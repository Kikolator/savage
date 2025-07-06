import {jest, describe, it, expect, beforeEach, afterAll} from '@jest/globals';

import {
  getConfig,
  isDevelopment,
  isProduction,
  isStaging,
} from '../../../src/core/config/app-config';

describe('App Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {...originalEnv};
    // Clear any cached config
    jest.clearAllMocks();
  });

  afterAll(() => {
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

    it('should return the same config instance on multiple calls', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    it('should have correct default values', () => {
      const config = getConfig();

      expect(config.firebase.projectId).toBe('savage-coworking');
      expect(config.firebase.region).toBe('europe-west1');
      expect(config.cors.allowedOrigins).toContain('http://localhost:3000');
      expect(config.cors.allowedOrigins).toContain(
        'https://savage-coworking.com'
      );
    });
  });

  describe('Environment helpers', () => {
    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(false);
    });

    it('should correctly identify production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isStaging()).toBe(false);
    });

    it('should correctly identify staging environment', () => {
      process.env.NODE_ENV = 'staging';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(true);
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(false);
    });

    it('should handle unknown environment values', () => {
      process.env.NODE_ENV = 'unknown';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isStaging()).toBe(false);
    });
  });
});
