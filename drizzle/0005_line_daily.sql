CREATE TABLE line_daily_deliveries (
 day TEXT PRIMARY KEY NOT NULL,
 payload TEXT NOT NULL,
 next_part INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,
 completed_at TEXT,
 last_status INTEGER
);
