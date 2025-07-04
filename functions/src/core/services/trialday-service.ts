import {logger} from 'firebase-functions';
import {format, parse} from 'date-fns';
import {toZonedTime, fromZonedTime} from 'date-fns-tz';
import {MailDataRequired} from '@sendgrid/mail';

import {
  OfficeRndMember,
  OfficeRndNewMember,
  OfficeRndOpportunity,
  Trialday,
  TrialDayFormData,
} from '../data/models';
import {TrialdayStatus} from '../data/enums';
import {AppError, ErrorCode} from '../errors/app-error';
import {TrialdayError} from '../errors';
import {officeRndConfig} from '../config/office-rnd-config';
import {mainConfig} from '../config/main-config';
import {SendgridConfig} from '../config/sendgrid';

import {SendgridService} from './sendgrid-service';
import {FirestoreService} from './firestore-service';
import {EmailConfirmationService} from './email-confirmation-service';
import OfficeRndService from './office-rnd-service';

export class TrialdayService {
  public static readonly trialDaysCollection = 'trialDays';
  // Inject dependancies
  constructor(
    private readonly params: {
      sendgridService: SendgridService;
      // calendarService: GoogleCalService;
      // officeService: OfficeRndService;
      firestoreService: FirestoreService;
      // referralService: ReferralService;
      emailConfirmationService: EmailConfirmationService;
      officeRndService: OfficeRndService;
    }
  ) {}

  /**
   * Handles a trial day request.
   * 0. Check if eventId exists in firestore.
   * 2. Add trial day request to firestore.
   * 3. Send confirm email button.
   * @param formData - The form data submitted by the user.
   * @returns void
   * @throws AppError - If the trial day request cannot be processed.
   */
  async handleTrialdayRequest(formData: TrialDayFormData): Promise<void> {
    logger.info([
      'TrialdayService.handleTrialdayRequest()- handling trialday request',
      {eventId: formData.eventId},
    ]);

    try {
      // 0. Check if eventId already in firestore.
      const trialdayQuery = await this.params.firestoreService.queryCollection(
        TrialdayService.trialDaysCollection,
        [
          {
            field: Trialday.FIELDS.EVENT_ID,
            operator: '==',
            value: formData.eventId,
          },
        ]
      );
      if (trialdayQuery.length > 0) {
        // EventId already in firestore so this is a duplicate request.
        return;
      }

      // 1. Add to firestore.
      const id = this.params.firestoreService.createReference(
        TrialdayService.trialDaysCollection
      ).id;
      // Set timezone and parse start date time
      const dateTimeString = `${formData.preferredDate} ${formData.preferredTime}`;
      // Parse the date string into a Date object
      // Standard Date is UTC as set in index: porcess.env.TZ.
      // Input date string is in Europe/Madrid (for now)
      const inputStartDate = parse(
        dateTimeString,
        'yyyy-MM-dd HH:mm',
        new Date()
      );
      // Convert input to utc timezone
      const serverStartDate = fromZonedTime(inputStartDate, 'Europe/Madrid');
      // TODO handle if timezone is provided in future versions.
      if (formData.timezone) {
        logger.warn(
          'TrialdayService.handleTrialdayRequest()- timezone provided, but not used',
          {timezone: formData.timezone}
        );
      }
      // Set end time to 18:00 Madrid time on the same day
      // Madrid time will automatically handle DST transitions
      // const madridEndDate = parse(
      //   `${formData.preferredDate}T18:00`,
      //   'yyyy-MM-dd\'T\'HH:mm',
      //   new Date()
      // );
      // const serverEndDate = fromZonedTime(madridEndDate, 'Europe/Madrid');
      const trialday = new Trialday({
        id: id,
        email: formData.email,
        phone: formData.phoneNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        status: TrialdayStatus.REQUESTED,
        trialDateTime: serverStartDate,
        reason: formData.reason,
        interestedIn: formData.interest,
        termsAccepted: formData.legal,
        eventId: formData.eventId,
        referralCode: formData.referralCode ?? null,
      });

      await this.params.firestoreService.createDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: trialday.toDocumentData(),
      });

