import {initializeApp} from 'firebase-admin/app';
import {onRequest} from 'firebase-functions/v2/https';

import {scheduledEvents} from './scheduled-events';
import {STATIC_CONFIG, SECRET_REFERENCES} from './core/config';
import {initializeContainer} from './core/services/di';
import apiApp from './api';
import {callableFunctions, trialdayMigrationFunctions} from './app-functions';
import {initializeEventTriggers} from './event-triggers';

// Set timezone to UTC
process.env.TZ = STATIC_CONFIG.timezone;

// Initialize Firebase Admin
initializeApp();

// Initialize DI Container
initializeContainer();

// API app - using static config for deployment-safe values
exports.api = onRequest(
  {
    region: STATIC_CONFIG.region,
    secrets: [
      SECRET_REFERENCES.sendgridApiKey,
      SECRET_REFERENCES.officeRndSecretKey,
      SECRET_REFERENCES.typeformSecretKey,
      SECRET_REFERENCES.officeRndWebhookSecret,
      SECRET_REFERENCES.savageSecret,
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
Object.assign(exports, initializeEventTriggers());
