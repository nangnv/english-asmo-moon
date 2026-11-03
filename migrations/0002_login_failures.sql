-- Failed password attempts per hashed IP and overall, so limits hold across Worker isolates.
CREATE TABLE IF NOT EXISTS login_failures (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
