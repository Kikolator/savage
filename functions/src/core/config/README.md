# Configuration Management

This directory contains the configuration management system for the Firebase Functions project. The configuration is split into static (deployment-safe) and runtime (secret-dependent) values to ensure proper deployment behavior.

## Structure

### Static Configuration (`static-config.ts`)
Contains all deployment-safe configuration values that can be accessed at module load time without causing deployment issues.

```typescript
export const STATIC_CONFIG = {
  region: 'us-central1',
  timezone: 'UTC',
  // ... other static values
} as const;
```

### Secret Management (`secrets.ts`)
Contains Firebase secret definitions and references for function declarations.

```typescript
import {defineSecret} from 'firebase-functions/params';

// Firebase secret definitions
export const SECRETS = {
  sendgridApiKey: defineSecret('SENDGRID_API_KEY'),
  // ... other secrets
} as const;

// Secret references for function declarations only
export const SECRET_REFERENCES = {
  sendgridApiKey: SECRETS.sendgridApiKey,
  // ... other secret references
} as const;
```

### Runtime Configuration (`runtime-config.ts`)
Contains all secret-dependent configuration values that are only accessed at runtime. This includes:

- **Runtime Config Interface**: TypeScript interface defining the runtime configuration structure
- **Runtime Config Function**: Function that resolves all secrets and returns the complete runtime configuration

```typescript
import {SECRETS} from './secrets';

export interface RuntimeConfig {
  environment: 'development' | 'staging' | 'production' | 'test';
  sendgrid: {
    apiKey: string;
    fromEmail: string;
    templates: {
      trialdayConfirmation: string;
      trialdayFollowUp: string;
    };
  };
  officeRnd: {
    clientId: string;
    grantType: string;
    scopes: string;
    orgSlug: string;
    apiV2url: string;
    defaultLocationId: string;
    defaultReferralPlanId: string;
    secretKey: string;        // Secret value
    webhookSecret: string;    // Secret value
  };
  typeform: {
    ids: {
      trialDay: string;
    };
    secretKey: string;        // Secret value
  };
  savage: {
    secret: string;           // Secret value
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    environment: process.env.NODE_ENV || 'development',
    sendgrid: {
      apiKey: SECRETS.sendgridApiKey.value(),
      // ... other values
    },
    // ... other config sections
  };
}
```

## Usage

### In Services and Controllers

Always use `getConfig()` or `getRuntimeConfig()` to access configuration values:

```typescript
import {getConfig} from '../config';

class MyService {
  private readonly config: ReturnType<typeof getConfig>['runtime'];

  constructor() {
    // Get runtime config when service is instantiated
    const appConfig = getConfig();
    this.config = appConfig.runtime;
  }

  async someMethod() {
    // Access secrets safely at runtime
    const apiKey = this.config.sendgrid.apiKey;
    const webhookSecret = this.config.officeRnd.webhookSecret;
  }
}
```

### In Function Declarations

Use `SECRET_REFERENCES` only for function declarations:

```typescript
import {STATIC_CONFIG, SECRET_REFERENCES} from '../config';

export const myFunction = onRequest(
  {
    region: STATIC_CONFIG.region,
    secrets: [SECRET_REFERENCES.sendgridApiKey],
  },
  async (request, response) => {
    // Access secrets through getRuntimeConfig() at runtime
    const config = getRuntimeConfig();
    const apiKey = config.sendgrid.apiKey;
  }
);
```

## Best Practices

### ✅ DO

1. **Access secrets only at runtime**: Always call `getRuntimeConfig()` or `getConfig()` within function handlers, not at module load
2. **Use SECRET_REFERENCES for declarations**: Only use `SECRET_REFERENCES` in function declarations, never for accessing values
3. **Initialize config in constructors**: Get runtime config when services/controllers are instantiated
4. **Use static config for deployment-safe values**: Use `STATIC_CONFIG` for region, timezone, and other static values

### ❌ DON'T

1. **Access secrets at module load**: Never call `.value()` on secrets at the top level of modules
2. **Export SECRETS directly**: The internal `SECRETS` object should never be exported
3. **Use SECRET_REFERENCES for values**: Don't call `.value()` on `SECRET_REFERENCES` - use `getRuntimeConfig()` instead
4. **Hardcode secret values**: Always use the configuration system, never hardcode secrets

## Migration Guide

### From Old Structure

**Before:**
```typescript
import {SECRETS} from '../config';

// ❌ Wrong - accessing secrets at module load
const apiKey = SECRETS.sendgridApiKey.value();

// ❌ Wrong - using SECRETS in function declarations
secrets: [SECRETS.sendgridApiKey],
```

**After:**
```typescript
import {getConfig, SECRET_REFERENCES} from '../config';

// ✅ Correct - accessing secrets at runtime
const config = getConfig();
const apiKey = config.runtime.sendgrid.apiKey;

// ✅ Correct - using SECRET_REFERENCES for declarations
secrets: [SECRET_REFERENCES.sendgridApiKey],
```

## Common Patterns

### Service Pattern
```typescript
class MyService {
  private readonly config: ReturnType<typeof getConfig>['runtime'];

  constructor() {
    const appConfig = getConfig();
    this.config = appConfig.runtime;
  }

  async authenticate() {
    const secret = this.config.someService.secretKey;
    // Use secret...
  }
}
```

### Controller Pattern
```typescript
class MyController {
  private readonly config: ReturnType<typeof getConfig>['runtime'];

  constructor() {
    const appConfig = getConfig();
    this.config = appConfig.runtime;
  }

  verifySignature(signature: string) {
    const expectedSecret = this.config.someService.webhookSecret;
    // Verify signature...
  }
}
```

### Function Declaration Pattern
```typescript
export const myFunction = onRequest(
  {
    region: STATIC_CONFIG.region,
    secrets: [SECRET_REFERENCES.sendgridApiKey],
  },
  async (request, response) => {
    const config = getRuntimeConfig();
    const apiKey = config.sendgrid.apiKey;
    // Use apiKey...
  }
);
```

## Error Handling

If you encounter deployment errors related to secrets, check:

1. **Module load access**: Ensure no `.value()` calls are happening at module load time
2. **Import statements**: Verify you're importing `SECRET_REFERENCES` for declarations and `getRuntimeConfig()` for values
3. **Service initialization**: Make sure services get config in constructors, not at module load
4. **Function declarations**: Confirm all function declarations use `SECRET_REFERENCES`

## Testing

When testing, you can mock the configuration:

```typescript
import {getConfig} from '../config';

// Mock the config for testing
jest.mock('../config', () => ({
  getConfig: jest.fn(() => ({
    runtime: {
      sendgrid: {
        apiKey: 'test-api-key',
        // ... other test values
      },
    },
  })),
}));
``` 