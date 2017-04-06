/* jshint node:true, esversion:6 */

const winston = require('winston');
const config = require('config');
const path = require('path');
let sqlite3 = require('sqlite3');

const db = new sqlite3.Database(path.join(__dirname, '..', 'data.db'));

if (config.get('log.cli_mode')) {
    sqlite3 = sqlite3.verbose();
}

function atExit(exitCode) {
    db.close(() => { winston.info('database closed'); });
}

process.on('exit', atExit);
process.on('SIGEXIT', atExit);

module.exports = {
    insert: ($now, $delta, $weight, $temperature) => {
        db.run('INSERT INTO deltas VALUES (NULL, $now, $delta, $weight, $temperature)',
                {
                    $now,
                    $delta,
                    $weight,
                    $temperature
                });
    },


    getEvents : ($since, $to, callback) => {
        db.all(
                'SELECT * FROM deltas WHERE timestamp >= $since AND timestamp <= $to ORDER BY timestamp DESC',
                {
                    $since,
                    $to
                },
                callback);
    },


    getConsumptionSum: ($since, $to, callback) => {
                db.get(
                        'SELECT SUM(delta) as dsum FROM deltas WHERE timestamp >= $since AND timestamp < $to AND delta < 0',
                        {
                            $since,
                            $to
                        },
                        (err, row) => { callback(err, row && row.dsum); });
    }
};
