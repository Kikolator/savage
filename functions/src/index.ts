import {initializeApp} from 'firebase-admin/app';
import {onRequest} from 'firebase-functions/v2/https';

import {scheduledEvents} from './scheduled-events';
import {getConfig} from './core/config';
import apiApp from './api';
import {callableFunctions, trialdayMigrationFunctions} from './app-functions';
import {eventTriggers} from './event-triggers';
import {initializeContainer} from './core/di';

// Set timezone to UTC
process.env.TZ = 'UTC';

// Initialize Firebase Admin
initializeApp();

// Initialize DI Container
initializeContainer();

// API app
const config = getConfig();
exports.api = onRequest(
  {
    region: config.firebase.region,
    secrets: [
      config.firebase.secrets.typeformSecretKey,
      config.firebase.secrets.officeRndSecretKey,
      config.firebase.secrets.sendgridApiKey,
      config.firebase.secrets.officeRndWebhookSecret,
      config.firebase.secrets.savageSecret,
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
