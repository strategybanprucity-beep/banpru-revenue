# LINE booking notifications

Cloudflare Worker secrets: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_GROUP_ID`.
`LINE_CHANNEL_SECRET` is reserved for validating a future webhook; sending notifications does not require a webhook when the target group is already known.
Never commit credentials. The OA must be a member of the target group.

Notifications follow successful booking creation and status changes (approved, rejected, cancelled). Failed/conflicting mutations do not send. Messages contain purpose, venue/location, department, booker name, Bangkok date/time, status and authenticated admin link. Immediate notifications do not include phone/email or documents.

The same Worker runs `scheduled()` at `0 1 * * *` UTC (08:00 Asia/Bangkok). The daily summary includes pending/approved bookings overlapping that Thai calendar day, including ongoing multi-day bookings. Rejected/cancelled bookings are excluded. No bookings means no message. Daily details also include the booker's phone as requested. Long summaries are split below LINE's text limit. `line_daily_deliveries` stores per-day progress and stable retry keys, prevents repeat delivery of completed summaries, and clears the message payload after completion. Failed runs are visible in Worker logs and can be retried with the same scheduled date; no extra automatic retry schedule is configured. Apply migration `0005_line_daily.sql` before deployment. This is an app-level Cloudflare Cron Trigger, independent of the user's computer.

Each send has a unique LINE retry key. Transient network/server failures retry once with the same key; permanent errors do not retry. Delivery acceptance/failure is recorded as `line_sent` / `line_failed` in the admin audit log. A LINE failure does not reverse a saved booking. There is no background delivery queue; a persistent delivery failure needs administrator attention. LINE message quota still applies.

Run `node --experimental-strip-types tests/line-message.mjs` for privacy, timezone and delivery failure tests. Test credentials and network checks belong in ignored `.sites-runtime` only.
Run `node --experimental-strip-types tests/line-daily.mjs` for day boundaries, no-booking skips, status selection, multi-day overlap, chunking and delivery deduplication tests.
