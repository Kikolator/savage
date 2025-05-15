import { logger } from 'firebase-functions';
import {
  // OfficeRndMember,
  TrialDayFormData,
} from '../data/models';
// import { parse } from 'date-fns';
// import { fromZonedTime } from 'date-fns-tz';
import OfficeRndService from './office-rnd-service';
import { SendgridService } from './sendgrid-service';
import GoogleCalService from './google-cal-service';
// import { OfficeRndMemberStatus } from '../data/enums';
import { AppError, ErrorCode } from '../errors/app-error';

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
    logger.info(this.params);
    throw new AppError('Not implemented', ErrorCode.UNKNOWN_ERROR);
    // // 1. Set DateTime to UTC
    // // Set timezone and parse start date time
    // const dateTimeString = `${formData.preferredDate} ${formData.preferredTime}`;
    // const zonedDateTime = parse(dateTimeString, 'yyyy-MM-dd\'T\'HH:mm', new Date());
    // let utcStartDateTime: Date;
    // // If timezone is provided, convert to UTC
    // if (formData.timezone) {
    //   utcStartDateTime = fromZonedTime(zonedDateTime, formData.timezone);
    // } else {
    //   // If no timezone is provided, use the default timezone (UTC)
    //   utcStartDateTime = zonedDateTime;
    // }
    // // Set end time to 18:00 Madrid time on the same day
    // const madridEndTime = parse(
    //   `${formData.preferredDate}T18:00`,
    //   'yyyy-MM-dd\'T\'HH:mm',
    //   new Date()
    // );
    // const utcEndDateTime: Date = fromZonedTime(madridEndTime, 'Europe/Madrid');


    // // 2. Check if email is already a member
    // const member: OfficeRndMember | undefined =
    //   await this.params.officeService.getMemberByEmail(formData.email);
    // // Check member exists.
    // if (member) {
    //   // Check member status.
    //   if (
    //     member.status !== OfficeRndMemberStatus.CONTACT &&
    //     member.status !== OfficeRndMemberStatus.LEAD
    //   ) {
    //     // If member status is not contact or lead, send email to user he
    //     // cannot book a trial day.
    //     throw new AppError(
    //       'Membership status does not allow to book a trial day.',
    //       ErrorCode.TRIALDAY_MEMBER_NOT_ALLOWED,
    //       403,
    //       {
    //         memberEmail: formData.email,
    //         memberStatus: member.status,
    //       }
    //     );
    //   } else if (
    //     member.status === OfficeRndMemberStatus.LEAD &&
    //     member.properties.trialdayCompleted
    //   ) {
    //     // if member status is lead, and completed trial day, user cannot
    //     // book trial.
    //     throw new AppError(
    //       'Member has already completed a trial day.',
    //       ErrorCode.TRIALDAY_ALREADY_COMPLETED,
    //       403,
    //       { memberEmail: formData.email },
    //     );
    //   } else {
    //     // Member is either a Contact, or a Lead with incompleted trial.
    //     // Update the trialdayDateTime.
    //     await this.params.officeService.updateMember(member.id, {
    //       trialdayDateTime: utcStartDateTime,
    //     });
    //   }
    // } else {
    //   // Create new member.
    //   await this.params.officeService.createMember(formData.email, {
    //     firstName: formData.firstName,
    //     lastName: formData.lastName,
    //     phone: formData.phoneNumber,
    //     interest: formData.interest,
    //     reason: formData.reason,
    //     trialdayDateTime: utcStartDateTime,
    //   });
    // }

    // // 3. Add Opportunity to member.
    // const opportunityName = `${formData.firstName} ${formData.lastName}`;
    // await this.params.officeService.addOpportunity(opportunityName, {
    //   memberId: member.id,
    //   status: OpportunityStatus.TRIAL_DAY,
    //   startDate: utcStartDateTime,
    //   requestedPlan: formData.interest,
    // });

    // // 4. Book a free desk for member.
    // // Get an available desk for start and end date time.
    // const availableDesks = await this.params.officeService.getAvailableDesks(
    //   utcStartDateTime,
    //   utcEndDateTime
    // );
    // if (
    //   member.status === OfficeRndMemberStatus.LEAD &&
    //   !member.properties.trialdayCompleted
    // ) {
    //   // If member is Lead with !trialdayCompleted, we need to reschedule
    //   // an exisiting booking.
    //   // Fetch booking for member.
    //   const bookings: Array<OfficeRndBooking> = await this.
    //     params.
    //     officeService.
    //     getBookingsforMember(member.id);
    //   // if bookings.length != 1, throw error.
    //   // This should not be possible as we are rescheduling
    //   // an existing trial day and a member can only have 1.
    //   if (bookings.length !== 1) {
    //     throw new AppError(
    //       'Trial day member has more than 1 booking.',
    //       ErrorCode.TRIALDAY_BOOKING_ERROR,
    //       500,
    //       {
    //         memberEmail: formData.email,
    //         bookingCount: bookings.length,
    //       },
    //     );
    //   }
    //   const booking = bookings[0];

    //   // Update booking with new trialday Date and Time.
    //   await this.params.officeService.updateBooking(booking.id, {
    //     start: utcStartDateTime,
    //     end: utcEndDateTime,
    //     resource: booking.resource,
    //   });
    // } else {
    //   // Else, we need to book a new desk.
    //   await this.params.officeService.bookDesk({
    //     start: utcStartDateTime,
    //     end: utcEndDateTime,
    //     resource:
    //   });
    // }


    // // 5. Create calendar event for savage coworking.

    // // 6. Send confirmation email to member.


    // // Check if email is already a member.
    // // If yes, check if has completed trial day.
    // // if yes, send email to user he cannot book a trial day.
    // // If no, continue.
    // // If no, create a new member.
    // // Book desk
    // // If not successful, send email to user to reschedule.

    // // // Check availability
    // // const availableDesks = await this.params.officeService.getAvailableDesks(
    // //   utcStartDateTime,
    // //   utcEndDateTime
    // // );
    // // const isAvailable = availableDesks.length > 0;

    // // // 2. If available proceed with booking
    // // if (isAvailable) {
    // //   // 3. Book desk
    // //   const deskBookingRequest: DeskBookingRequest = {};
    // //   const deskBookingResponse = await this.params.officeService.bookDesk(
    // //     deskBookingRequest
    // //   );

    // //   // 4. Create calendar event
    // //   const calendarEventRequest: CalendarEventRequest = {};
    // //   const calendarEventResponse =
    // //     await this.params.calendarService.createEvent(
    // //       calendarEventRequest
    // //     );

    // // // 5. Send confirmation email
    // // const mailData: MailDataRequired = {
    // //   from: {
    // //     email: 'hub@savage-coworking.com', // Replace with your actual sending email
    // //     name: 'Savage Coworking', // Replace with your company name
    // //   },
    // //   to: formData.email,
    // //   templateId: 'd-25105204bd734ff49bcfb6dbd3ce4deb',
    // //   dynamicTemplateData: {
    // //     first_name: formData.firstName,
    // //     last_name: formData.lastName,
    // //     trial_date: format(zonedDateTime, 'EEEE, \'the\' do \'of\' MMMM yyyy'),
    // //     trial_start_time: format(zonedDateTime, 'h:mm a'),
    // //     google_cal_url: calendarEventResponse?.htmlLink || '',
    // //   },
    // // };
    // // await this.params.sendgridService.mailSend(
    // //   mailData
    // // );
    // // } else {
    // //   // Handle unavailability (send alternative dates)
    // // }

    // throw new AppError(
    //   'Not implemented',
    //   ErrorCode.UNKNOWN_ERROR,
    //   501
    // );
  }
}
