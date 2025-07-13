import {describe, it, expect, beforeEach, afterEach, jest} from '@jest/globals';

import {
  DIContainer,
  initializeContainer,
  container,
  ServiceKeys,
} from '../../../../src/core/services/di/container';

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

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(() => {
    container.clear();
  });

  describe('Basic Registration and Resolution', () => {
    it('should register and resolve a service', () => {
      const mockService = {test: 'value'};
      container.register('test', () => mockService);

      const resolved = container.resolve('test');
      expect(resolved).toBe(mockService);
    });

    it('should check if service is registered', () => {
      expect(container.has('test')).toBe(false);

      container.register('test', () => ({}));
      expect(container.has('test')).toBe(true);
    });

    it('should throw error when resolving unregistered service', () => {
      expect(() => {
        container.resolve('unregistered');
      }).toThrow(/Service "unregistered" not found/);
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

    it('should register and resolve a singleton service factory', () => {
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

    it('should work with generic types', () => {
      const stringService = 'test-string';
      const numberService = 42;

      container.registerSingleton<string>('StringService', stringService);
      container.registerSingleton<number>('NumberService', numberService);

      const resolvedString = container.resolve<string>('StringService');
      const resolvedNumber = container.resolve<number>('NumberService');

      expect(typeof resolvedString).toBe('string');
      expect(typeof resolvedNumber).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for null or undefined service instance', () => {
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

      expect(() => {
        container.registerSingletonFactory('TestService', null as any);
      }).toThrow('Service factory cannot be null or undefined');
    });

    it('should not throw error for null or undefined in register (no validation)', () => {
      // The register method doesn't validate for null/undefined factories
      expect(() => {
        container.register('TestService', null as any);
      }).not.toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    it('should maintain singleton state across multiple resolves', () => {
      let creationCount = 0;
      const factory = () => {
        creationCount++;
        return {id: creationCount, timestamp: Date.now()};
      };

      container.registerSingletonFactory('counter', factory);

      const first = container.resolve<{id: number; timestamp: number}>(
        'counter'
      );
      const second = container.resolve<{id: number; timestamp: number}>(
        'counter'
      );
      const third = container.resolve<{id: number; timestamp: number}>(
        'counter'
      );

      expect(creationCount).toBe(1);
      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(first.id).toBe(1);
    });

    it('should create new instances for regular registration', () => {
      let creationCount = 0;
      const factory = () => {
        creationCount++;
        return {id: creationCount, timestamp: Date.now()};
      };

      container.register('counter', factory);

      const first = container.resolve<{id: number; timestamp: number}>(
        'counter'
      );
      const second = container.resolve<{id: number; timestamp: number}>(
        'counter'
      );
      const third = container.resolve<{id: number; timestamp: number}>(
        'counter'
      );

      expect(creationCount).toBe(3);
      expect(first).not.toBe(second);
      expect(second).not.toBe(third);
      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
      expect(third.id).toBe(3);
    });
  });
});

describe('initializeContainer', () => {
  beforeEach(() => {
    // Clear the global container before each test
    container.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear the global container after each test
    container.clear();
  });

  it('should register all required services', () => {
    // Call initializeContainer
    initializeContainer();

    // Verify that all expected services are registered
    expect(container.has(ServiceKeys.FIRESTORE)).toBe(true);
    expect(container.has(ServiceKeys.SENDGRID)).toBe(true);
    expect(container.has(ServiceKeys.OFFICE_RND)).toBe(true);
    expect(container.has(ServiceKeys.BANK_PAYOUT)).toBe(true);
    expect(container.has(ServiceKeys.EMAIL_CONFIRMATION)).toBe(true);
    expect(container.has(ServiceKeys.REWARD)).toBe(true);
    expect(container.has(ServiceKeys.REFERRAL)).toBe(true);
    expect(container.has(ServiceKeys.TRIALDAY)).toBe(true);
    expect(container.has(ServiceKeys.TRIALDAY_MIGRATION)).toBe(true);
  });

  it('should register services with correct types', () => {
    // Call initializeContainer
    initializeContainer();

    // Verify that services can be resolved without throwing
    expect(() => container.resolve(ServiceKeys.FIRESTORE)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.SENDGRID)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.OFFICE_RND)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.BANK_PAYOUT)).not.toThrow();
    expect(() =>
      container.resolve(ServiceKeys.EMAIL_CONFIRMATION)
    ).not.toThrow();
    expect(() => container.resolve(ServiceKeys.REWARD)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.REFERRAL)).not.toThrow();
    expect(() => container.resolve(ServiceKeys.TRIALDAY)).not.toThrow();
    expect(() =>
      container.resolve(ServiceKeys.TRIALDAY_MIGRATION)
    ).not.toThrow();
  });

  it('should register singleton services as singletons', () => {
    // Call initializeContainer
    initializeContainer();

    // Verify that singleton services return the same instance
    const firestore1 = container.resolve(ServiceKeys.FIRESTORE);
    const firestore2 = container.resolve(ServiceKeys.FIRESTORE);
    expect(firestore1).toBe(firestore2);

    const sendgrid1 = container.resolve(ServiceKeys.SENDGRID);
    const sendgrid2 = container.resolve(ServiceKeys.SENDGRID);
    expect(sendgrid1).toBe(sendgrid2);

    const officeRnd1 = container.resolve(ServiceKeys.OFFICE_RND);
    const officeRnd2 = container.resolve(ServiceKeys.OFFICE_RND);
    expect(officeRnd1).toBe(officeRnd2);

    const bankPayout1 = container.resolve(ServiceKeys.BANK_PAYOUT);
    const bankPayout2 = container.resolve(ServiceKeys.BANK_PAYOUT);
    expect(bankPayout1).toBe(bankPayout2);

    const trialday1 = container.resolve(ServiceKeys.TRIALDAY);
    const trialday2 = container.resolve(ServiceKeys.TRIALDAY);
    expect(trialday1).toBe(trialday2);
  });

  it('should register factory services as factories', () => {
    // Call initializeContainer
    initializeContainer();

    // Verify that factory services return new instances each time
    const emailConfirmation1 = container.resolve(
      ServiceKeys.EMAIL_CONFIRMATION
    );
    const emailConfirmation2 = container.resolve(
      ServiceKeys.EMAIL_CONFIRMATION
    );
    expect(emailConfirmation1).not.toBe(emailConfirmation2);

    const reward1 = container.resolve(ServiceKeys.REWARD);
    const reward2 = container.resolve(ServiceKeys.REWARD);
    expect(reward1).not.toBe(reward2);

    const referral1 = container.resolve(ServiceKeys.REFERRAL);
    const referral2 = container.resolve(ServiceKeys.REFERRAL);
    expect(referral1).not.toBe(referral2);

    const trialdayMigration1 = container.resolve(
      ServiceKeys.TRIALDAY_MIGRATION
    );
    const trialdayMigration2 = container.resolve(
      ServiceKeys.TRIALDAY_MIGRATION
    );
    expect(trialdayMigration1).not.toBe(trialdayMigration2);
  });

  it('should handle dependencies correctly', () => {
    // Call initializeContainer
    initializeContainer();

    // Verify that services with dependencies can be resolved
    // This tests that the dependency injection is working correctly
    expect(() => {
      const referralService = container.resolve(ServiceKeys.REFERRAL);
      expect(referralService).toBeDefined();
    }).not.toThrow();

    expect(() => {
      const trialdayService = container.resolve(ServiceKeys.TRIALDAY);
      expect(trialdayService).toBeDefined();
    }).not.toThrow();

    expect(() => {
      const trialdayMigrationService = container.resolve(
        ServiceKeys.TRIALDAY_MIGRATION
      );
      expect(trialdayMigrationService).toBeDefined();
    }).not.toThrow();
  });

  it('should not throw when called multiple times', () => {
    // Call initializeContainer multiple times
    expect(() => initializeContainer()).not.toThrow();
    expect(() => initializeContainer()).not.toThrow();
    expect(() => initializeContainer()).not.toThrow();

    // Verify that services are still available
    expect(container.has(ServiceKeys.FIRESTORE)).toBe(true);
    expect(container.has(ServiceKeys.TRIALDAY)).toBe(true);
  });
});
