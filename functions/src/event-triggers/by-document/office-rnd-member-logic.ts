import {logger} from 'firebase-functions/v2';

import {OfficeRndMemberStatus} from '../../core/data/enums';

// Define a simpler interface for the logic functions
export interface OfficeRndMemberData {
  _id: string;
  name: string;
  email: string;
  location: string;
  company: string;
  status: OfficeRndMemberStatus;
  startDate: Date;
  createdAt: Date;
  modifiedAt: Date;
  properties: Record<string, any>;
}

export function handleMemberCreatedLogic(
  member: OfficeRndMemberData,
  log = logger
) {
  if (
    member.status === OfficeRndMemberStatus.ACTIVE ||
    member.status === OfficeRndMemberStatus.DROP_IN
  ) {
    log.info(
      'New member created with active/drop-in status, adding to WhatsApp',
      {
        memberId: member._id,
        memberName: member.name,
        memberEmail: member.email,
        status: member.status,
      }
    );
    // TODO: Implement WhatsApp integration here
    // await this.whatsappService.addMemberToCommunity(member);
    return true;
  }
  return false;
}

export function handleMemberStatusChangedLogic(
  memberBefore: OfficeRndMemberData,
  memberAfter: OfficeRndMemberData,
  log = logger
) {
  // Check if status changed to active or drop-in (from non-active/non-drop-in)
  const shouldAddToWhatsApp =
    (memberAfter.status === OfficeRndMemberStatus.ACTIVE ||
      memberAfter.status === OfficeRndMemberStatus.DROP_IN) &&
    memberBefore.status !== memberAfter.status &&
    memberBefore.status !== OfficeRndMemberStatus.ACTIVE &&
    memberBefore.status !== OfficeRndMemberStatus.DROP_IN;

  if (shouldAddToWhatsApp) {
    log.info('Member status changed to active/drop-in, adding to WhatsApp', {
      memberId: memberAfter._id,
      memberName: memberAfter.name,
      memberEmail: memberAfter.email,
      previousStatus: memberBefore.status,
      newStatus: memberAfter.status,
    });
    // TODO: Implement WhatsApp integration here
    // await this.whatsappService.addMemberToCommunity(memberAfter);
    return 'add';
  }

  // Check if status changed from active/drop-in to something else
  const shouldRemoveFromWhatsApp =
    (memberBefore.status === OfficeRndMemberStatus.ACTIVE ||
      memberBefore.status === OfficeRndMemberStatus.DROP_IN) &&
    memberBefore.status !== memberAfter.status &&
    memberAfter.status !== OfficeRndMemberStatus.ACTIVE &&
    memberAfter.status !== OfficeRndMemberStatus.DROP_IN;

  if (shouldRemoveFromWhatsApp) {
    log.info(
      'Member status changed from active/drop-in, removing from WhatsApp',
      {
        memberId: memberAfter._id,
        memberName: memberAfter.name,
        memberEmail: memberAfter.email,
        previousStatus: memberBefore.status,
        newStatus: memberAfter.status,
      }
    );
    // TODO: Implement WhatsApp removal here
    // await this.whatsappService.removeMemberFromCommunity(memberAfter);
    return 'remove';
  }

  return null;
}
