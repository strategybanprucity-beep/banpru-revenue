# Google Drive booking documents

Google Cloud project: smart-axe-512307-v2 (Banprucity Venue Booking).
Drive owner: strategybanpru@gmail.com. Google Auth publishing status was observed as In production on 2026-10-21.
Folder allowlist: config/google-drive-uploads.json (seven existing venue folders under Revenue).

## Connection

Use /admin/drive as an active Super admin. The migration button revokes the previous broad Google grant before requesting only openid, email, and https://www.googleapis.com/auth/drive.file. Uploads pause during migration. Revocation never deletes Drive files. The callback rejects a returned Drive scope other than drive.file and verifies the Google account. It holds the encrypted refresh token as an expiring pending setup until the owner chooses all seven existing folders in Google Picker. Server checks their exact IDs, MIME type, parent ID and write capability before activating the connection. Existing files created by this app remain app files; previously unrelated files inside selected folders are not automatically granted to the app.

The redirect URI is https://revenue.banphru.workers.dev/api/google-drive/callback. OAuth uses PKCE, an expiring one-use state, an HttpOnly state cookie and the matching Super admin session. Google Picker receives a short-lived access token only through the authenticated Super admin setup endpoint with no-store headers. Refresh tokens are never sent to the browser; AES-GCM encrypts them before D1 storage.

Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_KEY, GOOGLE_PICKER_KEY. Never commit secrets or .sites-runtime. The Picker key is restricted to https://revenue.banphru.workers.dev/* and https://docs.google.com/*, and to Google Drive API plus Google Picker API. OAuth JavaScript origin is https://revenue.banphru.workers.dev. The public data notice is /privacy.

Production removes the Testing-specific seven-day refresh-token limit, but Google may still revoke or expire authorizations. Check the returned refresh_token_expires_in before claiming unattended long-term availability. The setup page warns if Google returns a time-limited grant. App publishing is separate from Google brand verification; do not claim verified status unless verified in the console.

## Documents

PDFs are capped at 10 MB, validated by signature, rate-limited per IP and globally, and uploaded under an opaque filename into the chosen venue folder. The opaque upload key is bound to an HttpOnly browser cookie and venue, expires after 30 minutes until attached, and cannot be reused across bookings. Through the app, only active admins can download a file linked to a booking. Drive folder sharing stays with the account owner; the app does not make files public. Unattached or old files are not automatically deleted. Deleting a booking does not delete its Drive document.

Tests:
- node --experimental-strip-types tests/drive-scope.mjs
- node --experimental-strip-types tests/drive-storage.mjs
- node tests/booking-details.mjs
- node node_modules/typescript/bin/tsc --noEmit

The storage test mocks Google. After selecting folders, test an actual upload and verify destination, permissions, and failed access outside the allowlist. Do not report the scope migration complete before that check.
