import {DocumentData, Timestamp} from 'firebase-admin/firestore';

import {TrialdayStatus} from '../../enums';

export class Trialday {
  // Static field constants for type-safe Firestore operations
  static readonly FIELDS = {
    ID: 'id',
    EMAIL: 'email',
    PHONE: 'phone',
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    STATUS: 'status',
    TRIAL_DATE_TIME: 'trialDateTime',
    REASON: 'reason',
    INTERESTED_IN: 'interestedIn',
    TERMS_ACCEPTED: 'termsAccepted',
    OPPORTUNITY_ID: 'opportunityId',
    MEMBER_ID: 'memberId',
    EVENT_ID: 'eventId',
    CANCELLATION_REASON: 'cancellationReason',
    PREVIOUS_TRIALDAY_ID: 'previousTrialdayId',
    REFERRAL_CODE: 'referralCode',
  } as const;

  public readonly id: string;
  public readonly email: string;
  public readonly phone: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly status: TrialdayStatus;
  public readonly trialDateTime: Date;
  public readonly reason: string;
  public readonly interestedIn: string[];
  public readonly termsAccepted: boolean;
  // Office Rnd
  public readonly opportunityId: string | null;
  public readonly memberId: string | null;
  // Typeform
  public readonly eventId: string;
  public readonly cancellationReason: string | null;
  // Rescheduling
  public readonly previousTrialdayId: string | null;
  // Referral
  public readonly referralCode: string | null;

  constructor(params: {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    status: TrialdayStatus;
    trialDateTime: Date;
    reason: string;
    interestedIn: string[];
    termsAccepted: boolean;
    opportunityId?: string | null;
    memberId?: string | null;
    eventId: string;
    cancellationReason?: string | null;
    previousTrialdayId?: string | null;
    referralCode?: string | null;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.phone = params.phone;
    this.firstName = params.firstName;
    this.lastName = params.lastName;
    this.status = params.status;
    this.trialDateTime = params.trialDateTime;
    this.reason = params.reason;
    this.interestedIn = params.interestedIn;
    this.termsAccepted = params.termsAccepted;
    this.opportunityId = params.opportunityId ?? null;
    this.memberId = params.memberId ?? null;
    this.eventId = params.eventId;
    this.cancellationReason = params.cancellationReason ?? null;
    this.previousTrialdayId = params.previousTrialdayId ?? null;
    this.referralCode = params.referralCode ?? null;
  }

  public static fromDocumentData(id: string, data: DocumentData): Trialday {
    return new Trialday({
      id,
      email: data[Trialday.FIELDS.EMAIL] as string,
      phone: data[Trialday.FIELDS.PHONE] as string,
      firstName: data[Trialday.FIELDS.FIRST_NAME] as string,
      lastName: data[Trialday.FIELDS.LAST_NAME] as string,
      status: data[Trialday.FIELDS.STATUS] as TrialdayStatus,
      trialDateTime: (
        data[Trialday.FIELDS.TRIAL_DATE_TIME] as Timestamp
      ).toDate(),
      reason: data[Trialday.FIELDS.REASON] as string,
      interestedIn: data[Trialday.FIELDS.INTERESTED_IN] as string[],
      termsAccepted: data[Trialday.FIELDS.TERMS_ACCEPTED] as boolean,
      opportunityId: data[Trialday.FIELDS.OPPORTUNITY_ID] as string | null,
      memberId: data[Trialday.FIELDS.MEMBER_ID] as string | null,
      eventId: data[Trialday.FIELDS.EVENT_ID] as string,
      cancellationReason: data[Trialday.FIELDS.CANCELLATION_REASON] as
        | string
        | null,
      previousTrialdayId: data[Trialday.FIELDS.PREVIOUS_TRIALDAY_ID] as
        | string
        | null,
      referralCode: data[Trialday.FIELDS.REFERRAL_CODE] as string | null,
    });
  }

  public toDocumentData(): DocumentData {
    return {
      [Trialday.FIELDS.ID]: this.id,
      [Trialday.FIELDS.EMAIL]: this.email,
      [Trialday.FIELDS.PHONE]: this.phone,
      [Trialday.FIELDS.FIRST_NAME]: this.firstName,
      [Trialday.FIELDS.LAST_NAME]: this.lastName,
      [Trialday.FIELDS.STATUS]: this.status,
      [Trialday.FIELDS.TRIAL_DATE_TIME]: Timestamp.fromDate(this.trialDateTime),
      [Trialday.FIELDS.REASON]: this.reason,
      [Trialday.FIELDS.INTERESTED_IN]: this.interestedIn,
      [Trialday.FIELDS.TERMS_ACCEPTED]: this.termsAccepted,
      [Trialday.FIELDS.OPPORTUNITY_ID]: this.opportunityId,
      [Trialday.FIELDS.MEMBER_ID]: this.memberId,
      [Trialday.FIELDS.EVENT_ID]: this.eventId,
      [Trialday.FIELDS.CANCELLATION_REASON]: this.cancellationReason,
      [Trialday.FIELDS.PREVIOUS_TRIALDAY_ID]: this.previousTrialdayId,
      [Trialday.FIELDS.REFERRAL_CODE]: this.referralCode,
    };
  }
}
