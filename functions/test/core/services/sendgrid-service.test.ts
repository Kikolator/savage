import {SendgridService} from '../../../src/core/services/sendgrid-service';
import {
  SendgridServiceError,
  FirestoreServiceError,
  FirestoreErrorCode,
} from '../../../src/core/errors';
import {OfficeRndMemberStatus} from '../../../src/core/data/enums';

// Mock the config module
jest.mock('../../../src/core/config', () => ({
  getConfig: jest.fn(() => ({
    runtime: {
      sendgrid: {
        apiKey: 'test-api-key',
        templates: {
          trialdayConfirmation: 'template-1',
          trialdayFollowUp: 'template-2',
        },
      },
    },
  })),
}));

// Mock the environment utility
jest.mock('../../../src/core/utils/environment', () => ({
  isDevelopment: jest.fn(() => false),
}));

// Mock SendGrid classes
const mockClient = {
  setApiKey: jest.fn(),
  request: jest.fn(),
};

const mockMailService = {
  setApiKey: jest.fn(),
  send: jest.fn(),
};

jest.mock('@sendgrid/client', () => ({
  Client: jest.fn(() => mockClient),
}));

jest.mock('@sendgrid/mail', () => ({
  MailService: jest.fn(() => mockMailService),
}));

const mockFirestoreService = {
  queryCollection: jest.fn(),
  createDocumentReference: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  getDocument: jest.fn(),
  setDocument: jest.fn(),
  getCollection: jest.fn(),
};

const baseDeps = () => ({
  firestoreService: mockFirestoreService,
});

const sampleMember = {
  _id: 'member-1',
  name: 'John Doe',
  email: 'john@example.com',
  status: OfficeRndMemberStatus.ACTIVE,
  location: 'loc-1',
  company: 'company-1',
  startDate: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  modifiedAt: new Date('2024-01-01'),
  properties: {
    receiveNewsletter: true,
    trialdayCompleted: true,
    referralCodeUsed: 'REF123',
    referralPermission: true,
    accessCode: 'ACCESS123',
    phoneNumber: '+1234567890',
  },
  toDocumentData: jest.fn(),
  toJson: jest.fn(),
} as any;

const sampleMailData = {
  from: {
    email: 'test@example.com',
    name: 'Test Sender',
  },
  to: 'recipient@example.com',
  subject: 'Test Email',
  text: 'Test content',
};

