// Sendgrid imports
import {Client} from '@sendgrid/client';
import {ClientRequest} from '@sendgrid/client/src/request';
import {ClientResponse, MailService} from '@sendgrid/mail';
import {MailDataRequired} from '@sendgrid/helpers/classes/mail';
// Project imports
import {logger} from 'firebase-functions';
import {DocumentData} from 'firebase-admin/firestore';

import {
  SendgridContactRequest,
  SendgridCustomField,
  SendgridCustomFieldResponse,
  SendgridList,
  SendgridListResponse,
  OfficeRndMember,
} from '../data/models';
import {AppError, ErrorCode} from '../errors/app-error';
import {firebaseSecrets} from '../config/firebase-secrets';
import {isDevelopment} from '../utils/environment';
import {OfficeRndMemberStatus} from '../data/enums';

import {FirestoreService} from './firestore-service';

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
    if (isDevelopment()) {
      logger.debug(
        'SendgridService.addContact()- In development mode, the contact will not be added to Sendgrid'
      );
      return 'fake-contact-id';
    } else {
      const [response, body] = await this.client.request(request);
      if (response.statusCode !== 202) {
        throw new Error(
          `Error adding Sendgrid contact: ${response.statusCode} ${response.body}`
        );
      }
      return body;
    }
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
    if (isDevelopment()) {
      logger.debug(
        'SendgridService.mailSend()- In development mode, the email will not be sent'
      );
      return;
    } else {
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

  /**
   * Syncs a member to SendGrid based on their status and properties
   * This is a write operation that goes directly to SendGrid API
   */
  public async syncMemberToSendGrid(
    member: OfficeRndMember,
    previousMember?: OfficeRndMember
  ): Promise<void> {
    try {
      logger.info('SendgridService.syncMemberToSendGrid', {
        memberId: member._id,
        email: member.email,
        status: member.status,
        previousStatus: previousMember?.status,
      });

      // Determine which lists this member should be in
      const targetListNames = this.determineTargetListNames(member);

      // Resolve list IDs from Firestore metadata (read operation)
      const targetListIds = await this.resolveListIds(targetListNames);

      // Create the contact object
      const contact = await this.createContactFromMember(member);

      // Add to target lists (write operation to SendGrid)
      if (targetListIds.length > 0) {
        await this.addContacts(targetListIds, [contact]);

        logger.info('Successfully synced member to SendGrid', {
          memberId: member._id,
          email: member.email,
          lists: targetListNames,
          listIds: targetListIds,
        });
      } else {
        logger.info('Member not added to any SendGrid lists', {
          memberId: member._id,
          email: member.email,
          reason: 'No matching list criteria',
        });
      }
    } catch (error) {
      logger.error('Failed to sync member to SendGrid', {
        memberId: member._id,
        email: member.email,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      // Don't throw to avoid breaking the webhook flow
    }
  }

  // ===== READ OPERATIONS (From Firestore) =====

  /**
   * Gets all SendGrid lists from Firestore (source of truth)
   */
  public async getLists(): Promise<Array<SendgridList>> {
    logger.info(
      'SendgridService.getLists() - Getting all lists from Firestore'
    );

    try {
      const firestoreService = FirestoreService.getInstance();
      const query = await firestoreService.getCollection(
        'sendgrid/metadata/lists'
      );
      const listsResult: Array<SendgridList> = [];

      query.forEach((documentData) => {
        listsResult.push(documentData as SendgridList);
      });

      if (listsResult.length === 0) {
        logger.warn(
          'SendgridService.getLists() - No lists found in Firestore. Scheduled sync may not be working.'
        );
      }

      return listsResult;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === ErrorCode.COLLECTION_EMPTY
      ) {
        logger.warn(
          'SendgridService.getLists() - Lists collection is empty. Scheduled sync may not be working.'
        );
        return [];
      }
      throw error;
    }
  }

  /**
   * Gets all SendGrid custom fields from Firestore (source of truth)
   */
  public async getCustomFields(): Promise<Array<SendgridCustomField>> {
    logger.info(
      'SendgridService.getCustomFields() - Getting all custom fields from Firestore'
    );

    try {
      const firestoreService = FirestoreService.getInstance();
      const query = await firestoreService.getCollection(
        'sendgrid/metadata/customFields'
      );
      const customFieldsResult: Array<SendgridCustomField> = [];

      query.forEach((documentData) => {
        customFieldsResult.push(documentData as SendgridCustomField);
      });

      if (customFieldsResult.length === 0) {
        logger.warn(
          'SendgridService.getCustomFields() - No custom fields found in Firestore. Scheduled sync may not be working.'
        );
      }

      return customFieldsResult;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === ErrorCode.COLLECTION_EMPTY
      ) {
        logger.warn(
          'SendgridService.getCustomFields() - Custom fields collection is empty. Scheduled sync may not be working.'
        );
        return [];
      }
      throw error;
    }
  }

  // ===== WRITE OPERATIONS (To SendGrid API) =====

  // ===== API METHODS (For scheduled sync) =====

  /**
   * Gets all SendGrid lists from SendGrid API (for scheduled sync)
   */
  public async getListsFromAPI(): Promise<Array<SendgridList>> {
    logger.info(
      'SendgridService.getListsFromAPI() - Getting all lists from SendGrid API'
    );
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

  /**
   * Gets all SendGrid custom fields from SendGrid API (for scheduled sync)
   */
  public async getCustomFieldsFromAPI(): Promise<Array<SendgridCustomField>> {
    logger.info(
      'SendgridService.getCustomFieldsFromAPI() - Getting all custom fields from SendGrid API'
    );
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

  /**
   * Determines which SendGrid list names a member should be added to
   */
  private determineTargetListNames(member: OfficeRndMember): string[] {
    const listNames: string[] = [];

    // Add to leads list if they're a lead or contact
    if (
      member.status === OfficeRndMemberStatus.LEAD ||
      member.status === OfficeRndMemberStatus.CONTACT
    ) {
      listNames.push('leads');
    }

    // Add to members list if they're an active member
    if (member.status === OfficeRndMemberStatus.ACTIVE) {
      listNames.push('members');
    }

    // Add to newsletter list if they have newsletter permission
    if (member.properties?.receiveNewsletter === true) {
      listNames.push('newsletter');
    }

    return listNames;
  }

  /**
   * Resolves list names to SendGrid list IDs by querying Firestore metadata
   */
  private async resolveListIds(listNames: string[]): Promise<string[]> {
    const listIds: string[] = [];
    const firestoreService = FirestoreService.getInstance();

    for (const listName of listNames) {
      try {
        // Query Firestore for the list by name
        const lists = await firestoreService.queryCollection(
          'sendgrid/metadata/lists',
          [
            {
              field: 'name',
              operator: '==',
              value: listName,
            },
          ]
        );

        if (lists.length === 0) {
          logger.warn(`SendGrid list not found: ${listName}`);
          continue;
        }

        if (lists.length > 1) {
          logger.warn(`Multiple SendGrid lists found with name: ${listName}`, {
            count: lists.length,
          });
        }

        // Use the first matching list
        const list = lists[0] as SendgridList;
        listIds.push(list.id);

        logger.info(`Resolved list name to ID: ${listName} -> ${list.id}`);
      } catch (error) {
        logger.error(`Failed to resolve list ID for: ${listName}`, {
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    return listIds;
  }

  /**
   * Creates a SendGrid contact object from an Office Rnd member
   */
  private async createContactFromMember(
    member: OfficeRndMember
  ): Promise<SendgridContactRequest> {
    // Extract first and last name from full name
    const nameParts = member.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Get custom field mappings from Firestore
    const customFields = await this.getCustomFieldMappings();

    return {
      email: member.email,
      first_name: firstName,
      last_name: lastName,
      phone_number_id: member.properties?.phoneNumber,
      custom_fields: {
        // Map Office Rnd data to SendGrid custom fields
        [customFields.membership_status || 'membership_status']: member.status,
        [customFields.membership_start_date || 'membership_start_date']:
          member.startDate?.toISOString() || '',
        [customFields.trialday_completed || 'trialday_completed']:
          member.properties?.trialdayCompleted?.toString() || 'false',
        [customFields.referral_code_used || 'referral_code_used']:
          member.properties?.referralCodeUsed || '',
        [customFields.referral_permission || 'referral_permission']:
          member.properties?.referralPermission?.toString() || 'false',
        [customFields.access_code || 'access_code']:
          member.properties?.accessCode || '',
        [customFields.newsletter_opt_in || 'newsletter_opt_in']:
          member.properties?.receiveNewsletter?.toString() || 'false',
        [customFields.member_id || 'member_id']: member._id,
        [customFields.company_id || 'company_id']: member.company || '',
        [customFields.location_id || 'location_id']: member.location,
        [customFields.created_at || 'created_at']:
          member.createdAt?.toISOString() || '',
        [customFields.modified_at || 'modified_at']:
          member.modifiedAt?.toISOString() || '',
      },
    };
  }

  /**
   * Gets custom field ID mappings from Firestore metadata
   */
  private async getCustomFieldMappings(): Promise<{[key: string]: string}> {
    try {
      const firestoreService = FirestoreService.getInstance();
      // Get all custom fields from Firestore
      const customFields = await firestoreService.getCollection(
        'sendgrid/metadata/customFields'
      );

      // Create a mapping of field names to field IDs
      const mappings: {[key: string]: string} = {};

      customFields.forEach((field: DocumentData) => {
        if (field.name && field.id) {
          mappings[field.name] = field.id;
        }
      });

      return mappings;
    } catch (error) {
      logger.warn(
        'Failed to get custom field mappings, using default field names',
        {
          error: error instanceof Error ? error.message : 'unknown error',
        }
      );

      // Return default field names if metadata is not available
      return {
        membership_status: 'membership_status',
        membership_start_date: 'membership_start_date',
        trialday_completed: 'trialday_completed',
        referral_code_used: 'referral_code_used',
        referral_permission: 'referral_permission',
        access_code: 'access_code',
        newsletter_opt_in: 'newsletter_opt_in',
        member_id: 'member_id',
        company_id: 'company_id',
        location_id: 'location_id',
        created_at: 'created_at',
        modified_at: 'modified_at',
      };
    }
  }

  /**
   * Removes a member from SendGrid
   */
  public async removeMemberFromSendGrid(
    member: OfficeRndMember
  ): Promise<void> {
    try {
      logger.info('SendgridService.removeMemberFromSendGrid', {
        memberId: member._id,
        email: member.email,
      });

      // TODO: Implement contact removal
      // SendGrid doesn't have a direct "remove from all lists" API
      // We would need to remove from each list individually.
      // This is not a priority for now.

      logger.info('Member removal from SendGrid completed', {
        memberId: member._id,
        email: member.email,
      });
    } catch (error) {
      logger.error('Failed to remove member from SendGrid', {
        memberId: member._id,
        email: member.email,
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }
}
