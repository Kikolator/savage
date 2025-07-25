import {SECRETS} from './secrets';

export interface RuntimeConfig {
  environment: 'development' | 'staging' | 'production' | 'test';
  sendgrid: {
    apiKey: string;
    fromEmail: string;
    templates: {
      trialdayConfirmation: string;
      trialdayFollowUp: string;
    };
  };
  officeRnd: {
    clientId: string;
    grantType: string;
    scopes: string;
    orgSlug: string;
    apiV2url: string;
    defaultLocationId: string;
    defaultReferralPlanId: string;
    secretKey: string;
    webhookSecret: string;
  };
  typeform: {
    secretKey: string;
  };
  savage: {
    secret: string;
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  const environment = process.env.NODE_ENV || 'development';

  return {
    environment: environment as RuntimeConfig['environment'],
    sendgrid: {
      apiKey: getSecretValue(SECRETS.sendgridApiKey, 'SENDGRID_API_KEY'),
      fromEmail: 'noreply@savage-coworking.com',
      templates: {
        trialdayConfirmation: 'd-25105204bd734ff49bcfb6dbd3ce4deb',
        trialdayFollowUp: 'd-9ec3822395524358888396e6ae56d260',
      },
    },
    officeRnd: {
      clientId: 'ijlB4RjrVR0nYx9U',
      grantType: 'client_credentials',
      scopes:
        'officernd.api.read officernd.api.write flex.billing.payments.create flex.community.members.read flex.community.members.create flex.community.members.update flex.community.companies.read flex.community.companies.create flex.community.companies.update flex.community.opportunities.read flex.community.opportunities.create flex.community.opportunities.update flex.community.opportunityStatuses.read flex.space.locations.read',
      orgSlug: 'savage-coworking',
      apiV2url: 'https://app.officernd.com/api/v2/organizations',
      defaultLocationId: '5d1bcda0dbd6e40010479eec',
      defaultReferralPlanId: '68544dc51579c137fb109286',
      secretKey: getSecretValue(
        SECRETS.officeRndSecretKey,
        'OFFICE_RND_SECRET'
      ),
      webhookSecret: getSecretValue(
        SECRETS.officeRndWebhookSecret,
        'OFFICE_RND_WEBHOOK_SECRET'
      ),
    },
    typeform: {
      secretKey: getSecretValue(SECRETS.typeformSecretKey, 'TYPEFORM_SECRET'),
    },
    savage: {
      secret: getSecretValue(SECRETS.savageSecret, 'SAVAGE_SECRET'),
    },
  };
}

/**
 * Safely get secret value, providing fallback for development/emulator environments
 */
function getSecretValue(secret: any, secretName: string): string {
  try {
    return secret.value();
  } catch (error) {
    // In development/emulator environments, provide fallback values
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.FUNCTIONS_EMULATOR
    ) {
      console.warn(
        `Warning: Using fallback value for secret ${secretName} in development/emulator mode`
      );
      return `mock-${secretName.toLowerCase()}`;
    }
    // In production, re-throw the error
    throw error;
  }
}
