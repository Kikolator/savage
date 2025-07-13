// Sendgrid imports
import {Client} from '@sendgrid/client';
import {ClientRequest} from '@sendgrid/client/src/request';
import {ClientResponse, MailService} from '@sendgrid/mail';
import {MailDataRequired} from '@sendgrid/helpers/classes/mail';
// Project imports
import {DocumentData} from 'firebase-admin/firestore';

import {
  SendgridContactRequest,
  SendgridCustomField,
  SendgridCustomFieldResponse,
  SendgridList,
  SendgridListResponse,
  OfficeRndMember,
} from '../data/models';
import {getConfig} from '../config';
import {
  SendgridServiceError,
  FirestoreServiceError,
  FirestoreErrorCode,
} from '../errors';
import {isDevelopment} from '../utils/environment';
import {OfficeRndMemberStatus} from '../data/enums';

import {BaseServiceWithDependencies} from './base-service';
import {FirestoreService} from './firestore-service';

interface SendgridServiceDependencies {
  firestoreService: FirestoreService;
}

export class SendgridService extends BaseServiceWithDependencies<SendgridServiceDependencies> {
  private apiKey: string | null = null;
  private client: Client | null = null;
  private mail: MailService | null = null;
  private static instance: SendgridService | null = null;
  private config: ReturnType<typeof getConfig>['runtime']['sendgrid'] | null =
    null;

  constructor(dependencies: SendgridServiceDependencies) {
    super(dependencies);
    // Defer config access until first use to avoid deployment issues
  }

  /**
   * Get singleton instance of SendgridService
   * @param dependencies - Required dependencies for the service
   * @returns Singleton instance of SendgridService
   */
  public static getInstance(
    dependencies: SendgridServiceDependencies
  ): SendgridService {
    if (!SendgridService.instance) {
      SendgridService.instance = new SendgridService(dependencies);
    }
    return SendgridService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    SendgridService.instance = null;
  }

  /**
   * Get the FirestoreService dependency
   */
  private get firestoreService(): FirestoreService {
    return this.getDependency('firestoreService');
  }

  /**
   * Initialize SendGrid client and mail service
   */
  protected async performInitialization(): Promise<void> {
    try {
      this.logMethodEntry('performInitialization');

      // Get config on first use to avoid deployment issues
      if (!this.config) {
        const appConfig = getConfig();
        this.config = appConfig.runtime.sendgrid;
      }

      if (!this.apiKey) {
        this.apiKey = this.config!.apiKey;
        if (!this.apiKey) {
          throw SendgridServiceError.apiKeyMissing();
        }
      }

      if (!this.client) {
        this.client = new Client();
        this.client.setApiKey(this.apiKey);
      }

      if (!this.mail) {
        this.mail = new MailService();
        this.mail.setApiKey(this.apiKey);
      }

      this.logMethodSuccess('performInitialization');
    } catch (error) {
      this.logMethodError('performInitialization', error as Error);
      if (error instanceof SendgridServiceError) {
        throw error;
      }
      throw SendgridServiceError.unknownError(
        'Failed to initialize SendGrid service',
        {error}
      );
    }
  }

