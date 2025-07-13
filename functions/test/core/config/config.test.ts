import {describe, it, expect, beforeEach, afterEach, jest} from '@jest/globals';

import {
  getConfig,
  getRuntimeConfig,
  STATIC_CONFIG,
  SECRET_REFERENCES,
  type AppConfig,
  type RuntimeConfig,
} from '../../../src/core/config';

// Mock the secrets module
jest.mock('../../../src/core/config/secrets', () => ({
  SECRETS: {
    sendgridApiKey: {
      value: jest.fn(() => 'mock-sendgrid-api-key'),
    },
    typeformSecretKey: {
      value: jest.fn(() => 'mock-typeform-secret-key'),
    },
    officeRndSecretKey: {
      value: jest.fn(() => 'mock-office-rnd-secret-key'),
    },
    officeRndWebhookSecret: {
      value: jest.fn(() => 'mock-office-rnd-webhook-secret'),
    },
    savageSecret: {
      value: jest.fn(() => 'mock-savage-secret'),
    },
  },
  SECRET_REFERENCES: {
    sendgridApiKey: {value: jest.fn(() => 'mock-sendgrid-api-key')},
    typeformSecretKey: {value: jest.fn(() => 'mock-typeform-secret-key')},
    officeRndSecretKey: {value: jest.fn(() => 'mock-office-rnd-secret-key')},
    officeRndWebhookSecret: {
      value: jest.fn(() => 'mock-office-rnd-webhook-secret'),
    },
    savageSecret: {value: jest.fn(() => 'mock-savage-secret')},
  },
}));

