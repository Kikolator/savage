import {MailDataRequired} from '@sendgrid/helpers/classes/mail';

import {Email} from '../data/models';
import {EmailConfirmationError} from '../errors';

import {BaseServiceWithDependencies} from './base-service';
import {FirestoreService} from './firestore-service';
import {SendgridService} from './sendgrid-service';

interface EmailConfirmationServiceDependencies {
  firestoreService: FirestoreService;
  sendgridService: SendgridService;
}

export class EmailConfirmationService extends BaseServiceWithDependencies<EmailConfirmationServiceDependencies> {
  private readonly emailConfirmationCollection = 'emailConfirmations';

  constructor(dependencies: EmailConfirmationServiceDependencies) {
    super(dependencies);
  }

  /**
   * Get the FirestoreService dependency
   */
  private get firestoreService(): FirestoreService {
    return this.getDependency('firestoreService');
  }

  /**
   * Get the SendgridService dependency
   */
  private get sendgridService(): SendgridService {
    return this.getDependency('sendgridService');
  }

  /**
   * Creates a new email confirmation object in firestore.
   * Sends a confirmation email to the user.
   * @param firstName - The first name of the user.
   * @param email - The email address to create the confirmation for.
   * @param eventType - The type of event that the user is validating his email for (trial or signup)
   * @param eventId - The id of the document that the user validating his email for (trial or signup)
   * @returns void
   * @throws EmailConfirmationError - If the email cannot be created.
   */
  public async createEmailConfirmation(
    firstName: string,
    email: string,
    eventType: 'trial' | 'signup',
    eventId: string
  ): Promise<void> {
    this.logMethodEntry('createEmailConfirmation', {
      email,
      firstName,
      eventType,
      eventId,
    });

    try {
      // Validate event type
      if (eventType !== 'trial' && eventType !== 'signup') {
        throw EmailConfirmationError.invalidEventType(
          'createEmailConfirmation',
          eventType
        );
      }

      // Check if email object exists
      let confirmationUrl: string | null = null;
      const emailObject = await this.emailObjectExists(email);

      if (emailObject !== null) {
        // Email already exists, check if confirmed
        if (emailObject.confirmed) {
          this.logMethodSuccess('createEmailConfirmation', {
            email,
            status: 'already_confirmed',
          });
          return;
        } else {
          // Email not confirmed, send confirmation email again
          confirmationUrl = `https://savage-coworking.com/confirm-email?id=${emailObject.id}&eventType=${eventType}&eventId=${eventId}`;
          await this.sendEmailConfirmation(email, firstName, confirmationUrl);

          // Update emailConfirmationSent field to true
          await this.firestoreService.updateDocument({
            collection: this.emailConfirmationCollection,
            documentId: emailObject.id,
            data: {
              [Email.FIELDS.CONFIRMATION_EMAIL_SENT]: true,
              [Email.FIELDS.AMOUNT_SENT]: this.firestoreService.increment(1),
            },
          });
        }
      } else {
        // Email doesn't exist, create new email object
        const id = this.firestoreService.createDocumentReference(
          this.emailConfirmationCollection
        ).id;

        confirmationUrl = `https://savage-coworking.com/confirm-email?id=${id}&eventType=${eventType}&eventId=${eventId}`;

        const emailObject = new Email({
          id: id,
          email: email,
          confirmed: false,
          confirmationEmailSent: false,
          confirmationUrl: confirmationUrl,
          amountSent: 0,
        });

        await this.firestoreService.createDocument({
          collection: this.emailConfirmationCollection,
          documentId: id,
          data: emailObject.toDocumentData(),
        });

        // Send confirmation email
        await this.sendEmailConfirmation(email, firstName, confirmationUrl);

        // Update emailConfirmationSent field to true
        await this.firestoreService.updateDocument({
          collection: this.emailConfirmationCollection,
          documentId: id,
          data: {
            [Email.FIELDS.CONFIRMATION_EMAIL_SENT]: true,
            [Email.FIELDS.AMOUNT_SENT]: this.firestoreService.increment(1),
          },
        });
      }

      this.logMethodSuccess('createEmailConfirmation', {
        email,
        eventType,
        eventId,
      });
    } catch (error) {
      this.logMethodError('createEmailConfirmation', error as Error);
      if (error instanceof EmailConfirmationError) {
        throw error;
      }
      throw EmailConfirmationError.emailObjectCreationFailed(
        'createEmailConfirmation',
        email,
        eventType,
        eventId,
        error as Error
      );
    }
  }

