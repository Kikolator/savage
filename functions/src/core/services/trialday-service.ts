import { logger } from 'firebase-functions';
import {
  OfficeRndMember,
  OfficeRndNewMember,
  OfficeRndOpportunity,
  OfficeRndOpportunityUpdate,
  TrialDayFormData,
} from '../data/models';
import { format, parse } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import OfficeRndService from './office-rnd-service';
import { SendgridService } from './sendgrid-service';
import GoogleCalService from './google-cal-service';
import { OfficeRndMemberStatus } from '../data/enums';
import { AppError, ErrorCode } from '../errors/app-error';
import { officeRndConfig } from '../config/office-rnd-config';
import { MailDataRequired } from '@sendgrid/mail';

export class TrialdayService {
  // Inject dependancies
  constructor(
    private readonly params: {
      sendgridService: SendgridService,
      calendarService: GoogleCalService,
      officeService: OfficeRndService,
    }
  ) { }

  async handleTrialdayRequest(formData: TrialDayFormData): Promise<void> {
    logger.info('TrialdayService.handleTrialdayRequest()- handling trialday request', {
      eventId: formData.eventId,
    });
    // 1. Set DateTime to UTC
    // Set timezone and parse start date time
    const dateTimeString = `${formData.preferredDate} ${formData.preferredTime}`;
    logger.debug('dateTimeString', dateTimeString);

    // Parse the date string into a Date object
    // Standard Date is UTC as set in index: porcess.env.TZ.
    // Input date string is in Europe/Madrid (for now)
    const inputStartDate = parse(dateTimeString, 'yyyy-MM-dd HH:mm', new Date());
    logger.debug('input start date', inputStartDate);

    // Convert input to utc timezone
    const serverStartDate = fromZonedTime(inputStartDate, 'Europe/Madrid');
    logger.debug('server start date', serverStartDate);

    // TODO handle if timezone is provided in future versions.
    if (formData.timezone) {
      logger.warn('TrialdayService.handleTrialdayRequest()- timezone provided, but not used', {
        timezone: formData.timezone,
      });
    }

    // Set end time to 18:00 Madrid time on the same day
    // Madrid time will automatically handle DST transitions
    const madridEndDate = parse(
      `${formData.preferredDate}T18:00`,
      'yyyy-MM-dd\'T\'HH:mm',
      new Date()
    );
    logger.debug('madridEndTime', madridEndDate);
    const serverEndDate = fromZonedTime(madridEndDate, 'Europe/Madrid');

    logger.debug('TrialdayService.handleTrialdayRequest()- times', {
      localStartDate: inputStartDate,
      serverStartDate: serverStartDate,
      madridEndDate: madridEndDate,
      serverEndDate: serverEndDate,
    });


    // 2. Check if email is already a member
    const members: Array<OfficeRndMember> =
      await this.params.officeService.getMembersByEmail(formData.email);
    let member: OfficeRndMember;
    // Check only one member exists, and that member can book a trial day.
    let memberExists = false;
    if (members.length == 1) {
      member = members[0];
      memberExists = true;
      // Check member status.
      if (
        member.status !== OfficeRndMemberStatus.CONTACT &&
        member.status !== OfficeRndMemberStatus.LEAD
      ) {
        // If member status is nor contact nor lead, send email to user he
        // cannot book a trial day.
        throw new AppError(
          'TrialdayService.handleTrialdayRequest()- Membership status does not allow to book a trial day.',
          ErrorCode.TRIALDAY_MEMBER_NOT_ALLOWED,
          403,
          {
            memberEmail: formData.email,
            memberStatus: member.status,
          }
        );
      } else if (
        member.status === OfficeRndMemberStatus.LEAD &&
        member.properties.trialdayCompleted
      ) {
        // if member status is lead, and completed trial day, user cannot
        // book trial.
        throw new AppError(
          'TrialdayService.handleTrialdayRequest()- Member has already completed a trial day.',
          ErrorCode.TRIALDAY_ALREADY_COMPLETED,
          403,
          { memberEmail: formData.email },
        );
      }
    } else if (members.length == 0) {
      const now = new Date();
      const newMember: OfficeRndNewMember = {
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        location: officeRndConfig.defaultLocationId,
        startDate: now,
        description: '',
        properties: {
          trialdayCompleted: false,
          phoneNumber: formData.phoneNumber,
          interest: formData.interest,
          reason: formData.reason,
        },
      };
      // Create new member.
      member = await this.params.officeService.createMember(newMember);
    } else {
      // If more than one member exists with same email, throw error.
      throw new AppError(
        'TrialdayService.handleTrialdayRequest()- More than one member exists for email.',
        ErrorCode.OFFICE_RND_MULTIPLE_MEMBERS_FOUND,
        404,
        { memberEmail: formData.email },
      );
      // TODO handle multiple office rnd accounts with same email error.
    }

    // 3. Add Opportunity to member.
    // get the opportunity statuses.
    const trialRequestStatus = await this
      .params
      .officeService
      .getOpportunityStatuses();
    // get the trial request status id.
    const trialRequestStatusId = trialRequestStatus.find(
      (status) => status._id === '682200cd47119167b0c24e9a'
    )?._id;
    if (!trialRequestStatusId) {
      throw new AppError(
        'TrialdayService.handleTrialdayRequest()- Trial Request status not found.',
        ErrorCode.TRIALDAY_STATUS_NOT_FOUND,
        404,
        { memberEmail: formData.email },
      );
    }
    // TODO handle opportunites for members. Do we update or create?
    // When we update we cannot change the probability?


    // If member exists, check if oportunity exists to update.
    if (memberExists) {
      const opportunities: Array<OfficeRndOpportunity> = await this
        .params.officeService.getOpportunities({
          member: member._id,
        });
      if (opportunities.length > 0) {
        // opportunities already exist, update to Trial Request status.
        // TODO in the future we might have multiple opportinities for a member.
        // We need to update the correct one.
        // For now we just take the first one.
        // update the opportunity.
        const opportunityUpdate: OfficeRndOpportunityUpdate = {
          name: `${formData.firstName} ${formData.lastName} - TRIAL DAY`,
          status: trialRequestStatusId,
          properties: {
            trialdayDate: serverStartDate,
            interestedIn: formData.interest,
            reason: formData.reason,
          },
        };
        if (!opportunities[0]._id) {
          throw new AppError(
            'TrialdayService.handleTrialdayRequest()- Opportunity id not found.',
            ErrorCode.UNKNOWN_ERROR,
            404,
            { memberEmail: formData.email },
          );
        }
        await this
          .params
          .officeService
          .updateOpportunity(
            opportunities[0]._id,
            opportunityUpdate);
      } else {
        // existing member does not have an ooportunity, create a new one.
        // TODO add requested plans.
        await this.params.officeService.createOpportunity({
          name: `${formData.firstName} ${formData.lastName} - TRIAL DAY`,
          member: member._id,
          status: trialRequestStatusId,
          startDate: serverStartDate,
          properties: {
            trialdayDate: serverStartDate,
            interestedIn: formData.interest,
            reason: formData.reason,
          },
        });
      }
    } else {
      // member did not exist yet so create new opportunity.
      // TODO add requested plans.
      await this.params.officeService.createOpportunity({
        name: `${formData.firstName} ${formData.lastName} - TRIAL DAY`,
        member: member._id,
        status: trialRequestStatusId,
        startDate: serverStartDate,
        properties: {
          trialdayDate: serverStartDate,
          interestedIn: formData.interest,
          reason: formData.reason,
        },
      });
    }

    // 4. Book a free desk for member.
    // TODO add desk booking.

    // 5. Send confirmation email
    const mailData: MailDataRequired = {
      from: {
        email: 'hub@savage-coworking.com', // sending email
        name: 'Savage Coworking', // company name
      },
      to: formData.email,
      templateId: 'd-25105204bd734ff49bcfb6dbd3ce4deb',
      dynamicTemplateData: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        trial_date: format(toZonedTime(serverStartDate, 'Europe/Madrid'), 'EEEE, \'the\' do \'of\' MMMM yyyy'),
        trial_start_time: format(toZonedTime(serverStartDate, 'Europe/Madrid'), 'h:mm a'),
        // google_cal_url: calendarEventResponse?.htmlLink || '',
      },
    };
    await this.params.sendgridService.mailSend(
      mailData
    );
  }
}
