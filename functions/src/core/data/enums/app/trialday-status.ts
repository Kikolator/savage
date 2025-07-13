export enum TrialdayStatus {
  REQUESTED = 'requested',
  PENDING_EMAIL_CONFIRMATION = 'pending-email-confirmation',
  EMAIL_CONFIRMED = 'email-confirmed',
  EMAIL_CONFIRMATION_SENT = 'email-confirmation-sent',
  PHONE_CONFIRMATION_SENT = 'phone-confirmation-sent',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED_BY_USER = 'cancelled-by-user',
  CANCELLED_BY_OFFICE = 'cancelled-by-office',
  RESCHEDULED_BY_USER = 'rescheduled-by-user',
  RESCHEDULED_BY_OFFICE = 'rescheduled-by-office',
}
