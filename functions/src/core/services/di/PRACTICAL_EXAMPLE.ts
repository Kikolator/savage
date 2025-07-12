/**
 * Practical Example: How DI Patterns Work Together
 *
 * This example shows how different registration patterns complement each other
 * in a real Firebase Cloud Functions scenario.
 */

import {logger} from 'firebase-functions';

import {container, initializeContainer} from './container';

// Example: Request-scoped service (Factory Pattern)
class RequestContext {
  private requestId: string;
  private startTime: Date;

  constructor() {
    this.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = new Date();
  }

  getRequestId(): string {
    return this.requestId;
  }

  getDuration(): number {
    return Date.now() - this.startTime.getTime();
  }
}

// Example: Heavy external service (Lazy Singleton)
class ExternalApiService {
  private static instance: ExternalApiService;
  private isInitialized = false;
  private apiKey: string | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ExternalApiService {
    if (!ExternalApiService.instance) {
      ExternalApiService.instance = new ExternalApiService();
    }
    return ExternalApiService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Simulate heavy initialization (API key loading, connection setup)
    logger.info('Initializing ExternalApiService...');
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
    this.apiKey = 'loaded-api-key';
    this.isInitialized = true;
    logger.info('ExternalApiService initialized');
  }

  async makeApiCall(endpoint: string): Promise<any> {
    await this.initialize();
    logger.info(
      `Making API call to ${endpoint} with key: ${this.apiKey?.substring(0, 8)}...`
    );
    return {success: true, endpoint};
  }
}

// Example: Business service with dependencies (Factory Pattern)
class UserService {
  constructor(
    private firestoreService: any,
    private externalApiService: ExternalApiService,
    private requestContext: RequestContext
  ) {}

  async getUser(userId: string): Promise<any> {
    logger.info(
      `Getting user ${userId} for request ${this.requestContext.getRequestId()}`
    );

    // Use shared infrastructure services
    const userData = await this.firestoreService.getDocument('users', userId);
    const externalData = await this.externalApiService.makeApiCall(
      `/users/${userId}`
    );

    return {
      ...userData,
      externalData,
      requestId: this.requestContext.getRequestId(),
      duration: this.requestContext.getDuration(),
    };
  }
}

// Example: Configuration service (Pre-created Singleton)
class ConfigService {
  private config: Record<string, any>;

