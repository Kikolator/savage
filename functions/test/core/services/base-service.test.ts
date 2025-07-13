// Mock logger
jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import {logger} from 'firebase-functions/v2';

import {
  BaseService,
  BaseServiceWithDependencies,
  ServiceDependencies,
} from '../../../src/core/services/base-service';

describe('BaseService', () => {
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = logger as jest.Mocked<typeof logger>;
  });

  describe('Basic Service', () => {
    class TestService extends BaseService {
      public async testMethod(): Promise<string> {
        await this.ensureInitialized();
        this.logMethodEntry('testMethod', {param: 'value'});
        this.logMethodSuccess('testMethod', 'result');
        return 'test result';
      }

      protected async performInitialization(): Promise<void> {
        // Simulate some initialization work
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      public static reset(): void {
        // Test reset functionality
      }
    }

    it('should initialize service lazily on first use', async () => {
      const service = new TestService();

      // Service should not be initialized initially
      expect((service as any).initialized).toBe(false);

      // Call method that requires initialization
      const result = await service.testMethod();

      // Service should now be initialized
      expect((service as any).initialized).toBe(true);
      expect(result).toBe('test result');

      // Should have logged initialization
      expect(mockLogger.info).toHaveBeenCalledWith(
        'TestService initialized successfully'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      const service = new TestService();

      // First call - should initialize
      await service.testMethod();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'TestService initialized successfully'
      );

      // Reset mock calls
      jest.clearAllMocks();

      // Second call - should not reinitialize
      await service.testMethod();
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'TestService initialized successfully'
      );
    });

    it('should log method entry and success', async () => {
      const service = new TestService();
      await service.testMethod();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'TestService.testMethod() called',
        {params: {param: 'value'}}
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'TestService.testMethod() completed successfully',
        {
          result: 'result',
        }
      );
    });

    it('should handle initialization errors', async () => {
      class ErrorService extends BaseService {
        public async testMethod(): Promise<string> {
          await this.ensureInitialized();
          return 'test';
        }

        protected async performInitialization(): Promise<void> {
          throw new Error('Initialization failed');
        }
      }

      const service = new ErrorService();

      await expect(service.testMethod()).rejects.toThrow(
        'Initialization failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize ErrorService',
        expect.any(Error)
      );
    });

    it('should get correct service name', () => {
      const service = new TestService();
      expect((service as any).getServiceName()).toBe('TestService');
    });
  });

  describe('Service with Dependencies', () => {
    interface TestDependencies extends ServiceDependencies {
      database: any;
      config: any;
    }

    class TestServiceWithDeps extends BaseServiceWithDependencies<TestDependencies> {
      constructor(dependencies: TestDependencies) {
        super(dependencies);
      }

      public async testMethod(): Promise<string> {
        const db = this.getDependency('database');
        const config = this.getDependency('config');
        return `${db.name}-${config.env}`;
      }

      public async testMissingDependency(): Promise<void> {
        this.getDependency('missing' as any);
      }
    }

    it('should store and retrieve dependencies', async () => {
      const mockDeps: TestDependencies = {
        database: {name: 'testdb'},
        config: {env: 'test'},
      };

      const service = new TestServiceWithDeps(mockDeps);
      const result = await service.testMethod();

      expect(result).toBe('testdb-test');
    });

    it('should throw error for missing dependency', async () => {
      const mockDeps: TestDependencies = {
        database: {name: 'testdb'},
        config: {env: 'test'},
      };

      const service = new TestServiceWithDeps(mockDeps);

      await expect(service.testMissingDependency()).rejects.toThrow(
        // eslint-disable-next-line quotes
        "Dependency 'missing' not found in TestServiceWithDeps"
      );
    });

    it('should get correct service name for dependency service', () => {
      const mockDeps: TestDependencies = {
        database: {name: 'testdb'},
        config: {env: 'test'},
      };

      const service = new TestServiceWithDeps(mockDeps);
      expect((service as any).getServiceName()).toBe('TestServiceWithDeps');
    });
  });

  describe('Error Handling', () => {
    class ErrorTestService extends BaseService {
      public async methodWithError(): Promise<void> {
        this.logMethodEntry('methodWithError');
        try {
          throw new Error('Test error');
        } catch (error) {
          this.logMethodError('methodWithError', error as Error);
          throw error;
        }
      }
    }

    it('should log method errors correctly', async () => {
      const service = new ErrorTestService();

      await expect(service.methodWithError()).rejects.toThrow('Test error');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ErrorTestService.methodWithError() called',
        {params: 'none'}
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ErrorTestService.methodWithError() failed',
        {
          error: 'Test error',
          stack: expect.any(String),
        }
      );
    });
  });

  describe('Logging Methods', () => {
    class LoggingTestService extends BaseService {
      public testLogging(): void {
        this.logMethodEntry('testLogging', {test: true});
        this.logMethodSuccess('testLogging', 'success');
      }

      public testLoggingWithoutParams(): void {
        this.logMethodEntry('testLoggingWithoutParams');
        this.logMethodSuccess('testLoggingWithoutParams');
      }
    }

    it('should log method entry with parameters', () => {
      const service = new LoggingTestService();
      service.testLogging();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'LoggingTestService.testLogging() called',
        {params: {test: true}}
      );
    });

    it('should log method entry without parameters', () => {
      const service = new LoggingTestService();
      service.testLoggingWithoutParams();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'LoggingTestService.testLoggingWithoutParams() called',
        {params: 'none'}
      );
    });

    it('should log method success with result', () => {
      const service = new LoggingTestService();
      service.testLogging();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'LoggingTestService.testLogging() completed successfully',
        {
          result: 'success',
        }
      );
    });

    it('should log method success without result', () => {
      const service = new LoggingTestService();
      service.testLoggingWithoutParams();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'LoggingTestService.testLoggingWithoutParams() completed successfully',
        {
          result: 'void',
        }
      );
    });
  });

  describe('Static Methods', () => {
    it('should have reset method available', () => {
      class ResetTestService extends BaseService {
        public static reset(): void {
          // Implementation
        }
      }

      expect(typeof ResetTestService.reset).toBe('function');
    });
  });
});
