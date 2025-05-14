# Savage Coworking Backend Functions

!! TIMEZONE !! All dates are converted to UTC. If no timezone parameter is set in the 
request, we will assume it's UTC.

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
To add a secret:
```bash
# Change the value of an existing secret
firebase functions:secrets:set SECRET_NAME

# View the value of a secret
functions:secrets:access SECRET_NAME

# Destroy a secret
functions:secrets:destroy SECRET_NAME

# View all secret versions and their state
functions:secrets:get SECRET_NAME

# Automatically clean up all secrets that aren't referenced by any of your functions
functions:secrets:prune
```

