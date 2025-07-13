import {logger} from 'firebase-functions/v2';

import {SendgridScheduledEvents} from '../../../src/scheduled-events/on-schedule-events/sendgrid-scheduled-events';
import {FirestoreService} from '../../../src/core/services/firestore-service';
import {container} from '../../../src/core/services/di/container';
import * as environment from '../../../src/core/utils/environment';
import {SendgridScheduledEventError} from '../../../src/core/errors';
import {SendgridCustomField, SendgridList} from '../../../src/core/data/models';

jest.mock('../../../src/core/services/firestore-service');
jest.mock('../../../src/core/services/sendgrid-service');
jest.mock('../../../src/core/services/di/container');
jest.mock('../../../src/core/utils/environment');

// Define proper types for mocks
interface MockFirestoreService {
  runBatch: jest.Mock;
  setDocument: jest.Mock;
  addSetToBatch: jest.Mock;
  createDocument: jest.Mock;
}

interface MockSendgridService {
  getCustomFieldsFromAPI: jest.Mock;
  getListsFromAPI: jest.Mock;
}

interface MockBatch {
  [key: string]: unknown;
}

const mockFirestoreService: MockFirestoreService = {
  runBatch: jest.fn(),
  setDocument: jest.fn(),
  addSetToBatch: jest.fn(),
  createDocument: jest.fn(),
};

const mockSendgridService: MockSendgridService = {
  getCustomFieldsFromAPI: jest.fn(),
  getListsFromAPI: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (FirestoreService.getInstance as jest.Mock).mockReturnValue(
    mockFirestoreService
  );
  (container.resolve as jest.Mock).mockImplementation((service: string) => {
    if (service === 'sendgrid') return mockSendgridService;
    return undefined;
  });
  (environment.isDevelopment as jest.Mock).mockReturnValue(false);
});

