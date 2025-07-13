# API v1 Endpoints

the main url is https://api.savage-coworking.com/v1

To test connection you can `GET /ping`

## Typeform Webhooks

All typeform webhooks are handled by `/webhook/typeform/`
Inside the function.

To add a new typeform form the the list:
1. Add the id to typeform config.
2. Set the fields and ids in the typeform mapping.

### Forms
#### Trial Day Form
Handles trial day requests. 
1. Checks if the space is open. 
2. Checks if a trial desk is available.
3. Adds booking to google calendar.
4. Sends confirmation email to user.
5. Add trial to Firestore and OfficeRnd opportunity.

## Office Rnd webhooks
#### New Member
- add to sendgrid.