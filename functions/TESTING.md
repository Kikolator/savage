# Testing Guide for Firebase Functions

This document provides a comprehensive guide for testing the Firebase Functions codebase.

## Table of Contents

1. [Setup](#setup)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Categories](#test-categories)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

## Setup

### Prerequisites

- Node.js 22+
- npm or yarn
- Firebase CLI (for emulator testing)

### Installation

```bash
cd functions
npm install
```

### Test Dependencies

The following testing dependencies are included:

- **Jest**: Test runner and assertion library
- **ts-jest**: TypeScript support for Jest
- **firebase-functions-test**: Firebase Functions testing utilities
- **@types/jest**: TypeScript definitions for Jest

## Test Structure

```
functions/
├── src/                          # Source code
│   ├── core/
│   │   ├── config/
│   │   └── services/
│   ├── api/
│   │   └── controllers/
│   └── app-functions/
│       └── functions/
├── test/                         # Test files (mirrors src structure)
│   ├── core/
│   │   ├── config/
│   │   │   └── main-config.test.ts
│   │   └── services/
│   │       ├── firestore-service.test.ts
│   │       └── di-container.test.ts
│   ├── api/
│   │   └── controllers/
│   │       └── test-controller.test.ts
│   ├── app-functions/
│   │   └── functions/
│   │       └── referral-functions.test.ts
│   ├── utils/
│   │   └── test-helpers.ts
│   ├── setup.ts
│   └── index.test.ts
├── jest.config.js                # Jest configuration
└── TESTING.md                    # This file
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- --testNamePattern="FirestoreService"

# Run tests in a specific file
npm test -- firestore-service.test.ts

# Run tests in a specific directory
npm test -- test/core/services/
```

### Coverage Reports

After running `npm run test:coverage`, you can find coverage reports in:

- **Console**: Coverage summary in terminal
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`

## Test Categories

### 1. Unit Tests

Unit tests focus on testing individual functions, methods, or classes in isolation.

**Location**: `test/**/*.test.ts`

**Examples**:
- Service method tests
- Utility function tests
- Configuration tests
- Error handling tests

### 2. Integration Tests

Integration tests verify that different parts of the system work together correctly.

**Location**: `test/*.test.ts`

**Examples**:
- Controller initialization tests
- Service dependency tests
- End-to-end function tests

### 3. Mock Tests

Tests that verify the behavior of mocked dependencies and external services.

**Examples**:
- Firebase Firestore operations
- SendGrid email sending
- OfficeRnd API calls
- Typeform webhook handling

## Best Practices

### 1. Test Organization

- Use descriptive test names that explain the expected behavior
- Group related tests using `describe` blocks
- Follow the AAA pattern: Arrange, Act, Assert

```typescript
describe('FirestoreService', () => {
  describe('createDocument', () => {
    it('should create document with auto-generated ID', async () => {
      // Arrange
      const data = { collection: 'test', data: { name: 'test' } };
      
      // Act
      await firestoreService.createDocument(data);
      
      // Assert
      expect(mockDoc.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'test',
        created_at: 'mock-timestamp',
      }));
    });
  });
});
```

### 2. Mocking

- Mock external dependencies (Firebase, APIs, etc.)
- Use consistent mock patterns across tests
- Reset mocks between tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockFirestoreService.createDocument.mockResolvedValue(mockDocument);
});
```

### 3. Error Testing

- Test both success and error scenarios
- Verify error types, messages, and status codes
- Test edge cases and boundary conditions

```typescript
it('should throw AppError when document does not exist', async () => {
  mockDoc.get.mockResolvedValue({
    data: () => null,
    exists: false,
  });

  await expect(
    firestoreService.getDocument('collection', 'id')
  ).rejects.toThrow(AppError);
});
```

### 4. Async Testing

- Use `async/await` for asynchronous operations
- Test both resolved and rejected promises
- Use `jest.fn()` for mocking async functions

```typescript
it('should handle async operations correctly', async () => {
  const mockAsyncFunction = jest.fn().mockResolvedValue('result');
  
  const result = await service.doSomething(mockAsyncFunction);
  
  expect(result).toBe('result');
  expect(mockAsyncFunction).toHaveBeenCalled();
});
```

## Examples

### Service Test Example

```typescript
import {jest, describe, it, expect, beforeEach} from '@jest/globals';
import {FirestoreService} from '../../../src/core/services/firestore-service';

describe('FirestoreService', () => {
  let firestoreService: FirestoreService;
  let mockDb: any;

  beforeEach(() => {
    // Reset singleton
    (FirestoreService as any).instance = null;
    
    // Setup mocks
    mockDb = createMockFirestore();
    firestoreService = FirestoreService.getInstance();
  });

  describe('createDocument', () => {
    it('should create document successfully', async () => {
      const data = {
        collection: 'users',
        data: { name: 'John', email: 'john@example.com' }
      };

      await firestoreService.createDocument(data);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockDb.doc().create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John',
          email: 'john@example.com',
          created_at: expect.any(String),
        })
      );
    });
  });
});
```

### Controller Test Example

```typescript
import {jest, describe, it, expect, beforeEach} from '@jest/globals';
import TestController from '../../../src/api/controllers/test-controllers/test-controller';
import {createMockRequest, createMockResponse} from '../../utils/test-helpers';

describe('TestController', () => {
  let controller: TestController;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    controller = new TestController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = jest.fn();
  });

  describe('ping endpoint', () => {
    it('should return pong message', async () => {
      await controller.ping(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Pong' });
    });
  });
});
```

### Callable Function Test Example

```typescript
import {jest, describe, it, expect, beforeEach} from '@jest/globals';
import {ReferralFunctions} from '../../../src/app-functions/functions/referral-functions';
import {createMockCallableRequest} from '../../utils/test-helpers';

describe('ReferralFunctions', () => {
  let referralFunctions: ReferralFunctions;
  let mockReferralService: any;

  beforeEach(() => {
    referralFunctions = new ReferralFunctions();
    mockReferralService = {
      createReferralCode: jest.fn(),
    };
    
    // Mock service resolver
    jest.spyOn(ServiceResolver, 'getReferralService')
      .mockReturnValue(mockReferralService);
  });

  describe('createReferralCode', () => {
    it('should create referral code successfully', async () => {
      const mockCode = { id: 'ref-123', code: 'SAVAGE123' };
      mockReferralService.createReferralCode.mockResolvedValue(mockCode);

      const request = createMockCallableRequest({
        memberId: 'member-123',
        companyId: 'company-123',
      });

      const result = await referralFunctions.createReferralCode.handler(request);

      expect(result).toEqual(mockCode);
      expect(mockReferralService.createReferralCode).toHaveBeenCalledWith({
        referrerId: 'member-123',
        referrerCompanyId: 'company-123',
        referrerType: ReferrerType.MEMBER,
      });
    });
  });
});
```

## Test Utilities

### Mock Helpers

The `test/utils/test-helpers.ts` file provides common mock utilities:

- `createMockRequest()`: Creates mock Express request objects
- `createMockResponse()`: Creates mock Express response objects
- `createMockCallableRequest()`: Creates mock Firebase callable request objects
- `mockFirestoreDocument()`: Creates mock Firestore document objects
- `mockFirestoreQuerySnapshot()`: Creates mock Firestore query snapshots

### Environment Setup

The `test/setup.ts` file configures the test environment:

- Mocks Firebase Functions and Admin SDK
- Sets up environment variables
- Configures global test utilities

## Continuous Integration

### GitHub Actions

Tests are automatically run in CI/CD pipelines:

```yaml
- name: Run Tests
  run: |
    cd functions
    npm run test:ci
```

### Pre-commit Hooks

Consider adding pre-commit hooks to run tests before commits:

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "cd functions && npm test"
```

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mocks are set up in `beforeEach` and cleared in `afterEach`
2. **Async test failures**: Use `await` for async operations and `expect().rejects` for error testing
3. **Type errors**: Use `as any` for mock objects when TypeScript types are too strict
4. **Firebase emulator issues**: Ensure emulator is running for integration tests

### Debug Mode

Run tests in debug mode for more verbose output:

```bash
npm test -- --verbose --detectOpenHandles
```

## Contributing

When adding new tests:

1. Follow the existing test structure and patterns
2. Add tests for both success and error scenarios
3. Use descriptive test names
4. Mock external dependencies
5. Update this documentation if needed

For questions or issues with testing, please refer to the Jest documentation or create an issue in the repository. 