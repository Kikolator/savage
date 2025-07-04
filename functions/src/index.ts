import {initializeApp} from 'firebase-admin/app';
import {onRequest} from 'firebase-functions/v2/https';

import {scheduledEvents} from './scheduled-events';
import {mainConfig} from './core/config/main-config';
import apiApp from './api';
import {firebaseSecrets} from './core/config/firebase-secrets';
import {callableFunctions, trialdayMigrationFunctions} from './app-functions';
import {eventTriggers} from './event-triggers';

// Set timezone to UTC
process.env.TZ = 'UTC';

// Initialize Firebase Admin
initializeApp();

// API app
exports.api = onRequest(
  {
    region: mainConfig.cloudFunctionsLocation,
    secrets: [
      firebaseSecrets.typeformSecretKey,
      firebaseSecrets.officeRndSecretKey,
      firebaseSecrets.sendgridApiKey,
    ],
  },
  apiApp
);

// Scheduled functions
Object.assign(exports, scheduledEvents());

// App Functions
Object.assign(exports, callableFunctions());

// Migration Functions
Object.assign(exports, trialdayMigrationFunctions);

// Event Triggers
Object.assign(exports, eventTriggers());
