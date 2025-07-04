/**
 * Example usage of the DI container
 * This file demonstrates how to use the ServiceResolver in different scenarios
 */

import {ServiceResolver} from './service-resolver';

// Example 1: Using services in a controller
export class ExampleController {
  async handleRequest() {
    // Get services with proper TypeScript types
    const trialdayService = ServiceResolver.getTrialdayService();
    const emailService = ServiceResolver.getEmailConfirmationService();

    // Use the services (example methods - adjust based on actual service methods)
    // const result = await trialdayService.getTrialday('some-id');
    // await emailService.sendConfirmationEmail('user@example.com');

    return {message: 'Example controller'};
  }
}

// Example 2: Using services in a callable function
export const exampleCallableFunction = async (data: any) => {
  const referralService = ServiceResolver.getReferralService();
  const firestoreService = ServiceResolver.getFirestoreService();

  // Create a referral code
  const referralCode = await referralService.createReferralCode({
    referrerId: data.memberId,
    referrerCompanyId: data.companyId,
    referrerType: 'MEMBER' as any,
  });

  // Store some data
  await firestoreService.setDocument({
    collection: 'example',
    documentId: 'test',
    data: {referralCode},
  });

  return referralCode;
};

// Example 3: Using services in a scheduled function
export const exampleScheduledFunction = async () => {
  const officeRndService = ServiceResolver.getOfficeRndService();
  const sendgridService = ServiceResolver.getSendgridService();

  // Get data from OfficeRnd
  const companies = await officeRndService.getAllCompaniesFromAPI();

  // Send email notification
  await sendgridService.mailSend({
    to: 'admin@example.com',
    from: 'noreply@example.com',
    subject: 'Daily Report',
    text: `Found ${companies.length} companies`,
  });
};

// Example 4: Using services in an event trigger
export const exampleEventTrigger = async (change: any) => {
  const trialdayService = ServiceResolver.getTrialdayService();
  const rewardService = ServiceResolver.getRewardService();

  // Process the change (example methods - adjust based on actual service methods)
  if (change.after.data().status === 'completed') {
    // await trialdayService.confirm(change.after.data());
    // await rewardService.processDueRewards();
  }
};
