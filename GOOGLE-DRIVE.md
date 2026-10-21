# Google Drive documents

Google Cloud project: smart-axe-512307-v2 (Banprucity Venue Booking).
Drive owner: strategybanpru@gmail.com.
Folder mappings: config/google-drive-uploads.json.

The app uses GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_TOKEN_KEY Worker secrets. The refresh token is encrypted with AES-GCM before storage in D1. Never add these secrets or .sites-runtime files to Git.

A logged-in Super admin starts the owner-only authorization flow at /api/google-drive/connect. The redirect URI must exactly match https://revenue.banphru.workers.dev/api/google-drive/callback. PKCE, expiring one-use state, an HttpOnly state cookie and a matching Super admin session protect the callback. The callback verifies the Google account and parent folder write access before enabling attachments.

The Drive scope is required to access the existing venue folders created outside this OAuth client. It is broader than the application folder allowlist: app code only uploads to configured venue folders and only downloads registered files linked to bookings. Never set public sharing permissions on uploaded documents.

Google Auth Testing mode may expire refresh tokens after seven days. Complete Google's production/personal-use requirements before treating this connection as permanent. Do not claim long-term availability until this has been addressed. Reconnect as the owner if Google revokes access.

PDF uploads are capped at 10 MB, verify the PDF signature, are limited by IP and globally, and receive an opaque upload key bound to a HttpOnly browser cookie and venue. Booking attachment references expire after 30 minutes until attached. A unique index prevents reusing a document across bookings. Downloads through the app require an active admin and a booking reference. Unattached files are not automatically deleted; administrators should review the folders periodically.

The Google OAuth approval is performed by the Drive owner. Uploads remain disabled until that approval and folder checks succeed. Worker secrets alone do not enable uploads.

Tests: node --experimental-strip-types tests/drive-storage.mjs and node tests/booking-details.mjs. The first uses mocked Google responses; a real upload must also be checked after owner consent.
