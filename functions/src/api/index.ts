import express, {Express} from 'express';

import {HttpServer} from './controllers';
import {interceptors} from './middelwares';
import {getControllersV1} from './controllers/controllers-v1';

// Initialize the express app
const apiApp: Express = express();

// Initialize the http server
const httpServer = new HttpServer(apiApp);

// Initialize the interceptors
for (const interceptor of interceptors) {
  apiApp.use(interceptor);
}

// Initialize the v1 router
const v1Router = httpServer.createdVersionedRouter('1');
const v1HttpServer = new HttpServer(v1Router);

// Initialize the controllers for v1
getControllersV1().forEach((controller) => {
  controller.initialize(v1HttpServer);
});

export default apiApp;
