import {ReferralFunctions} from './functions/referral-functions';
import {
  getMigrationStatus,
  migrateTrialdayData,
} from './functions/trialday-migration-functions';
import {InitializeCallableFunctions} from './initialize-callable-functions';

const callableFunctionList: Array<InitializeCallableFunctions> = [
  new ReferralFunctions(),
];

export const trialdayMigrationFunctions = {
  migrateTrialdayData,
  getMigrationStatus,
};

export function callableFunctions(): {[key: string]: unknown} {
  const res: {[key: string]: unknown} = {};
  for (const v2 of callableFunctionList) {
    v2.initialize((params) => {
      res[params.name] = params.handler;
    });
  }
  return res;
}
