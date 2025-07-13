import {logger} from 'firebase-functions/v2';

/**
 * Base class for all services providing common functionality
 * and consistent patterns for service implementation.
 */
export abstract class BaseService<T = unknown> {
  protected initialized = false;

  constructor() {
    // Base constructor
  }

  /**
   * Initialize the service (called lazily when first used)
   * Override this method to implement service-specific initialization
   */
  protected async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.performInitialization();
      this.initialized = true;
      logger.info(`${this.constructor.name} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.constructor.name}`, error);
      throw error;
    }
  }

  /**
   * Perform the actual initialization logic
   * Override this method in derived classes
   */
  protected async performInitialization(): Promise<void> {
    // Default implementation - override in derived classes
  }

  /**
   * Ensure service is initialized before use
   */
  protected async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Reset the service (useful for testing)
   * Override in derived classes if needed
   */
  public static reset(): void {
    // Default implementation - override in derived classes
  }

  /**
   * Get service name for logging and debugging
   */
  protected getServiceName(): string {
    return this.constructor.name;
  }

  /**
   * Log service method entry with parameters
   */
  protected logMethodEntry(
    methodName: string,
    params?: Record<string, unknown>
  ): void {
    const logData: Record<string, unknown> = {};

    if (params !== undefined) {
      logData.params = params;
    } else {
      logData.params = 'none';
    }

    logger.info(`${this.getServiceName()}.${methodName}() called`, logData);
  }

  /**
   * Log service method completion
   */
  protected logMethodSuccess(methodName: string, result?: unknown): void {
    const logData: Record<string, unknown> = {};

    if (result !== undefined) {
      logData.result = result;
    } else {
      logData.result = 'void';
    }

    logger.info(
      `${this.getServiceName()}.${methodName}() completed successfully`,
      logData
    );
  }

  /**
   * Log service method error
   */
  protected logMethodError(methodName: string, error: Error): void {
    logger.error(`${this.getServiceName()}.${methodName}() failed`, {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Interface for services that require dependencies
 */
export interface ServiceDependencies {
  [key: string]: any;
}

/**
 * Base class for services that require dependencies
 */
export abstract class BaseServiceWithDependencies<
  T = unknown,
> extends BaseService<T> {
  protected dependencies: ServiceDependencies;

  constructor(dependencies: ServiceDependencies) {
    super();
    this.dependencies = dependencies;
  }

  /**
   * Get a dependency by key
   */
  protected getDependency<K extends keyof ServiceDependencies>(
    key: K
  ): ServiceDependencies[K] {
    const dependency = this.dependencies[key];
    if (!dependency) {
      throw new Error(
        `Dependency '${String(key)}' not found in ${this.getServiceName()}`
      );
    }
    return dependency;
  }
}
