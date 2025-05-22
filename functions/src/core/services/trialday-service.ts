import { logger } from 'firebase-functions';
import {
  OfficeRndMember,
  OfficeRndNewMember,
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
import { FirestoreService } from './firestore-service';

export class TrialdayService {
  private readonly trialDayRequestsCollection = 'trialDayRequests';
  // Inject dependancies
  constructor(
    private readonly params: {
      sendgridService: SendgridService,
      calendarService: GoogleCalService,
      officeService: OfficeRndService,
      firestoreService: FirestoreService,
    }
  ) { }

  async handleTrialdayRequest(formData: TrialDayFormData): Promise<void> {
    logger.info('TrialdayService.handleTrialdayRequest()- handling trialday request', {
      eventId: formData.eventId,
    });
    // 0. Add to firestore.
    await this.params.firestoreService.createDocument({
      collection: this.trialDayRequestsCollection,
      documentId: formData.eventId,
      data: {
        status: 'pending',
        ...formData,
      },
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
    if (members.length == 1) {
      member = members[0];
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
      // No members in Array so create a new one.
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
    // get the opportunity statusses.
    const trialRequestStatusses = await this
      .params
      .officeService
      .getOpportunityStatuses();
    // get the trial request status.
    const trialRequestStatus = trialRequestStatusses.find(
      (status) => status._id === '682200cd47119167b0c24e9a'
    );
    if (!trialRequestStatus) {
      throw new AppError(
        'TrialdayService.handleTrialdayRequest()- Trial Request status not found.',
        ErrorCode.TRIALDAY_STATUS_NOT_FOUND,
        404,
        { memberEmail: formData.email },
      );
    }
    // Because we cannot update the opportunity probability,
    // We'll create a new oppportuntiy for each request,
    // this way we'll also retain data.
    // TODO add requested plans to opportunity.
    await this.params.officeService.createOpportunity({
      name: `${formData.firstName} ${formData.lastName} - TRIAL DAY`,
      member: member._id,
      status: trialRequestStatus._id,
      probability: trialRequestStatus.probability,
      startDate: serverStartDate,
      properties: {
        trialdayDate: serverStartDate,
        interestedIn: formData.interest,
        reason: formData.reason,
      },
    });


    // 4. Book a free desk for member without notification.
    // TODO add desk booking.

    // 5. Create calendar event
    // const calendarEvent = await this.params.calendarService.createEvent({
    //   summary: `${formData.firstName} ${formData.lastName} - Trial Day`,
    //   description: `Trial day for ${formData.firstName} ${formData.lastName}\n\nInterest: ${formData.interest.join(', ')}\nReason: ${formData.reason}`,
    //   start: {
    //     dateTime: serverStartDate.toISOString(),
    //     timeZone: 'Europe/Madrid',
    //   },
    //   end: {
    //     dateTime: serverEndDate.toISOString(),
    //     timeZone: 'Europe/Madrid',
    //   },
    //   attendees: [
    //     {
    //       email: formData.email,
    //       displayName: `${formData.firstName} ${formData.lastName}`,
    //     },
    //     {
    //       email: 'hub@savage-coworking.com',
    //       displayName: 'Savage Coworking',
    //     },
    //   ],
    //   reminders: {
    //     useDefault: true,
    //   },
    // });

    throw new AppError(
      'TrialdayService.handleTrialdayRequest()- Desk booking not implemented.',
      ErrorCode.UNKNOWN_ERROR,
      501,
      { memberEmail: formData.email },
    );

    // 6. Send confirmation email
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
        // google_cal_url: calendarEvent.htmlLink,
      },
    };
    await this.params.sendgridService.mailSend(
      mailData
    );

    await this.params.firestoreService.updateDocument({
      collection: this.trialDayRequestsCollection,
      documentId: formData.eventId,
      data: {
        status: 'confirmed',
      },
    });
  }
}
