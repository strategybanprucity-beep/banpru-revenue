CREATE TABLE drive_uploads (key TEXT PRIMARY KEY NOT NULL,venue_id TEXT NOT NULL REFERENCES venues(id),file_id TEXT NOT NULL,owner_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE UNIQUE INDEX bookings_drive_document_unique ON bookings(document) WHERE document LIKE 'drive/%';
