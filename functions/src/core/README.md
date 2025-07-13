# Core Module

This module contains the core business logic, data models, and infrastructure services for the Savage Coworking platform.

## 📁 Structure

```
core/
├── config/           # Configuration management
├── data/             # Data models and enums
├── errors/           # Custom error classes
├── services/         # Business logic services
├── utils/            # Shared utilities
└── README.md         # This file
```

## 🚀 Quick Start

### Configuration
```typescript
import {getConfig} from './config';

const config = getConfig();
const apiKey = config.runtime.sendgrid.apiKey;
```

### Services
```typescript
import {container} from './services/di/container';

const firestoreService = container.get('firestoreService');
const sendgridService = container.get('sendgridService');
```

### Error Handling
```typescript
import {FirestoreServiceError} from './errors/services/firestore-service-error';

throw FirestoreServiceError.documentNotFound('User not found');
```

## 🔧 Core Components

### **Configuration** (`config/`)
Environment and runtime configuration management.
- **Static Config**: Build-time configuration
- **Runtime Config**: Environment-specific settings
- **Secret Management**: Secure secret access

### **Data Models** (`data/`)
TypeScript interfaces and data structures.
- **Models**: Business entity definitions
- **Enums**: Type-safe enumerations
- **Interfaces**: Contract definitions

### **Error Handling** (`errors/`)
Custom error classes with proper categorization.
- **Service Errors**: Business logic errors
- **API Errors**: HTTP request errors
- **Event Errors**: Trigger function errors

### **Services** (`services/`)
Business logic and external integrations.
- **Infrastructure**: Database, email, external APIs
- **Business Logic**: Referrals, rewards, trial days
- **Dependency Injection**: Service container management

### **Utilities** (`utils/`)
Shared helper functions and utilities.
- **Environment**: Environment detection
- **Validation**: Data validation helpers
- **Formatting**: Data formatting utilities

## 🏗️ Architecture Patterns

### **Dependency Injection**
Services use a DI container for dependency management:

```typescript
// Service definition
interface MyServiceDependencies extends ServiceDependencies {
  firestoreService: FirestoreService;
  sendgridService: SendgridService;
}

export class MyService extends BaseServiceWithDependencies<MyServiceDependencies> {
  constructor(dependencies: MyServiceDependencies) {
    super(dependencies);
  }
}

// Service registration
container.register('myService', () => new MyService({
  firestoreService: container.get('firestoreService'),
  sendgridService: container.get('sendgridService')
}));
```

### **Error Hierarchy**
Structured error classes for different contexts:

```typescript
// Base error class
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
}

// Service-specific errors
export class FirestoreServiceError extends AppError {
  static documentNotFound(message: string): FirestoreServiceError {
    return new FirestoreServiceError('DOCUMENT_NOT_FOUND', 404, message);
  }
}
```

### **Configuration Management**
Type-safe configuration with environment detection:

```typescript
// Static configuration
export const STATIC_CONFIG = {
  region: 'europe-west1',
  timezone: 'Europe/Amsterdam',
  projectId: 'savage-coworking'
} as const;

// Runtime configuration
export const getConfig = () => ({
  runtime: {
    sendgrid: {
      apiKey: getSecret('SENDGRID_API_KEY'),
      fromEmail: 'noreply@savagecoworking.com'
    },
    officeRnd: {
      apiKey: getSecret('OFFICE_RND_SECRET'),
      webhookSecret: getSecret('OFFICE_RND_WEBHOOK_SECRET')
    }
  }
});
```

## 📝 Data Models

### **Core Entities**
- **TrialDay**: Trial day management
- **Referral**: Referral program tracking
- **Reward**: Reward calculation and distribution
- **EmailConfirmation**: Email verification tracking

### **External Integrations**
- **OfficeRndMember**: OfficeRnd CRM integration
- **TypeformResponse**: Typeform webhook data
- **SendGridEmail**: Email service integration

## 🧪 Testing

### **Unit Testing**
```typescript
describe('MyService', () => {
  beforeEach(() => {
    // Reset service state
    MyService.reset();
  });

  it('should process data correctly', async () => {
    const service = MyService.getInstance();
    const result = await service.processData(testData);
    expect(result).toEqual(expectedResult);
  });
});
```

### **Integration Testing**
```typescript
describe('Service Integration', () => {
  it('should work with dependencies', async () => {
    const mockFirestore = createMockFirestoreService();
    const service = new MyService({
      firestoreService: mockFirestore
    });
    
    await service.doSomething();
    expect(mockFirestore.get).toHaveBeenCalled();
  });
});
```

## 📚 Related Documentation

- **[Services Architecture](services/README.md)** - Detailed service patterns
- **[Error Handling](../docs/errors.md)** - Error management guide
- **[Configuration](../docs/config.md)** - Configuration management
- **[Data Models](../docs/models.md)** - Data structure documentation

## 🔗 Key Files

- `config/index.ts` - Configuration management
- `services/di/container.ts` - Dependency injection container
- `errors/index.ts` - Error class exports
- `data/models/` - Data model definitions
- `utils/environment.ts` - Environment utilities 