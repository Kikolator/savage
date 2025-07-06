import {jest, describe, it, expect, beforeEach, afterAll} from '@jest/globals';

import {
  getConfig,
  getConfigForEnvironment,
  clearConfigCache,
  isDevelopment,
  isProduction,
  isStaging,
  isTest,
} from '../../../src/core/config/app-config';

describe('App Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    clearConfigCache();
    process.env = {...originalEnv};
  });

  afterAll(() => {
    clearConfigCache();
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return a valid config object', () => {
      const config = getConfig();

      expect(config).toBeDefined();
      expect(config.firebase).toBeDefined();
      expect(config.sendgrid).toBeDefined();
      expect(config.officeRnd).toBeDefined();
      expect(config.typeform).toBeDefined();
      expect(config.cors).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.urls).toBeDefined();
    });

    it('should return the same config instance on multiple calls for same environment', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    it('should have correct default values for development', () => {
      // Clear FIREBASE_PROJECT_ID to test default value
      const originalProjectId = process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_PROJECT_ID;

      const config = getConfigForEnvironment('development');
      expect(config.firebase.projectId).toBe('savage-coworking');
      expect(config.firebase.region).toBe('europe-west1');
      expect(config.cors.allowedOrigins).toContain('http://localhost:3000');
      expect(config.cors.allowedOrigins).toContain('http://localhost:8080');

      // Restore original value
      if (originalProjectId) {
        process.env.FIREBASE_PROJECT_ID = originalProjectId;
      }
    });
  });

  describe('getConfigForEnvironment', () => {
    it('should return test config when environment is test', () => {
      const config = getConfigForEnvironment('test');

      expect(config.environment).toBe('test');
      expect(config.firebase.projectId).toBe('test-project');
      expect(config.cors.allowedOrigins).toEqual(['http://localhost:3000']);
    });

    it('should return production config when environment is production', () => {
      const config = getConfigForEnvironment('production');

      expect(config.environment).toBe('production');
      expect(config.cors.allowedOrigins).toContain(
        'https://savage-coworking.com'
      );
      expect(config.cors.allowedOrigins).toContain(
        'https://*.savage-coworking.com'
      );
    });

    it('should return staging config when environment is staging', () => {
      const config = getConfigForEnvironment('staging');

      expect(config.environment).toBe('staging');
      expect(config.cors.allowedOrigins).toContain('http://localhost:3000');
      expect(config.cors.allowedOrigins).toContain(
        'https://staging.savage-coworking.com'
      );
    });

    it('should return development config when environment is development', () => {
      const config = getConfigForEnvironment('development');

      expect(config.environment).toBe('development');
      expect(config.cors.allowedOrigins).toContain('http://localhost:3000');
      expect(config.cors.allowedOrigins).toContain('http://localhost:8080');
    });
  });

  describe('clearConfigCache', () => {
    it('should clear the config cache', () => {
      const config1 = getConfig();
      clearConfigCache();
      const config2 = getConfig();

      expect(config1).not.toBe(config2);
    });
  });

  describe('Environment helpers', () => {
    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should correctly identify production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isStaging()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should correctly identify staging environment', () => {
      process.env.NODE_ENV = 'staging';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(true);
      expect(isTest()).toBe(false);
    });

    it('should correctly identify test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(false);
      expect(isTest()).toBe(true);
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should handle unknown environment values', () => {
      process.env.NODE_ENV = 'unknown';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(false);
      expect(isTest()).toBe(false);
    });
  });
});
