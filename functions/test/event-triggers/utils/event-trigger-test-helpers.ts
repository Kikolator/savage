import {jest} from '@jest/globals';

/**
 * Test utilities for event triggers
 */
export interface MockFirestoreEvent {
  params: Record<string, string>;
  data: {
    data?: () => any;
    before?: {
      data: () => any;
    };
    after?: {
      data: () => any;
    };
  };
}

/**
 * Creates a mock Firestore document creation event
 */
export const createMockDocumentCreatedEvent = (
  params: Record<string, string>,
  data: any = null
): MockFirestoreEvent => ({
  params,
  data: {
    data: jest.fn().mockReturnValue(data),
  },
});

/**
 * Creates a mock Firestore document update event
 */
export const createMockDocumentUpdatedEvent = (
  params: Record<string, string>,
  beforeData: any = null,
  afterData: any = null
): MockFirestoreEvent => ({
  params,
  data: {
    before: {
      data: jest.fn().mockReturnValue(beforeData),
    },
    after: {
      data: jest.fn().mockReturnValue(afterData),
    },
  },
});

/**
 * Creates a mock Firestore document deletion event
 */
export const createMockDocumentDeletedEvent = (
  params: Record<string, string>,
  data: any = null
): MockFirestoreEvent => ({
  params,
  data: {
    data: jest.fn().mockReturnValue(data),
  },
});

/**
 * Mock event trigger registration function
 */
export const createMockEventTriggerRegistrar = () => {
  const registeredFunctions: Array<{name: string; handler: any}> = [];

  const mockAdd = jest.fn((eventTrigger: any) => {
    registeredFunctions.push(eventTrigger);
  });

  return {
    mockAdd,
    registeredFunctions,
    getHandlerByName: (name: string) => {
      return registeredFunctions.find((fn) => fn.name === name)?.handler;
    },
    getAllHandlers: () => registeredFunctions,
  };
};

/**
 * Helper to extract event handler from event trigger class
 */
export const extractEventHandler = (
  eventTriggerClass: any,
  handlerName: string
): any => {
  const registrar = createMockEventTriggerRegistrar();
  eventTriggerClass.initialize(registrar.mockAdd);

  const handler = registrar.getHandlerByName(handlerName);
  if (!handler) {
    throw new Error(
      `Handler '${handlerName}' not found in event trigger class`
    );
  }

  return handler;
};

/**
 * Helper to test event handler with mock event
 */
export const testEventHandler = async (
  handler: any,
  event: MockFirestoreEvent,
  expectedCalls: Array<{
    method: string;
    args?: any[];
    times?: number;
  }> = []
) => {
  // Execute the handler
  await handler(event);

  // Verify expected calls
  expectedCalls.forEach(({method, args, times = 1}) => {
    if (args) {
      expect(method).toHaveBeenCalledWith(...args);
    }
    expect(method).toHaveBeenCalledTimes(times);
  });
};

/**
 * Helper to create mock OfficeRnd member data
 */
export const createMockOfficeRndMember = (overrides: any = {}) => ({
  _id: 'test-member-id',
  name: 'Test Member',
  email: 'test@example.com',
  location: 'Test Location',
  company: 'Test Company',
  status: 'active',
  startDate: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01T10:00:00Z'),
  modifiedAt: new Date('2024-01-01T10:00:00Z'),
  properties: {},
  ...overrides,
});

/**
 * Helper to create mock Trialday data
 */
export const createMockTrialday = (overrides: any = {}) => ({
  _id: 'test-trialday-id',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  company: 'Test Company',
  status: 'pending-email-confirmation',
  trialDateTime: new Date('2024-01-01T10:00:00Z'),
  referralCode: null,
  memberId: null,
  opportunityId: null,
  createdAt: new Date('2024-01-01T09:00:00Z'),
  modifiedAt: new Date('2024-01-01T09:00:00Z'),
  ...overrides,
});

/**
 * Helper to create mock service responses
 */
export const createMockServiceResponses = () => ({
  trialdayService: {
    sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    addToOfficeRnd: jest.fn().mockResolvedValue({
      member: createMockOfficeRndMember(),
      opportunity: {
        _id: 'test-opportunity-id',
        name: 'Test Opportunity',
        member: createMockOfficeRndMember(),
      },
    }),
    addOpportunityAndMemberIdsToTrialday: jest
      .fn()
      .mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(undefined),
    sendFollowUpEmail: jest.fn().mockResolvedValue(undefined),
    trialDaysCollection: 'trialDays',
  },

  referralService: {
    createReferral: jest.fn().mockResolvedValue(undefined),
  },

  officeRndService: {
    updateMember: jest.fn().mockResolvedValue(undefined),
  },
});

/**
 * Helper to verify error handling in event handlers
 */
export const testErrorHandling = async (
  handler: any,
  event: MockFirestoreEvent,
  expectedErrorType: any,
  expectedErrorMessage?: string
) => {
  if (expectedErrorMessage) {
    await expect(handler(event)).rejects.toThrow(expectedErrorType);
    await expect(handler(event)).rejects.toThrow(expectedErrorMessage);
  } else {
    await expect(handler(event)).rejects.toThrow(expectedErrorType);
  }
};

/**
 * Helper to verify logging in event handlers
 */
export const verifyLogging = (
  mockLogger: any,
  expectedLogLevel: 'info' | 'warn' | 'error' | 'debug',
  expectedMessage: string,
  expectedData?: any
) => {
  if (expectedData) {
    expect(mockLogger[expectedLogLevel]).toHaveBeenCalledWith(
      expectedMessage,
      expectedData
    );
  } else {
    expect(mockLogger[expectedLogLevel]).toHaveBeenCalledWith(expectedMessage);
  }
};

/**
 * Helper to verify no logging occurred
 */
export const verifyNoLogging = (mockLogger: any) => {
  expect(mockLogger.info).not.toHaveBeenCalled();
  expect(mockLogger.warn).not.toHaveBeenCalled();
  expect(mockLogger.error).not.toHaveBeenCalled();
  expect(mockLogger.debug).not.toHaveBeenCalled();
};
