# App Functions

This module contains callable functions that can be invoked directly from client applications.

## 📁 Structure

```
app-functions/
├── functions/              # Callable function implementations
│   ├── referral-functions.ts       # Referral management
│   └── trialday-migration-functions.ts # Data migration
├── index.ts                # Function exports
└── initialize-callable-functions.ts # Function initialization
```

## 🚀 Quick Start

### Callable Functions

#### Referral Functions
- **createReferralCode**: Generate new referral codes
- **getMigrationStatus**: Check migration progress

#### Migration Functions
- **migrateTrialdayData**: Migrate trial day data
- **getMigrationStatus**: Get migration status

### Usage
```typescript
import {onCall} from 'firebase-functions/v2/https';

export const createReferralCode = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    const {data, auth} = request;
    return await generateReferralCode(auth?.uid);
  }
);
```

## 🔧 Callable Function Patterns

### **Basic Callable Function**
Simple callable function with authentication:

```typescript
import {onCall} from 'firebase-functions/v2/https';
import {STATIC_CONFIG} from '../core/config';

export const myCallableFunction = onCall(
  {
    region: STATIC_CONFIG.region,
    maxInstances: 10
  },
  async (request) => {
    const {data, auth} = request;
    
    // Check authentication
    if (!auth) {
      throw new Error('Authentication required');
    }
    
    // Process request
    const result = await processRequest(data, auth.uid);
    return {success: true, data: result};
  }
);
```

### **Service-Based Callable Functions**
Use dependency injection for business logic:

```typescript
import {onCall} from 'firebase-functions/v2/https';
import {container} from '../core/services/di/container';

export const createReferralCode = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    const {auth} = request;
    
    if (!auth) {
      throw new Error('Authentication required');
    }
    
    const referralService = container.get('referralService');
    const firestoreService = container.get('firestoreService');
    
    try {
      // Generate referral code
      const referralCode = await referralService.generateCode(auth.uid);
      
      // Save to database
      await firestoreService.saveReferralCode(referralCode);
      
      return {
        success: true,
        referralCode: referralCode.code,
        expiresAt: referralCode.expiresAt
      };
    } catch (error) {
      console.error('Failed to create referral code:', error);
      throw new Error('Failed to create referral code');
    }
  }
);
```

### **Data Validation**
Validate input data before processing:

```typescript
import {onCall} from 'firebase-functions/v2/https';

interface CreateReferralRequest {
  type: 'member' | 'guest';
  description?: string;
}

export const createReferralCode = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    const {data, auth} = request;
    
    // Validate authentication
    if (!auth) {
      throw new Error('Authentication required');
    }
    
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid request data');
    }
    
    const {type, description} = data as CreateReferralRequest;
    
    if (!type || !['member', 'guest'].includes(type)) {
      throw new Error('Invalid referral type');
    }
    
    if (description && typeof description !== 'string') {
      throw new Error('Description must be a string');
    }
    
    // Process validated request
    const result = await createReferral(auth.uid, type, description);
    return {success: true, data: result};
  }
);
```

## 🔒 Security & Authentication

### **Authentication Checks**
Verify user authentication:

```typescript
export const authenticatedFunction = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    const {auth} = request;
    
    // Check if user is authenticated
    if (!auth) {
      throw new Error('Authentication required');
    }
    
    // Check if user has required claims
    if (!auth.token.admin && !auth.token.member) {
      throw new Error('Insufficient permissions');
    }
    
    // Process request
    return await processAuthenticatedRequest(auth.uid);
  }
);
```

### **Input Sanitization**
Sanitize and validate input data:

```typescript
export const safeCallableFunction = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    const {data} = request;
    
    // Sanitize string inputs
    const sanitizedData = {
      name: typeof data.name === 'string' ? data.name.trim() : '',
      email: typeof data.email === 'string' ? data.email.toLowerCase().trim() : '',
      phone: typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : ''
    };
    
    // Validate required fields
    if (!sanitizedData.name || !sanitizedData.email) {
      throw new Error('Name and email are required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedData.email)) {
      throw new Error('Invalid email format');
    }
    
    // Process sanitized data
    return await processSanitizedData(sanitizedData);
  }
);
```

## 📝 Error Handling

### **Structured Error Responses**
Provide consistent error responses:

