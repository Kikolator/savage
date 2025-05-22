# SENDGRID README

#### Lists:
- leads
- members
- newsletter

#### Reserved Fields:
- first_name
- last_name
- email
- phone_number_id (main phone)
- external_id (app_id can be office and or firebase in the future)
- phone_number (WhatsApp phone if diff from phone_number_id)

#### Custom Fields:
**General**:
- location (e.g. “Estepona, Spain”)
- tags (comma-separated, or use SendGrid’s native tagging if needed)
**Membership**:
- membership_status (active, on-leave, drop-in, trial, former, lead)
	- active when has an active recurring membership
	- drop-in when has active day-passes
	- on-leave when inactive but coming back within 3 months
	- trial has had a trial day but not a membership
	- former had a membership or was a drop-in
	- lead has not had a trial or memerbship yet.
- membership_start_date
- membership_end_date
- trial_start_date (populated when user signs up for trial)
- trial_end_date (populated when user has completed trial)
**Engagement**:
- last_checkin_date
- event_attendee (yes, no, savage_friday_only, rooftop_sessions_only, etc..)
- newsletter_opt_in (true, false)
- engagement_score (manual or automated: 1-10)
**Source Tracking**:
- signup_source:
  - typeform-trial-day
  - typeform-contact
- referrer_email