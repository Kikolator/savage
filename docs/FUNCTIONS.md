# Savage Coworking Backend Functions

## API

API calls are structured according to express app practices with a little bit of extra sauce to handle errors, and use an API versioning implementation. Herre is the basic setup:
1. After initializing our express app, as you normally do, we initialize a new HttpServer class which handles the calls and error handling.
2. We then iterate over interceptors to use as global midleware, adding them to our app.
3. Our HttpServer allows us to create a new versioned router, which we can then use to initialise a new versioned HttpServer, and run version specific middleware.
4. We initiate our controllers for each version handling CRUD logic.
Check out the index file [HERE](../functions/src/api/index.ts)

To check out v1 endpoint refer to the [API documentation](./API_V1.md).

- [ ] TODO: Create a webhook for typeform submissions.

## Scheduled

Sendgrid Functions:
- **updateSendgerid**: Gets the latest custom field and list ids from sendgrid and stores them in firestore.

## Core

Core functionalities of our functions package.
- services: Classes that handle specific package functionalities. e.g. Firestore, Sendgrid, OfficeRnd,...
- Data: The models and enums we use throughtout ensuring type safety.

## Config

For config variables use the mainConfig map.

We use Firebase Secrets for env keys and secret values.
- Parameterized configuration (recommended for most scenarios). This provides strongly-typed environment configuration with parameters that are validated at deploy time, which prevents errors and simplifies debugging.
