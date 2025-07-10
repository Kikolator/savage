export const STATIC_CONFIG = {
  region: 'europe-west1',
  projectId: 'savage-coworking',
  timezone: 'UTC',
  cors: {
    allowedOrigins: [
      'https://savage-coworking.com',
      'https://*.savage-coworking.com',
      'http://localhost:3000',
      'http://localhost:8080',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.',
  },
  urls: {
    googleReview: 'https://g.page/r/CWkHAQxtLGElEBM/review',
    website: 'https://savage-coworking.com',
  },
} as const;
