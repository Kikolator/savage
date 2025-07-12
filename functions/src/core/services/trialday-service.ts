import {format, parse} from 'date-fns';
import {toZonedTime, fromZonedTime} from 'date-fns-tz';
import {MailDataRequired} from '@sendgrid/mail';

import {
  OfficeRndMember,
  OfficeRndNewMember,
  OfficeRndOpportunity,
  OfficeRndOpportunityStatus,
  Trialday,
  TrialDayFormData,
} from '../data/models';
import {TrialdayStatus} from '../data/enums';
import {TrialdayServiceError} from '../errors';
import {getConfig} from '../config';

import {BaseServiceWithDependencies} from './base-service';
import {SendgridService} from './sendgrid-service';
import {FirestoreService} from './firestore-service';
import {EmailConfirmationService} from './email-confirmation-service';
import OfficeRndService from './office-rnd-service';

interface TrialdayServiceDependencies {
  sendgridService: SendgridService;
  firestoreService: FirestoreService;
  emailConfirmationService: EmailConfirmationService;
  officeRndService: OfficeRndService;
}

export class TrialdayService extends BaseServiceWithDependencies<TrialdayServiceDependencies> {
  public static readonly trialDaysCollection = 'trialDays';
  private readonly config: ReturnType<typeof getConfig>;
  private static instance: TrialdayService | null = null;

