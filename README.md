# Savage Coworking

## Documentation:

- [API v1](./docs/API_V1.md)
- [Functions](./docs/FUNCTIONS.md)
- [Hosting](./docs/HOSTING.md)
- [Office RnD](./docs/OFFICE_RND.md)
- [Referrals](./docs/REFERRALS.md)
- [Sendgrid](./docs/SENDGRID.md)

## App Services

The goal of this app is connecting various platforms we use to manage our coworking space in a clean and productive codebase, easy to manage, operations oriented.

### OfficeRnd Integration Architecture

Our OfficeRnd integration follows a **webhook-driven architecture** where Firestore serves as the source of truth for read operations, while OfficeRnd remains the master system for write operations.

#### Architecture Overview

```
┌─────────────────┐    Webhook    ┌─────────────────┐
│   OfficeRnd     │ ────────────► │    Firestore    │
│                 │               │                 │
│  (Master Data)  │               │ (Source of      │
│                 │               │  Truth)         │
└─────────────────┘               └─────────────────┘
         ▲                                │
         │                                │
         │ API Calls                      │ Read Operations
         │ (Create/Update)                │ (Get/Query)
         │                                │
         └────────────────────────────────┘
                    Your App
```

#### Data Flow

1. **Read Operations**: Always from Firestore (fast, consistent)
   - `getAllMembers()` - From Firestore
   - `getOpportunities()` - From Firestore
   - `getOpportunityStatuses()` - From Firestore

2. **Write Operations**: Always to OfficeRnd API (triggers webhooks)
   - `createMember()` - To OfficeRnd API
   - `updateMember()` - To OfficeRnd API
   - `createOpportunity()` - To OfficeRnd API

3. **Migration/Recovery**: Direct API access when needed
   - `getAllMembersFromAPI()` - From OfficeRnd API
   - `getOpportunitiesFromAPI()` - From OfficeRnd API
   - `getOpportunityStatusesFromAPI()` - From OfficeRnd API

#### Benefits

- **Performance**: No API calls for reads
- **Consistency**: Single source of truth
- **Reliability**: Webhook + scheduled backup
- **Cost**: Reduced API usage
- **Scalability**: Firestore handles query complexity

For detailed implementation, see [Office RnD Documentation](./docs/OFFICE_RND.md).

### Trial Days

User flow:
1. User signs up through a typeform on our website.
2. The user is requested to confirm their email address.
3. User receives:
    a. A confirmation of their trial day
    b. A request to reschedule.
4. User receives a reminder the previous day.
5. On completion: the user receives a follow up email.
6. After a couple of days a follow up call.

Catches:
- User is already a member, or already had a trial day before.
- User already booked a trial day at another date.

Their are several models we use:
- TrialDayFormData (the data incomming through typeform)
- Trialday (the main firestore model for trial days)
- OfficeRndOpportunity (The opportunity model we use in OfficeRnd (crm))

This functionality is handled by the TrialdayService.  
This service includes methods for:
- handleTrialdayRequest(typeFormData)
- sendEmailConfirmation(trialday)
- canBookTrail(trialday)
- sendPhoneConfirmation(trialday)
- confirm(trialday)
- cancel(trialday, cancelObject)
- complete(eventId, feedbackObject)
- addComment(eventId, commentObject)

### Signup

### Email Confirmation

When a new user signs up for a trial day, a subscription or an event, we ask to confirm their email address. The EmailConfirmationObject is stored in firestore for future references so once an email is confirmed it does not need to go through those steps again.  
We don't link EmailObjects to users for privacy reasons. This simply a service to check if an email has been confirmed or not.

EmailConfirmationService methods:
- checkIfConfirmed(email): Promise\<boolean\>
- confirmEmail(email)

## Version

Git Branches:

- main: latest firebase deploy **v0.6**

