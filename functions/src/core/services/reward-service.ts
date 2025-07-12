import {logger} from 'firebase-functions';
import {FieldValue, Timestamp} from 'firebase-admin/firestore';

import {
  PayoutChannel,
  ReferralStatus,
  ReferrerType,
  RewardStatus,
} from '../data/enums';
import {Referral, Reward} from '../data/models';
import {RewardServiceError} from '../errors';
import {getConfig} from '../config';

import {BaseService} from './base-service';
import {BankPayoutService} from './bank-payout-service';
import {FirestoreService} from './firestore-service';
import OfficeRndService from './office-rnd-service';

export class RewardService extends BaseService<RewardService> {
  private readonly rewardsCollection = 'rewards';
  private readonly config: ReturnType<typeof getConfig>;

  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly officeRndService: OfficeRndService,
    private readonly bankPayoutService: BankPayoutService
  ) {
    super();
    // Get config when service is instantiated
    this.config = getConfig();
  }

  protected async performInitialization(): Promise<void> {
    // No-op for now, but could be used for future setup
  }

  /**
   * Creates one or more Reward docs when a referral converts.
   * - Member referrer -> single reward (50% of subscriptionValue)
   * - Business referrer -> 3 rewards (20%, 10%, 5%)
   *
   * @returns array of created Reward objects
   */
  public async createRewardsForConversion(
    referral: Referral
  ): Promise<Reward[]> {
    this.logMethodEntry('createRewardsForConversion', {
      referralId: referral.id,
    });
    try {
      await this.ensureInitialized();

      if (referral.status !== ReferralStatus.CONVERTED) {
        this.logMethodError(
          'createRewardsForConversion',
          RewardServiceError.invalidReferralStatus(referral.id, referral.status)
        );
        return [];
      }

      const rewards: Reward[] = [];
      const baseAmount = referral.subscriptionValue ?? 0;

      if (!baseAmount) {
        throw RewardServiceError.missingSubscriptionValue(referral.id);
      }

      // Helper to push reward objects
      const pushReward = (
        amountPct: number,
        dueInDays: number,
        payoutChannel: PayoutChannel
      ) => {
        const dueDate = new Date(Date.now() + dueInDays * 86_400_000);
        rewards.push(
          new Reward({
            id: this.firestoreService.createDocumentReference(
              this.rewardsCollection
            ).id,
            referralId: referral.id,
            referrerId: referral.referrerId,
            referrerType: referral.referrerType,
            amountEur: +(baseAmount * amountPct).toFixed(2),
            dueDate: dueDate,
            status: RewardStatus.SCHEDULED,
            payoutChannel: payoutChannel,
            referrerCompanyId: referral.referrerCompanyId,
          })
        );
      };

      if (referral.referrerType === ReferrerType.MEMBER) {
        // 50% one-off credit
        pushReward(0.5, 0, PayoutChannel.OFFICERND);
      } else {
        pushReward(0.2, 0, PayoutChannel.OFFICERND); // month 1
        pushReward(0.1, 30, PayoutChannel.OFFICERND); // month 2
        pushReward(0.05, 60, PayoutChannel.OFFICERND); // month 3
      }

      await this.firestoreService.runBatch(async (batch) => {
        for (const r of rewards) {
          const docRef = this.firestoreService.createDocumentReference(
            this.rewardsCollection
          );
          batch.set(docRef, r.toDocumentData());
        }
      });

      this.logMethodSuccess('createRewardsForConversion', rewards);
      return rewards;
    } catch (error) {
      this.logMethodError('createRewardsForConversion', error as Error);
      if (error instanceof RewardServiceError) throw error;
      throw RewardServiceError.unknownError((error as Error).message, error);
    }
  }

  /**
   * Processes all rewards whose status = SCHEDULED & dueDate <= now.
   * Applies invoice credit (OfficeRnd) or triggers bank payout.
   */
  public async processDueRewards(): Promise<void> {
    this.logMethodEntry('processDueRewards');
    try {
      await this.ensureInitialized();

      const now = Timestamp.now();
      const snapshot = await this.firestoreService.queryCollectionSnapshot(
        this.rewardsCollection,
        [
          {
            field: 'status',
            operator: '==',
            value: RewardStatus.SCHEDULED,
          },
          {
            field: 'dueDate',
            operator: '<=',
            value: now,
          },
        ]
      );

      let processedCount = 0;
      let failedCount = 0;

      for (const doc of snapshot.docs) {
        const reward = Reward.fromDocumentData(doc.id, doc.data());

        try {
          await this.handlePayout(reward);
          await doc.ref.update({
            status: RewardStatus.PAID,
            paidAt: FieldValue.serverTimestamp(),
          });

          processedCount++;
          logger.info(`Reward ${reward.id} paid successfully`);
        } catch (err) {
          failedCount++;
          logger.error(`Reward payout failed for ${reward.id}`, err);
          await doc.ref.update({
            status: RewardStatus.FAILED,
            lastError: (err as Error).message,
          });
        }
      }

      this.logMethodSuccess('processDueRewards', {
        processed: processedCount,
        failed: failedCount,
        total: snapshot.docs.length,
      });
    } catch (error) {
      this.logMethodError('processDueRewards', error as Error);
      if (error instanceof RewardServiceError) throw error;
      throw RewardServiceError.unknownError((error as Error).message, error);
    }
  }

  /**
   * Voids any future scheduled rewards for a referral (e.g. early cancellation).
   */
  public async voidFutureRewards(referralId: string): Promise<void> {
    this.logMethodEntry('voidFutureRewards', {referralId});
    try {
      await this.ensureInitialized();

      const snapshot = await this.firestoreService.queryCollection(
        this.rewardsCollection,
        [
          {
            field: 'referralId',
            operator: '==',
            value: referralId,
          },
          {
            field: 'status',
            operator: '==',
            value: RewardStatus.SCHEDULED,
          },
        ]
      );

      await this.firestoreService.runBatch(async (batch) => {
        for (const doc of snapshot) {
          batch.update(doc.ref, {status: RewardStatus.VOID});
        }
      });

      this.logMethodSuccess('voidFutureRewards', {
        voidedCount: snapshot.length,
      });
    } catch (error) {
      this.logMethodError('voidFutureRewards', error as Error);
      if (error instanceof RewardServiceError) throw error;
      throw RewardServiceError.unknownError((error as Error).message, error);
    }
  }

  // ──────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────
  private async handlePayout(reward: Reward): Promise<void> {
    try {
      if (reward.payoutChannel === PayoutChannel.OFFICERND) {
        await this.officeRndService.addNewFee({
          memberId: reward.referrerId,
          feeName: 'Referral Reward',
          planId: this.config.runtime.officeRnd.defaultReferralPlanId,
          price: reward.amountEur,
          issueDate: reward.dueDate,
          companyId: reward.referrerCompanyId, // TODO implement companyId
        });
      } else if (reward.payoutChannel === PayoutChannel.STRIPE) {
        await this.bankPayoutService.issueTransfer(
          reward.referrerId,
          reward.amountEur
        );
      } else if (reward.payoutChannel === PayoutChannel.MANUAL) {
        // TODO: manual payout
        throw RewardServiceError.invalidPayoutChannel(
          'Manual payout not implemented yet'
        );
      } else {
        throw RewardServiceError.invalidPayoutChannel(reward.payoutChannel);
      }
    } catch (error) {
      if (error instanceof RewardServiceError) throw error;
      throw RewardServiceError.payoutFailed(
        reward.id,
        (error as Error).message
      );
    }
  }
}
