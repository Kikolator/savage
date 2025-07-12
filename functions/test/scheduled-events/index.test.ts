import {describe, it, expect, beforeEach, jest} from '@jest/globals';
import {ScheduleFunction} from 'firebase-functions/v2/scheduler';

import {scheduledEvents} from '../../src/scheduled-events';

// Mock the scheduled events classes
jest.mock(
  '../../src/scheduled-events/on-schedule-events/sendgrid-scheduled-events',
  () => ({
    SendgridScheduledEvents: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockImplementation((add: any) => {
        const mockHandler = (() =>
          Promise.resolve()) as unknown as ScheduleFunction;
        add({name: 'updateSendgrid', handler: mockHandler});
      }),
    })),
  })
);

jest.mock(
  '../../src/scheduled-events/on-schedule-events/office-rnd-scheduled-events',
  () => ({
    OfficeRndScheduledEvents: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockImplementation((add: any) => {
        const mockHandler1 = (() =>
          Promise.resolve()) as unknown as ScheduleFunction;
        const mockHandler2 = (() =>
          Promise.resolve()) as unknown as ScheduleFunction;
        const mockHandler3 = (() =>
          Promise.resolve()) as unknown as ScheduleFunction;

        add({name: 'tokenGeneration', handler: mockHandler1});
        add({name: 'dataBackup', handler: mockHandler2});
        add({name: 'trialdayFollowup', handler: mockHandler3});
      }),
    })),
  })
);

describe('scheduled-events/index.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduledEvents function', () => {
    it('should return an object with scheduled event handlers', () => {
      const result = scheduledEvents();

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    it('should register all scheduled events from the list', () => {
      const result = scheduledEvents();

      // Should have handlers for all scheduled events
      expect(result.updateSendgrid).toBeDefined();
      expect(result.tokenGeneration).toBeDefined();
      expect(result.dataBackup).toBeDefined();
      expect(result.trialdayFollowup).toBeDefined();
    });

    it('should return functions for all registered handlers', () => {
      const result = scheduledEvents();

      // All values should be functions (ScheduleFunction handlers)
      Object.values(result).forEach((handler) => {
        expect(typeof handler).toBe('function');
      });
    });

    it('should use event names as keys in the response object', () => {
      const result = scheduledEvents();

      // Check that the keys match expected event names
      expect(Object.keys(result)).toContain('updateSendgrid');
      expect(Object.keys(result)).toContain('tokenGeneration');
      expect(Object.keys(result)).toContain('dataBackup');
      expect(Object.keys(result)).toContain('trialdayFollowup');
    });
  });

  describe('scheduledEventsList integration', () => {
    it('should initialize all scheduled events in the list', () => {
      const result = scheduledEvents();

      // Verify that all expected events are registered
      const expectedEvents = [
        'updateSendgrid',
        'tokenGeneration',
        'dataBackup',
        'trialdayFollowup',
      ];

      expectedEvents.forEach((eventName) => {
        expect(result[eventName]).toBeDefined();
        expect(typeof result[eventName]).toBe('function');
      });
    });

    it('should handle multiple scheduled events correctly', () => {
      const result = scheduledEvents();

      // Should have multiple events registered
      const eventCount = Object.keys(result).length;
      expect(eventCount).toBeGreaterThan(1);
    });
  });

  describe('error handling', () => {
    it('should not throw when initializing scheduled events', () => {
      expect(() => scheduledEvents()).not.toThrow();
    });
  });

  describe('handler function properties', () => {
    it('should return handlers that are callable', () => {
      const result = scheduledEvents();

      Object.values(result).forEach((handler) => {
        expect(typeof handler).toBe('function');
        // Note: We can't actually call these handlers in tests as they require
        // Firebase Functions context, but we can verify they're functions
      });
    });
  });
});
