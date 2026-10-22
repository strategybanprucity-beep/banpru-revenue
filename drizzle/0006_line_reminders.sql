CREATE TABLE line_booking_reminders (
 booking_id TEXT NOT NULL,
 start_at TEXT NOT NULL,
 retry_key TEXT NOT NULL,
 lease_until INTEGER NOT NULL DEFAULT 0,
 sent_at TEXT,
 last_status INTEGER,
 PRIMARY KEY (booking_id,start_at)
);
