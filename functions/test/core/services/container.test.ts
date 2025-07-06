import {describe, it, expect, beforeEach, afterEach} from '@jest/globals';

import {DIContainer} from '../../../src/core/services/di/container';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(() => {
    container.clear();
  });

  it('should register and resolve a service', () => {
    const mockService = {test: 'value'};
    container.register('test', () => mockService);

    const resolved = container.resolve('test');
    expect(resolved).toBe(mockService);
  });

  it('should register and resolve a singleton service', () => {
    let callCount = 0;
    const factory = () => {
      callCount++;
      return {id: callCount};
    };

    container.registerSingletonFactory('singleton', factory);

    const first = container.resolve('singleton');
    const second = container.resolve('singleton');

    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it('should throw error when resolving unregistered service', () => {
    expect(() => {
      container.resolve('unregistered');
    }).toThrow(/Service "unregistered" not found/);
  });

  it('should check if service is registered', () => {
    expect(container.has('test')).toBe(false);

    container.register('test', () => ({}));
    expect(container.has('test')).toBe(true);
  });

  it('should clear all services', () => {
    container.register('test1', () => ({}));
    container.register('test2', () => ({}));

    expect(container.has('test1')).toBe(true);
    expect(container.has('test2')).toBe(true);

    container.clear();

    expect(container.has('test1')).toBe(false);
    expect(container.has('test2')).toBe(false);
  });
});

// ServiceResolver tests would require mocking the actual services
// and are better suited for integration tests
