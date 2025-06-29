// Sendgrid imports
import {Client} from '@sendgrid/client';
import {ClientRequest} from '@sendgrid/client/src/request';
import {ClientResponse, MailService} from '@sendgrid/mail';
import {MailDataRequired} from '@sendgrid/helpers/classes/mail';
// Project imports
import {logger} from 'firebase-functions';

import {
  SendgridContactRequest,
  SendgridCustomField,
  SendgridCustomFieldResponse,
  SendgridList,
  SendgridListResponse,
} from '../data/models';
import {AppError, ErrorCode} from '../errors/app-error';
import {firebaseSecrets} from '../config/firebase-secrets';

export class SendgridService {
  private apiKey: string | null = null;
  private client: Client | null = null;
  private mail: MailService | null = null;
  private static instance: SendgridService;

  private constructor() {
    // empty constructor, initialization will happen lazily
  }

  public static getInstance(): SendgridService {
    if (!SendgridService.instance) {
      SendgridService.instance = new SendgridService();
    }
    return SendgridService.instance;
  }

  private initialize() {
    if (!this.apiKey) {
      this.apiKey = firebaseSecrets.sendgridApiKey.value();
    }
    if (!this.client) {
      this.client = new Client();
      this.client.setApiKey(this.apiKey);
    }
    if (!this.mail) {
      this.mail = new MailService();
      this.mail.setApiKey(this.apiKey);
    }
    return;
  }

  public async getCustomFields(): Promise<Array<SendgridCustomField>> {
    logger.info('SendgridService.getCustomFields()- Getting custom fields');
    this.initialize();
    if (!this.client) {
      throw new AppError(
        'Sendgrid client not initialized',
        ErrorCode.UNKNOWN_ERROR
      );
    }
    const request: ClientRequest = {
      url: '/v3/marketing/field_definitions',
      method: 'GET',
    };
    const [response, body] = await this.client.request(request);
    if (response.statusCode !== 200) {
      throw new Error(
        `Error getting Sendgrid custom fields: ${response.statusCode} ${response.body}`
      );
    }
    const customFields: Array<SendgridCustomField> = [];
    body.custom_fields.forEach((field: SendgridCustomFieldResponse) => {
      customFields.push({
        id: field.id,
        name: field.name,
        type: field.field_type,
      });
    });
    return customFields;
  }

  public async getLists(): Promise<Array<SendgridList>> {
    logger.info('SendgridService.getLists()- Getting lists');
    this.initialize();
    if (!this.client) {
      throw new AppError(
        'Sendgrid client not initialized',
        ErrorCode.UNKNOWN_ERROR
      );
    }
    const request: ClientRequest = {
      url: '/v3/marketing/lists',
      method: 'GET',
    };
    const [response, body] = await this.client.request(request);
    if (response.statusCode !== 200) {
      throw new Error(
        `Error getting Sendgrid lists: ${response.statusCode} ${response.body}`
      );
    }
    const lists: Array<SendgridList> = [];
    body.result.forEach((list: SendgridListResponse) => {
      lists.push({
        id: list.id,
        name: list.name,
        contactCount: list.contact_count,
      });
    });
    return lists;
  }

  public async addContacts(
    lists: Array<string>,
    contacts: Array<SendgridContactRequest>
  ): Promise<string> {
    logger.info('SendgridService.addContact()- Adding contact');
    this.initialize();
    if (!this.client) {
      throw new AppError(
        'Sendgrid client not initialized',
        ErrorCode.UNKNOWN_ERROR
      );
    }
    const request: ClientRequest = {
      url: '/v3/marketing/contacts',
      method: 'PUT',
      body: {
        list_ids: lists,
        contacts: contacts,
      },
    };
    const [response, body] = await this.client.request(request);
    if (response.statusCode !== 202) {
      throw new Error(
        `Error adding Sendgrid contact: ${response.statusCode} ${response.body}`
      );
    }
    return body;
  }

  // Sends an email to one or more recipients.
  // If isMultiple is true, the multiple recipients will not see eachothers
  // email addresses.
  public async mailSend(
    mailData: MailDataRequired,
    isMultiple = false
  ): Promise<void> {
    logger.info('SendgridService.mailSend()- Sending email');
    this.initialize();
    if (!this.mail) {
      throw new AppError(
        'Sendgrid mail service not initialized',
        ErrorCode.UNKNOWN_ERROR
      );
    }
    // Send the email(s)
    const response: [ClientResponse, object] = await this.mail.send(
      mailData,
      isMultiple
    );
    // Check the response
    if (response[0].statusCode !== 202) {
      throw new AppError(
        `Error sending Sendgrid mail: ${response[0].statusCode} ${response[0].body}`,
        ErrorCode.SENDGRID_MAIL_SEND_FAILED
      );
    }
    return;
  }
}
