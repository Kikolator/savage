import {jest, describe, it, expect, beforeEach} from '@jest/globals';

import {DIContainer} from '../../../src/core/services/di/container';

// Test interfaces
interface TestService {
  id: string;
  doSomething(): string;
}

interface AnotherService {
  name: string;
  getValue(): number;
}

class TestServiceImpl implements TestService {
  constructor(public id: string) {}

  doSomething(): string {
    return `Test service ${this.id} did something`;
  }
}

class AnotherServiceImpl implements AnotherService {
  constructor(public name: string) {}

  getValue(): number {
    return 42;
  }
}

describe('DI Container', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('Singleton Registration', () => {
    it('should register and resolve singleton service', () => {
      const testService = new TestServiceImpl('test-1');
      container.registerSingleton<TestService>('TestService', testService);

      const resolved = container.resolve<TestService>('TestService');
      expect(resolved).toBe(testService);
      expect(resolved.doSomething()).toBe('Test service test-1 did something');
    });

    it('should return the same instance for singleton services', () => {
      const testService = new TestServiceImpl('test-1');
      container.registerSingleton<TestService>('TestService', testService);

      const instance1 = container.resolve<TestService>('TestService');
      const instance2 = container.resolve<TestService>('TestService');

      expect(instance1).toBe(instance2);
    });

    it('should throw error when resolving unregistered service', () => {
      expect(() => {
        container.resolve<TestService>('UnregisteredService');
      }).toThrow('Service "UnregisteredService" not found');
    });
  });

  describe('Instance Registration', () => {
    it('should register and resolve instance service', () => {
      container.registerInstance<TestService>(
        'TestService',
        () => new TestServiceImpl('test-1')
      );

      const resolved = container.resolve<TestService>('TestService');
      expect(resolved).toBeInstanceOf(TestServiceImpl);
      expect(resolved.doSomething()).toBe('Test service test-1 did something');
    });

    it('should create new instance each time for instance services', () => {
      container.registerInstance<TestService>(
        'TestService',
        () => new TestServiceImpl('test-1')
      );

      const instance1 = container.resolve<TestService>('TestService');
      const instance2 = container.resolve<TestService>('TestService');

      expect(instance1).not.toBe(instance2);
      expect(instance1.doSomething()).toBe(instance2.doSomething());
    });
  });

  describe('Multiple Services', () => {
    it('should handle multiple different services', () => {
      const testService = new TestServiceImpl('test-1');
      const anotherService = new AnotherServiceImpl('another');

      container.registerSingleton<TestService>('TestService', testService);
      container.registerSingleton<AnotherService>(
        'AnotherService',
        anotherService
      );

      const resolvedTest = container.resolve<TestService>('TestService');
      const resolvedAnother =
        container.resolve<AnotherService>('AnotherService');

      expect(resolvedTest).toBe(testService);
      expect(resolvedAnother).toBe(anotherService);
      expect(resolvedTest.doSomething()).toBe(
        'Test service test-1 did something'
      );
      expect(resolvedAnother.getValue()).toBe(42);
    });

    it('should allow overriding services', () => {
      const originalService = new TestServiceImpl('original');
      const newService = new TestServiceImpl('new');

      container.registerSingleton<TestService>('TestService', originalService);
      container.registerSingleton<TestService>('TestService', newService);

      const resolved = container.resolve<TestService>('TestService');
      expect(resolved).toBe(newService);
      expect(resolved.doSomething()).toBe('Test service new did something');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for resolved services', () => {
      const testService = new TestServiceImpl('test-1');
      container.registerSingleton<TestService>('TestService', testService);

      const resolved: TestService =
        container.resolve<TestService>('TestService');

      // TypeScript should allow these calls
      expect(typeof resolved.id).toBe('string');
      expect(typeof resolved.doSomething).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for null or undefined service', () => {
      expect(() => {
        container.registerSingleton<TestService>('TestService', null as any);
      }).toThrow('Service instance cannot be null or undefined');

      expect(() => {
        container.registerSingleton<TestService>(
          'TestService',
          undefined as any
        );
      }).toThrow('Service instance cannot be null or undefined');
    });

    it('should throw error for null or undefined factory', () => {
      expect(() => {
        container.registerInstance<TestService>('TestService', null as any);
      }).toThrow('Service factory cannot be null or undefined');

      expect(() => {
        container.registerInstance<TestService>(
          'TestService',
          undefined as any
        );
      }).toThrow('Service factory cannot be null or undefined');
    });
  });
});
