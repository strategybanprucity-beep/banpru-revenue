# Google Calendar integration

Owner: strategybanpru@gmail.com. A dedicated secondary calendar named จองใช้สถานที่เทศบาลเมืองบ้านพรุ is created by the app. OAuth uses only openid/email and `calendar.app.created`, which permits management of calendars the app creates, not pre-existing personal calendars. Drive authorization remains separate and is never revoked by this flow.

Enable Calendar API in project smart-axe-512307-v2. Add `https://revenue.banphru.workers.dev/api/google-calendar/callback` to the existing OAuth web client's authorized redirect URIs. The existing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_TOKEN_KEY secrets are reused. Calendar refresh credentials are encrypted separately in D1. Only an active Super admin can connect or retry sync at `/admin/calendar`. OAuth checks state cookie, one-use state record, expiry, PKCE, current role, verified owner email and scope.

Apply migration 0007_google_calendar.sql. Successful approvals, edits, cancellations and deletion queue a sync. Only approved bookings create events; other statuses or missing bookings remove the corresponding app event. IDs are deterministic to avoid duplicates. Initial connection queues ongoing/future approved bookings. Calendar is private by default; no public ACL, guests, invitations, phone numbers, emails or documents are added. Title, venue/location, department, time and booking ID are sent. Web app/D1 is the source of truth; Calendar edits do not flow back.

Queue revisions prevent losing updates during a sync. A short global lease serializes workers. Mutations try syncing immediately; the independent `*/5 * * * *` Cron Trigger retries pending work in batches of 25. This cron never calls LINE. Super admin can retry queued work manually. A Calendar outage does not reverse a successful booking mutation. Pending count is visible on the connection page. Existing LINE policy remains new booking requests only.

Run `node --experimental-strip-types tests/calendar-events.mjs` and TypeScript/build checks. Complete owner consent and verify actual create/edit/cancel behavior before reporting activation.
