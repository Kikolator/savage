import { defineSecret } from "firebase-functions/params";

interface FirebaseSecrets {
    sendgridApiKey: ReturnType<typeof defineSecret>;
  }

export const firebaseSecrets: FirebaseSecrets = {
    sendgridApiKey: defineSecret('SENDGRID_API_KEY'),
  };