describe('SendgridScheduledEvents', () => {
  const events = new SendgridScheduledEvents();
  const add = jest.fn();

  it('should register the updateSendgrid scheduled event', () => {
    events.initialize(add);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({name: 'updateSendgrid'})
    );
  });

  describe('updateSendgrid scheduled handler', () => {
    const handler = (
      events as unknown as {updateSendgrid: {handler: () => Promise<void>}}
    ).updateSendgrid.handler;
    const customFields: SendgridCustomField[] = [
      {id: 'cf1', name: 'Field1', type: 'text'},
      {id: 'cf2', name: 'Field2', type: 'number'},
    ];
    const lists: SendgridList[] = [
      {id: 'l1', name: 'List1', contactCount: 10},
      {id: 'l2', name: 'List2', contactCount: 20},
    ];

    beforeEach(() => {
      mockFirestoreService.runBatch.mockImplementation(
        async (fn: (batch: MockBatch) => Promise<void>) => {
          const batch: MockBatch = {};
          await fn(batch);
        }
      );
      mockFirestoreService.addSetToBatch.mockClear();
      mockFirestoreService.setDocument.mockResolvedValue(undefined);
    });

    describe('Success scenarios', () => {
      it('should fetch, validate, and write custom fields and lists to Firestore', async () => {
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          customFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(lists);

        await handler();

        expect(mockSendgridService.getCustomFieldsFromAPI).toHaveBeenCalled();
        expect(mockSendgridService.getListsFromAPI).toHaveBeenCalled();
        // Should add all custom fields and lists to batch
        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(
          customFields.length + lists.length
        );
        // Should update sync metadata
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'sendgrid',
            documentId: 'metadata',
            merge: true,
            data: expect.objectContaining({
              syncStatus: expect.objectContaining({status: 'completed'}),
            }),
          })
        );
      });

      it('should handle empty custom fields and lists', async () => {
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue([]);
        mockSendgridService.getListsFromAPI.mockResolvedValue([]);

        await handler();

        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(0);
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'sendgrid',
            documentId: 'metadata',
            merge: true,
            data: expect.objectContaining({
              syncStatus: expect.objectContaining({
                status: 'completed',
                customFieldsCount: 0,
                listsCount: 0,
              }),
            }),
          })
        );
      });

      it('should handle null/undefined responses from API', async () => {
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(null);
        mockSendgridService.getListsFromAPI.mockResolvedValue(undefined);

        await handler();

        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(0);
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'sendgrid',
            documentId: 'metadata',
            merge: true,
            data: expect.objectContaining({
              syncStatus: expect.objectContaining({
                status: 'completed',
                customFieldsCount: 0,
                listsCount: 0,
              }),
            }),
          })
        );
      });
    });

    describe('Data validation scenarios', () => {
      it('should filter out invalid custom fields', async () => {
        const invalidCustomFields: Array<
          SendgridCustomField | Partial<SendgridCustomField> | null | undefined
        > = [
          {id: 'cf1', name: 'Field1', type: 'text'}, // valid
          {id: 'cf2', name: 'Field2'}, // missing type
          {id: 'cf3', type: 'number'}, // missing name
          null, // null item
          undefined, // undefined item
        ];
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          invalidCustomFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(lists);

        await handler();

        // Should only process valid custom fields
        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(
          1 + lists.length
        );
      });

      it('should filter out invalid lists', async () => {
        const invalidLists: Array<
          SendgridList | Partial<SendgridList> | null | undefined
        > = [
          {id: 'l1', name: 'List1', contactCount: 10}, // valid
          {id: 'l2', name: 'List2'}, // missing contactCount
          {id: 'l3', contactCount: 20}, // missing name
          null, // null item
          undefined, // undefined item
        ];
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          customFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(invalidLists);

        await handler();

        // Should only process valid lists
        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(
          customFields.length + 1
        );
      });

      it('should handle non-array responses from API', async () => {
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          'not an array'
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(lists);

        await expect(handler()).rejects.toThrow(SendgridScheduledEventError);
      });
    });

    describe('Batch chunking scenarios', () => {
      it('should process large datasets in chunks', async () => {
        // Create more than 500 items to trigger chunking
        const largeCustomFields: SendgridCustomField[] = Array.from(
          {length: 300},
          (_, i) => ({
            id: `cf${i}`,
            name: `Field${i}`,
            type: 'text',
          })
        );
        const largeLists: SendgridList[] = Array.from(
          {length: 300},
          (_, i) => ({
            id: `l${i}`,
            name: `List${i}`,
            contactCount: i,
          })
        );

        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          largeCustomFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(largeLists);

        await handler();

        // Should call runBatch multiple times (600 items / 500 max batch size = 2 batches)
        expect(mockFirestoreService.runBatch).toHaveBeenCalledTimes(2);
        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(600);
      });

      it('should handle exact batch size boundary', async () => {
        // Create exactly 500 items
        const exactCustomFields: SendgridCustomField[] = Array.from(
          {length: 250},
          (_, i) => ({
            id: `cf${i}`,
            name: `Field${i}`,
            type: 'text',
          })
        );
        const exactLists: SendgridList[] = Array.from(
          {length: 250},
          (_, i) => ({
            id: `l${i}`,
            name: `List${i}`,
            contactCount: i,
          })
        );

        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          exactCustomFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(exactLists);

        await handler();

        // Should call runBatch once (exactly 500 items)
        expect(mockFirestoreService.runBatch).toHaveBeenCalledTimes(1);
        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(500);
      });
    });

    describe('Error handling scenarios', () => {
      it('should handle custom fields API error', async () => {
        const apiError = new Error('SendGrid API error');
        mockSendgridService.getCustomFieldsFromAPI.mockRejectedValue(apiError);
        mockSendgridService.getListsFromAPI.mockResolvedValue(lists);

        await expect(handler()).rejects.toThrow(SendgridScheduledEventError);

        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'sendgrid',
            documentId: 'metadata',
            merge: true,
            data: expect.objectContaining({
              syncStatus: expect.objectContaining({
                status: 'failed',
                error: 'SendGrid API error',
              }),
            }),
          })
        );
      });

      it('should handle lists API error', async () => {
        const apiError = new Error('SendGrid API error');
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          customFields
        );
        mockSendgridService.getListsFromAPI.mockRejectedValue(apiError);

        await expect(handler()).rejects.toThrow(SendgridScheduledEventError);

        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'sendgrid',
            documentId: 'metadata',
            merge: true,
            data: expect.objectContaining({
              syncStatus: expect.objectContaining({
                status: 'failed',
                error: 'SendGrid API error',
              }),
            }),
          })
        );
      });

      it('should handle Firestore batch error', async () => {
        const firestoreError = new Error('Firestore batch error');
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          customFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(lists);
        mockFirestoreService.runBatch.mockRejectedValue(firestoreError);

        await expect(handler()).rejects.toThrow(SendgridScheduledEventError);

        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'sendgrid',
            documentId: 'metadata',
            merge: true,
            data: expect.objectContaining({
              syncStatus: expect.objectContaining({
                status: 'failed',
                error: 'Firestore batch error',
              }),
            }),
          })
        );
      });

      it('should handle sync metadata update error', async () => {
        const metadataError = new Error('Metadata update error');
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          customFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(lists);
        mockFirestoreService.setDocument.mockRejectedValue(metadataError); // Always throw

        await handler(); // This should not throw, just log the error

        // Should still log the error but not break the main function
        expect(logger.warn).toHaveBeenCalledWith(
          'SendgridScheduledEvents.updateSyncMetadata()- Failed to update sync metadata',
          expect.any(Object)
        );
      });

      it('should log error to Firestore in production mode', async () => {
        const apiError = new Error('SendGrid API error');
        mockSendgridService.getCustomFieldsFromAPI.mockRejectedValue(apiError);
        mockFirestoreService.createDocument.mockResolvedValue(undefined);

        await expect(handler()).rejects.toThrow(SendgridScheduledEventError);

        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'errors',
            data: expect.objectContaining({
              name: 'SendgridScheduledEventError',
              functionName: 'updateSendgrid',
            }),
          })
        );
      });

      it('should not log error to Firestore in development mode', async () => {
        (environment.isDevelopment as jest.Mock).mockReturnValue(true);
        const apiError = new Error('SendGrid API error');
        mockSendgridService.getCustomFieldsFromAPI.mockRejectedValue(apiError);

        await expect(handler()).rejects.toThrow(SendgridScheduledEventError);

        expect(mockFirestoreService.createDocument).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
          'SendgridScheduledEvents.updateSendgrid()- In development mode, the error will not be logged in Firestore'
        );
      });

      it('should handle Firestore error logging failure', async () => {
        const apiError = new Error('SendGrid API error');
        const firestoreError = new Error('Firestore error logging failed');
        mockSendgridService.getCustomFieldsFromAPI.mockRejectedValue(apiError);
        mockFirestoreService.createDocument.mockRejectedValue(firestoreError);

        await expect(handler()).rejects.toThrow(SendgridScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'SendgridScheduledEvents.updateSendgrid()- Failed to log error to Firestore',
          expect.any(Object)
        );
      });
    });

    describe('Performance logging', () => {
      it('should log performance metrics for each stage', async () => {
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          customFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(lists);

        await handler();

        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining('customFieldsFetch- Performance metrics'),
          expect.objectContaining({
            stage: 'customFieldsFetch',
            dataCount: 2,
          })
        );

        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining('listsFetch- Performance metrics'),
          expect.objectContaining({
            stage: 'listsFetch',
            dataCount: 2,
          })
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle mixed valid and invalid data', async () => {
        const mixedCustomFields: Array<
          SendgridCustomField | Partial<SendgridCustomField>
        > = [
          {id: 'cf1', name: 'Field1', type: 'text'}, // valid
          {id: 'cf2', name: 'Field2'}, // invalid
          {id: 'cf3', name: 'Field3', type: 'text'}, // valid
        ];
        const mixedLists: Array<SendgridList | Partial<SendgridList>> = [
          {id: 'l1', name: 'List1', contactCount: 10}, // valid
          {id: 'l2', name: 'List2'}, // invalid
          {id: 'l3', name: 'List3', contactCount: 30}, // valid
        ];

        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          mixedCustomFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(mixedLists);

        await handler();

        // Should only process valid items
        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(4); // 2 valid custom fields + 2 valid lists
      });

      it('should handle empty arrays with null/undefined items', async () => {
        const emptyWithNulls: Array<null | undefined> = [null, undefined, null];
        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          emptyWithNulls
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(emptyWithNulls);

        await handler();

        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(0);
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: 'sendgrid',
            documentId: 'metadata',
            merge: true,
            data: expect.objectContaining({
              syncStatus: expect.objectContaining({
                status: 'completed',
                customFieldsCount: 3, // The original array length, not filtered count
                listsCount: 3, // The original array length, not filtered count
              }),
            }),
          })
        );
      });

      it('should handle very large datasets efficiently', async () => {
        // Create a very large dataset to test memory efficiency
        const largeCustomFields: SendgridCustomField[] = Array.from(
          {length: 1000},
          (_, i) => ({
            id: `cf${i}`,
            name: `Field${i}`,
            type: 'text',
          })
        );
        const largeLists: SendgridList[] = Array.from(
          {length: 1000},
          (_, i) => ({
            id: `l${i}`,
            name: `List${i}`,
            contactCount: i,
          })
        );

        mockSendgridService.getCustomFieldsFromAPI.mockResolvedValue(
          largeCustomFields
        );
        mockSendgridService.getListsFromAPI.mockResolvedValue(largeLists);

        await handler();

        // Should process in 4 chunks (2000 items / 500 max batch size = 4 batches)
        expect(mockFirestoreService.runBatch).toHaveBeenCalledTimes(4);
        expect(mockFirestoreService.addSetToBatch).toHaveBeenCalledTimes(2000);
      });
    });
  });
});
