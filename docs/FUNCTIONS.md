# Savage Coworking Backend Functions

## API

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
