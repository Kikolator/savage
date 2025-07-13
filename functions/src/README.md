# Firebase Functions Source Code

This directory contains the source code for all Firebase Cloud Functions in the Savage Coworking platform.

## 📁 Module Structure

### **API Layer** (`api/`)
REST API endpoints and controllers for external integrations.
- **Controllers**: Handle HTTP requests and responses
- **Middlewares**: Request validation and authentication
- **Routes**: API endpoint definitions

**Key Integrations:**
- Typeform webhooks
- OfficeRnd webhooks
- Email confirmation endpoints

### **Core Services** (`core/`)
Business logic, data models, and infrastructure services.
- **Services**: Business logic and external integrations
- **Data Models**: TypeScript interfaces and data structures
- **Configuration**: Environment and runtime configuration
- **Error Handling**: Custom error classes and handling
- **Utilities**: Shared helper functions

### **App Functions** (`app-functions/`)
Callable functions for client applications.
- **Referral Functions**: Referral code generation and management
- **Migration Functions**: Data migration utilities

### **Event Triggers** (`event-triggers/`)
Firestore document change triggers.
- **OfficeRnd Events**: Member creation and status changes
- **Trialday Events**: Trial day lifecycle management

### **Scheduled Events** (`scheduled-events/`)
Time-based automated functions.
- **OfficeRnd Sync**: Scheduled data synchronization
- **Reward Processing**: Automated reward calculations
- **Email Campaigns**: Scheduled email workflows

## 🚀 Quick Start

### Development
```bash
# Start emulators
firebase emulators:start

# Run tests
npm test

# Deploy functions
firebase deploy --only functions
```

### Key Files
- `index.ts` - Main entry point and function exports
- `core/services/` - Business logic services
- `api/controllers/` - HTTP request handlers
- `event-triggers/` - Firestore triggers
- `scheduled-events/` - Time-based functions

## 📚 Documentation

- **[API Documentation](../docs/api.md)** - Complete API reference
- **[Functions Overview](../docs/functions.md)** - Architecture guide
- **[Service Documentation](../docs/)** - Detailed service guides

## 🔧 Architecture Patterns

### **Dependency Injection**
Services use a DI container for dependency management:
```typescript
import {container} from './core/services/di/container';

const service = container.get('myService');
```

### **Error Handling**
Custom error classes with proper logging:
```typescript
import {MyServiceError} from './core/errors/services/my-service-error';

throw MyServiceError.specificError('Error message');
```

### **Logging**
Structured logging with method entry/exit tracking:
```typescript
this.logMethodEntry('methodName', {param1, param2});
this.logMethodSuccess('methodName', result);
this.logMethodError('methodName', error);
```

## 🧪 Testing

### Test Structure
```
test/
├── api/           # API endpoint tests
├── core/          # Service unit tests
├── event-triggers/ # Trigger function tests
└── scheduled-events/ # Scheduled function tests
```

### Running Tests
```bash
npm test                    # All tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## 📝 Contributing

When adding new functionality:
1. **Follow existing patterns** in similar modules
2. **Add comprehensive tests** for new features
3. **Update documentation** in relevant docs folders
4. **Use proper error handling** and logging
5. **Follow TypeScript best practices**

## 🔗 Related Documentation

- [Core Services README](core/services/README.md) - Service architecture
- [API Controllers README](api/README.md) - API patterns
- [Event Triggers README](event-triggers/README.md) - Trigger patterns
- [Scheduled Events README](scheduled-events/README.md) - Scheduled function patterns 