# LINE booking notifications

Cloudflare Worker secrets: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_GROUP_ID`.
`LINE_CHANNEL_SECRET` is reserved for validating a future webhook; sending notifications does not require a webhook when the target group is already known.
Never commit credentials. The OA must be a member of the target group.

Notifications follow successful booking creation and status changes (approved, rejected, cancelled). Failed/conflicting mutations do not send. Messages contain venue, Bangkok date/time, status, booking ID and the authenticated admin page link. Contact information and uploaded documents are not included.

Each send has a unique LINE retry key. Transient network/server failures retry once with the same key; permanent errors do not retry. Delivery acceptance/failure is recorded as `line_sent` / `line_failed` in the admin audit log. A LINE failure does not reverse a saved booking. There is no background delivery queue; a persistent delivery failure needs administrator attention. LINE message quota still applies.

Run `node --experimental-strip-types tests/line-message.mjs` for privacy, timezone and delivery failure tests. Test credentials and network checks belong in ignored `.sites-runtime` only.
