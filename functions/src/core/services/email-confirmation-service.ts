import {MailDataRequired} from '@sendgrid/helpers/classes/mail';
import {logger} from 'firebase-functions/v2';

import {Email} from '../data/models';
import {AppError, EmailConfirmationError} from '../errors';

import {FirestoreService} from './firestore-service';
import {SendgridService} from './sendgrid-service';

export class EmailConfirmationService {
  private readonly emailConfirmationCollection = 'emailConfirmations';

  // Inject deps
  constructor(
    private readonly params: {
      firestoreService: FirestoreService;
      sendgridService: SendgridService;
    }
  ) {}

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
    try {
      logger.info('createEmailConfirmation', {email: email});
      // 0. Check if confirmed.
      let confirmationUrl: string | null = null;
      const emailObject = await this.emailObjectExists(email);
      if (emailObject !== null) {
        // email is not null so email already exists.
        // check if email is confirmed.
        if (emailObject.confirmed) {
          // email is confirmed so return.
          return;
        } else {
          // email is not confirmed so send a confirmation email again.
          confirmationUrl = `https://savage-coworking.com/confirm-email?id=${emailObject.id}&eventType=${eventType}&eventId=${eventId}`;
          await this.sendEmailConfirmation(email, firstName, confirmationUrl);
          // update emailConfirmationSent fiedl to true.
          await this.params.firestoreService.updateDocument({
            collection: this.emailConfirmationCollection,
            documentId: emailObject.id,
            data: {
              [Email.FIELDS.CONFIRMATION_EMAIL_SENT]: true,
              [Email.FIELDS.AMOUNT_SENT]: this.params.firestoreService
                .getFieldValue()
                .increment(1),
            },
          });
        }
        return;
      } else {
        // email is null so create a new email object.
        // 1. Create a new email object in firestore.
        const id = this.params.firestoreService.createReference(
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
        await this.params.firestoreService.createDocument({
          collection: this.emailConfirmationCollection,
          documentId: id,
          data: emailObject.toDocumentData(),
        });
        // 2. Send a confirmation email to the email address.
        await this.sendEmailConfirmation(email, firstName, confirmationUrl);
        // update emailConfirmationSent fiedl to true.
        await this.params.firestoreService.updateDocument({
          collection: this.emailConfirmationCollection,
          documentId: id,
          data: {
            [Email.FIELDS.CONFIRMATION_EMAIL_SENT]: true,
            [Email.FIELDS.AMOUNT_SENT]: this.params.firestoreService
              .getFieldValue()
              .increment(1),
          },
        });
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new EmailConfirmationError(
          'Error creating email confirmation',
          email,
          error instanceof Error ? error.toString() : 'unknown'
        );
      }
    }
  }

  /**
   * Checks if an email object exists in firestore.
   * @param email - The email address to check.
   * @returns Email | null - Email if the email object exists, null otherwise.
   * @throws EmailConfirmationError - If the email cannot be checked.
   */
  public async emailObjectExists(email: string): Promise<Email | null> {
    try {
      logger.info('emailObjectExists', {email: email});
      const emailQuery = await this.params.firestoreService.queryCollection(
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
        return null;
      } else {
        return Email.fromData(emailQuery[0]);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new EmailConfirmationError(
          'Error creating email confirmation',
          email,
          error instanceof Error ? error.toString() : 'unknown'
        );
      }
    }
  }

  /**
   * Sends an email confirmation to the email address.
   * @param email - The email address to send the confirmation to.
   * @param firstName - The first name of the user.
   * @param confirmationUrl - The URL to confirm the email.
   * @returns void
   * @throws AppError - If the email cannot be sent.
   */
  public async sendEmailConfirmation(
    email: string,
    firstName: string,
    confirmationUrl: string
  ): Promise<void> {
    try {
      logger.info('sendEmailConfirmation', {email: email});
      const isConfirmed = await this.checkIfConfirmed(email);
      if (isConfirmed) {
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
      await this.params.sendgridService.mailSend(mailData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new EmailConfirmationError(
          'Error creating email confirmation',
          email,
          error instanceof Error ? error.toString() : 'unknown'
        );
      }
    }
  }

  /**
   * Confirms an email address.
   * The email object should always be created already in firestore before sending a confiramtion email.
   * This is to avoid race conditions where the email object is created after the confirmation email is sent.
   * For this reason if a email is not found in firestore, an error is thrown.
   * @param id - The id of the email object to confirm.
   * @returns void
   * @throws AppError - If the email cannot be confirmed.
   */
  public async confirmEmail(id: string): Promise<void> {
    try {
      logger.info('confirmEmail', {id: id});
      await this.params.firestoreService.updateDocument({
        collection: this.emailConfirmationCollection,
        documentId: id,
        data: {
          [Email.FIELDS.CONFIRMED]: true,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new EmailConfirmationError(
          'Error confirming email',
          id,
          error instanceof Error ? error.toString() : 'unknown'
        );
      }
    }
  }

  /**
   * Checks if an email address is confirmed.
   * @param email - The email address to check.
   * @returns boolean - True if the email is confirmed, false otherwise.
   * @throws AppError - If the email cannot be checked.
   */
  public async checkIfConfirmed(email: string): Promise<boolean> {
    try {
      logger.info('checkIfConfirmed', {email: email});
      // Query the collection for the email address.
      const emailQuery = await this.params.firestoreService.queryCollection(
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
        return false;
      }
      const emailObject = Email.fromData(emailQuery[0]);
      return emailObject.confirmed;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new EmailConfirmationError(
          'Error checking if email is confirmed',
          email,
          error instanceof Error ? error.toString() : 'unknown'
        );
      }
    }
  }
}