  // Inject dependencies
  constructor(dependencies: TrialdayServiceDependencies) {
    super(dependencies);
    // Get config when service is instantiated
    this.config = getConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(dependencies: {
    sendgridService: SendgridService;
    firestoreService: FirestoreService;
    emailConfirmationService: EmailConfirmationService;
    officeRndService: OfficeRndService;
  }): TrialdayService {
    if (!TrialdayService.instance) {
      TrialdayService.instance = new TrialdayService(dependencies);
    }
    return TrialdayService.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static reset(): void {
    TrialdayService.instance = null;
  }

  /**
   * Handles a trial day request.
   * 0. Check if eventId exists in firestore.
   * 2. Add trial day request to firestore.
   * 3. Send confirm email button.
   * @param formData - The form data submitted by the user.
   * @returns void
   * @throws TrialdayServiceError - If the trial day request cannot be processed.
   */
  async handleTrialdayRequest(formData: TrialDayFormData): Promise<void> {
    this.logMethodEntry('handleTrialdayRequest', {eventId: formData.eventId});

    try {
      // 0. Check if eventId already in firestore.
      const trialdayQuery =
        await this.dependencies.firestoreService.queryCollection(
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
        this.logMethodSuccess('handleTrialdayRequest', {duplicate: true});
        return;
      }

      // 1. Add to firestore.
      const id = this.dependencies.firestoreService.createDocumentReference(
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
        this.logMethodEntry('handleTrialdayRequest', {
          warning: 'timezone provided, but not used',
          timezone: formData.timezone,
        });
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

      await this.dependencies.firestoreService.createDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: trialday.toDocumentData(),
      });

      // 2. Send email confirmation.

      await this.dependencies.emailConfirmationService.createEmailConfirmation(
        trialday.firstName,
        trialday.email,
        'trial',
        trialday.id
      );
      // 2. Update trial day status to pending email confirmation.
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {status: TrialdayStatus.PENDING_EMAIL_CONFIRMATION},
      });

      this.logMethodSuccess('handleTrialdayRequest');
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
      this.logMethodError('handleTrialdayRequest', error as Error);
      throw TrialdayServiceError.handleRequestFailed('handleTrialdayRequest', {
        eventId: formData.eventId,
        error: error instanceof Error ? error.toString() : 'unknown',
      });
    }
  }

  /**
   * Gets a trialday by opportunity id.
   * @param _id - The id of the opportunity.
   * @returns The trialday object.
   * @throws TrialdayServiceError - If the trialday cannot be found.
   */
  public async getTrialdayByOpportunityId(
    _id: string
  ): Promise<Trialday | null> {
    this.logMethodEntry('getTrialdayByOpportunityId', {opportunityId: _id});

    try {
      const trialdayQuery =
        await this.dependencies.firestoreService.queryCollection(
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
        this.logMethodSuccess('getTrialdayByOpportunityId', {found: false});
        return null;
      }
      const result = Trialday.fromDocumentData(
        trialdayQuery[0].id,
        trialdayQuery[0]
      );
      this.logMethodSuccess('getTrialdayByOpportunityId', {found: true});
      return result;
    } catch (error) {
      this.logMethodError('getTrialdayByOpportunityId', error as Error);
      throw TrialdayServiceError.documentQueryFailed(
        TrialdayService.trialDaysCollection,
        'getTrialdayByOpportunityId',
        {
          opportunityId: _id,
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  /**
   * Creates a placeholder trialday document for an opportunity that doesn't have one.
   * This is useful for handling legacy opportunities or data migration scenarios.
   * @param opportunityId - The opportunity ID
   * @param memberId - The member ID
   * @param opportunityName - The opportunity name
   * @returns The created trialday document ID
   * @throws TrialdayServiceError - If the trialday cannot be created.
   */
  public async createPlaceholderTrialday(
    opportunityId: string,
    memberId: string,
    opportunityName: string
  ): Promise<string> {
    this.logMethodEntry('createPlaceholderTrialday', {
      opportunityId,
      memberId,
      opportunityName,
    });

    try {
      const id = this.dependencies.firestoreService.createDocumentReference(
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

      await this.dependencies.firestoreService.createDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: placeholderTrialday.id,
        data: placeholderTrialday.toDocumentData(),
      });

      this.logMethodSuccess('createPlaceholderTrialday', {trialdayId: id});

      return id;
    } catch (error) {
      this.logMethodError('createPlaceholderTrialday', error as Error);
      throw TrialdayServiceError.placeholderCreationFailed(opportunityId, {
        memberId,
        error: error instanceof Error ? error.toString() : 'unknown',
      });
    }
  }

  /**
   * Updates the status of a trialday.
   * @param trialdayId - The id of the trialday.
   * @param status - The new status of the trialday.
   * @returns void
   * @throws TrialdayServiceError - If the trialday status cannot be updated.
   */
  public async updateTrialdayStatus(
    trialdayId: string,
    status: TrialdayStatus
  ): Promise<void> {
    this.logMethodEntry('updateTrialdayStatus', {trialdayId, status});

    try {
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialdayId,
        data: {
          [Trialday.FIELDS.STATUS]: status,
        },
      });
      this.logMethodSuccess('updateTrialdayStatus');
    } catch (error) {
      this.logMethodError('updateTrialdayStatus', error as Error);
      throw TrialdayServiceError.documentUpdateFailed(
        TrialdayService.trialDaysCollection,
        trialdayId,
        'updateTrialdayStatus',
        {
          status,
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  /**
   * Adds a trial day to Office Rnd.
   * @param trialday - The trialday object.
   * @returns The member and opportunity objects.
   * @throws TrialdayServiceError - If the trial day cannot be added to Office Rnd.
   */
  public async addToOfficeRnd(
    trialday: Trialday
  ): Promise<{member: OfficeRndMember; opportunity: OfficeRndOpportunity}> {
    this.logMethodEntry('addToOfficeRnd', {trialdayId: trialday.id});

    try {
      // Check if member exists in office rnd.
      const membersQuery =
        await this.dependencies.officeRndService.getMembersByEmail(
          trialday.email
        );
      let member: OfficeRndMember;
      if (membersQuery.length !== 0) {
        member = membersQuery[0];
      } else {
        const memberData: OfficeRndNewMember = {
          email: trialday.email,
          name: `${trialday.firstName} ${trialday.lastName}`,
          location: this.config.runtime.officeRnd.defaultLocationId,
          startDate: new Date(),
          description: '',
          properties: {
            trialdayCompleted: false,
            phoneNumber: trialday.phone,
            referralCodeUsed: trialday.referralCode ?? undefined,
            referralPermission: false,
          },
        };
        member =
          await this.dependencies.officeRndService.createMember(memberData);
      }
      // Get trial request status.
      const opportunityStatuses =
        await this.dependencies.officeRndService.getOpportunityStatuses();
      const trialdayRequestStatus = opportunityStatuses.find(
        (status: OfficeRndOpportunityStatus) =>
          status.description === 'trialRequest'
      );
      if (!trialdayRequestStatus) {
        throw TrialdayServiceError.officeRndStatusNotFound(trialday.id);
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
        await this.dependencies.officeRndService.createOpportunity(
          opportunityData
        );
      const result = {member, opportunity};
      this.logMethodSuccess('addToOfficeRnd');
      return result;
    } catch (error) {
      this.logMethodError('addToOfficeRnd', error as Error);
      throw TrialdayServiceError.officeRndIntegrationFailed(trialday.id, {
        error: error instanceof Error ? error.toString() : 'unknown',
      });
    }
  }

  /**
   * Sends an email confirmation to the user.
   * @param trialday - The trialday object.
   * @returns void
   * @throws TrialdayServiceError - If the email confirmation cannot be sent.
   */
  public async sendConfirmationEmail(trialday: Trialday): Promise<void> {
    this.logMethodEntry('sendConfirmationEmail', {trialdayId: trialday.id});

    try {
      // 0. Check if user can book a trial day.
      const canBookTrialDay = await this.canBookTrialday(trialday);
      if (!canBookTrialDay) {
        // Update the status and add a cancellation reason.
        await this.dependencies.firestoreService.updateDocument({
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
        templateId: this.config.runtime.sendgrid.templates.trialdayConfirmation,
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
      await this.dependencies.sendgridService.mailSend(mailData);
      // 2. Update trial day status to email confirmation sent.
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {status: TrialdayStatus.EMAIL_CONFIRMATION_SENT},
      });
      this.logMethodSuccess('sendConfirmationEmail');
    } catch (error) {
      this.logMethodError('sendConfirmationEmail', error as Error);
      throw TrialdayServiceError.emailConfirmationFailed(
        trialday.id,
        'sendConfirmationEmail',
        {
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  /**
   * Sends a follow up email to the user.
   * @param trialday - The trialday object.
   * @returns void
   * @throws TrialdayServiceError - If the follow up email cannot be sent.
   */
  public async sendFollowUpEmail(trialday: Trialday): Promise<void> {
    this.logMethodEntry('sendFollowUpEmail', {trialdayId: trialday.id});

    try {
      // 1. Send email confirmation.
      const signupUrl = `${this.config.static.urls.website}/signup?utm_source=trialday&utm_medium=email&utm_campaign=trialday-follow-up`;
      const daypassUrl = `${this.config.static.urls.website}/daypass?utm_source=trialday&utm_medium=email&utm_campaign=trialday-follow-up`;
      const messageUrl = `${this.config.static.urls.website}/message?utm_source=trialday&utm_medium=email&utm_campaign=trialday-follow-up`;
      const mailData: MailDataRequired = {
        from: {
          email: 'no-reply@savage-coworking.com',
          name: 'Savage Coworking',
        },
        to: trialday.email,
        templateId: this.config.runtime.sendgrid.templates.trialdayFollowUp,
        dynamicTemplateData: {
          first_name: trialday.firstName,
          signup_url: signupUrl,
          daypass_url: daypassUrl,
          message_url: messageUrl,
        },
      };
      await this.dependencies.sendgridService.mailSend(mailData);
      this.logMethodSuccess('sendFollowUpEmail');
    } catch (error) {
      this.logMethodError('sendFollowUpEmail', error as Error);
      throw TrialdayServiceError.emailSendFailed(
        trialday.id,
        'sendFollowUpEmail',
        {
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  public async sendOfficeCancellationEmail(trialday: Trialday): Promise<void> {
    this.logMethodEntry('sendOfficeCancellationEmail', {
      trialdayId: trialday.id,
    });
    try {
      // Implementation placeholder
      this.logMethodSuccess('sendOfficeCancellationEmail');
    } catch (error) {
      this.logMethodError('sendOfficeCancellationEmail', error as Error);
      throw TrialdayServiceError.emailSendFailed(
        trialday.id,
        'sendOfficeCancellationEmail',
        {
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  public async sendUserCancellationEmail(trialday: Trialday): Promise<void> {
    this.logMethodEntry('sendUserCancellationEmail', {trialdayId: trialday.id});
    try {
      // Implementation placeholder
      this.logMethodSuccess('sendUserCancellationEmail');
    } catch (error) {
      this.logMethodError('sendUserCancellationEmail', error as Error);
      throw TrialdayServiceError.emailSendFailed(
        trialday.id,
        'sendUserCancellationEmail',
        {
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  /**
   * Checks if a user can book a trial day.
   * Queries firestore for existing trial days with the same email or firstname+lastname.
   * If a completed trial day is found, the user cannot book a trial day.
   * @param trialday - The trialday object.
   * @returns boolean - True if the user can book a trial day, false otherwise.
   * @throws TrialdayServiceError - If the user cannot book a trial day.
   */
  public async canBookTrialday(trialday: Trialday): Promise<boolean> {
    this.logMethodEntry('canBookTrialday', {trialdayId: trialday.id});
    try {
      // Check if user has any completed trial days - if so, they cannot book another one
      const completedTrialdayEmailQuery =
        await this.dependencies.firestoreService.queryCollection(
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
        await this.dependencies.firestoreService.queryCollection(
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

      this.logMethodSuccess('canBookTrialday', {canBook: true});
      return true;
    } catch (error) {
      this.logMethodError('canBookTrialday', error as Error);
      throw TrialdayServiceError.userCannotBookTrialday(
        trialday.id,
        error instanceof Error ? error.toString() : 'unknown'
      );
    }
  }

  public async addOpportunityAndMemberIdsToTrialday(
    trialdayId: string,
    _id: string,
    _id1: string | undefined
  ): Promise<void> {
    this.logMethodEntry('addOpportunityAndMemberIdsToTrialday', {
      trialdayId,
      _id,
      _id1,
    });
    try {
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialdayId,
        data: {
          [Trialday.FIELDS.OPPORTUNITY_ID]: _id,
          [Trialday.FIELDS.MEMBER_ID]: _id1,
        },
      });
      this.logMethodSuccess('addOpportunityAndMemberIdsToTrialday');
    } catch (error) {
      this.logMethodError(
        'addOpportunityAndMemberIdsToTrialday',
        error as Error
      );
      throw TrialdayServiceError.documentUpdateFailed(
        TrialdayService.trialDaysCollection,
        trialdayId,
        'addOpportunityAndMemberIdsToTrialday',
        {
          _id,
          _id1,
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  public async sendPhoneConfirmation(trialday: Trialday): Promise<void> {
    this.logMethodEntry('sendPhoneConfirmation', {trialdayId: trialday.id});
    try {
      // 0. Check if user can book a trial day.
      const canBookTrialDay = await this.canBookTrialday(trialday);
      if (!canBookTrialDay) {
        // Update the status and add a cancellation reason.
        await this.dependencies.firestoreService.updateDocument({
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
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {status: TrialdayStatus.PHONE_CONFIRMATION_SENT},
      });
      this.logMethodSuccess('sendPhoneConfirmation');
    } catch (error) {
      this.logMethodError('sendPhoneConfirmation', error as Error);
      throw TrialdayServiceError.phoneConfirmationFailed(trialday.id, {
        error: error instanceof Error ? error.toString() : 'unknown',
      });
    }
  }

  public async confirm(trialday: Trialday): Promise<void> {
    this.logMethodEntry('confirm', {trialdayId: trialday.id});
    try {
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {[Trialday.FIELDS.STATUS]: TrialdayStatus.CONFIRMED},
      });
      this.logMethodSuccess('confirm');
    } catch (error) {
      this.logMethodError('confirm', error as Error);
      throw TrialdayServiceError.documentUpdateFailed(
        TrialdayService.trialDaysCollection,
        trialday.id,
        'confirm',
        {
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  public async cancel(
    trialday: Trialday,
    isUserCancelled: boolean,
    reason?: string
  ): Promise<void> {
    this.logMethodEntry('cancel', {
      trialdayId: trialday.id,
      isUserCancelled,
      reason,
    });
    try {
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {
          [Trialday.FIELDS.STATUS]: isUserCancelled
            ? TrialdayStatus.CANCELLED_BY_USER
            : TrialdayStatus.CANCELLED_BY_OFFICE,
          [Trialday.FIELDS.CANCELLATION_REASON]: reason ?? null,
        },
      });
      this.logMethodSuccess('cancel');
    } catch (error) {
      this.logMethodError('cancel', error as Error);
      throw TrialdayServiceError.documentUpdateFailed(
        TrialdayService.trialDaysCollection,
        trialday.id,
        'cancel',
        {
          isUserCancelled,
          reason,
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }

  public async complete(trialday: Trialday): Promise<void> {
    this.logMethodEntry('complete', {trialdayId: trialday.id});
    try {
      await this.dependencies.firestoreService.updateDocument({
        collection: TrialdayService.trialDaysCollection,
        documentId: trialday.id,
        data: {[Trialday.FIELDS.STATUS]: TrialdayStatus.COMPLETED},
      });
      this.logMethodSuccess('complete');
    } catch (error) {
      this.logMethodError('complete', error as Error);
      throw TrialdayServiceError.documentUpdateFailed(
        TrialdayService.trialDaysCollection,
        trialday.id,
        'complete',
        {
          error: error instanceof Error ? error.toString() : 'unknown',
        }
      );
    }
  }
}