describe('SendgridService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SendgridService.reset();

    // Reset mock config to default
    const mockConfig = jest.requireMock('../../../src/core/config');
    mockConfig.getConfig.mockReturnValue({
      runtime: {
        sendgrid: {
          apiKey: 'test-api-key',
          templates: {
            trialdayConfirmation: 'template-1',
            trialdayFollowUp: 'template-2',
          },
        },
      },
    });
  });

  describe('Singleton Pattern', () => {
    it('should implement singleton pattern', () => {
      const instance1 = SendgridService.getInstance(baseDeps() as any);
      const instance2 = SendgridService.getInstance(baseDeps() as any);
      expect(instance1).toBe(instance2);

      SendgridService.reset();
      const instance3 = SendgridService.getInstance(baseDeps() as any);
      expect(instance3).not.toBe(instance1);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      const service = SendgridService.getInstance(baseDeps() as any);
      await service['ensureInitialized']();

      expect(mockClient.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(mockMailService.setApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('should throw error if API key is missing', async () => {
      const mockConfig = jest.requireMock('../../../src/core/config');
      mockConfig.getConfig.mockReturnValueOnce({
        runtime: {
          sendgrid: {
            apiKey: null,
          },
        },
      });

      const service = SendgridService.getInstance(baseDeps() as any);
      await expect(service['ensureInitialized']()).rejects.toThrow(
        SendgridServiceError
      );
    });
  });

  describe('addContacts', () => {
    it('should add contacts successfully', async () => {
      mockClient.request.mockResolvedValueOnce([
        {statusCode: 202, body: 'success'},
        {contact_id: 'contact-123'},
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.addContacts(
        ['list-1'],
        [
          {
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
          },
        ]
      );

      expect(mockClient.request).toHaveBeenCalledWith({
        url: '/v3/marketing/contacts',
        method: 'PUT',
        body: {
          list_ids: ['list-1'],
          contacts: [
            {
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
            },
          ],
        },
      });
      expect(result).toEqual({contact_id: 'contact-123'});
    });

    it('should return fake ID in development mode', async () => {
      const mockEnvironment = jest.requireMock(
        '../../../src/core/utils/environment'
      );
      mockEnvironment.isDevelopment.mockReturnValueOnce(true);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.addContacts(
        ['list-1'],
        [
          {
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
          },
        ]
      );

      expect(result).toBe('fake-contact-id');
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      mockClient.request.mockResolvedValueOnce([
        {statusCode: 400, body: 'Bad Request'},
        {error: 'Invalid request'},
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      await expect(
        service.addContacts(
          ['list-1'],
          [
            {
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
            },
          ]
        )
      ).rejects.toThrow(SendgridServiceError);
    });
  });

  describe('mailSend', () => {
    it('should send email successfully', async () => {
      mockMailService.send.mockResolvedValueOnce([
        {statusCode: 202, body: 'success'},
        {},
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      await service.mailSend(sampleMailData);

      expect(mockMailService.send).toHaveBeenCalledWith(sampleMailData, false);
    });

    it('should send email with multiple recipients', async () => {
      mockMailService.send.mockResolvedValueOnce([
        {statusCode: 202, body: 'success'},
        {},
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      await service.mailSend(sampleMailData, true);

      expect(mockMailService.send).toHaveBeenCalledWith(sampleMailData, true);
    });

    it('should skip sending in development mode', async () => {
      const mockEnvironment = jest.requireMock(
        '../../../src/core/utils/environment'
      );
      mockEnvironment.isDevelopment.mockReturnValueOnce(true);

      const service = SendgridService.getInstance(baseDeps() as any);
      await service.mailSend(sampleMailData);

      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      mockMailService.send.mockResolvedValueOnce([
        {statusCode: 400, body: 'Bad Request'},
        {},
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      await expect(service.mailSend(sampleMailData)).rejects.toThrow(
        SendgridServiceError
      );
    });
  });

  describe('getLists', () => {
    it('should get lists from Firestore successfully', async () => {
      const mockLists = [
        {id: 'list-1', name: 'members', contactCount: 100},
        {id: 'list-2', name: 'leads', contactCount: 50},
      ];

      mockFirestoreService.getCollection.mockResolvedValueOnce(mockLists);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.getLists();

      expect(mockFirestoreService.getCollection).toHaveBeenCalledWith(
        'sendgrid/metadata/lists'
      );
      expect(result).toEqual(mockLists);
    });

    it('should return empty array when no lists found', async () => {
      mockFirestoreService.getCollection.mockResolvedValueOnce([]);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.getLists();

      expect(result).toEqual([]);
    });

    it('should handle Firestore collection empty error', async () => {
      mockFirestoreService.getCollection.mockRejectedValueOnce(
        new FirestoreServiceError(
          'Collection empty',
          FirestoreErrorCode.COLLECTION_EMPTY
        )
      );

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.getLists();

      expect(result).toEqual([]);
    });
  });

  describe('getCustomFields', () => {
    it('should get custom fields from Firestore successfully', async () => {
      const mockFields = [
        {id: 'field-1', name: 'membership_status', type: 'text'},
        {id: 'field-2', name: 'newsletter_opt_in', type: 'boolean'},
      ];

      mockFirestoreService.getCollection.mockResolvedValueOnce(mockFields);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.getCustomFields();

      expect(mockFirestoreService.getCollection).toHaveBeenCalledWith(
        'sendgrid/metadata/customFields'
      );
      expect(result).toEqual(mockFields);
    });

    it('should return empty array when no custom fields found', async () => {
      mockFirestoreService.getCollection.mockResolvedValueOnce([]);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.getCustomFields();

      expect(result).toEqual([]);
    });
  });

  describe('getListsFromAPI', () => {
    it('should get lists from SendGrid API successfully', async () => {
      const mockApiResponse = {
        result: [
          {id: 'list-1', name: 'members', contact_count: 100},
          {id: 'list-2', name: 'leads', contact_count: 50},
        ],
      };
      mockClient.request.mockResolvedValueOnce([
        {statusCode: 200, body: 'success'},
        mockApiResponse,
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.getListsFromAPI();

      expect(mockClient.request).toHaveBeenCalledWith({
        url: '/v3/marketing/lists',
        method: 'GET',
      });
      expect(result).toEqual([
        {id: 'list-1', name: 'members', contactCount: 100},
        {id: 'list-2', name: 'leads', contactCount: 50},
      ]);
    });

    it('should throw error on API failure', async () => {
      mockClient.request.mockResolvedValueOnce([
        {statusCode: 400, body: 'Bad Request'},
        {error: 'Invalid request'},
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      await expect(service.getListsFromAPI()).rejects.toThrow(
        SendgridServiceError
      );
    });
  });

  describe('getCustomFieldsFromAPI', () => {
    it('should get custom fields from SendGrid API successfully', async () => {
      const mockApiResponse = {
        custom_fields: [
          {id: 'field-1', name: 'membership_status', field_type: 'text'},
          {id: 'field-2', name: 'newsletter_opt_in', field_type: 'boolean'},
        ],
      };
      mockClient.request.mockResolvedValueOnce([
        {statusCode: 200, body: 'success'},
        mockApiResponse,
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      const result = await service.getCustomFieldsFromAPI();

      expect(mockClient.request).toHaveBeenCalledWith({
        url: '/v3/marketing/field_definitions',
        method: 'GET',
      });
      expect(result).toEqual([
        {id: 'field-1', name: 'membership_status', type: 'text'},
        {id: 'field-2', name: 'newsletter_opt_in', type: 'boolean'},
      ]);
    });

    it('should throw error on API failure', async () => {
      mockClient.request.mockResolvedValueOnce([
        {statusCode: 400, body: 'Bad Request'},
        {error: 'Invalid request'},
      ]);

      const service = SendgridService.getInstance(baseDeps() as any);
      await expect(service.getCustomFieldsFromAPI()).rejects.toThrow(
        SendgridServiceError
      );
    });
  });

  describe('removeMemberFromSendGrid', () => {
    it('should handle member removal (not yet implemented)', async () => {
      const service = SendgridService.getInstance(baseDeps() as any);
      await service.removeMemberFromSendGrid(sampleMember);

      // Currently just logs that removal is not implemented
      // No actual API calls should be made
    });
  });

  describe('Private Methods', () => {
    describe('determineTargetListNames', () => {
      it('should determine correct lists for active member with newsletter', () => {
        const service = SendgridService.getInstance(baseDeps() as any);
        const result = service['determineTargetListNames'](sampleMember);

        expect(result).toEqual(['members', 'newsletter']);
      });

      it('should determine correct lists for lead', () => {
        const leadMember = {
          ...sampleMember,
          status: OfficeRndMemberStatus.LEAD,
        };
        const service = SendgridService.getInstance(baseDeps() as any);
        const result = service['determineTargetListNames'](leadMember);

        expect(result).toEqual(['leads', 'newsletter']);
      });

      it('should determine correct lists for contact', () => {
        const contactMember = {
          ...sampleMember,
          status: OfficeRndMemberStatus.CONTACT,
        };
        const service = SendgridService.getInstance(baseDeps() as any);
        const result = service['determineTargetListNames'](contactMember);

        expect(result).toEqual(['leads', 'newsletter']);
      });

      it('should not include newsletter for member without permission', () => {
        const memberWithoutNewsletter = {
          ...sampleMember,
          properties: {...sampleMember.properties, receiveNewsletter: false},
        };
        const service = SendgridService.getInstance(baseDeps() as any);
        const result = service['determineTargetListNames'](
          memberWithoutNewsletter
        );

        expect(result).toEqual(['members']);
      });
    });

    describe('resolveListIds', () => {
      it('should resolve list names to IDs successfully', async () => {
        mockFirestoreService.queryCollection.mockResolvedValueOnce([
          {id: 'list-1', name: 'members'},
        ]);

        const service = SendgridService.getInstance(baseDeps() as any);
        const result = await service['resolveListIds'](['members']);

        expect(mockFirestoreService.queryCollection).toHaveBeenCalledWith(
          'sendgrid/metadata/lists',
          [{field: 'name', operator: '==', value: 'members'}]
        );
        expect(result).toEqual(['list-1']);
      });

      it('should handle missing list gracefully', async () => {
        mockFirestoreService.queryCollection.mockResolvedValueOnce([]);

        const service = SendgridService.getInstance(baseDeps() as any);
        const result = await service['resolveListIds'](['nonexistent']);

        expect(result).toEqual([]);
      });

      it('should throw error on query failure', async () => {
        mockFirestoreService.queryCollection.mockRejectedValueOnce(
          new Error('Database error')
        );

        const service = SendgridService.getInstance(baseDeps() as any);
        await expect(service['resolveListIds'](['members'])).rejects.toThrow(
          SendgridServiceError
        );
      });
    });

    describe('getCustomFieldMappings', () => {
      it('should get custom field mappings successfully', async () => {
        const mockFields = [
          {name: 'membership_status', id: 'field-1'},
          {name: 'newsletter_opt_in', id: 'field-2'},
        ];
        mockFirestoreService.getCollection.mockResolvedValueOnce(mockFields);

        const service = SendgridService.getInstance(baseDeps() as any);
        const result = await service['getCustomFieldMappings']();

        expect(result).toEqual({
          membership_status: 'field-1',
          newsletter_opt_in: 'field-2',
        });
      });

      it('should throw error on mapping failure', async () => {
        mockFirestoreService.getCollection.mockRejectedValueOnce(
          new Error('Database error')
        );

        const service = SendgridService.getInstance(baseDeps() as any);
        await expect(service['getCustomFieldMappings']()).rejects.toThrow(
          SendgridServiceError
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should wrap generic errors in SendgridServiceError', async () => {
      mockClient.request.mockRejectedValueOnce(new Error('Network error'));

      const service = SendgridService.getInstance(baseDeps() as any);
      await expect(
        service.addContacts(
          ['list-1'],
          [
            {
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
            },
          ]
        )
      ).rejects.toThrow(SendgridServiceError);
    });
  });
});
