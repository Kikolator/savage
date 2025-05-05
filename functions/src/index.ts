import { initializeApp } from "firebase-admin/app";
import { scheduledEvents } from './scheduled-events';
import { isDevelopment } from "./core/utils/environment";
import { logger } from "firebase-functions";

// Set timezone to Madrid
process.env.TZ = 'Europe/Madrid';

// Initialize Firebase Admin
initializeApp();

if (isDevelopment()){
    logger.info('Running in development mode');
} else {
    logger.info('Running in production mode');
}

// Scheduled functions
Object.assign(exports, scheduledEvents());