describe('Configuration System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = {...originalEnv};
    // Set default test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('STATIC_CONFIG', () => {
    it('should have correct structure and values', () => {
      expect(STATIC_CONFIG).toBeDefined();
      expect(STATIC_CONFIG.region).toBe('europe-west1');
      expect(STATIC_CONFIG.projectId).toBe('savage-coworking');
      expect(STATIC_CONFIG.timezone).toBe('UTC');
    });

    it('should have valid CORS configuration', () => {
      expect(STATIC_CONFIG.cors).toBeDefined();
      expect(STATIC_CONFIG.cors.allowedOrigins).toBeInstanceOf(Array);
      expect(STATIC_CONFIG.cors.allowedOrigins).toContain(
        'https://savage-coworking.com'
      );
      expect(STATIC_CONFIG.cors.allowedOrigins).toContain(
        'https://*.savage-coworking.com'
      );
      expect(STATIC_CONFIG.cors.allowedOrigins).toContain(
        'http://localhost:3000'
      );
      expect(STATIC_CONFIG.cors.allowedOrigins).toContain(
        'http://localhost:8080'
      );
      expect(STATIC_CONFIG.cors.credentials).toBe(true);
      expect(STATIC_CONFIG.cors.optionsSuccessStatus).toBe(200);
    });

    it('should have valid rate limit configuration', () => {
      expect(STATIC_CONFIG.rateLimit).toBeDefined();
      expect(STATIC_CONFIG.rateLimit.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(STATIC_CONFIG.rateLimit.maxRequests).toBe(100);
      expect(typeof STATIC_CONFIG.rateLimit.message).toBe('string');
    });

    it('should have valid URLs configuration', () => {
      expect(STATIC_CONFIG.urls).toBeDefined();
      expect(STATIC_CONFIG.urls.googleReview).toBe(
        'https://g.page/r/CWkHAQxtLGElEBM/review'
      );
      expect(STATIC_CONFIG.urls.website).toBe('https://savage-coworking.com');
    });

    it('should have valid Typeform configuration', () => {
      expect(STATIC_CONFIG.typeform).toBeDefined();
      expect(STATIC_CONFIG.typeform.ids).toBeDefined();
      expect(STATIC_CONFIG.typeform.ids.trialDay).toBe('iqIU10kN');
    });

    it('should have correct structure types', () => {
      expect(typeof STATIC_CONFIG.region).toBe('string');
      expect(typeof STATIC_CONFIG.projectId).toBe('string');
      expect(typeof STATIC_CONFIG.timezone).toBe('string');
      expect(Array.isArray(STATIC_CONFIG.cors.allowedOrigins)).toBe(true);
      expect(typeof STATIC_CONFIG.rateLimit.windowMs).toBe('number');
      expect(typeof STATIC_CONFIG.rateLimit.maxRequests).toBe('number');
      expect(typeof STATIC_CONFIG.rateLimit.message).toBe('string');
    });
  });

  describe('SECRET_REFERENCES', () => {
    it('should have all required secret references', () => {
      expect(SECRET_REFERENCES).toBeDefined();
      expect(SECRET_REFERENCES.sendgridApiKey).toBeDefined();
      expect(SECRET_REFERENCES.typeformSecretKey).toBeDefined();
      expect(SECRET_REFERENCES.officeRndSecretKey).toBeDefined();
      expect(SECRET_REFERENCES.officeRndWebhookSecret).toBeDefined();
      expect(SECRET_REFERENCES.savageSecret).toBeDefined();
    });

    it('should have value methods for all secrets', () => {
      expect(typeof SECRET_REFERENCES.sendgridApiKey.value).toBe('function');
      expect(typeof SECRET_REFERENCES.typeformSecretKey.value).toBe('function');
      expect(typeof SECRET_REFERENCES.officeRndSecretKey.value).toBe(
        'function'
      );
      expect(typeof SECRET_REFERENCES.officeRndWebhookSecret.value).toBe(
        'function'
      );
      expect(typeof SECRET_REFERENCES.savageSecret.value).toBe('function');
    });
  });

  describe('getRuntimeConfig', () => {
    it('should return a valid RuntimeConfig object', () => {
      const config = getRuntimeConfig();

      expect(config).toBeDefined();
      expect(config.environment).toBe('test');
      expect(config.sendgrid).toBeDefined();
      expect(config.officeRnd).toBeDefined();
      expect(config.typeform).toBeDefined();
      expect(config.savage).toBeDefined();
    });

    it('should handle different environment values', () => {
      const environments = [
        'development',
        'staging',
        'production',
        'test',
      ] as const;

      environments.forEach((env) => {
        process.env.NODE_ENV = env;
        const config = getRuntimeConfig();
        expect(config.environment).toBe(env);
      });
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const config = getRuntimeConfig();
      expect(config.environment).toBe('development');
    });

    it('should accept any environment value from NODE_ENV', () => {
      process.env.NODE_ENV = 'unknown';
      const config = getRuntimeConfig();
      expect(config.environment).toBe('unknown');
    });

    describe('SendGrid configuration', () => {
      it('should have correct SendGrid structure', () => {
        const config = getRuntimeConfig();

        expect(config.sendgrid.apiKey).toBe('mock-sendgrid-api-key');
        expect(config.sendgrid.fromEmail).toBe('noreply@savage-coworking.com');
        expect(config.sendgrid.templates).toBeDefined();
        expect(config.sendgrid.templates.trialdayConfirmation).toBe(
          'd-25105204bd734ff49bcfb6dbd3ce4deb'
        );
        expect(config.sendgrid.templates.trialdayFollowUp).toBe(
          'd-9ec3822395524358888396e6ae56d260'
        );
      });
    });

    describe('OfficeRnd configuration', () => {
      it('should have correct OfficeRnd structure', () => {
        const config = getRuntimeConfig();

        expect(config.officeRnd.clientId).toBe('ijlB4RjrVR0nYx9U');
        expect(config.officeRnd.grantType).toBe('client_credentials');
        expect(config.officeRnd.orgSlug).toBe('savage-coworking');
        expect(config.officeRnd.apiV2url).toBe(
          'https://app.officernd.com/api/v2/organizations'
        );
        expect(config.officeRnd.defaultLocationId).toBe(
          '5d1bcda0dbd6e40010479eec'
        );
        expect(config.officeRnd.defaultReferralPlanId).toBe(
          '68544dc51579c137fb109286'
        );
        expect(config.officeRnd.secretKey).toBe('mock-office-rnd-secret-key');
        expect(config.officeRnd.webhookSecret).toBe(
          'mock-office-rnd-webhook-secret'
        );
      });

      it('should have valid scopes', () => {
        const scopes = getRuntimeConfig().officeRnd.scopes;

        expect(typeof scopes).toBe('string');
        expect(scopes).toContain('officernd.api.read');
        expect(scopes).toContain('officernd.api.write');
        expect(scopes).toContain('flex.billing.payments.create');
        expect(scopes).toContain('flex.community.members.read');
        expect(scopes).toContain('flex.community.members.create');
        expect(scopes).toContain('flex.community.members.update');
        expect(scopes).toContain('flex.community.companies.read');
        expect(scopes).toContain('flex.community.companies.create');
        expect(scopes).toContain('flex.community.companies.update');
        expect(scopes).toContain('flex.community.opportunities.read');
        expect(scopes).toContain('flex.community.opportunities.create');
        expect(scopes).toContain('flex.community.opportunities.update');
        expect(scopes).toContain('flex.community.opportunityStatuses.read');
        expect(scopes).toContain('flex.space.locations.read');
      });
    });

    describe('Typeform configuration', () => {
      it('should have correct Typeform structure', () => {
        const config = getRuntimeConfig();

        expect(config.typeform.secretKey).toBe('mock-typeform-secret-key');
      });
    });

    describe('Savage configuration', () => {
      it('should have correct Savage structure', () => {
        const config = getRuntimeConfig();

        expect(config.savage.secret).toBe('mock-savage-secret');
      });
    });
  });

  describe('getConfig', () => {
    it('should return a valid AppConfig object', () => {
      const config = getConfig();

      expect(config).toBeDefined();
      expect(config.static).toBe(STATIC_CONFIG);
      expect(config.runtime).toBeDefined();
      expect(config.runtime.environment).toBe('test');
    });

    it('should return the same static config reference', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1.static).toBe(config2.static);
      expect(config1.static).toBe(STATIC_CONFIG);
    });

    it('should return fresh runtime config on each call', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      // Runtime config should be fresh each time (not cached)
      expect(config1.runtime).not.toBe(config2.runtime);
    });

    it('should have correct TypeScript types', () => {
      const config: AppConfig = getConfig();
      const runtimeConfig: RuntimeConfig = config.runtime;

      expect(config.static).toBeDefined();
      expect(runtimeConfig.environment).toBeDefined();
      expect(typeof runtimeConfig.environment).toBe('string');
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct environment types', () => {
      // These should be valid
      const validEnvironments: RuntimeConfig['environment'][] = [
        'development',
        'staging',
        'production',
        'test',
      ];

      validEnvironments.forEach((env) => {
        expect(validEnvironments).toContain(env);
      });
    });

    it('should have proper nested object types', () => {
      const config = getRuntimeConfig();

      // Test SendGrid types
      expect(typeof config.sendgrid.apiKey).toBe('string');
      expect(typeof config.sendgrid.fromEmail).toBe('string');
      expect(typeof config.sendgrid.templates.trialdayConfirmation).toBe(
        'string'
      );
      expect(typeof config.sendgrid.templates.trialdayFollowUp).toBe('string');

      // Test OfficeRnd types
      expect(typeof config.officeRnd.clientId).toBe('string');
      expect(typeof config.officeRnd.grantType).toBe('string');
      expect(typeof config.officeRnd.scopes).toBe('string');
      expect(typeof config.officeRnd.orgSlug).toBe('string');
      expect(typeof config.officeRnd.apiV2url).toBe('string');
      expect(typeof config.officeRnd.defaultLocationId).toBe('string');
      expect(typeof config.officeRnd.defaultReferralPlanId).toBe('string');
      expect(typeof config.officeRnd.secretKey).toBe('string');
      expect(typeof config.officeRnd.webhookSecret).toBe('string');

      // Test Typeform types
      expect(typeof config.typeform.secretKey).toBe('string');

      // Test Savage types
      expect(typeof config.savage.secret).toBe('string');
    });
  });

  describe('Integration Tests', () => {
    it('should work correctly with environment changes', () => {
      // Test development environment
      process.env.NODE_ENV = 'development';
      let config = getConfig();
      expect(config.runtime.environment).toBe('development');

      // Test production environment
      process.env.NODE_ENV = 'production';
      config = getConfig();
      expect(config.runtime.environment).toBe('production');

      // Test staging environment
      process.env.NODE_ENV = 'staging';
      config = getConfig();
      expect(config.runtime.environment).toBe('staging');
    });

    it('should maintain static config consistency across environments', () => {
      const environments = ['development', 'staging', 'production', 'test'];

      environments.forEach((env) => {
        process.env.NODE_ENV = env;
        const config = getConfig();

        // Static config should remain the same regardless of environment
        expect(config.static.region).toBe('europe-west1');
        expect(config.static.projectId).toBe('savage-coworking');
        expect(config.static.timezone).toBe('UTC');
        expect(config.static.cors.allowedOrigins).toContain(
          'https://savage-coworking.com'
        );
      });
    });
  });
});
