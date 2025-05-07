import { initializeApp } from 'firebase-admin/app';
import { scheduledEvents } from './scheduled-events';
import { isDevelopment } from './core/utils/environment';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { mainConfig } from './core/config/main-config';
import apiApp from './api';

// Set timezone to Madrid
process.env.TZ = 'Europe/Madrid';

// Initialize Firebase Admin
initializeApp();

if (isDevelopment()) {
  logger.info('Running in development mode');
} else {
  logger.info('Running in production mode');
}

// API app
exports.api = onRequest(
  {
    region: mainConfig.cloudFunctionsLocation,
    secrets: [],
  },
  apiApp,
);

// Scheduled functions
Object.assign(exports, scheduledEvents());
