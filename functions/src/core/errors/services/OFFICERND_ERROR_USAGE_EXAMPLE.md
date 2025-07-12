# OfficeRnD Service Error Usage Example

This document shows how to replace the existing `AppError` usage in the OfficeRnD service with the new `OfficeRnDServiceError` class.

## Before (Current Implementation)

```typescript
// Current error handling in OfficeRnD service
import {AppError, ErrorCode} from '../errors/app-error';

// Token initialization
if (this.token == null) {
  throw new AppError(
    `${methodName} - Office Rnd token is null`,
    ErrorCode.UNKNOWN_ERROR,
    500
  );
}

// API request failure
if (response.status !== 200) {
  throw new AppError(
    `${methodName} - Failed to fetch ${endpoint}`,
    ErrorCode.UNKNOWN_ERROR,
    500,
    body
  );
}

// OAuth token failure
if (response.status !== 200) {
  throw new AppError(
    'Failed to get Office Rnd OAuth2.0 token',
    ErrorCode.UNKNOWN_ERROR,
    500,
    body
  );
}

// Member creation failure
if (response.status !== 201) {
  throw new AppError(
    'OfficeRndService.createMember()- Failed to create Office Rnd member',
    ErrorCode.UNKNOWN_ERROR,
    500,
    body
  );
}
```

## After (Using OfficeRnDServiceError)

```typescript
// Updated error handling with OfficeRnDServiceError
import {OfficeRnDServiceError} from '../errors/services/office-rnd-service-error';

// Token initialization
if (this.token == null) {
  throw OfficeRnDServiceError.tokenInitializationFailed(methodName);
}

// API request failure
if (response.status !== 200) {
  throw OfficeRnDServiceError.apiRequestFailed(
    methodName,
    endpoint,
    response.status,
    body
  );
}

// OAuth token failure
if (response.status !== 200) {
  throw OfficeRnDServiceError.oauthTokenFailed(body);
}

// Member creation failure
if (response.status !== 201) {
  throw OfficeRnDServiceError.memberCreationFailed(
    'OfficeRndService.createMember()',
    member,
    body
  );
}
```

## Complete Migration Example

### 1. Token Management

```typescript
// Before
private async initializeToken(): Promise<void> {
  try {
    // ... token logic
    if (this.token == null) {
      throw new AppError(
        'OfficeRndService.initializeToken()- Office Rnd token is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
    if (!this.token.updated_at) {
      throw new AppError(
        'Office Rnd token updated_at field is null',
        ErrorCode.UNKNOWN_ERROR,
        500
      );
    }
  } catch (error) {
    throw new AppError(
      'OfficeRndService.initializeToken()- Failed to initialize token',
      ErrorCode.UNKNOWN_ERROR,
      500,
      error
    );
  }
}

// After
private async initializeToken(): Promise<void> {
  try {
    // ... token logic
    if (this.token == null) {
      throw OfficeRnDServiceError.tokenInitializationFailed(
        'OfficeRndService.initializeToken()'
      );
    }
    if (!this.token.updated_at) {
      throw OfficeRnDServiceError.tokenExpired();
    }
  } catch (error) {
    throw OfficeRnDServiceError.tokenInitializationFailed(
      'OfficeRndService.initializeToken()',
      null,
      error instanceof Error ? error : undefined
    );
  }
}
```

### 2. API Requests

```typescript
// Before
private async fetchAllPages<T>(endpoint: string, methodName: string): Promise<Array<T>> {
  // ... API logic
  if (response.status !== 200) {
    throw new AppError(
      `${methodName} - Failed to fetch ${endpoint}`,
      ErrorCode.UNKNOWN_ERROR,
      500,
      body
    );
  }
}

// After
private async fetchAllPages<T>(endpoint: string, methodName: string): Promise<Array<T>> {
  // ... API logic
  if (response.status !== 200) {
    throw OfficeRnDServiceError.apiRequestFailed(
      methodName,
      endpoint,
      response.status,
      body
    );
  }
}
```

### 3. Member Operations

