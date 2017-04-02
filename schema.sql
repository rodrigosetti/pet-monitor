
/* stable changes */
CREATE TABLE deltas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER, /* when */
    delta INTEGER, /* by how much (in grams) */
    weight INTEGER,     /* new weight (in grams) */
    temperature REAL   /* temperature reading (in Celsius) */
);

CREATE INDEX delta_timestamp ON deltas(timestamp);

