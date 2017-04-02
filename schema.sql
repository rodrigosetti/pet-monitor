
/* stable changes */
CREATE TABLE deltas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER, /* when */
    delta INTEGER, /* by how much */
    weight INTEGER     /* new weight */
);

CREATE INDEX delta_timestamp ON deltas(timestamp);

