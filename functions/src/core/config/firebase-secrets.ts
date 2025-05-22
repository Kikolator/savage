import { defineSecret } from 'firebase-functions/params';

interface FirebaseSecrets {
  sendgridApiKey: ReturnType<typeof defineSecret>;
  typeformSecretKey: ReturnType<typeof defineSecret>;
  officeRndSecretKey: ReturnType<typeof defineSecret>;
}

export const firebaseSecrets: FirebaseSecrets = {
  sendgridApiKey: defineSecret('SENDGRID_API_KEY'),
  typeformSecretKey: defineSecret('TYPEFORM_SECRET'),
  officeRndSecretKey: defineSecret('OFFICE_RND_SECRET'),
};