      // 2. Send email confirmation.

      await this.params.emailConfirmationService.createEmailConfirmation(
        trialday.firstName,
        trialday.email,
        'trial',
        trialday.id
      );
      // 2. Update trial day status to pending email confirmation.
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {status: TrialdayStatus.PENDING_EMAIL_CONFIRMATION},
      });

      return;

      // ------------------------------------------------------------
      // ------------------------------------------------------------
      // OLD CODE

      // // 4. Book a free desk for member without notification.
      // // TODO add desk booking.
      // // 5. Create calendar event
      // // const calendarEvent = await this.params.calendarService.createEvent({
      // //   summary: `${formData.firstName} ${formData.lastName} - Trial Day`,
      // //   description: `Trial day for ${formData.firstName} ${formData.lastName}\n\nInterest: ${formData.interest.join(', ')}\nReason: ${formData.reason}`,
      // //   start: {
      // //     dateTime: serverStartDate.toISOString(),
      // //     timeZone: 'Europe/Madrid',
      // //   },
      // //   end: {
      // //     dateTime: serverEndDate.toISOString(),
      // //     timeZone: 'Europe/Madrid',
      // //   },
      // //   attendees: [
      // //     {
      // //       email: formData.email,
      // //       displayName: `${formData.firstName} ${formData.lastName}`,
      // //     },
      // //     {
      // //       email: 'hub@savage-coworking.com',
      // //       displayName: 'Savage Coworking',
      // //     },
      // //   ],
      // //   reminders: {
      // //     useDefault: true,
      // //   },
      // // });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error handling a trialday request from typeform.',
          'handleTrialdayRequest',
          {
            eventId: formData.eventId,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  /**
   * Gets a trialday by opportunity id.
   * @param _id - The id of the opportunity.
   * @returns The trialday object.
   * @throws TrialdayError - If the trialday cannot be found.
   */
  public async getTrialdayByOpportunityId(
    _id: string
  ): Promise<Trialday | null> {
    try {
      const trialdayQuery = await this.params.firestoreService.queryCollection(
        TrialdayService.trialDaysCollection,
        [
          {
            field: Trialday.FIELDS.OPPORTUNITY_ID,
            operator: '==',
            value: _id,
          },
        ]
      );
      if (trialdayQuery.length === 0) {
        return null;
      }
      return Trialday.fromDocumentData(trialdayQuery[0].id, trialdayQuery[0]);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error getting trialday by opportunity id.',
          'getTrialdayByOpportunityId',
          {
            opportunityId: _id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  /**
   * Creates a placeholder trialday document for an opportunity that doesn't have one.
   * This is useful for handling legacy opportunities or data migration scenarios.
   * @param opportunityId - The opportunity ID
   * @param memberId - The member ID
   * @param opportunityName - The opportunity name
   * @returns The created trialday document ID
   * @throws TrialdayError - If the trialday cannot be created.
   */
  public async createPlaceholderTrialday(
    opportunityId: string,
    memberId: string,
    opportunityName: string
  ): Promise<string> {
    try {
      logger.info('TrialdayService.createPlaceholderTrialday', {
        opportunityId,
        memberId,
        opportunityName,
      });

      const id = this.params.firestoreService.createReference(
        TrialdayService.trialDaysCollection
      ).id;

      const placeholderTrialday = new Trialday({
        id: id,
        email: 'placeholder@example.com', // Will be updated when real data is available
        phone: '',
        firstName: 'Placeholder',
        lastName: 'User',
        status: TrialdayStatus.COMPLETED, // Mark as completed since opportunity is already trialComplete
        trialDateTime: new Date(), // Will be updated when real data is available
        reason: 'Legacy opportunity - placeholder created',
        interestedIn: ['Legacy'],
        termsAccepted: true,
        opportunityId: opportunityId,
        memberId: memberId,
        eventId: `legacy-${opportunityId}`,
        cancellationReason: null,
        previousTrialdayId: null,
        referralCode: null,
      });

      await this.params.firestoreService.createDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: placeholderTrialday.id,
        data: placeholderTrialday.toDocumentData(),
      });

      logger.info('TrialdayService.createPlaceholderTrialday - Success', {
        trialdayId: id,
        opportunityId,
      });

      return id;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error creating placeholder trialday.',
          'createPlaceholderTrialday',
          {
            opportunityId,
            memberId,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  /**
   * Updates the status of a trialday.
   * @param trialdayId - The id of the trialday.
   * @param status - The new status of the trialday.
   * @returns void
   * @throws TrialdayError - If the trialday status cannot be updated.
   */
  public async updateTrialdayStatus(
    trialdayId: string,
    status: TrialdayStatus
  ): Promise<void> {
    try {
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialdayId,
        data: {
          [Trialday.FIELDS.STATUS]: status,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error updating trialday status.',
          'updateTrialdayStatus',
          {
            trialdayId: trialdayId,
            status: status,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  /**
   * Adds a trial day to Office Rnd.
   * @param trialday - The trialday object.
   * @returns The member and opportunity objects.
   * @throws TrialdayError - If the trial day cannot be added to Office Rnd.
   */
  public async addToOfficeRnd(
    trialday: Trialday
  ): Promise<{member: OfficeRndMember; opportunity: OfficeRndOpportunity}> {
    try {
      logger.info('TrialdayService.addToOfficeRnd', {trialdayId: trialday.id});
      // Check if member exists in office rnd.
      const membersQuery = await this.params.officeRndService.getMembersByEmail(
        trialday.email
      );
      let member: OfficeRndMember;
      if (membersQuery.length !== 0) {
        member = membersQuery[0];
      } else {
        const memberData: OfficeRndNewMember = {
          email: trialday.email,
          name: `${trialday.firstName} ${trialday.lastName}`,
          location: officeRndConfig.defaultLocationId,
          startDate: new Date(),
          description: '',
          properties: {
            trialdayCompleted: false,
            phoneNumber: trialday.phone,
            referralCodeUsed: trialday.referralCode ?? undefined,
            referralPermission: false,
          },
        };
        member = await this.params.officeRndService.createMember(memberData);
      }
      // Get trial request status.
      const opportunityStatuses =
        await this.params.officeRndService.getOpportunityStatuses();
      const trialdayRequestStatus = opportunityStatuses.find(
        (status) => status.description === 'trialRequest'
      );
      if (!trialdayRequestStatus) {
        throw new AppError('Trial day status not found', ErrorCode.NOT_FOUND);
      }
      // Add oportunity to member.
      const opportunityData: OfficeRndOpportunity = {
        name: `${trialday.firstName} ${trialday.lastName} - TRIAL DAY`,
        member: member._id,
        status: trialdayRequestStatus._id,
        probability: trialdayRequestStatus.probability,
        startDate: trialday.trialDateTime,
        properties: {
          trialdayDate: trialday.trialDateTime,
          interestedIn: trialday.interestedIn,
          reason: trialday.reason,
        },
      };
      const opportunity =
        await this.params.officeRndService.createOpportunity(opportunityData);
      return {member, opportunity};
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error creating opportunity.',
          'createOpportunity',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  /**
   * Sends an email confirmation to the user.
   * @param trialday - The trialday object.
   * @returns void
   * @throws TrialdayError - If the email confirmation cannot be sent.
   */
  public async sendConfirmationEmail(trialday: Trialday): Promise<void> {
    try {
      logger.info('sendEmailConfirmation', {email: trialday.id});
      // 0. Check if user can book a trial day.
      const canBookTrialDay = await this.canBookTrialday(trialday);
      if (!canBookTrialDay) {
        // Update the status and add a cancellation reason.
        await this.params.firestoreService.updateDocument({
          collection: TrialdayService.trialDaysCollection,
          documentId: trialday.id,
          data: {
            [Trialday.FIELDS.STATUS]: TrialdayStatus.CANCELLED_BY_OFFICE,
            [Trialday.FIELDS.CANCELLATION_REASON]:
              'User cannot book a trial day.',
          },
        });
        return;
      }
      // 1. Send email confirmation.
      const mailData: MailDataRequired = {
        from: {
          email: 'no-reply@savage-coworking.com',
          name: 'Savage Coworking',
        },
        to: trialday.email,
        templateId: SendgridConfig.trialdayConfirmationTemplateId,
        dynamicTemplateData: {
          first_name: trialday.firstName,
          trial_date: format(
            toZonedTime(trialday.trialDateTime, 'Europe/Madrid'),
            // eslint-disable-next-line quotes
            "EEEE, 'the' dd 'of' MMMM yyyy"
          ),
          trial_start_time: format(
            toZonedTime(trialday.trialDateTime, 'Europe/Madrid'),
            'h:mm a'
          ),
        },
      };
      await this.params.sendgridService.mailSend(mailData);
      // 2. Update trial day status to email confirmation sent.
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {status: TrialdayStatus.EMAIL_CONFIRMATION_SENT},
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error sending confirmation email.',
          'sendConfirmationEmail',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  /**
   * Sends a follow up email to the user.
   * @param trialday - The trialday object.
   * @returns void
   * @throws TrialdayError - If the follow up email cannot be sent.
   */
  public async sendFollowUpEmail(trialday: Trialday): Promise<void> {
    try {
      logger.info('sendFollowUpEmail', {trialdayId: trialday.id});
      // 1. Send email confirmation.
      const signupUrl = `${mainConfig.websiteUrl}/signup?utm_source=trialday&utm_medium=email&utm_campaign=trialday-follow-up`;
      const daypassUrl = `${mainConfig.websiteUrl}/daypass?utm_source=trialday&utm_medium=email&utm_campaign=trialday-follow-up`;
      const messageUrl = `${mainConfig.websiteUrl}/message?utm_source=trialday&utm_medium=email&utm_campaign=trialday-follow-up`;
      const mailData: MailDataRequired = {
        from: {
          email: 'no-reply@savage-coworking.com',
          name: 'Savage Coworking',
        },
        to: trialday.email,
        templateId: SendgridConfig.trialdayFollowUpTemplateId,
        dynamicTemplateData: {
          first_name: trialday.firstName,
          signup_url: signupUrl,
          daypass_url: daypassUrl,
          message_url: messageUrl,
        },
      };
      await this.params.sendgridService.mailSend(mailData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error sending follow up email.',
          'sendFollowUpEmail',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  public async sendOfficeCancellationEmail(trialday: Trialday): Promise<void> {
    try {
      logger.info('sendOfficeCancellationEmail', {trialdayId: trialday.id});
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error sending office cancellation email.',
          'sendOfficeCancellationEmail',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  public async sendUserCancellationEmail(trialday: Trialday): Promise<void> {
    try {
      logger.info('sendUserCancellationEmail', {trialdayId: trialday.id});
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error sending user cancellation email.',
          'sendUserCancellationEmail',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  /**
   * Checks if a user can book a trial day.
   * Queries firestore for existing trial days with the same email or firstname+lastname.
   * If a completed trial day is found, the user cannot book a trial day.
   * @param trialday - The trialday object.
   * @returns boolean - True if the user can book a trial day, false otherwise.
   * @throws TrialdayError - If the user cannot book a trial day.
   */
  public async canBookTrialday(trialday: Trialday): Promise<boolean> {
    try {
      logger.info('canBookTrialday', {trialdayId: trialday.id});
      // Check if user has any completed trial days - if so, they cannot book another one
      const completedTrialdayEmailQuery =
        await this.params.firestoreService.queryCollection(
          TrialdayService.trialDaysCollection,
          [
            {
              field: Trialday.FIELDS.EMAIL,
              operator: '==',
              value: trialday.email,
            },
            {
              field: Trialday.FIELDS.STATUS,
              operator: '==',
              value: TrialdayStatus.COMPLETED,
            },
          ]
        );
      if (completedTrialdayEmailQuery.length > 0) {
        return false;
      }

      const completedTrialdayNameQuery =
        await this.params.firestoreService.queryCollection(
          TrialdayService.trialDaysCollection,
          [
            {
              field: Trialday.FIELDS.FIRST_NAME,
              operator: '==',
              value: trialday.firstName,
            },
            {
              field: Trialday.FIELDS.LAST_NAME,
              operator: '==',
              value: trialday.lastName,
            },
            {
              field: Trialday.FIELDS.STATUS,
              operator: '==',
              value: TrialdayStatus.COMPLETED,
            },
          ]
        );
      if (completedTrialdayNameQuery.length > 0) {
        return false;
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error checking if user can book a trial day.',
          'canBookTrialday',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  public async addOpportunityAndMemberIdsToTrialday(
    trialdayId: string,
    _id: string,
    _id1: string | undefined
  ): Promise<void> {
    try {
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialdayId,
        data: {
          [Trialday.FIELDS.OPPORTUNITY_ID]: _id,
          [Trialday.FIELDS.MEMBER_ID]: _id1,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error adding opportunity and member ids to trialday.',
          'addOpportunityAndMemberIdsToTrialday',
          {
            trialdayId: trialdayId,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  public async sendPhoneConfirmation(trialday: Trialday): Promise<void> {
    try {
      logger.info('sendPhoneConfirmation', {trialdayId: trialday.id});
      // 0. Check if user can book a trial day.
      const canBookTrialDay = await this.canBookTrialday(trialday);
      if (!canBookTrialDay) {
        // Update the status and add a cancellation reason.
        await this.params.firestoreService.updateDocument({
          collection: TrialdayService.trialDaysCollection,
          documentId: trialday.id,
          data: {
            status: TrialdayStatus.CANCELLED_BY_OFFICE,
            cancellationReason: 'User cannot book a trial day.',
          },
        });
        return;
      }
      // TODO send phone confirmation. Currently this is done manually
      // this method simply updates the status to phone confirmation sent.
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {status: TrialdayStatus.PHONE_CONFIRMATION_SENT},
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error sending phone confirmation.',
          'sendPhoneConfirmation',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  public async confirm(trialday: Trialday): Promise<void> {
    try {
      logger.info('confirm', {trialdayId: trialday.id});
      // set status to confirmed
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {[Trialday.FIELDS.STATUS]: TrialdayStatus.CONFIRMED},
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error confirming trialday.',
          'confirmTrialday',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  public async cancel(
    trialday: Trialday,
    isUserCancelled: boolean,
    reason?: string
  ): Promise<void> {
    try {
      logger.info('cancel', {
        trialdayId: trialday.id,
        isUserCancelled: isUserCancelled,
        reason: reason,
      });
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {
          [Trialday.FIELDS.STATUS]: isUserCancelled
            ? TrialdayStatus.CANCELLED_BY_USER
            : TrialdayStatus.CANCELLED_BY_OFFICE,
          [Trialday.FIELDS.CANCELLATION_REASON]: reason ?? null,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error cancelling trialday.',
          'cancelTrialday',
          {
            trialdayId: trialday.id,
            isUserCancelled: isUserCancelled,
            reason: reason,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }

  public async complete(trialday: Trialday): Promise<void> {
    try {
      logger.info('complete', {trialdayId: trialday.id});
      await this.params.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {[Trialday.FIELDS.STATUS]: TrialdayStatus.COMPLETED},
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new TrialdayError(
          'Error completing trialday.',
          'completeTrialday',
          {
            trialdayId: trialday.id,
            error: error instanceof Error ? error.toString() : 'unknown',
          }
        );
      }
    }
  }
}