  /**
   * Add contacts to SendGrid lists
   */
  public async addContacts(
    lists: Array<string>,
    contacts: Array<SendgridContactRequest>
  ): Promise<string> {
    this.logMethodEntry('addContacts', {
      listsCount: lists.length,
      contactsCount: contacts.length,
    });

    try {
      await this.ensureInitialized();

      if (!this.client) {
        throw SendgridServiceError.clientNotInitialized('addContacts');
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
        this.logMethodSuccess('addContacts', {developmentMode: true});
        return 'fake-contact-id';
      }

      const [response, body] = await this.client.request(request);

      if (response.statusCode !== 202) {
        throw SendgridServiceError.contactAdditionFailed(
          'addContacts',
          response.statusCode,
          response.body
        );
      }

      this.logMethodSuccess('addContacts', {
        responseStatus: response.statusCode,
      });
      return body;
    } catch (error) {
      this.logMethodError('addContacts', error as Error);
      if (error instanceof SendgridServiceError) {
        throw error;
      }
      throw SendgridServiceError.contactAdditionFailed(
        'addContacts',
        0,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Send an email to one or more recipients
   * If isMultiple is true, the multiple recipients will not see each other's email addresses
   */
  public async mailSend(
    mailData: MailDataRequired,
    isMultiple = false
  ): Promise<void> {
    this.logMethodEntry('mailSend', {isMultiple, to: mailData.to});

    try {
      await this.ensureInitialized();

      if (!this.mail) {
        throw SendgridServiceError.mailServiceNotInitialized('mailSend');
      }

      if (isDevelopment()) {
        this.logMethodSuccess('mailSend', {developmentMode: true});
        return;
      }

      const response: [ClientResponse, object] = await this.mail.send(
        mailData,
        isMultiple
      );

      if (response[0].statusCode !== 202) {
        throw SendgridServiceError.mailSendFailed(
          'mailSend',
          response[0].statusCode,
          response[0].body
        );
      }

      this.logMethodSuccess('mailSend', {
        responseStatus: response[0].statusCode,
      });
    } catch (error) {
      this.logMethodError('mailSend', error as Error);
      if (error instanceof SendgridServiceError) {
        throw error;
      }
      throw SendgridServiceError.mailSendFailed(
        'mailSend',
        0,
        undefined,
        error as Error
      );
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
    this.logMethodEntry('syncMemberToSendGrid', {
      memberId: member._id,
      email: member.email,
      status: member.status,
      previousStatus: previousMember?.status,
    });

    try {
      // Determine which lists this member should be in
      const targetListNames = this.determineTargetListNames(member);

      // Resolve list IDs from Firestore metadata (read operation)
      const targetListIds = await this.resolveListIds(targetListNames);

      // Create the contact object
      const contact = await this.createContactFromMember(member);

      // Add to target lists (write operation to SendGrid)
      if (targetListIds.length > 0) {
        await this.addContacts(targetListIds, [contact]);

        this.logMethodSuccess('syncMemberToSendGrid', {
          memberId: member._id,
          email: member.email,
          lists: targetListNames,
          listIds: targetListIds,
        });
      } else {
        this.logMethodSuccess('syncMemberToSendGrid', {
          memberId: member._id,
          email: member.email,
          reason: 'No matching list criteria',
        });
      }
    } catch (error) {
      this.logMethodError('syncMemberToSendGrid', error as Error);
      // Don't throw to avoid breaking the webhook flow
      // Just log the error and continue
    }
  }

  /**
   * Gets all SendGrid lists from Firestore (source of truth)
   */
  public async getLists(): Promise<Array<SendgridList>> {
    this.logMethodEntry('getLists');

    try {
      const query = await this.firestoreService.getCollection(
        'sendgrid/metadata/lists'
      );
      const listsResult: Array<SendgridList> = [];

      query.forEach((documentData: DocumentData) => {
        listsResult.push(documentData as SendgridList);
      });

      if (listsResult.length === 0) {
        this.logMethodSuccess('getLists', {
          warning: 'No lists found in Firestore',
        });
      } else {
        this.logMethodSuccess('getLists', {count: listsResult.length});
      }

      return listsResult;
    } catch (error) {
      this.logMethodError('getLists', error as Error);
      if (
        error instanceof FirestoreServiceError &&
        Number(error.code) === FirestoreErrorCode.COLLECTION_EMPTY
      ) {
        this.logMethodSuccess('getLists', {
          warning: 'Lists collection is empty',
        });
        return [];
      }
      throw error;
    }
  }

  /**
   * Gets all SendGrid custom fields from Firestore (source of truth)
   */
  public async getCustomFields(): Promise<Array<SendgridCustomField>> {
    this.logMethodEntry('getCustomFields');

    try {
      const query = await this.firestoreService.getCollection(
        'sendgrid/metadata/customFields'
      );
      const customFieldsResult: Array<SendgridCustomField> = [];

      query.forEach((documentData: DocumentData) => {
        customFieldsResult.push(documentData as SendgridCustomField);
      });

      if (customFieldsResult.length === 0) {
        this.logMethodSuccess('getCustomFields', {
          warning: 'No custom fields found in Firestore',
        });
      } else {
        this.logMethodSuccess('getCustomFields', {
          count: customFieldsResult.length,
        });
      }

      return customFieldsResult;
    } catch (error) {
      this.logMethodError('getCustomFields', error as Error);
      if (
        error instanceof FirestoreServiceError &&
        Number(error.code) === FirestoreErrorCode.COLLECTION_EMPTY
      ) {
        this.logMethodSuccess('getCustomFields', {
          warning: 'Custom fields collection is empty',
        });
        return [];
      }
      throw error;
    }
  }

  /**
   * Gets all SendGrid lists from SendGrid API (for scheduled sync)
   */
  public async getListsFromAPI(): Promise<Array<SendgridList>> {
    this.logMethodEntry('getListsFromAPI');

    try {
      await this.ensureInitialized();

      if (!this.client) {
        throw SendgridServiceError.clientNotInitialized('getListsFromAPI');
      }

      const request: ClientRequest = {
        url: '/v3/marketing/lists',
        method: 'GET',
      };

      const [response, body] = await this.client.request(request);

      if (response.statusCode !== 200) {
        throw SendgridServiceError.listsFetchFailed(
          'getListsFromAPI',
          response.statusCode,
          response.body
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

      this.logMethodSuccess('getListsFromAPI', {count: lists.length});
      return lists;
    } catch (error) {
      this.logMethodError('getListsFromAPI', error as Error);
      if (error instanceof SendgridServiceError) {
        throw error;
      }
      throw SendgridServiceError.listsFetchFailed(
        'getListsFromAPI',
        0,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Gets all SendGrid custom fields from SendGrid API (for scheduled sync)
   */
  public async getCustomFieldsFromAPI(): Promise<Array<SendgridCustomField>> {
    this.logMethodEntry('getCustomFieldsFromAPI');

    try {
      await this.ensureInitialized();

      if (!this.client) {
        throw SendgridServiceError.clientNotInitialized(
          'getCustomFieldsFromAPI'
        );
      }

      const request: ClientRequest = {
        url: '/v3/marketing/field_definitions',
        method: 'GET',
      };

      const [response, body] = await this.client.request(request);

      if (response.statusCode !== 200) {
        throw SendgridServiceError.customFieldsFetchFailed(
          'getCustomFieldsFromAPI',
          response.statusCode,
          response.body
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

      this.logMethodSuccess('getCustomFieldsFromAPI', {
        count: customFields.length,
      });
      return customFields;
    } catch (error) {
      this.logMethodError('getCustomFieldsFromAPI', error as Error);
      if (error instanceof SendgridServiceError) {
        throw error;
      }
      throw SendgridServiceError.customFieldsFetchFailed(
        'getCustomFieldsFromAPI',
        0,
        undefined,
        error as Error
      );
    }
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

    for (const listName of listNames) {
      try {
        // Query Firestore for the list by name
        const lists = await this.firestoreService.queryCollection(
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
          this.logMethodError(
            'resolveListIds',
            new Error(`SendGrid list not found: ${listName}`)
          );
          continue;
        }

        if (lists.length > 1) {
          this.logMethodError(
            'resolveListIds',
            new Error(`Multiple SendGrid lists found with name: ${listName}`)
          );
        }

        // Use the first matching list
        const list = lists[0] as SendgridList;
        listIds.push(list.id);
      } catch (error) {
        this.logMethodError('resolveListIds', error as Error);
        throw SendgridServiceError.listResolutionFailed(
          'resolveListIds',
          listName,
          error as Error
        );
      }
    }

    return listIds;
  }

  /**
   * Creates a SendGrid contact object from an Office R nd member
   */
  private async createContactFromMember(
    member: OfficeRndMember
  ): Promise<SendgridContactRequest> {
    try {
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
          // Map Office R nd data to SendGrid custom fields
          [customFields.membership_status || 'membership_status']:
            member.status,
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
    } catch (error) {
      throw SendgridServiceError.contactCreationFailed(
        'createContactFromMember',
        member._id,
        error as Error
      );
    }
  }

  /**
   * Gets custom field ID mappings from Firestore metadata
   */
  private async getCustomFieldMappings(): Promise<{[key: string]: string}> {
    try {
      // Get all custom fields from Firestore
      const customFields = await this.firestoreService.getCollection(
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
      this.logMethodError('getCustomFieldMappings', error as Error);
      throw SendgridServiceError.customFieldMappingsFailed(
        'getCustomFieldMappings',
        error as Error
      );
    }
  }

  /**
   * Removes a member from SendGrid
   */
  public async removeMemberFromSendGrid(
    member: OfficeRndMember
  ): Promise<void> {
    this.logMethodEntry('removeMemberFromSendGrid', {
      memberId: member._id,
      email: member.email,
    });

    try {
      // TODO: Implement contact removal
      // SendGrid doesn't have a direct "remove from all lists" API
      // We would need to remove from each list individually.
      // This is not a priority for now.

      this.logMethodSuccess('removeMemberFromSendGrid', {
        memberId: member._id,
        email: member.email,
        note: 'Removal not yet implemented',
      });
    } catch (error) {
      this.logMethodError('removeMemberFromSendGrid', error as Error);
      // Don't throw to avoid breaking the webhook flow
      // Just log the error and continue
    }
  }
}
