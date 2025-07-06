import {defineSecret} from 'firebase-functions/params';

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Firebase secrets configuration
 */
export interface FirebaseSecrets {
  sendgridApiKey: ReturnType<typeof defineSecret>;
  typeformSecretKey: ReturnType<typeof defineSecret>;
  officeRndSecretKey: ReturnType<typeof defineSecret>;
  officeRndWebhookSecret: ReturnType<typeof defineSecret>;
  savageSecret: ReturnType<typeof defineSecret>;
}

/**
 * Firebase configuration
 */
export interface FirebaseConfig {
  projectId: string;
  region: string;
  secrets: FirebaseSecrets;
}

/**
 * SendGrid configuration
 */
export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  templates: {
    trialdayConfirmation: string;
    trialdayFollowUp: string;
  };
}

/**
 * OfficeRnd configuration
 */
export interface OfficeRndConfig {
  clientId: string;
  grantType: string;
  scopes: string;
  orgSlug: string;
  apiV2url: string;
  defaultLocationId: string;
  defaultReferralPlanId: string;
}

/**
 * Typeform configuration
 */
export interface TypeformConfig {
  ids: {
    trialDay: string;
  };
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  allowedOrigins: string[];
  credentials: boolean;
  optionsSuccessStatus: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

/**
 * Application configuration
 */
export interface AppConfig {
  environment: Environment;
  firebase: FirebaseConfig;
  sendgrid: SendGridConfig;
  officeRnd: OfficeRndConfig;
  typeform: TypeformConfig;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  urls: {
    googleReview: string;
    website: string;
  };
}

/**
 * Get current environment
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  if (env === 'test') return 'test';
  return 'development';
}

/**
 * Check if current environment is development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if current environment is production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if current environment is staging
 */
export function isStaging(): boolean {
  return getEnvironment() === 'staging';
}

/**
 * Check if current environment is test
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}

/**
 * Firebase secrets
 */
export const firebaseSecrets: FirebaseSecrets = {
  sendgridApiKey: defineSecret('SENDGRID_API_KEY'),
  typeformSecretKey: defineSecret('TYPEFORM_SECRET'),
  officeRndSecretKey: defineSecret('OFFICE_RND_SECRET'),
  officeRndWebhookSecret: defineSecret('OFFICE_RND_WEBHOOK_SECRET'),
  savageSecret: defineSecret('SAVAGE_SECRET'),
};

/**
 * Create configuration for a specific environment
 */
function createConfig(environment: Environment): AppConfig {
  const baseConfig = {
    environment,
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || 'savage-coworking',
      region: 'europe-west1',
      secrets: firebaseSecrets,
    },
    sendgrid: {
      apiKey: firebaseSecrets.sendgridApiKey.value(),
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
    },
    typeform: {
      ids: {
        trialDay: 'iqIU10kN',
      },
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests from this IP, please try again later.',
    },
    urls: {
      googleReview: 'https://g.page/r/CWkHAQxtLGElEBM/review',
      website: 'https://savage-coworking.com',
    },
  };

  // Environment-specific overrides
  switch (environment) {
    case 'test':
      return {
        ...baseConfig,
        firebase: {
          ...baseConfig.firebase,
          projectId: 'test-project',
        },
        cors: {
          allowedOrigins: ['http://localhost:3000'],
          credentials: true,
          optionsSuccessStatus: 200,
        },
      };
    case 'development':
      return {
        ...baseConfig,
        cors: {
          allowedOrigins: ['http://localhost:3000', 'http://localhost:8080'],
          credentials: true,
          optionsSuccessStatus: 200,
        },
      };
    case 'production':
      return {
        ...baseConfig,
        cors: {
          allowedOrigins: [
            'https://savage-coworking.com',
            'https://*.savage-coworking.com',
          ],
          credentials: true,
          optionsSuccessStatus: 200,
        },
      };
    case 'staging':
      return {
        ...baseConfig,
        cors: {
          allowedOrigins: [
            'http://localhost:3000',
            'https://staging.savage-coworking.com',
          ],
          credentials: true,
          optionsSuccessStatus: 200,
        },
      };
    default:
      return {
        ...baseConfig,
        cors: {
          allowedOrigins: [
            'http://localhost:3000',
            'http://localhost:8080',
            'https://savage-coworking.com',
            'https://*.savage-coworking.com',
          ],
          credentials: true,
          optionsSuccessStatus: 200,
        },
      };
  }
}

// Cache for different environments
const configCache = new Map<Environment, AppConfig>();

/**
 * Get configuration for current environment (cached)
 */
export function getConfig(): AppConfig {
  const environment = getEnvironment();

  if (!configCache.has(environment)) {
    configCache.set(environment, createConfig(environment));
  }

  return configCache.get(environment)!;
}

/**
 * Get configuration for a specific environment (for testing)
 */
export function getConfigForEnvironment(environment: Environment): AppConfig {
  // Always create a fresh config for the specified environment
  return createConfig(environment);
}

/**
 * Clear config cache (for testing)
 */
export function clearConfigCache(): void {
  configCache.clear();
}

/**
 * Get Firebase configuration
 */
export function getFirebaseConfig(): FirebaseConfig {
  return getConfig().firebase;
}

/**
 * Get SendGrid configuration
 */
export function getSendGridConfig(): SendGridConfig {
  return getConfig().sendgrid;
}

/**
 * Get OfficeRnd configuration
 */
export function getOfficeRndConfig(): OfficeRndConfig {
  return getConfig().officeRnd;
}

/**
 * Get Typeform configuration
 */
export function getTypeformConfig(): TypeformConfig {
  return getConfig().typeform;
}

/**
 * Get CORS configuration
 */
export function getCorsConfig(): CorsConfig {
  return getConfig().cors;
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitConfig(): RateLimitConfig {
  return getConfig().rateLimit;
}
