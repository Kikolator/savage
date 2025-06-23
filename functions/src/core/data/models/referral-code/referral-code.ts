import { DocumentData } from "firebase-admin/firestore";
import { ReferrerType } from "../../enums";

export class ReferralCode {
    documentId: string; // same as ownerId (officeRnd)
    code: string;
    ownerId: string;
    companyId: string | null;
    ownerType: ReferrerType;
    // Total number of referrals made with this code.
    totalReferred: number;
    // Total number of referrals converted to a membership.
    totalConverted: number;
    // Total amount of rewards given out in EUR.
    totalRewardedEur: number;
    // List with users that have been referred with this code.
    referredUsers: string[];

    constructor(params: {
        documentId: string;
        code: string;
        ownerId: string;
        companyId: string | null;
        ownerType: ReferrerType;
        totalReferred: number;
        totalConverted: number;
        totalRewardedEur: number;
        referredUsers: string[];
    }) {
        this.documentId = params.documentId;
        this.code = params.code;
        this.ownerId = params.ownerId;
        this.companyId = params.companyId;
        this.ownerType = params.ownerType;
        this.totalReferred = params.totalReferred;
        this.totalConverted = params.totalConverted;
        this.totalRewardedEur = params.totalRewardedEur;
        this.referredUsers = params.referredUsers;
    }

    static fromDocumentData(id: string, data: DocumentData): ReferralCode {
        return new ReferralCode({
            documentId: id,
            code: data.code as string,
            ownerId: data.ownerId as string,
            companyId: data.companyId as string | null,
            ownerType: data.ownerType as ReferrerType,
            totalReferred: data.totalReferred as number,
            totalConverted: data.totalConverted as number,
            totalRewardedEur: data.totalRewardedEur as number,
            referredUsers: data.referredUsers as string[],
        });
    }

    toDocumentData(): DocumentData {
        return {
            documentId: this.documentId,
            code: this.code,
            ownerId: this.ownerId,
            companyId: this.companyId,
            ownerType: this.ownerType,
            totalReferred: this.totalReferred,
            totalConverted: this.totalConverted,
            totalRewardedEur: this.totalRewardedEur,
            referredUsers: this.referredUsers,
        };
    }
}
