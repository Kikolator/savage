import {logger} from 'firebase-functions';

import {ReferralStatus, ReferrerType} from '../data/enums';
import {CreateDoc, Referral, ReferralCode} from '../data/models';
import {FirestoreServiceError, ReferralServiceError} from '../errors';

import {BaseService} from './base-service';
import {FirestoreService} from './firestore-service';
import OfficeRndService from './office-rnd-service';
import {RewardService} from './reward-service';

export class ReferralService extends BaseService<ReferralService> {
  private readonly referralCodesCollection = 'referralCodes';
  private readonly referralsCollection = 'referrals';

  constructor(
    private readonly services: {
      firestoreService: FirestoreService;
      officeRndService: OfficeRndService;
      rewardService: RewardService;
    }
  ) {
    super();
  }

  protected async performInitialization(): Promise<void> {
    // No-op for now, but could be used for future setup
  }

  private generateReferralCode(): string {
    // Generate a 6-character code using uppercase letters and numbers
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Creates a new referral code for a referrer.
   * Creates a doc in firestore.
   * Updates office rnd member properties.
   * @param referrerId - The id of the referrer.
   * @param referrerType - The type of the referrer (business or member).
   * @returns The created referral code object.
   */
  public async createReferralCode(params: {
    referrerId: string;
    referrerCompanyId: string | null;
    referrerType: ReferrerType;
  }): Promise<ReferralCode> {
    this.logMethodEntry('createReferralCode', params);
    try {
      await this.ensureInitialized();
      // Check if referrer has permission to create referral code.
      // And referral code does not already exist.
      const officeRndService = this.services.officeRndService;
      const referrer = await officeRndService.getMember(params.referrerId);
      if (!referrer.properties.referralPermission) {
        throw ReferralServiceError.noPermission();
      }

      if (referrer.properties.referralOwnCode) {
        throw ReferralServiceError.alreadyExists();
      }

      let referralCode: ReferralCode | null = null;
      let attempts = 0;
      const maxAttempts = 10; // Prevent infinite loops

      while (attempts < maxAttempts) {
        attempts++;

        // Create new referral code object
        const candidate = new ReferralCode({
          documentId: params.referrerId,
          code: this.generateReferralCode(),
          ownerId: params.referrerId,
          companyId: params.referrerCompanyId,
          ownerType: params.referrerType,
          totalReferred: 0,
          totalConverted: 0,
          totalRewardedEur: 0,
          referredUsers: [],
        });

        try {
          // Attempt to create the document in firestore
          const data: CreateDoc = {
            collection: this.referralCodesCollection,
            documentId: candidate.documentId,
            data: candidate.toDocumentData(),
          };
          await this.services.firestoreService.createDocument(data);

          // only assign on succesful write
          referralCode = candidate;
          break;
        } catch (error) {
          // If document creation fails (likely due to code collision), continue to next attempt
          logger.warn([
            'ReferralService.createReferralCode()- code collision detected, retrying',
            {
              attempt: attempts,
              code: candidate.code,
              error: error,
            },
          ]);
        }
      }

      // if we failed to generate a unique code, throw an error
      if (referralCode === null) {
        throw ReferralServiceError.uniqueCodeFailed();
      }

      // Add referral code to office rnd member properties
      await this.services.officeRndService.updateMember(params.referrerId, {
        referralOwnCode: referralCode.code,
      });

      this.logMethodSuccess('createReferralCode', referralCode);
      // Return referral code object
      return referralCode;
    } catch (error) {
      this.logMethodError('createReferralCode', error as Error);
      if (error instanceof ReferralServiceError) throw error;
      throw ReferralServiceError.unknownError((error as Error).message, error);
    }
  }

  public async createReferral(params: {
    referralCode: string;
    referredUserId: string;
    referrerCompanyId: string | null;
    isTrialday: boolean;
    trialdayStartDate?: Date;
    trialDayId?: string;
    opportunityId?: string;
    membershipStartDate?: Date;
    subscriptionValue?: number;
    referralValue?: number;
  }): Promise<Referral> {
    this.logMethodEntry('createReferral', params);
    try {
      await this.ensureInitialized();
      const firestoreService = this.services.firestoreService;
      const officeRndService = this.services.officeRndService;
      const referralCodesCollection = this.referralCodesCollection;
      const referralsCollection = this.referralsCollection;
      const referralCode = params.referralCode.toUpperCase();
      const referredUserId = params.referredUserId;
      const isTrialday = params.isTrialday;
      const trialdayStartDate = params.trialdayStartDate;
      const trialDayId = params.trialDayId;
      const opportunityId = params.opportunityId;
      const membershipStartDate = params.membershipStartDate;
      const subscriptionValue = params.subscriptionValue;
      const referralValue = params.referralValue;

      // If trial day, trial start date, trial day id, and opportunity id are required.
      // If not trial day, membership start date, subscription value, and referral value are required.
      if (isTrialday) {
        if (!trialdayStartDate) {
          throw ReferralServiceError.invalidArgument(
            'Trial day start date is required when creating a trial day referral'
          );
        }
        if (!trialDayId) {
          throw ReferralServiceError.invalidArgument(
            'Trial day id is required when creating a trial day referral'
          );
        }
        if (!opportunityId) {
          throw ReferralServiceError.invalidArgument(
            'Opportunity id is required when creating a trial day referral'
          );
        }
        if (membershipStartDate) {
          throw ReferralServiceError.invalidArgument(
            'Membership start date must be undefined when creating a trial day referral'
          );
        }
        if (subscriptionValue) {
          throw ReferralServiceError.invalidArgument(
            'Subscription value must be undefined when creating a trial day referral'
          );
        }
        if (referralValue) {
          throw ReferralServiceError.invalidArgument(
            'Referral value must be undefined when creating a trial day referral'
          );
        }
      } else {
        if (trialdayStartDate) {
          throw ReferralServiceError.invalidArgument(
            'Trial day start date must be undefined when creating a membership referral'
          );
        }
        if (trialDayId) {
          throw ReferralServiceError.invalidArgument(
            'Trial day id must be undefined when creating a membership referral'
          );
        }
        if (opportunityId) {
          throw ReferralServiceError.invalidArgument(
            'Opportunity id must be undefined when creating a membership referral'
          );
        }
        if (!membershipStartDate) {
          throw ReferralServiceError.invalidArgument(
            'Membership start date is required when creating a membership referral'
          );
        }
        if (!subscriptionValue) {
          throw ReferralServiceError.invalidArgument(
            'Subscription value is required when creating a membership referral'
          );
        }
        if (!referralValue) {
          throw ReferralServiceError.invalidArgument(
            'Referral value is required when creating a membership referral'
          );
        }
      }

      // Use transaction to ensure atomicity and prevent data races
      const referral = await firestoreService.runTransaction(
        async (transaction) => {
          // Get the referral code object from firestore within the transaction
          const referralCodeSnapshot =
            await firestoreService.queryCollectionWithTransaction(
              transaction,
              referralCodesCollection,
              [
                {
                  field: 'code',
                  operator: '==',
                  value: referralCode,
                },
              ]
            );

          if (referralCodeSnapshot.empty) {
            throw ReferralServiceError.referralCodeNotFound(referralCode);
          }
          const referralCodeDoc = referralCodeSnapshot.docs[0];
          const referralCodeData = referralCodeDoc.data();
          if (!referralCodeData) {
            throw ReferralServiceError.dataUndefined(
              'Referral code data is undefined'
            );
          }
          const referralCodeObject = ReferralCode.fromDocumentData(
            referralCodeDoc.id,
            referralCodeData
          );

          // Check if referred user is already referred with this code
          if (referralCodeObject.referredUsers.includes(referredUserId)) {
            throw ReferralServiceError.alreadyReferred();
          }

          // Check if referred user is the referrer.
          if (referredUserId === referralCodeObject.ownerId) {
            throw ReferralServiceError.selfReferral();
          }

          // Check if referred user is already referred with another code.
          const referralsQuery = await firestoreService.queryCollection(
            referralsCollection,
            [
              {
                field: 'referredUserId',
                operator: '==',
                value: referredUserId,
              },
            ]
          );
          if (referralsQuery.length > 0) {
            throw ReferralServiceError.alreadyReferredOther(
              referralsQuery[0].referralCode
            );
          }

          // Create a new document reference for the referral
          const referralDocRef =
            firestoreService.createDocumentReference(referralsCollection);

          // Create referral object
          const referral = new Referral({
            id: referralDocRef.id,
            referrerId: referralCodeObject.ownerId,
            referrerCompanyId: referralCodeObject.companyId || null,
            referrerType: referralCodeObject.ownerType,
            referredUserId: referredUserId,
            referralCode: referralCode,
            trialStartDate: trialdayStartDate || null,
            trialDayId: trialDayId || null,
            opportunityId: opportunityId || null,
            membershipStartDate: membershipStartDate || null,
            subscriptionValue: subscriptionValue || null,
            referralValue: referralValue || null,
            status: isTrialday
              ? ReferralStatus.TRIAL
              : ReferralStatus.AWAITING_PAYMENT,
            rewardIds: [],
          });

          // Add referral object to firestore within the transaction
          firestoreService.setDocumentWithTransaction(
            transaction,
            referralsCollection,
            referralDocRef.id,
            {
              ...referral.toDocumentData(),
              created_at: firestoreService.getServerTimestamp(),
            }
          );

          // Update referral code object within the transaction using FieldValue operations
          // Use increment for totalReferred and arrayUnion for referredUsers
          firestoreService.updateDocumentWithTransaction(
            transaction,
            referralCodesCollection,
            referralCodeDoc.id,
            {
              totalReferred: firestoreService.increment(1),
              referredUsers: firestoreService.arrayUnion(referredUserId),
            }
          );

          return referral;
        }
      );

      // Update OfficeRnd outside of the transaction since it's not part of Firestore
      await officeRndService.updateMember(referral.referredUserId, {
        referralCodeUsed: referralCode,
      });

      this.logMethodSuccess('createReferral', referral);
      return referral;
    } catch (error) {
      this.logMethodError('createReferral', error as Error);
      if (error instanceof ReferralServiceError) throw error;
      throw ReferralServiceError.unknownError((error as Error).message, error);
    }
  }

  /**
   * Marks a referral as converted once the referred user’s first payment clears.
   * Updates referral status, reward status, and increments totalConverted on the
   * related referral code document. Returns the updated Referral object.
   *
   * @param params.referralId The Firestore document ID of the referral to convert.
   */
  public async confirmConversion(params: {
    referralId: string;
  }): Promise<Referral> {
    this.logMethodEntry('confirmConversion', params);
    try {
      await this.ensureInitialized();
      const firestoreService = this.services.firestoreService;
      const referralsCollection = this.referralsCollection;
      const rewardService = this.services.rewardService;
      const referralCodesCollection = this.referralCodesCollection;

      // Run transaction for atomic consistency.
      const updatedReferral = await firestoreService.runTransaction(
        async (transaction) => {
          // Fetch referral doc
          const referralDoc = await firestoreService.getDocumentWithTransaction(
            transaction,
            referralsCollection,
            params.referralId
          );
          if (!referralDoc.exists) {
            throw FirestoreServiceError.documentNotFound(
              'referrals',
              params.referralId
            );
          }
          const referralData = referralDoc.data();
          if (!referralData) {
            throw ReferralServiceError.dataUndefined(
              'Referral data is undefined'
            );
          }

          const referralObj = Referral.fromDocumentData(
            referralDoc.id,
            referralData
          );

          // Only referrals awaiting payment can be converted
          if (referralObj.status !== ReferralStatus.AWAITING_PAYMENT) {
            throw ReferralServiceError.notEligibleForConversion(
              referralObj.status
            );
          }

          // Update referral fields
          referralObj.status = ReferralStatus.CONVERTED;

          firestoreService.updateDocumentWithTransaction(
            transaction,
            referralsCollection,
            params.referralId,
            {
              status: referralObj.status,
            }
          );

          // Increment totalConverted on the parent referral code
          firestoreService.updateDocumentWithTransaction(
            transaction,
            referralCodesCollection,
            referralObj.referralCode,
            {
              totalConverted: firestoreService.increment(1),
            }
          );

          return referralObj;
        }
      );

      // Create rewards now that conversion is committed
      const rewards =
        await rewardService.createRewardsForConversion(updatedReferral);

      // Link reward IDs back to referral document
      if (rewards.length) {
        await firestoreService.updateDocument({
          collection: referralsCollection,
          documentId: updatedReferral.id,
          data: {rewardIds: rewards.map((r) => r.id)},
        });
      }

      // ─────────────────────────────────────────────────────────────
      // Reward payout can be triggered here (invoice credit, etc.).
      // Leaving placeholder for subsequent implementation.
      // ─────────────────────────────────────────────────────────────
      logger.info([
        'ReferralService.confirmConversion()- reward now payable',
        {
          referralId: updatedReferral.id,
          referrerId: updatedReferral.referrerId,
        },
      ]);

      this.logMethodSuccess('confirmConversion', updatedReferral);
      return updatedReferral;
    } catch (error) {
      this.logMethodError('confirmConversion', error as Error);
      if (error instanceof ReferralServiceError) throw error;
      throw ReferralServiceError.unknownError((error as Error).message, error);
    }
  }
}
