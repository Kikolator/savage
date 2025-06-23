export interface TrialDayFormData {
    formId: string;
    eventId: string;
    preferredDate: string;
    preferredTime: string;
    interest: Array<string>
    reason: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    legal: boolean;
    submittedAt: string;
    timezone?: string;
    referralCode?: string;
    hiddenEmail?: string;
    hiddenFirstName?: string;
    hiddenLastName?: string;
    userId?: string;
    utmCampaign?: string;
    utmSource?: string;
}
