# Dependency Injection Container

This directory contains the Dependency Injection (DI) container implementation for the Firebase Functions codebase.

## Overview

The DI container provides a centralized way to manage service dependencies, making the codebase more maintainable and testable. It eliminates the need for manual service instantiation and reduces coupling between components.

## Files

- `container.ts` - Main DI container implementation
- `service-resolver.ts` - Type-safe service resolver with proper TypeScript types
- `index.ts` - Exports for easy importing
- `container.test.ts` - Unit tests for the DI container

## Usage

### Basic Usage

```typescript
import {ServiceResolver} from '../../core/di';

// Get a service with proper TypeScript types
const trialdayService = ServiceResolver.getTrialdayService();
const firestoreService = ServiceResolver.getFirestoreService();
```

### In Controllers

```typescript
import {ServiceResolver} from '../../core/di';

export class MyController implements Controller {
  initialize(httpServer: HttpServer): void {
    const trialdayService = ServiceResolver.getTrialdayService();
    const emailService = ServiceResolver.getEmailConfirmationService();
    
    // Use the services...
  }
}
```

### In Callable Functions

```typescript
import {ServiceResolver} from '../../core/di';

export const myCallableFunction = onCall(async (request) => {
  const referralService = ServiceResolver.getReferralService();
  const result = await referralService.createReferralCode(data);
  return result;
});
```

## Available Services

The following services are available through the DI container:

- `FirestoreService` - Database operations
- `SendgridService` - Email operations
- `TrialdayService` - Trial day business logic
- `EmailConfirmationService` - Email confirmation logic
- `OfficeRndService` - OfficeRnd API integration
- `ReferralService` - Referral system logic
- `RewardService` - Reward system logic
- `BankPayoutService` - Bank payout operations
- `TrialdayMigrationService` - Migration utilities

## Service Lifecycle

### Singleton Services
- `FirestoreService` - Shared database instance
- `SendgridService` - Shared email client

### Instance Services
- All other services are created as new instances when resolved

## Testing

The DI container supports testing through the `clear()` method:

```typescript
import {DIContainer} from '../../core/di/container';

describe('MyService', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
    // Register test services...
  });

  afterEach(() => {
    container.clear();
  });
});
```

## Benefits

1. **Type Safety** - All services have proper TypeScript types
2. **Centralized Management** - All dependencies are managed in one place
3. **Easier Testing** - Services can be easily mocked and replaced
4. **Reduced Coupling** - Components don't need to know about service instantiation
5. **Better Maintainability** - Changes to service dependencies only need to be made in one place

## Migration from Manual Instantiation

Before:
```typescript
const trialdayService = new TrialdayService({
  firestoreService: FirestoreService.getInstance(),
  sendgridService: SendgridService.getInstance(),
  emailConfirmationService: new EmailConfirmationService({
    firestoreService: FirestoreService.getInstance(),
    sendgridService: SendgridService.getInstance(),
  }),
  officeRndService: new OfficeRndService({
    firestoreService: FirestoreService.getInstance(),
  }),
});
```

After:
```typescript
const trialdayService = ServiceResolver.getTrialdayService();
```

## Future Enhancements

- Support for service scoping (request-scoped, session-scoped)
- Automatic dependency resolution
- Service lifecycle hooks
- Configuration-based service registration 