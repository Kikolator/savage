import {logger} from 'firebase-functions';
import {FieldValue, Timestamp} from 'firebase-admin/firestore';

import {
  PayoutChannel,
  ReferralStatus,
  ReferrerType,
  RewardStatus,
} from '../data/enums';
import {Referral, Reward} from '../data/models';
import {AppError, ErrorCode} from '../errors/app-error';
import {officeRndConfig} from '../config/office-rnd-config';

import {BankPayoutService} from './bank-payout-service';
import {FirestoreService} from './firestore-service';
import OfficeRndService from './office-rnd-service';

export class RewardService {
  private readonly rewardsCollection = 'rewards';

  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly officeRndService: OfficeRndService,
    private readonly bankPayoutService: BankPayoutService
  ) {}

  /**
   * Creates one or more REward docs when a referral converts.
   * - Member referrer -> single reward (50% fo subscriptionValue)
   * - Business referrer -> 3 rewards (20%, 10%, 5%)
   *
   * @returns array of created Reward objects
   */
  public async createRewardsForConversion(
    referral: Referral
  ): Promise<Reward[]> {
    if (referral.status !== ReferralStatus.CONVERTED) {
      logger.warn(
        `Skipping reward creation - referral ${referral.id} not CONVERTED`
      );
      return [];
    }

    const rewards: Reward[] = [];
    const baseAmount = referral.subscriptionValue ?? 0;

    if (!baseAmount) {
      logger.error(
        `Referral ${referral.id} has no subscriptionValue - cannot create reward`
      );
      return [];
    }

    // helkper to push reward objects
    const pushReward = (
      amountPct: number,
      dueInDays: number,
      payoutChannel: PayoutChannel
    ) => {
      const dueDate = new Date(Date.now() + dueInDays * 86_400_000);
      rewards.push(
        new Reward({
          id: this.firestoreService.createReference(this.rewardsCollection).id,
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
        const docRef = this.firestoreService.createReference(
          this.rewardsCollection
        );
        batch.set(docRef, r.toDocumentData());
      }
    });
    logger.info(
      `Created ${rewards.length} reward(s) for referral ${referral.id}`
    );
    return rewards;
  }

  /**
   * Processes all rewards whose status = SCHEDULED & dueDate <= now.
   * Applies invoice credit (OfficeRnd) or triggers bank payout.
   */
  public async processDueRewards(): Promise<void> {
    const now = Timestamp.now();
    const snapshot = await this.firestoreService
      .getFirestoreInstance()
      .collection(this.rewardsCollection)
      .where('status', '==', RewardStatus.SCHEDULED)
      .where('dueDate', '<=', now)
      .get();

    for (const doc of snapshot.docs) {
      const reward = Reward.fromDocumentData(doc.id, doc.data());

      try {
        await this.handlePayout(reward);
        await doc.ref.update({
          status: RewardStatus.PAID,
          paidAt: FieldValue.serverTimestamp(),
        });

        logger.info(`Reward ${reward.id} paid successfully`);
      } catch (err) {
        logger.error(`Reward payout failed for ${reward.id}`, err);
        await doc.ref.update({
          status: RewardStatus.FAILED,
          lastError: (err as Error).message,
        });
      }
    }
  }

  /**
   * Voids any future scheduled rewards for a referral (e.g. early cancellation).
   */
  public async voidFutureRewards(referralId: string): Promise<void> {
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
    logger.info(
      `Voided ${snapshot.length} future reward(s) for referral ${referralId}`
    );
  }

  // ──────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────
  private async handlePayout(reward: Reward): Promise<void> {
    if (reward.payoutChannel === PayoutChannel.OFFICERND) {
      await this.officeRndService.addNewFee({
        memberId: reward.referrerId,
        feeName: 'Referral Reward',
        planId: officeRndConfig.defaultReferralPlanId,
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
    } else {
      throw new AppError(
        'Invalid payout channel',
        ErrorCode.INVALID_ARGUMENT,
        400
      );
    }
  }
}
