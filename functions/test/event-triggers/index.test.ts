import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';

import {OfficeRndMemberEvents} from '../../src/event-triggers/by-document/office-rnd-member-events';
import {
  InitializeEventTriggers,
  AddEventTrigger,
} from '../../src/event-triggers/initialize-event-triggers';

// Mock the logger
jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Event Triggers Integration', () => {
  let mockAddEventTrigger: jest.MockedFunction<AddEventTrigger>;
  let registeredFunctions: Array<{name: string; handler: any}>;

  beforeEach(() => {
    registeredFunctions = [];
    mockAddEventTrigger = jest.fn((eventTrigger) => {
      registeredFunctions.push(eventTrigger);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('OfficeRndMemberEvents', () => {
    it('should register both event handlers during initialization', () => {
      const officeRndMemberEvents = new OfficeRndMemberEvents();

      officeRndMemberEvents.initialize(mockAddEventTrigger);

      expect(mockAddEventTrigger).toHaveBeenCalledTimes(2);
      expect(registeredFunctions).toHaveLength(2);

      const functionNames = registeredFunctions.map((fn) => fn.name);
      expect(functionNames).toContain('onOfficeRndMemberCreated');
      expect(functionNames).toContain('onOfficeRndMemberStatusChanged');
    });

    it('should register handlers with correct structure', () => {
      const officeRndMemberEvents = new OfficeRndMemberEvents();

      officeRndMemberEvents.initialize(mockAddEventTrigger);

      registeredFunctions.forEach((eventTrigger) => {
        expect(eventTrigger).toHaveProperty('name');
        expect(eventTrigger).toHaveProperty('handler');
        expect(typeof eventTrigger.name).toBe('string');
        expect(typeof eventTrigger.handler).toBe('function');
      });
    });
  });

  describe('Event Trigger Registration Pattern', () => {
    it('should follow the InitializeEventTriggers interface', () => {
      const officeRndMemberEvents = new OfficeRndMemberEvents();

      expect(typeof officeRndMemberEvents.initialize).toBe('function');
      expect(officeRndMemberEvents.initialize.length).toBe(1);
    });

    it('should handle multiple event trigger classes', () => {
      // This test ensures the pattern works for multiple event trigger classes
      const officeRndMemberEvents = new OfficeRndMemberEvents();

      // Simulate registering multiple event trigger classes
      const eventTriggers: InitializeEventTriggers[] = [
        officeRndMemberEvents,
        // Add other event trigger classes here when they exist
      ];

      eventTriggers.forEach((eventTrigger) => {
        eventTrigger.initialize(mockAddEventTrigger);
      });

      // Should have registered functions from all event trigger classes
      expect(registeredFunctions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling in Event Trigger Registration', () => {
    it('should handle errors during event trigger registration gracefully', () => {
      const officeRndMemberEvents = new OfficeRndMemberEvents();

      // Mock a function that throws an error
      const errorThrowingAdd = jest.fn(() => {
        throw new Error('Registration failed');
      });

      expect(() => {
        officeRndMemberEvents.initialize(errorThrowingAdd);
      }).toThrow('Registration failed');
    });
  });
});
