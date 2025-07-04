import {FirestoreService} from '../services/firestore-service';
import {SendgridService} from '../services/sendgrid-service';
import {TrialdayService} from '../services/trialday-service';
import {EmailConfirmationService} from '../services/email-confirmation-service';
import OfficeRndService from '../services/office-rnd-service';
import {ReferralService} from '../services/referral-service';
import {RewardService} from '../services/reward-service';
import {BankPayoutService} from '../services/bank-payout-service';
import {TrialdayMigrationService} from '../services/trialday-migration-service';

import {container, ServiceKeys} from './container';

/**
 * Type-safe service resolver with proper TypeScript types
 */
export class ServiceResolver {
  /**
   * Resolve FirestoreService
   */
  static getFirestoreService(): FirestoreService {
    return container.resolve(ServiceKeys.FIRESTORE);
  }

  /**
   * Resolve SendgridService
   */
  static getSendgridService(): SendgridService {
    return container.resolve(ServiceKeys.SENDGRID);
  }

  /**
   * Resolve TrialdayService
   */
  static getTrialdayService(): TrialdayService {
    return container.resolve(ServiceKeys.TRIALDAY);
  }

  /**
   * Resolve EmailConfirmationService
   */
  static getEmailConfirmationService(): EmailConfirmationService {
    return container.resolve(ServiceKeys.EMAIL_CONFIRMATION);
  }

  /**
   * Resolve OfficeRndService
   */
  static getOfficeRndService(): OfficeRndService {
    return container.resolve(ServiceKeys.OFFICE_RND);
  }

  /**
   * Resolve ReferralService
   */
  static getReferralService(): ReferralService {
    return container.resolve(ServiceKeys.REFERRAL);
  }

  /**
   * Resolve RewardService
   */
  static getRewardService(): RewardService {
    return container.resolve(ServiceKeys.REWARD);
  }

  /**
   * Resolve BankPayoutService
   */
  static getBankPayoutService(): BankPayoutService {
    return container.resolve(ServiceKeys.BANK_PAYOUT);
  }

  /**
   * Resolve TrialdayMigrationService
   */
  static getTrialdayMigrationService(): TrialdayMigrationService {
    return container.resolve(ServiceKeys.TRIALDAY_MIGRATION);
  }
}
