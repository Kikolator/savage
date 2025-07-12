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
import {OfficeRndMember} from '../../core/data/models';
import {OfficeRndMemberStatus} from '../../core/data/enums';

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
          const memberId = event.params.memberId;
          const memberData = event.data?.data();

          if (!memberData) {
            return;
          }

          const member = memberData as OfficeRndMember;

          // Check if new member has active or drop-in status
          if (
            member.status === OfficeRndMemberStatus.ACTIVE ||
            member.status === OfficeRndMemberStatus.DROP_IN
          ) {
            logger.info(
              'New member created with active/drop-in status, adding to WhatsApp',
              {
                memberId: memberId,
                memberName: member.name,
                memberEmail: member.email,
                status: member.status,
              }
            );

            // TODO: Implement WhatsApp integration here
            // await this.whatsappService.addMemberToCommunity(member);
          }
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
          const memberId = event.params.memberId;
          const memberBeforeData = event.data?.before.data();
          const memberAfterData = event.data?.after.data();

          if (!memberBeforeData || !memberAfterData) {
            return;
          }

          const memberBefore = memberBeforeData as OfficeRndMember;
          const memberAfter = memberAfterData as OfficeRndMember;

          // Check if status changed to active or drop-in
          const shouldAddToWhatsApp =
            (memberAfter.status === OfficeRndMemberStatus.ACTIVE ||
              memberAfter.status === OfficeRndMemberStatus.DROP_IN) &&
            memberBefore.status !== memberAfter.status;

          if (shouldAddToWhatsApp) {
            logger.info(
              'Member status changed to active/drop-in, adding to WhatsApp',
              {
                memberId: memberId,
                memberName: memberAfter.name,
                memberEmail: memberAfter.email,
                previousStatus: memberBefore.status,
                newStatus: memberAfter.status,
              }
            );

            // TODO: Implement WhatsApp integration here
            // await this.whatsappService.addMemberToCommunity(memberAfter);
          }

          // Check if status changed from active/drop-in to something else
          const shouldRemoveFromWhatsApp =
            (memberBefore.status === OfficeRndMemberStatus.ACTIVE ||
              memberBefore.status === OfficeRndMemberStatus.DROP_IN) &&
            memberBefore.status !== memberAfter.status &&
            memberAfter.status !== OfficeRndMemberStatus.ACTIVE &&
            memberAfter.status !== OfficeRndMemberStatus.DROP_IN;

          if (shouldRemoveFromWhatsApp) {
            logger.info(
              'Member status changed from active/drop-in, removing from WhatsApp',
              {
                memberId: memberId,
                memberName: memberAfter.name,
                memberEmail: memberAfter.email,
                previousStatus: memberBefore.status,
                newStatus: memberAfter.status,
              }
            );

            // TODO: Implement WhatsApp removal here
            // await this.whatsappService.removeMemberFromCommunity(memberAfter);
          }
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
