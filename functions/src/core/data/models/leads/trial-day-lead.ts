import { MembershipStatus } from '../../enums/membership-status';

export interface TrailDayLead {
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    membershipStatus: MembershipStatus.LEAD;
    referrerEmail?: string;
    tags: Array<string>;
    trialStartDate: Date;
    trialEndDate?: Date;
    signupReason: string;
}
