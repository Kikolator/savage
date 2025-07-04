import {logger} from 'firebase-functions';

import {FirestoreService} from '../services/firestore-service';
import {SendgridService} from '../services/sendgrid-service';
import {TrialdayService} from '../services/trialday-service';
import {EmailConfirmationService} from '../services/email-confirmation-service';
import OfficeRndService from '../services/office-rnd-service';
import {ReferralService} from '../services/referral-service';
import {RewardService} from '../services/reward-service';
import {BankPayoutService} from '../services/bank-payout-service';
import {TrialdayMigrationService} from '../services/trialday-migration-service';

export interface ServiceContainer {
  resolve<T>(key: string): T;
  register<T>(key: string, factory: () => T): void;
  has(key: string): boolean;
}

// Type-safe service resolution
export interface TypedServiceContainer {
  resolve<T>(key: ServiceKey): T;
  register<T>(key: ServiceKey, factory: () => T): void;
  has(key: ServiceKey): boolean;
}

export class DIContainer implements ServiceContainer, TypedServiceContainer {
  private services = new Map<string, () => any>();
  private singletons = new Map<string, any>();

  /**
   * Register a service factory function
   * @param key - Service identifier
   * @param factory - Factory function that creates the service
   */
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  /**
   * Register a singleton service factory function
   * @param key - Service identifier
   * @param factory - Factory function that creates the service (will only be called once)
   */
  registerSingleton<T>(key: string, factory: () => T): void {
    this.services.set(key, () => {
      if (!this.singletons.has(key)) {
        this.singletons.set(key, factory());
      }
      return this.singletons.get(key);
    });
  }

  /**
   * Resolve a service by key
   * @param key - Service identifier
   * @returns The resolved service instance
   */
  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service '${key}' not registered in DI container`);
    }
    return factory();
  }

  /**
   * Check if a service is registered
   * @param key - Service identifier
   * @returns True if service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all registered services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}

/**
 * Global DI container instance
 */
export const container = new DIContainer();

/**
 * Initialize the DI container with all services
 */
export function initializeContainer(): void {
  logger.info('Initializing DI container');

  // Register shared services as singletons
  container.registerSingleton('firestore', () =>
    FirestoreService.getInstance()
  );
  container.registerSingleton('sendgrid', () => SendgridService.getInstance());

  // Register business services
  container.register(
    'officeRnd',
    () =>
      new OfficeRndService({
        firestoreService: container.resolve('firestore'),
      })
  );

  container.register(
    'emailConfirmation',
    () =>
      new EmailConfirmationService({
        firestoreService: container.resolve('firestore'),
        sendgridService: container.resolve('sendgrid'),
      })
  );

  container.register('bankPayout', () => new BankPayoutService());

  container.register(
    'reward',
    () =>
      new RewardService(
        container.resolve('firestore'),
        container.resolve('officeRnd'),
        container.resolve('bankPayout')
      )
  );

  container.register(
    'referral',
    () =>
      new ReferralService({
        firestoreService: container.resolve('firestore'),
        officeRndService: container.resolve('officeRnd'),
        rewardService: container.resolve('reward'),
      })
  );

  container.register(
    'trialday',
    () =>
      new TrialdayService({
        firestoreService: container.resolve('firestore'),
        sendgridService: container.resolve('sendgrid'),
        emailConfirmationService: container.resolve('emailConfirmation'),
        officeRndService: container.resolve('officeRnd'),
      })
  );

  container.register(
    'trialdayMigration',
    () =>
      new TrialdayMigrationService(
        container.resolve('trialday'),
        container.resolve('firestore'),
        container.resolve('officeRnd')
      )
  );

  logger.info('DI container initialized successfully');
}

/**
 * Service keys for type safety
 */
export const ServiceKeys = {
  FIRESTORE: 'firestore',
  SENDGRID: 'sendgrid',
  OFFICE_RND: 'officeRnd',
  EMAIL_CONFIRMATION: 'emailConfirmation',
  BANK_PAYOUT: 'bankPayout',
  REWARD: 'reward',
  REFERRAL: 'referral',
  TRIALDAY: 'trialday',
  TRIALDAY_MIGRATION: 'trialdayMigration',
} as const;

export type ServiceKey = (typeof ServiceKeys)[keyof typeof ServiceKeys];
