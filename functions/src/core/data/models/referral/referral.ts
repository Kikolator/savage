import { DocumentData } from "firebase-admin/firestore";
import { ReferralStatus, ReferrerType } from "../../enums";

export class Referral {
    id: string;
    // The id of the referrer.
    referrerId: string;
    // The id of the referrer's company, null if not added to any company.
    referrerCompanyId: string | null;
    referrerType: ReferrerType;
    // The id of the referred user.
    referredUserId: string;
    // The referral code used to refer the user.
    referralCode: string;
    // The start date of the trial day.
    trialStartDate: Date | null | undefined;
    // The start date of the membership.
    membershipStartDate: Date | null | undefined;
    // The subscription value of the referred user.
    subscriptionValue: number | null | undefined;
    // The referral value of the referred user.
    referralValue: number | null | undefined;
    // The status of the referral.
    status: ReferralStatus;
    // The rewards associated with the referral.
    rewardIds: string[];

    constructor(params: {
        id: string;
        referrerId: string;
        referrerCompanyId: string | null;
        referrerType: ReferrerType;
        referredUserId: string;
        referralCode: string;
        trialStartDate: Date | null | undefined;
        membershipStartDate: Date | null | undefined;
        subscriptionValue: number | null | undefined;
        referralValue: number | null | undefined;
        status: ReferralStatus;
        rewardIds: string[];
    }) {
        this.id = params.id;
        this.referrerId = params.referrerId;
        this.referrerCompanyId = params.referrerCompanyId;
        this.referrerType = params.referrerType;
        this.referredUserId = params.referredUserId;
        this.referralCode = params.referralCode;
        this.trialStartDate = params.trialStartDate;
        this.membershipStartDate = params.membershipStartDate;
        this.subscriptionValue = params.subscriptionValue;
        this.referralValue = params.referralValue;
        this.status = params.status;
        this.rewardIds = params.rewardIds;
    }

    static fromDocumentData(id: string, data: DocumentData): Referral {
        return new Referral({
            id,
            referrerId: data.referrerId as string,
            referrerCompanyId: data.referrerCompanyId as string | null,
            referrerType: data.referrerType as ReferrerType,
            referredUserId: data.referredUserId as string,
            referralCode: data.referralCode as string,
            trialStartDate: data.trialStartDate as Date | undefined,
            membershipStartDate: data.membershipStartDate as Date | undefined,
            subscriptionValue: data.subscriptionValue as number | undefined,
            referralValue: data.referralValue as number | undefined,
            status: data.status as ReferralStatus,
            rewardIds: data.rewardIds as string[],
        });
    }

    toDocumentData(): DocumentData {
        return {
            id: this.id,
            referrerId: this.referrerId,
            referrerCompanyId: this.referrerCompanyId,
            referrerType: this.referrerType,
            referredUserId: this.referredUserId,
            referralCode: this.referralCode,
            trialStartDate: this.trialStartDate,
            membershipStartDate: this.membershipStartDate,
            subscriptionValue: this.subscriptionValue,
            referralValue: this.referralValue,
            status: this.status,
            rewardIds: this.rewardIds,
        };
    }
}