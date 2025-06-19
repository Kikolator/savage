import { DocumentData, Timestamp } from "firebase-admin/firestore";
import { PayoutChannel, ReferrerType, RewardStatus } from "../../enums";

export class Reward {
    id: string;
    referralId: string;
    referrerId: string;
    referrerType: ReferrerType;
    amountEur: number;
    dueDate: Date;
    status: RewardStatus;
    payoutChannel: PayoutChannel;
    referrerCompanyId: string | null;

    constructor(params: {
        id: string;
        referralId: string;
        referrerId: string;
        referrerType: ReferrerType;
        amountEur: number;
        dueDate: Date;
        status: RewardStatus;
        payoutChannel: PayoutChannel;
        referrerCompanyId: string | null;
    }) {
        this.id = params.id;
        this.referralId = params.referralId;
        this.referrerId = params.referrerId;
        this.referrerType = params.referrerType;
        this.amountEur = params.amountEur;
        this.dueDate = params.dueDate;
        this.status = params.status;
        this.payoutChannel = params.payoutChannel;
        this.referrerCompanyId = params.referrerCompanyId;
    }

    public toDocumentData(): DocumentData {
        return {
            id: this.id,
            referralId: this.referralId,
            referrerId: this.referrerId,
            referrerType: this.referrerType,
            amountEur: this.amountEur,
            dueDate: Timestamp.fromDate(this.dueDate),
            status: this.status,
            payoutChannel: this.payoutChannel,
            referrerCompanyId: this.referrerCompanyId,
        };
    }

    public static fromDocumentData(id: string, data: DocumentData): Reward {
        return new Reward({
            id: id,
            referralId: data.referralId,
            referrerId: data.referrerId,
            referrerType: data.referrerType,
            amountEur: data.amountEur,
            dueDate: (data.dueDate as Timestamp).toDate(),
            status: data.status,
            payoutChannel: data.payoutChannel,
            referrerCompanyId: data.referrerCompanyId as string | null,
        });
    }
}