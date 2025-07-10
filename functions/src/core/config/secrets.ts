import {defineSecret} from 'firebase-functions/params';

// Firebase secret definitions
export const SECRETS = {
  sendgridApiKey: defineSecret('SENDGRID_API_KEY'),
  typeformSecretKey: defineSecret('TYPEFORM_SECRET'),
  officeRndSecretKey: defineSecret('OFFICE_RND_SECRET'),
  officeRndWebhookSecret: defineSecret('OFFICE_RND_WEBHOOK_SECRET'),
  savageSecret: defineSecret('SAVAGE_SECRET'),
} as const;

// Secret references for function declarations only
// These should ONLY be used in function declarations, never for accessing values
export const SECRET_REFERENCES = {
  sendgridApiKey: SECRETS.sendgridApiKey,
  typeformSecretKey: SECRETS.typeformSecretKey,
  officeRndSecretKey: SECRETS.officeRndSecretKey,
  officeRndWebhookSecret: SECRETS.officeRndWebhookSecret,
  savageSecret: SECRETS.savageSecret,
} as const;