```typescript
export const errorHandledFunction = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    try {
      const {data, auth} = request;
      
      // Validate request
      if (!auth) {
        return {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated'
        };
      }
      
      // Process request
      const result = await processRequest(data, auth.uid);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Callable function error:', error);
      
      // Return structured error response
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
);
```

### **Custom Error Classes**
Use custom error classes for better error handling:

```typescript
import {ValidationError, AuthenticationError} from '../core/errors';

export const customErrorFunction = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    try {
      const {data, auth} = request;
      
      if (!auth) {
        throw new AuthenticationError('User not authenticated');
      }
      
      if (!data || !data.requiredField) {
        throw new ValidationError('Required field missing');
      }
      
      const result = await processRequest(data, auth.uid);
      return {success: true, data: result};
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.message
        };
      } else if (error instanceof AuthenticationError) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: error.message
        };
      } else {
        return {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        };
      }
    }
  }
);
```

## 📊 Performance & Monitoring

### **Performance Tracking**
Monitor function performance:

```typescript
export const performanceTrackedFunction = onCall(
  {
    region: 'europe-west1',
    maxInstances: 10
  },
  async (request) => {
    const startTime = Date.now();
    const {auth} = request;
    
    console.log('Callable function started', {
      userId: auth?.uid,
      startTime: new Date(startTime).toISOString()
    });
    
    try {
      const result = await processRequest(request.data, auth?.uid);
      
      console.log('Callable function completed', {
        userId: auth?.uid,
        duration: Date.now() - startTime,
        success: true
      });
      
      return {success: true, data: result};
    } catch (error) {
      console.error('Callable function failed', {
        userId: auth?.uid,
        duration: Date.now() - startTime,
        error: error.message
      });
      
      throw error;
    }
  }
);
```

### **Rate Limiting**
Implement rate limiting for sensitive operations:

```typescript
import {container} from '../core/services/di/container';

export const rateLimitedFunction = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    const {auth} = request;
    
    if (!auth) {
      throw new Error('Authentication required');
    }
    
    const firestoreService = container.get('firestoreService');
    
    // Check rate limit
    const rateLimitKey = `rate_limit:${auth.uid}:create_referral`;
    const currentCount = await firestoreService.getRateLimitCount(rateLimitKey);
    
    if (currentCount >= 5) { // Max 5 per hour
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.'
      };
    }
    
    // Increment rate limit counter
    await firestoreService.incrementRateLimit(rateLimitKey);
    
    // Process request
    const result = await createReferral(auth.uid);
    return {success: true, data: result};
  }
);
```

## 🧪 Testing

### **Unit Testing**
```typescript
describe('createReferralCode', () => {
  it('should create referral code for authenticated user', async () => {
    const mockAuth = {
      uid: 'test-user-id',
      token: {member: true}
    };
    
    const mockRequest = {
      data: {type: 'member'},
      auth: mockAuth
    };
    
    const result = await createReferralCode(mockRequest);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('referralCode');
  });
  
  it('should reject unauthenticated requests', async () => {
    const mockRequest = {
      data: {type: 'member'},
      auth: null
    };
    
    await expect(createReferralCode(mockRequest))
      .rejects.toThrow('Authentication required');
  });
});
```

### **Integration Testing**
```typescript
describe('Callable Function Integration', () => {
  it('should process referral creation', async () => {
    const testUser = await createTestUser();
    const testAuth = {uid: testUser.uid, token: {member: true}};
    
    const request = {
      data: {type: 'member', description: 'Test referral'},
      auth: testAuth
    };
    
    const result = await createReferralCode(request);
    
    expect(result.success).toBe(true);
    
    // Verify database side effects
    const referralCode = await getReferralCodeFromDatabase(result.data.referralCode);
    expect(referralCode).toBeDefined();
    expect(referralCode.userId).toBe(testUser.uid);
  });
});
```

## 📚 Related Documentation

- **[Referral System](../docs/referrals.md)** - Referral management guide
- **[Data Migration](../docs/trialday-migration.md)** - Migration procedures
- **[Authentication](../docs/auth.md)** - User authentication guide
- **[Error Handling](../core/errors/)** - Error management patterns

## 🔗 Key Files

- `functions/referral-functions.ts` - Referral management functions
- `functions/trialday-migration-functions.ts` - Data migration functions
- `initialize-callable-functions.ts` - Function initialization
- `index.ts` - Callable function exports 