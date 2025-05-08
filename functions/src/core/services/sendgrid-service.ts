import { Client } from '@sendgrid/client';
import {
  SendgridContactRequest,
  SendgridCustomField,
  SendgridCustomFieldResponse,
  SendgridList,
  SendgridListResponse,
} from '../data/models';
import { ClientRequest } from '@sendgrid/client/src/request';
import { logger } from 'firebase-functions';

export class SendgridService {
  private readonly client: Client;
  private static instance: SendgridService;

  private constructor(apiKey: string) {
    this.client = new Client();
    this.client.setApiKey(apiKey);
  }

  public static getInstance(apiKey: string): SendgridService {
    if (!SendgridService.instance) {
      SendgridService.instance = new SendgridService(apiKey);
    }
    return SendgridService.instance;
  }

  public async getCustomFields(): Promise<Array<SendgridCustomField>> {
    logger.info('SendgridService.getCustomFields()- Getting custom fields');
    const request: ClientRequest = {
      url: '/v3/marketing/field_definitions',
      method: 'GET',
    };
    const [response, body] = await this.client.request(request);

    if (response.statusCode !== 200) {
      throw new Error(`Error getting Sendgrid custom fields: ${response.statusCode} ${response.body}`);
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
    const request: ClientRequest = {
      url: '/v3/marketing/lists',
      method: 'GET',
    };
    const [response, body] = await this.client.request(request);
    if (response.statusCode !== 200) {
      throw new Error(`Error getting Sendgrid lists: ${response.statusCode} ${response.body}`);
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

  public async addContact(contact: SendgridContactRequest): Promise<string> {
    logger.info('SendgridService.addContact()- Adding contact');
    const request: ClientRequest = {
      url: '/v3/marketing/contacts',
      method: 'PUT',
      body: contact,
    };
    const [response, body] = await this.client.request(request);
    if (response.statusCode !== 202) {
      throw new Error(`Error adding Sendgrid contact: ${response.statusCode} ${response.body}`);
    }

    return body;
  }
}
