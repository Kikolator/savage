import { onSchedule } from "firebase-functions/scheduler";
import { mainConfig } from "../../core/config/main-config";
import { AddScheduledEvent, InitializeScheduledEvents, ScheduledV2Function } from "../initialize-scheduled-events";
import { logger } from "firebase-functions";
import { isDevelopment } from "../../core/utils/environment";
import { FirestoreService } from "../../core/services/firestore-service";
import { RewardService } from "../../core/services/reward-service";
import { BankPayoutService } from "../../core/services/bank-payout-service";
import OfficeRndService from "../../core/services/office-rnd-service";

export class RewardScheduledEvents implements InitializeScheduledEvents {
    initialize(add: AddScheduledEvent): void {
        add(this.processDueRewards);
    }

    private readonly processDueRewards: ScheduledV2Function = {
        name: 'processDueRewards',
        handler: onSchedule(
            {
                region: mainConfig.cloudFunctionsLocation,
                schedule: 'Every day',
            }, async () => {
                try {
                    const rewardsService = new RewardService(
                        FirestoreService.getInstance(),
                        new OfficeRndService(
                            {
                                firestoreService: FirestoreService.getInstance(),
                            }
                        ),
                        new BankPayoutService(),
                    );

                    await rewardsService.processDueRewards();
                    return;
                } catch (error) {
                    logger.error('RewardScheduledEvents.processDueRewards()- Error processing due rewards', error);
                    // add error to firestore if not in debug mode
                    if (!isDevelopment()) {
                        if (error instanceof Error) {
                            const firestoreService = FirestoreService.getInstance();
                            await firestoreService.createDocument({
                                collection: 'errors',
                                data: {
                                    name: 'RewardScheduledEvents.processDueRewards',
                                    error: error.message,
                                    timestamp: new Date(),
                                },
                            });
                            return;
                        }
                    } else {
                        logger.debug('RewardScheduledEvents.processDueRewards()- In development mode, the error will not be logged in Firestore');
                    }
                }
            }
        )
    }
}