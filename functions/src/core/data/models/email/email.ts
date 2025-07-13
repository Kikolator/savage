import {DocumentData} from 'firebase-admin/firestore';

export class Email {
  // Static field constants for type-safe Firestore operations
  static readonly FIELDS = {
    ID: 'id',
    EMAIL: 'email',
    CONFIRMED: 'confirmed',
    CONFIRMATION_EMAIL_SENT: 'confirmationEmailSent',
    CONFIRMATION_URL: 'confirmationUrl',
    AMOUNT_SENT: 'amountSent',
  } as const;

  constructor(params: {
    id: string;
    email: string;
    confirmed: boolean;
    confirmationEmailSent: boolean;
    confirmationUrl: string;
    amountSent: number;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.confirmed = params.confirmed;
    this.confirmationEmailSent = params.confirmationEmailSent;
    this.confirmationUrl = params.confirmationUrl;
    this.amountSent = params.amountSent;
  }

  public readonly id: string;
  public readonly email: string;
  public readonly confirmed: boolean;
  public readonly confirmationEmailSent: boolean;
  public readonly confirmationUrl: string;
  public readonly amountSent: number;

  public static fromData(data: DocumentData): Email {
    return new Email({
      id: data.id,
      email: data.email,
      confirmed: data.confirmed,
      confirmationEmailSent: data.confirmationEmailSent,
      confirmationUrl: data.confirmationUrl,
      amountSent: data.amountSent,
    });
  }

  public toDocumentData(): DocumentData {
    return {
      [Email.FIELDS.ID]: this.id,
      [Email.FIELDS.EMAIL]: this.email,
      [Email.FIELDS.CONFIRMED]: this.confirmed,
      [Email.FIELDS.CONFIRMATION_EMAIL_SENT]: this.confirmationEmailSent,
      [Email.FIELDS.CONFIRMATION_URL]: this.confirmationUrl,
      [Email.FIELDS.AMOUNT_SENT]: this.amountSent,
    };
  }
}
