import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {logger} from 'firebase-functions/v2';

import {mainConfig} from '../../core/config/main-config';
import {
  AddEventTrigger,
  EventTriggerV2Function,
  InitializeEventTriggers,
} from '../initialize-event-triggers';
import {AppError} from '../../core/errors/app-error';
import {TrialdayService} from '../../core/services/trialday-service';
import {TrialdayEventError} from '../../core/errors';
import {Trialday} from '../../core/data/models';
import {TrialdayStatus} from '../../core/data/enums';
import {ReferralService} from '../../core/services/referral-service';
import OfficeRndService from '../../core/services/office-rnd-service';
import {firebaseSecrets} from '../../core/config/firebase-secrets';

export class TrialdayEvents implements InitializeEventTriggers {
  constructor(
    private readonly trialdayService: TrialdayService,
    private readonly referralService: ReferralService,
    private readonly officeRndService: OfficeRndService
  ) {}
  initialize(add: AddEventTrigger): void {
    add(this.onChanged);
  }

  private readonly onChanged: EventTriggerV2Function = {
    name: 'onTrialdayChanged',
    handler: onDocumentUpdated(
      {
        document: `${TrialdayService.trialDaysCollection}/{trialdayId}`,
        region: mainConfig.cloudFunctionsLocation,
        secrets: [firebaseSecrets.sendgridApiKey],
      },
      async (event) => {
        try {
          const trialdayId = event.params.trialdayId;
          const trialdayBeforeData = event.data?.before.data();
          let trialdayBefore: Trialday | null = null;
          if (trialdayBeforeData) {
            trialdayBefore = Trialday.fromDocumentData(
              trialdayId,
              trialdayBeforeData
            );
          }
          const trialdayAfterData = event.data?.after.data();
          let trialdayAfter: Trialday | null = null;
          if (trialdayAfterData) {
            trialdayAfter = Trialday.fromDocumentData(
              trialdayId,
              trialdayAfterData
            );
          }
          if (trialdayBefore === null || trialdayAfter === null) {
            return;
          }
          // If status has changed.
          if (trialdayBefore.status !== trialdayAfter.status) {
            logger.info('trialday status changed', {
              trialdayId: trialdayId,
              trialdayBeforeStatus: trialdayBefore.status,
              trialdayAfterStatus: trialdayAfter.status,
            });
            switch (trialdayAfter.status) {
              case TrialdayStatus.EMAIL_CONFIRMED: {
                // Send confirmation email
                await this.trialdayService.sendConfirmationEmail(trialdayAfter);
                // Add opportunity to Office Rnd
                const {member, opportunity} =
                  await this.trialdayService.addToOfficeRnd(trialdayAfter);
                // Add opportunity and member ids to trialday doc.
                await this.trialdayService.addOpportunityAndMemberIdsToTrialday(
                  trialdayId,
                  member._id,
                  opportunity._id
                );
                // Create referral if exists
                if (trialdayAfter.referralCode) {
                  await this.referralService.createReferral({
                    referralCode: trialdayAfter.referralCode,
                    referredUserId: member._id,
                    referrerCompanyId: member.company || null,
                    isTrialday: true,
                    trialdayStartDate: trialdayAfter.trialDateTime,
                    trialDayId: trialdayId,
                    opportunityId: opportunity._id,
                  });
                }
                break;
              }
              case TrialdayStatus.COMPLETED:
                // Set member custom field trialCompleted to true.
                if (trialdayAfter.memberId) {
                  await this.officeRndService.updateMember(
                    trialdayAfter.memberId,
                    {trialdayCompleted: true}
                  );
                }
                // send a follow up email to the member.
                await this.trialdayService.sendFollowUpEmail(trialdayAfter);
                // TODO Send email to referrer if applicable.
                break;
              case TrialdayStatus.CANCELLED_BY_OFFICE:
                // Send office cancellation email
                break;
              case TrialdayStatus.CANCELLED_BY_USER:
                // Send user cancellation email
                break;
            }
          }
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          } else {
            throw new TrialdayEventError(
              'Error on trial day firestore event function.',
              'onTrialdayChanged',
              {
                error: error instanceof Error ? error.toString() : 'unknown',
              }
            );
          }
        }
      }
    ),
  };
}
