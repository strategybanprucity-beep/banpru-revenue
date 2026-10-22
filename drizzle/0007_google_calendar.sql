CREATE TABLE calendar_sync_jobs (
 booking_id TEXT PRIMARY KEY NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 synced_revision INTEGER NOT NULL DEFAULT 0,
 last_error TEXT,
 updated_at TEXT NOT NULL
);
