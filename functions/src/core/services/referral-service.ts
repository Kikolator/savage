import { logger } from "firebase-functions";
import { ReferralStatus, ReferrerType } from "../data/enums";
import { CreateDoc, Referral, ReferralCode } from "../data/models";
import { FirestoreService } from "./firestore-service";
import OfficeRndService from "./office-rnd-service";
import { AppError, ErrorCode } from "../errors/app-error";
import { RewardService } from "./reward-service";

export class ReferralService {
    private readonly referralCodesCollection = 'referralCodes';
    private readonly referralsCollection = 'referrals';

    constructor(
        private readonly params: {
            firestoreService: FirestoreService,
            officeRndService: OfficeRndService,
            rewardService: RewardService,
        }) { }

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
        referrerId: string,
        referrerCompanyId: string | null,
        referrerType: ReferrerType
    }): Promise<ReferralCode> {
        logger.info(['ReferralService.createReferralCode()- creating referral code', {
            referrerId: params.referrerId,
            referrerType: params.referrerType,
        }]);

        let referralCode: ReferralCode | null = null;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops

        while (attempts < maxAttempts) {
            attempts++;

            // Create new referral code object
            const candidate = new ReferralCode({
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
                    documentId: candidate.code,
                    data: candidate.toDocumentData()
                };
                await this.params.firestoreService.createDocument(data);

                // only assign on succesful write
                referralCode = candidate;
                break;
            } catch (error) {
                // If document creation fails (likely due to code collision), continue to next attempt
                logger.warn(['ReferralService.createReferralCode()- code collision detected, retrying', {
                    attempt: attempts,
                    code: candidate.code,
                    error: error
                }]);
            }
        }

        // if we failed to generate a unique code, throw an error
        if (referralCode === null) {
            throw new AppError(
                'Failed to generate unique referral code after maximum attempts',
                ErrorCode.UNKNOWN_ERROR,
                500,
            );
        }

        // Add referral code to office rnd member properties
        await this.params.officeRndService.updateMember(params.referrerId, {
            referralOwnCode: referralCode.code,
        });

        // Return referral code object
        return referralCode;
    }

    public async createReferral(params: {
        referralCode: string,
        referredUserId: string,
        isTrialday: boolean,
        trialdayStartDate?: Date,
        membershipStartDate?: Date,
        subscriptionValue?: number,
        referralValue?: number,
    }): Promise<Referral> {
        logger.info(['ReferralService.createReferral()- creating referral', {
            referralCode: params.referralCode,
            referredUserId: params.referredUserId,
        }]);
        const firestoreService = this.params.firestoreService;
        const officeRndService = this.params.officeRndService;
        const referralCodesCollection = this.referralCodesCollection;
        const referralsCollection = this.referralsCollection;
        const referralCode = params.referralCode;
        const referredUserId = params.referredUserId;
        const isTrialday = params.isTrialday;
        const trialdayStartDate = params.trialdayStartDate;
        const membershipStartDate = params.membershipStartDate;
        const subscriptionValue = params.subscriptionValue;
        const referralValue = params.referralValue;

        // If trial day, trial start date cannot be undefined.
        // If not trial day, trialdayStartDate must be undefined, and
        // membershipStartDate, subscriptionValue, and referralValue must be defined.
        if (isTrialday) {
            if (!trialdayStartDate) {
                throw new AppError('Trial day start date is required when creating a trial day referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
            if (membershipStartDate) {
                throw new AppError('Membership start date must be undefined when creating a trial day referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
            if (subscriptionValue) {
                throw new AppError('Subscription value must be undefined when creating a trial day referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
            if (referralValue) {
                throw new AppError('Referral value must be undefined when creating a trial day referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
        } else {
            if (trialdayStartDate) {
                throw new AppError('Trial day start date must be undefined when creating a membership referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
            if (!membershipStartDate) {
                throw new AppError('Membership start date is required when creating a membership referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
            if (!subscriptionValue) {
                throw new AppError('Subscription value is required when creating a membership referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
            if (!referralValue) {
                throw new AppError('Referral value is required when creating a membership referral', ErrorCode.INVALID_ARGUMENT, 400);
            }
        }

        // Use transaction to ensure atomicity and prevent data races
        const referral = await firestoreService.runTransaction(async (transaction) => {
            // Get the referral code object from firestore within the transaction
            const referralCodeDocRef = firestoreService.getFirestoreInstance().collection(referralCodesCollection).doc(referralCode);
            const referralCodeDoc = await transaction.get(referralCodeDocRef);

            if (!referralCodeDoc.exists) {
                throw new AppError('Referral code not found', ErrorCode.DOCUMENT_NOT_FOUND, 404);
            }

            const referralCodeObject = ReferralCode.fromDocumentData(
                referralCodeDoc.id,
                referralCodeDoc.data()!
            );

            // Check if referred user is already referred with this code
            if (referralCodeObject.referredUsers.includes(referredUserId)) {
                throw new AppError('User already referred with this code', ErrorCode.INVALID_ARGUMENT, 400);
            }

            // Check if referred user is the referrer.
            if (referredUserId === referralCodeObject.ownerId) {
                throw new AppError('Referrer cannot be the same as the referred user', ErrorCode.INVALID_ARGUMENT, 400);
            }

            // Check if referred user is already referred with another code.
            const referralsQuery = await firestoreService.queryCollection(
                referralsCollection, [{
                    field: 'referredUserId',
                    operator: '==',
                    value: referredUserId,
                }]
            );
            if (referralsQuery.length > 0) {
                throw new AppError('User already referred with another code', ErrorCode.INVALID_ARGUMENT, 400, {
                    referralCode: referralsQuery[0].referralCode,
                });
            }

            // Create a new document reference for the referral
            const referralDocRef = firestoreService.createReference(referralsCollection);

            // Create referral object
            const referral = new Referral({
                id: referralDocRef.id,
                referrerId: referralCodeObject.ownerId,
                referrerCompanyId: referralCodeObject.companyId,
                referrerType: referralCodeObject.ownerType,
                referredUserId: referredUserId,
                referralCode: referralCode,
                trialStartDate: trialdayStartDate,
                membershipStartDate: membershipStartDate,
                subscriptionValue: subscriptionValue,
                referralValue: referralValue,
                status: isTrialday ? ReferralStatus.TRIAL : ReferralStatus.AWAITING_PAYMENT,
                rewardIds: [],
            });

            // Add referral object to firestore within the transaction
            transaction.set(referralDocRef, {
                ...referral.toDocumentData(),
                created_at: firestoreService.getFieldValue().serverTimestamp(),
                updated_at: firestoreService.getFieldValue().serverTimestamp(),
            });

            // Update referral code object within the transaction using FieldValue operations
            // Use increment for totalReferred and arrayUnion for referredUsers
            transaction.update(referralCodeDocRef, {
                totalReferred: firestoreService.getFieldValue().increment(1),
                referredUsers: firestoreService.getFieldValue().arrayUnion(referredUserId),
                updated_at: firestoreService.getFieldValue().serverTimestamp(),
            });

            return referral;
        });

        // Update OfficeRnd outside of the transaction since it's not part of Firestore
        await officeRndService.updateMember(referral.referredUserId, {
            referralCodeUsed: referralCode,
        });

        return referral;
    }

    /**
     * Marks a referral as converted once the referred user’s first payment clears.
     * Updates referral status, reward status, and increments totalConverted on the
     * related referral code document. Returns the updated Referral object.
     *
     * @param params.referralId The Firestore document ID of the referral to convert.
     */
    public async confirmConversion(params: {
        referralId: string,
    }): Promise<Referral> {
        const firestoreService = this.params.firestoreService;
        const referralsCollection = this.referralsCollection;
        const rewardService = this.params.rewardService;
        const referralCodesCollection = this.referralCodesCollection;

        logger.info(['ReferralService.confirmConversion()- confirming conversion', {
            referralId: params.referralId,
        }]);

        // Run transaction for atomic consistency.
        const updatedReferral = await firestoreService.runTransaction(async (transaction) => {
            // Fetch referral doc
            const referralDocRef = firestoreService
                .getFirestoreInstance()
                .collection(referralsCollection)
                .doc(params.referralId);

            const referralDoc = await transaction.get(referralDocRef);
            if (!referralDoc.exists) {
                throw new AppError('Referral not found', ErrorCode.DOCUMENT_NOT_FOUND, 404);
            }

            const referralObj = Referral.fromDocumentData(
                referralDoc.id,
                referralDoc.data()!
            );

            // Only referrals awaiting payment can be converted
            if (referralObj.status !== ReferralStatus.AWAITING_PAYMENT) {
                throw new AppError('Referral not eligible for conversion', ErrorCode.INVALID_ARGUMENT, 400, {
                    currentStatus: referralObj.status,
                });
            }

            // Update referral fields
            referralObj.status = ReferralStatus.CONVERTED;

            transaction.update(referralDocRef, {
                status: referralObj.status,
                updated_at: firestoreService.getFieldValue().serverTimestamp(),
            });

            // Increment totalConverted on the parent referral code
            const codeDocRef = firestoreService
                .getFirestoreInstance()
                .collection(referralCodesCollection)
                .doc(referralObj.referralCode);

            transaction.update(codeDocRef, {
                totalConverted: firestoreService.getFieldValue().increment(1),
                updated_at: firestoreService.getFieldValue().serverTimestamp(),
            });

            return referralObj;
        });

        // Create rewards now that conversion is committed
        const rewards = await rewardService.createRewardsForConversion(updatedReferral);

        // Link reward IDs back to referral document
        if (rewards.length) {
            await firestoreService.updateDocument({
                collection: referralsCollection,
                documentId: updatedReferral.id,
                data: {
                    rewardIds: rewards.map(r => r.id),
                }
            });
        }

        // ─────────────────────────────────────────────────────────────
        // Reward payout can be triggered here (invoice credit, etc.).
        // Leaving placeholder for subsequent implementation.
        // ─────────────────────────────────────────────────────────────
        logger.info(['ReferralService.confirmConversion()- reward now payable', {
            referralId: updatedReferral.id,
            referrerId: updatedReferral.referrerId,
        }]);

        return updatedReferral;
    }
}
