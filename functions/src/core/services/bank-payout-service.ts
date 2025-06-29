import {logger} from 'firebase-functions/v2';

export class BankPayoutService {
  public async issueTransfer(
    referrerId: string,
    amountEur: number
  ): Promise<void> {
    logger.info('BankPayoutService.issueTransfer: issuing transfer', {
      referrerId,
      amountEur,
    });
    throw new Error('Method not implemented.');
  }
}
