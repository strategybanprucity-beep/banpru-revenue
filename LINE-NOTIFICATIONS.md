# LINE booking notifications

Cloudflare Worker secrets: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_GROUP_ID`.
`LINE_CHANNEL_SECRET` is reserved for validating a future webhook; sending notifications does not require a webhook when the target group is already known.
Never commit credentials. The OA must be a member of the target group.

Notifications follow successful booking creation and status changes (approved, rejected, cancelled). Failed/conflicting mutations do not send. Messages contain purpose, venue/location, department, booker name, Bangkok date/time, status and authenticated admin link. Immediate notifications do not include phone/email or documents.

The same Worker runs `scheduled()` at `0 1 * * *` UTC (08:00 Asia/Bangkok). The daily summary includes pending/approved bookings overlapping that Thai calendar day, including ongoing multi-day bookings. Rejected/cancelled bookings are excluded. No bookings means no message. Daily details also include the booker's phone as requested. Long summaries are split below LINE's text limit. `line_daily_deliveries` stores per-day progress and stable retry keys, prevents repeat delivery of completed summaries, and clears the message payload after completion. Failed runs are visible in Worker logs and can be retried with the same scheduled date; no extra automatic retry schedule is configured. Apply migration `0005_line_daily.sql` before deployment. This is an app-level Cloudflare Cron Trigger, independent of the user's computer.

Each send has a unique LINE retry key. Transient network/server failures retry once with the same key; permanent errors do not retry. Delivery acceptance/failure is recorded as `line_sent` / `line_failed` in the admin audit log. A LINE failure does not reverse a saved booking. There is no background delivery queue; a persistent delivery failure needs administrator attention. LINE message quota still applies.

Run `node --experimental-strip-types tests/line-message.mjs` for privacy, timezone and delivery failure tests. Test credentials and network checks belong in ignored `.sites-runtime` only.
Run `node --experimental-strip-types tests/line-daily.mjs` for day boundaries, no-booking skips, status selection, multi-day overlap, chunking and delivery deduplication tests.

## One-hour reminder

The `* * * * *` Cron Trigger calls `sendBookingReminders`, independently of the daily trigger. Only approved bookings starting within 55–60 minutes of the scheduled invocation qualify. The five-minute window permits retries and small cron delays. Messages include purpose, venue/location, department, booker name/phone, Thai dates and approval status. Pending, rejected and cancelled bookings do not receive reminders. Bookings created/approved less than 55 minutes before starting do not receive a late one-hour reminder.

Apply `0006_line_reminders.sql` before deployment. Delivery state is keyed by booking ID and start timestamp. The handler rechecks approval/start time after claiming a short lease; rescheduling creates a fresh reminder opportunity. Successful sends are deduplicated, failures retry on the following minute while within the recovery window, with the same LINE retry key. Persistent failure throws to Worker logs. No message is sent when nothing qualifies. Test with `node --experimental-strip-types tests/line-reminders.mjs`.
