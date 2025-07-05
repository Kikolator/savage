# Centralized Configuration

This directory contains the centralized configuration system for the Firebase Functions codebase.

## Overview

The configuration system provides a single source of truth for all application settings, making it easier to manage environment-specific configurations and reducing duplication.

## Files

- `app-config.ts` - Main centralized configuration with all settings
- `index.ts` - Exports for easy importing
- `main-config.ts` - Legacy configuration (deprecated)
- `firebase-secrets.ts` - Legacy Firebase secrets (deprecated)
- `office-rnd-config.ts` - Legacy OfficeRnd configuration (deprecated)
- `sendgrid.ts` - Legacy SendGrid configuration (deprecated)
- `typeform-ids.ts` - Legacy Typeform configuration (deprecated)

## Usage

### Basic Usage

```typescript
import {getConfig, getFirebaseConfig, getSendGridConfig} from '../config';

// Get all configuration
const config = getConfig();

// Get specific configuration sections
const firebaseConfig = getFirebaseConfig();
const sendgridConfig = getSendGridConfig();
const officeRndConfig = getOfficeRndConfig();
```

### Environment Detection

```typescript
import {getEnvironment, isDevelopment, isProduction, isStaging} from '../config';

const env = getEnvironment(); // 'development' | 'staging' | 'production'
const isDev = isDevelopment(); // boolean
const isProd = isProduction(); // boolean
const isStagingEnv = isStaging(); // boolean
```

### Configuration Structure

```typescript
interface AppConfig {
  environment: Environment;
  firebase: FirebaseConfig;
  sendgrid: SendGridConfig;
  officeRnd: OfficeRndConfig;
  typeform: TypeformConfig;
  cors: CorsConfig;
  rateLimit: RateLimitConfig;
  urls: {
    googleReview: string;
    website: string;
  };
}
```

## Migration from Legacy Config

### Before (Legacy)
```typescript
import {mainConfig} from '../config/main-config';
import {firebaseSecrets} from '../config/firebase-secrets';
import {officeRndConfig} from '../config/office-rnd-config';

const region = mainConfig.cloudFunctionsLocation;
const apiKey = firebaseSecrets.sendgridApiKey.value();
const clientId = officeRndConfig.clientId;
```

### After (Centralized)
```typescript
import {getConfig} from '../config';

const config = getConfig();
const region = config.firebase.region;
const apiKey = config.sendgrid.apiKey;
const clientId = config.officeRnd.clientId;
```

## Benefits

1. **Single Source of Truth** - All configuration in one place
2. **Type Safety** - Full TypeScript support with interfaces
3. **Environment Support** - Easy environment-specific configuration
4. **Centralized Management** - Changes only need to be made in one place
5. **Better Testing** - Easy to mock and test configuration
6. **Documentation** - Self-documenting configuration structure

## Environment Variables

The configuration system supports the following environment variables:

- `NODE_ENV` - Sets the environment ('development', 'staging', 'production')
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `SENDGRID_API_KEY` - SendGrid API key (via Firebase secrets)
- `TYPEFORM_SECRET` - Typeform secret key (via Firebase secrets)
- `OFFICE_RND_SECRET` - OfficeRnd secret key (via Firebase secrets)
- `OFFICE_RND_WEBHOOK_SECRET` - OfficeRnd webhook secret (via Firebase secrets)
- `SAVAGE_SECRET` - Savage secret key (via Firebase secrets)

## Future Enhancements

- Environment-specific configuration files
- Configuration validation
- Hot reloading for development
- Configuration encryption for sensitive data
- Configuration migration tools 