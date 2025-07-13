# Service Architecture

This document outlines the service architecture patterns and best practices for the Firebase Cloud Functions project.

## Overview

The service layer provides business logic, external integrations, and data access patterns. Services are organized using dependency injection and follow consistent patterns for initialization, logging, and error handling.

## Service Categories

### 1. Core Infrastructure Services (Lazy Singletons)
- **FirestoreService**: Database operations and transactions
- **SendgridService**: Email and contact management

### 2. External API Services (Lazy Singletons)
- **OfficeRndService**: OfficeRnD CRM API integration
- **BankPayoutService**: Bank transfer operations
- **GoogleCalService**: Google Calendar integration

### 3. Business Logic Services (Factories)
- **EmailConfirmationService**: Email confirmation workflows
- **ReferralService**: Referral program management
- **RewardService**: Reward calculation and distribution
- **TrialdayService**: Trial day management
- **TrialdayMigrationService**: Data migration utilities

## Base Service Classes

### BaseService
Provides common functionality for all services:

```typescript
import {BaseService} from './base-service';

export class MyService extends BaseService {
  private static instance: MyService;

  private constructor() {
    super();
  }

  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }

  public async doSomething(): Promise<void> {
    this.logMethodEntry('doSomething');
    
    try {
      await this.ensureInitialized();
      // Your logic here
      this.logMethodSuccess('doSomething');
    } catch (error) {
      this.logMethodError('doSomething', error as Error);
      throw error;
    }
  }

  protected async performInitialization(): Promise<void> {
    // Initialize your service
  }
}
```

### BaseServiceWithDependencies
For services that require dependencies:

```typescript
import {BaseServiceWithDependencies, ServiceDependencies} from './base-service';

interface MyServiceDependencies extends ServiceDependencies {
  firestoreService: FirestoreService;
  sendgridService: SendgridService;
}

export class MyService extends BaseServiceWithDependencies<MyServiceDependencies> {
  constructor(dependencies: MyServiceDependencies) {
    super(dependencies);
  }

  public async doSomething(): Promise<void> {
    const firestore = this.getDependency('firestoreService');
    // Use firestore...
  }
}
```

## Service Patterns

### 1. Singleton Pattern
Use for stateless services that can be shared across the application:

```typescript
export class MyService extends BaseService {
  private static instance: MyService;

  private constructor() {
    super();
  }

  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}
```

### 2. Dependency Injection Pattern
Use for services that require other services:

```typescript
export class MyService extends BaseServiceWithDependencies {
  constructor(dependencies: ServiceDependencies) {
    super(dependencies);
  }
}
```

### 3. Lazy Initialization
Services initialize only when first used:

```typescript
protected async performInitialization(): Promise<void> {
  // Load configuration, initialize clients, etc.
  this.apiClient = new ApiClient(this.config.apiKey);
  await this.apiClient.connect();
}
```

## Logging Patterns

All services inherit logging methods from BaseService:

- `logMethodEntry(methodName, params)`: Log method entry with parameters
- `logMethodSuccess(methodName, result)`: Log successful completion
- `logMethodError(methodName, error)`: Log errors with stack traces

## Error Handling

Services should:
1. Use typed errors from `../errors/`
2. Log errors using `logMethodError()`
3. Re-throw errors to maintain stack traces
4. Provide meaningful error messages

## Testing

### Unit Testing
```typescript
describe('MyService', () => {
  beforeEach(() => {
    MyService.reset(); // Reset singleton for clean tests
  });

  it('should initialize correctly', async () => {
    const service = MyService.getInstance();
    await service.doSomething();
    // Assertions...
  });
});
```

### Integration Testing
```typescript
describe('MyService Integration', () => {
  it('should work with dependencies', async () => {
    const mockFirestore = createMockFirestoreService();
    const service = new MyService({
      firestoreService: mockFirestore
    });
    // Test with mocked dependencies...
  });
});
```

## Best Practices

### 1. Service Organization
- Keep services focused on a single responsibility
- Use descriptive names that indicate the service's purpose
- Group related functionality within a service

### 2. Service Registration Patterns
- **Lazy Singletons** for:
  - External API services (OfficeRnD, SendGrid, etc.)
  - Database connections (Firestore)
  - Heavy, stateless services
  - Services with expensive initialization (token management, API setup)

- **Factories** for:
  - Business logic services with dependencies
  - Request-scoped services
  - Services that need isolation
  - Testing scenarios

### 3. Error Handling
- Always use typed errors
- Log errors with context
- Don't swallow exceptions unless intentional

### 4. Performance
- Use lazy initialization for expensive operations
- Implement caching where appropriate
- Use batch operations for multiple database calls

### 5. Testing
- Write unit tests for all service methods
- Mock external dependencies
- Test error scenarios

### 6. Documentation
- Document public methods with JSDoc
- Include examples for complex operations
- Document configuration requirements

## Migration Guide

### From Old Pattern to New Pattern

1. **Extend BaseService**:
```typescript
// Before
export class MyService {
  // ...
}

// After
export class MyService extends BaseService {
  // ...
}
```

2. **Add Logging**:
```typescript
// Before
logger.info('MyService.doSomething called');

// After
this.logMethodEntry('doSomething');
```

3. **Add Error Handling**:
```typescript
// Before
try {
  // logic
} catch (error) {
  logger.error('Error', error);
  throw error;
}

// After
try {
  await this.ensureInitialized();
  // logic
  this.logMethodSuccess('doSomething');
} catch (error) {
  this.logMethodError('doSomething', error as Error);
  throw error;
}
```

## File Structure

```
services/
├── base-service.ts              # Base service classes
├── index.ts                     # Service exports
├── firestore-service.ts         # Database operations
├── sendgrid-service.ts          # Email operations
├── office-rnd-service.ts        # OfficeRnD integration
├── email-confirmation-service.ts # Email workflows
├── referral-service.ts          # Referral management
├── reward-service.ts            # Reward calculations
├── trialday-service.ts          # Trial day management
├── trialday-migration-service.ts # Data migration
├── bank-payout-service.ts       # Bank transfers
├── google-cal-service.ts        # Calendar integration
└── di/                          # Dependency injection
    ├── container.ts
    ├── service-resolver.ts
    └── index.ts
```

## Configuration

Services should use the configuration system:

```typescript
import {getConfig} from '../config';

protected async performInitialization(): Promise<void> {
  const config = getConfig();
  this.apiKey = config.runtime.myService.apiKey;
}
```

## Monitoring and Observability

Services automatically log:
- Method entry/exit
- Errors with stack traces
- Initialization status
- Performance metrics (via Firebase Functions logger)

Use these logs for:
- Debugging issues
- Monitoring performance
- Understanding usage patterns
- Alerting on errors 