  constructor() {
    this.config = {
      apiTimeout: 5000,
      maxRetries: 3,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  get(key: string): any {
    return this.config[key];
  }
}

/**
 * Demonstration of how patterns work together
 */
export function demonstrateDIPatterns(): void {
  logger.info('=== DI Patterns Demonstration ===');

  // 1. Register services with different patterns
  const configService = new ConfigService();
  container.registerSingleton('config', configService);

  container.registerSingletonFactory('externalApi', () =>
    ExternalApiService.getInstance()
  );

  container.register('requestContext', () => new RequestContext());

  container.register(
    'userService',
    () =>
      new UserService(
        container.resolve('firestore'),
        container.resolve('externalApi'),
        container.resolve('requestContext')
      )
  );

  // 2. Demonstrate the patterns in action
  logger.info('\n--- Pattern 1: Pre-created Singleton (Config) ---');
  const config1 = container.resolve('config') as ConfigService;
  const config2 = container.resolve('config') as ConfigService;
  logger.info(`Config instances are the same: ${config1 === config2}`);
  logger.info(`API Timeout: ${config1.get('apiTimeout')}ms`);

  logger.info('\n--- Pattern 2: Lazy Singleton (External API) ---');
  logger.info('First call - should initialize the service');
  const api1 = container.resolve('externalApi') as ExternalApiService;

  logger.info('Second call - should reuse the same instance');
  const api2 = container.resolve('externalApi') as ExternalApiService;
  logger.info(`API instances are the same: ${api1 === api2}`);

  logger.info('\n--- Pattern 3: Factory (Request Context) ---');
  const context1 = container.resolve('requestContext') as RequestContext;
  const context2 = container.resolve('requestContext') as RequestContext;
  logger.info(`Request contexts are different: ${context1 !== context2}`);
  logger.info(`Context 1 ID: ${context1.getRequestId()}`);
  logger.info(`Context 2 ID: ${context2.getRequestId()}`);

  logger.info('\n--- Pattern 4: Factory with Dependencies (User Service) ---');
  const userService1 = container.resolve('userService');
  const userService2 = container.resolve('userService');
  logger.info(
    `User service instances are different: ${userService1 !== userService2}`
  );

  // But they share the same infrastructure services
  logger.info('Both user services share the same external API instance');
}

/**
 * Performance comparison
 */
export async function performanceComparison(): Promise<void> {
  logger.info('\n=== Performance Comparison ===');

  // Test Factory Pattern (new instances)
  console.time('factory-1000');
  for (let i = 0; i < 1000; i++) {
    container.resolve('requestContext');
  }
  console.timeEnd('factory-1000');

  // Test Singleton Pattern (shared instances)
  console.time('singleton-1000');
  for (let i = 0; i < 1000; i++) {
    container.resolve('externalApi');
  }
  console.timeEnd('singleton-1000');

  // Test Lazy Singleton (first call initializes, rest reuse)
  console.time('lazy-singleton-1000');
  for (let i = 0; i < 1000; i++) {
    container.resolve('config');
  }
  console.timeEnd('lazy-singleton-1000');
}

/**
 * Memory usage comparison
 */
export function memoryComparison(): void {
  logger.info('\n=== Memory Usage Comparison ===');

  const memoryBefore = process.memoryUsage().heapUsed;

  // Factory pattern - creates many instances
  const contexts: RequestContext[] = [];
  for (let i = 0; i < 1000; i++) {
    contexts.push(container.resolve('requestContext'));
  }

  const memoryAfterFactory = process.memoryUsage().heapUsed;
  logger.info(
    `Factory pattern memory used: ${(memoryAfterFactory - memoryBefore) / 1024} KB`
  );

  // Singleton pattern - reuses same instance
  const apis: ExternalApiService[] = [];
  for (let i = 0; i < 1000; i++) {
    apis.push(container.resolve('externalApi'));
  }

  const memoryAfterSingleton = process.memoryUsage().heapUsed;
  logger.info(
    `Singleton pattern additional memory: ${(memoryAfterSingleton - memoryAfterFactory) / 1024} KB`
  );

  // Clean up
  contexts.length = 0;
  apis.length = 0;
}

/**
 * Real-world usage simulation
 */
export async function simulateRealWorldUsage(): Promise<void> {
  logger.info('\n=== Real-World Usage Simulation ===');

  // Simulate multiple concurrent requests
  const requests = [
    simulateRequest('user1'),
    simulateRequest('user2'),
    simulateRequest('user3'),
  ];

  await Promise.all(requests);
}

async function simulateRequest(userId: string): Promise<void> {
  const requestContext = container.resolve('requestContext') as RequestContext;
  const userService = container.resolve('userService') as UserService;

  logger.info(
    `Processing request for ${userId} (${requestContext.getRequestId()})`
  );

  try {
    const result = await userService.getUser(userId);
    logger.info(`Request completed for ${userId} in ${result.duration}ms`);
  } catch (error) {
    logger.error(`Request failed for ${userId}:`, error);
  }
}

/**
 * Key Takeaways:
 *
 * 1. **Lazy Singletons** (`registerSingletonFactory`):
 *    - Best for heavy, stateless services (Firestore, SendGrid)
 *    - Created only when needed
 *    - Shared across all consumers
 *
 * 2. **Factories** (`register`):
 *    - Best for request-scoped or stateful services
 *    - Fresh instances each time
 *    - Good for isolation and testing
 *
 * 3. **Pre-created Singletons** (`registerSingleton`):
 *    - Best for configuration or pre-initialized services
 *    - Available immediately
 *    - No initialization delay
 *
 * 4. **Combination**:
 *    - Infrastructure services as singletons (shared, efficient)
 *    - Business services as factories (lightweight, with dependencies)
 *    - Request-scoped services as factories (isolated per request)
 *
 * Your current setup is well-designed because:
 * - Firestore/SendGrid are lazy singletons (heavy, stateless)
 * - Business services are factories (lightweight, with dependencies)
 * - Each business service gets fresh instances but shares infrastructure
 */
