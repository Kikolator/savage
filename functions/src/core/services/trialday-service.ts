import { TrialDayFormData } from '../data/models';
// import { SendgridService } from './sendgrid-service';

export class TrialdayService {
  // Inject dependancies
//   constructor(
  // private readonly sendgridService: SendgridService,
  // private readonly calendarService: GoogleCalendarService,
  // private readonly officeService: OfficeRndService,
  // private readonly availabilityService: AvailabilityService,
//   ) {}

  async handleTrialdayRequest(formData: TrialDayFormData): Promise<void> {
    throw new Error('Not implemented');
    // 1. Check availability
    // const dateTimeString = `${formData.preferredDate} ${formData.preferredTime}`;
    // const zonedDateTime = parse(dateTimeString, "yyy-MM-dd'T'HH:mm", new Date());
    // const utcDateTime = zonedTimeToUtc(zonedDateTime, formData.timezone);
    // const isAvailable = await this.availabilityService.checkAvailability(
    //   utcDateTime
    // );
    // 2. If available proceed with booking
    // 3. Book desk
    // 4. Create calendar event
    // 5. Send confirmation email
    // Handle unavailability (send alternative dates)
  }
}
