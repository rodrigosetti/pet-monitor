
/* stable changes */
CREATE TABLE deltas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER, /* when */
    delta INTEGER,     /* by how much (in grams) */
    weight INTEGER,    /* new weight (in grams) */
    temperature REAL,  /* temperature reading (in Celsius) */
    days INTEGER,      /* days since epoch (timezone) */
    hours INTEGER      /* hour in day (0-23) (timezone) */
);

CREATE INDEX delta_timestamp ON deltas(timestamp);
CREATE INDEX deltas_days ON deltas(days);
CREATE INDEX deltas_days_hours ON deltas(days, hours);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,

  /* notification preferences */
  phone_number TEXT,
  notify_consumption BOOLEAN,
  notify_refilling BOOLEAN,
  notify_empty BOOLEAN,
  notify_inactivity_hours INTEGER
);