```typescript
// Before
public async getMember(id: string): Promise<OfficeRndMember> {
  // ... member logic
  if (response.status !== 200) {
    throw new AppError(
      'OfficeRndService.getMember()- Failed to get Office Rnd member',
      ErrorCode.UNKNOWN_ERROR,
      500,
      body
    );
  }
}

public async createMember(member: OfficeRndNewMember): Promise<OfficeRndMember> {
  // ... creation logic
  if (response.status !== 201) {
    throw new AppError(
      'OfficeRndService.createMember()- Failed to create Office Rnd member',
      ErrorCode.UNKNOWN_ERROR,
      500,
      body
    );
  }
}

// After
public async getMember(id: string): Promise<OfficeRndMember> {
  // ... member logic
  if (response.status !== 200) {
    throw OfficeRnDServiceError.apiRequestFailed(
      'OfficeRndService.getMember()',
      `/members/${id}`,
      response.status,
      body
    );
  }
}

public async createMember(member: OfficeRndNewMember): Promise<OfficeRndMember> {
  // ... creation logic
  if (response.status !== 201) {
    throw OfficeRnDServiceError.memberCreationFailed(
      'OfficeRndService.createMember()',
      member,
      body
    );
  }
}
```

### 4. Opportunity Operations

```typescript
// Before
public async createOpportunity(opportunity: OfficeRndOpportunity): Promise<OfficeRndOpportunity> {
  // ... creation logic
  if (response.status !== 201) {
    throw new AppError(
      'OfficeRndService.createOpportunity()- Failed to create Office Rnd opportunity',
      ErrorCode.UNKNOWN_ERROR,
      response.status,
      body
    );
  }
}

// After
public async createOpportunity(opportunity: OfficeRndOpportunity): Promise<OfficeRndOpportunity> {
  // ... creation logic
  if (response.status !== 201) {
    throw OfficeRnDServiceError.opportunityCreationFailed(
      'OfficeRndService.createOpportunity()',
      opportunity,
      response.status,
      body
    );
  }
}
```

### 5. Payment Operations

```typescript
// Before
public async addOverPayment(params: PaymentParams): Promise<void> {
  // ... payment logic
  if (response.status !== 201) {
    throw new AppError(
      'OfficeRndService.addOverPayment()- Failed to add overpayment',
      ErrorCode.UNKNOWN_ERROR,
      response.status,
      body
    );
  }
}

public async addNewFee(params: FeeParams): Promise<string> {
  // ... fee logic
  if (response.status !== 201) {
    throw new AppError(
      'OfficeRndService.addNewFee()- Failed to add new fee',
      ErrorCode.UNKNOWN_ERROR,
      response.status,
      body
    );
  }
}

// After
public async addOverPayment(params: PaymentParams): Promise<void> {
  // ... payment logic
  if (response.status !== 201) {
    throw OfficeRnDServiceError.paymentAdditionFailed(
      'OfficeRndService.addOverPayment()',
      params.memberId,
      response.status,
      body
    );
  }
}

public async addNewFee(params: FeeParams): Promise<string> {
  // ... fee logic
  if (response.status !== 201) {
    throw OfficeRnDServiceError.feeCreationFailed(
      'OfficeRndService.addNewFee()',
      params.feeName,
      params.memberId,
      response.status,
      body
    );
  }
}
```

## Benefits of the New Error Class

### 1. **Type Safety**
```typescript
// Specific error types for different scenarios
try {
  await officeRndService.getMember('123');
} catch (error) {
  if (error instanceof OfficeRnDServiceError) {
    // Type-safe error handling
    switch (error.code) {
      case OfficeRnDServiceErrorCode.MEMBER_NOT_FOUND:
        // Handle member not found
        break;
      case OfficeRnDServiceErrorCode.TOKEN_EXPIRED:
        // Handle token expiration
        break;
      case OfficeRnDServiceErrorCode.API_RATE_LIMIT_EXCEEDED:
        // Handle rate limiting
        break;
    }
  }
}
```

### 2. **Better Error Messages**
```typescript
// Before: Generic error message
"OfficeRndService.getMember()- Failed to get Office Rnd member"

// After: Specific, contextual error message
"OfficeRndService.getMember() - Failed to fetch /members/123 (404)"
```

### 3. **Structured Error Details**
```typescript
// Error details include method name, endpoint, status code, and response body
{
  methodName: 'OfficeRndService.getMember()',
  endpoint: '/members/123',
  statusCode: 404,
  responseBody: { error: 'Member not found' }
}
```

### 4. **Consistent Error Handling**
```typescript
// All OfficeRnD errors follow the same pattern
OfficeRnDServiceError.[operation]Failed(
  methodName,
  [relevant parameters],
  statusCode,
  responseBody,
  cause
);
```

## Migration Strategy

1. **Import the new error class**
2. **Replace one method at a time**
3. **Update error handling in calling code**
4. **Add tests for new error scenarios**
5. **Remove old AppError imports when complete**

This approach provides better error handling, improved debugging, and more maintainable code while preserving backward compatibility during the migration. 