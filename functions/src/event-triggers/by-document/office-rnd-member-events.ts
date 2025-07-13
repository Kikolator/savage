import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {logger} from 'firebase-functions/v2';

import {STATIC_CONFIG} from '../../core/config';
import {
  AddEventTrigger,
  EventTriggerV2Function,
  InitializeEventTriggers,
} from '../initialize-event-triggers';
import {AppError, OfficeRndEventError} from '../../core/errors';

import {
  handleMemberCreatedLogic,
  handleMemberStatusChangedLogic,
  type OfficeRndMemberData,
} from './office-rnd-member-logic';

export class OfficeRndMemberEvents implements InitializeEventTriggers {
  initialize(add: AddEventTrigger): void {
    add(this.onMemberCreated);
    add(this.onMemberStatusChanged);
  }

  private readonly onMemberCreated: EventTriggerV2Function = {
    name: 'onOfficeRndMemberCreated',
    handler: onDocumentCreated(
      {
        document: 'officeRndMembers/{memberId}',
        region: STATIC_CONFIG.region,
      },
      async (event) => {
        try {
          const memberData = event.data?.data();

          if (!memberData) {
            return;
          }

          const member = memberData as OfficeRndMemberData;

          // Handle member creation logic
          handleMemberCreatedLogic(member, logger);
        } catch (error) {
          logger.error(
            'OfficeRndMemberEvents.onMemberCreated()- Error in member creation handler',
            {
              memberId: event.params.memberId,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          );

          if (error instanceof AppError) {
            throw error;
          } else {
            throw OfficeRndEventError.memberCreationHandlerFailed(
              event.params.memberId,
              {
                originalError:
                  error instanceof Error ? error.message : 'Unknown error',
              }
            );
          }
        }
      }
    ),
  };

  private readonly onMemberStatusChanged: EventTriggerV2Function = {
    name: 'onOfficeRndMemberStatusChanged',
    handler: onDocumentUpdated(
      {
        document: 'officeRndMembers/{memberId}',
        region: STATIC_CONFIG.region,
      },
      async (event) => {
        try {
          const memberBeforeData = event.data?.before.data();
          const memberAfterData = event.data?.after.data();

          if (!memberBeforeData || !memberAfterData) {
            return;
          }

          const memberBefore = memberBeforeData as OfficeRndMemberData;
          const memberAfter = memberAfterData as OfficeRndMemberData;

          // Handle member status change logic
          handleMemberStatusChangedLogic(memberBefore, memberAfter, logger);
        } catch (error) {
          logger.error(
            'OfficeRndMemberEvents.onMemberStatusChanged()- Error in member status change handler',
            {
              memberId: event.params.memberId,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          );

          if (error instanceof AppError) {
            throw error;
          } else {
            throw OfficeRndEventError.memberStatusChangeHandlerFailed(
              event.params.memberId,
              {
                originalError:
                  error instanceof Error ? error.message : 'Unknown error',
              }
            );
          }
        }
      }
    ),
  };
}
