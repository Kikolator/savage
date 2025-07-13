import {describe, it, expect} from '@jest/globals';
import {ScheduleFunction} from 'firebase-functions/v2/scheduler';

import {
  InitializeScheduledEvents,
  ScheduledV2Function,
  AddScheduledEvent,
} from '../../src/scheduled-events/initialize-scheduled-events';

// Mock implementation for testing
class MockScheduledEvents implements InitializeScheduledEvents {
  initialize(add: AddScheduledEvent): void {
    const mockHandler = (() =>
      Promise.resolve()) as unknown as ScheduleFunction;

    add({
      name: 'testEvent1',
      handler: mockHandler,
    });

    add({
      name: 'testEvent2',
      handler: mockHandler,
    });
  }
}

describe('InitializeScheduledEvents', () => {
  describe('interface implementation', () => {
    it('should implement the initialize method correctly', () => {
      const events = new MockScheduledEvents();
      const addMock = jest.fn();

      events.initialize(addMock);

      expect(addMock).toHaveBeenCalledTimes(2);
      expect(addMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testEvent1',
          handler: expect.any(Function),
        })
      );
      expect(addMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testEvent2',
          handler: expect.any(Function),
        })
      );
    });
  });

  describe('type definitions', () => {
    it('should have correct ScheduledV2Function type', () => {
      const mockHandler = (() =>
        Promise.resolve()) as unknown as ScheduleFunction;
      const scheduledFunction: ScheduledV2Function = {
        name: 'testEvent',
        handler: mockHandler,
      };

      expect(scheduledFunction.name).toBe('testEvent');
      expect(typeof scheduledFunction.handler).toBe('function');
    });

    it('should have correct AddScheduledEvent type', () => {
      const addFunction: AddScheduledEvent = jest.fn();
      const mockHandler = (() =>
        Promise.resolve()) as unknown as ScheduleFunction;

      addFunction({
        name: 'testEvent',
        handler: mockHandler,
      });

      expect(addFunction).toHaveBeenCalledWith({
        name: 'testEvent',
        handler: mockHandler,
      });
    });
  });
});