  /**
   * Checks if an email object exists in firestore.
   * @param email - The email address to check.
   * @returns Email | null - Email if the email object exists, null otherwise.
   * @throws EmailConfirmationError - If the email cannot be checked.
   */
  public async emailObjectExists(email: string): Promise<Email | null> {
    this.logMethodEntry('emailObjectExists', {email});

    try {
      const emailQuery = await this.firestoreService.queryCollection(
        this.emailConfirmationCollection,
        [
          {
            field: Email.FIELDS.EMAIL,
            operator: '==',
            value: email,
          },
        ]
      );

      if (emailQuery.length === 0) {
        this.logMethodSuccess('emailObjectExists', {
          email,
          result: 'not_found',
        });
        return null;
      } else {
        const emailObject = Email.fromData(emailQuery[0]);
        this.logMethodSuccess('emailObjectExists', {
          email,
          result: 'found',
          id: emailObject.id,
        });
        return emailObject;
      }
    } catch (error) {
      this.logMethodError('emailObjectExists', error as Error);
      if (error instanceof EmailConfirmationError) {
        throw error;
      }
      throw EmailConfirmationError.emailObjectQueryFailed(
        'emailObjectExists',
        email,
        error as Error
      );
    }
  }

  /**
   * Sends an email confirmation to the email address.
   * @param email - The email address to send the confirmation to.
   * @param firstName - The first name of the user.
   * @param confirmationUrl - The URL to confirm the email.
   * @returns void
   * @throws EmailConfirmationError - If the email cannot be sent.
   */
  public async sendEmailConfirmation(
    email: string,
    firstName: string,
    confirmationUrl: string
  ): Promise<void> {
    this.logMethodEntry('sendEmailConfirmation', {email, firstName});

    try {
      const isConfirmed = await this.checkIfConfirmed(email);
      if (isConfirmed) {
        this.logMethodSuccess('sendEmailConfirmation', {
          email,
          status: 'already_confirmed',
        });
        return;
      }

      const mailData: MailDataRequired = {
        from: {
          email: 'no-reply@savage-coworking.com',
          name: 'Savage Coworking',
        },
        to: email,
        templateId: 'd-eebf7469a11a42fdac5996371583e259',
        dynamicTemplateData: {
          first_name: firstName,
          confirm_email_link: confirmationUrl,
        },
      };

      await this.sendgridService.mailSend(mailData);
      this.logMethodSuccess('sendEmailConfirmation', {email, firstName});
    } catch (error) {
      this.logMethodError('sendEmailConfirmation', error as Error);
      if (error instanceof EmailConfirmationError) {
        throw error;
      }
      throw EmailConfirmationError.emailConfirmationSendFailed(
        'sendEmailConfirmation',
        email,
        firstName,
        error as Error
      );
    }
  }

  /**
   * Confirms an email address.
   * The email object should always be created already in firestore before sending a confirmation email.
   * This is to avoid race conditions where the email object is created after the confirmation email is sent.
   * For this reason if a email is not found in firestore, an error is thrown.
   * @param id - The id of the email object to confirm.
   * @returns void
   * @throws EmailConfirmationError - If the email cannot be confirmed.
   */
  public async confirmEmail(id: string): Promise<void> {
    this.logMethodEntry('confirmEmail', {id});

    try {
      await this.firestoreService.updateDocument({
        collection: this.emailConfirmationCollection,
        documentId: id,
        data: {
          [Email.FIELDS.CONFIRMED]: true,
        },
      });

      this.logMethodSuccess('confirmEmail', {id});
    } catch (error) {
      this.logMethodError('confirmEmail', error as Error);
      if (error instanceof EmailConfirmationError) {
        throw error;
      }
      throw EmailConfirmationError.emailConfirmationFailed(
        'confirmEmail',
        id,
        error as Error
      );
    }
  }

  /**
   * Checks if an email address is confirmed.
   * @param email - The email address to check.
   * @returns boolean - True if the email is confirmed, false otherwise.
   * @throws EmailConfirmationError - If the email cannot be checked.
   */
  public async checkIfConfirmed(email: string): Promise<boolean> {
    this.logMethodEntry('checkIfConfirmed', {email});

    try {
      // Query the collection for the email address
      const emailQuery = await this.firestoreService.queryCollection(
        this.emailConfirmationCollection,
        [
          {
            field: Email.FIELDS.EMAIL,
            operator: '==',
            value: email,
          },
        ]
      );

      if (emailQuery.length === 0) {
        this.logMethodSuccess('checkIfConfirmed', {
          email,
          result: false,
          reason: 'not_found',
        });
        return false;
      }

      const emailObject = Email.fromData(emailQuery[0]);
      const isConfirmed = emailObject.confirmed;

      this.logMethodSuccess('checkIfConfirmed', {email, result: isConfirmed});
      return isConfirmed;
    } catch (error) {
      this.logMethodError('checkIfConfirmed', error as Error);
      if (error instanceof EmailConfirmationError) {
        throw error;
      }
      throw EmailConfirmationError.emailStatusCheckFailed(
        'checkIfConfirmed',
        email,
        error as Error
      );
    }
  }
}
