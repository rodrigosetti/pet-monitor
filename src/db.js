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

const MILLIS_IN_MINUTES = 60 * 1000;
const MILLIS_IN_DAYS = 24 * 60 * MILLIS_IN_MINUTES;
const ZERO_24 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function computeDays(date) {
    return Math.floor((date.getTime() - (date.getTimezoneOffset() * MILLIS_IN_MINUTES)) / MILLIS_IN_DAYS);
}

module.exports = {
    insert: (date, $delta, $weight, $temperature) => {
        const $timestamp = date.getTime() / 1000; // in seconds
        const $hours = date.getHours();
        const $days = computeDays(date);

        db.run('INSERT INTO deltas VALUES (NULL, $timestamp, $delta, $weight, $temperature, $days, $hours)',
               {
                   $timestamp,
                   $delta,
                   $weight,
                   $temperature,
                   $hours,
                   $days
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


    getTrends: (daysBack, callback) => {
        const today = computeDays(new Date());

        db.all("SELECT SUM(delta) AS dsum, timestamp FROM deltas WHERE delta < 0 AND days >= $since AND days < $to GROUP BY days ORDER BY days DESC",
               {
                   $since: today - daysBack,
                   $to: today
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
    },

    getPunchCard: (callback) => {
        // for each week, starting now and back 52 (or until there's no results):
        //    calculate the sum(delta) group by day and hour, add to a list of (weekday, hour, sum(delta))
        // average all sum(delta)
        const date = new Date();
        const today = computeDays(date);
        const startOfWeekDay = today - date.getDay();
        const weeks = [];

        function queryWeek(week) {
            // both $since and $to are sundays
            const $since = startOfWeekDay - ((week+1) * 7);
            const $to = startOfWeekDay - (week * 7);
            db.all("SELECT sum(delta) AS dsum, days, hours FROM deltas WHERE delta < 0 AND days >= $since AND days < $to GROUP BY days, hours",
                   {
                       $since, $to
                   },
                   (err, rows) => {
                       if (err) {
                           callback(err);
                       } else {
                           const weekDayToHourValues = {};
                           rows.forEach(r => {
                               const weekday = r.days - $since;
                               if (!weekDayToHourValues[weekday]) {
                                   weekDayToHourValues[weekday] = {};
                               }
                               weekDayToHourValues[weekday][r.hours] = -r.dsum;
                           });

                           // normalize and add missing values
                           Object.keys(weekDayToHourValues).forEach(weekday => {
                               const o = weekDayToHourValues[weekday];
                               const values = [];
                               for (let h=0; h < 24; h++) {
                                   values.push(o[h] || 0);
                               }
                               weekDayToHourValues[weekday] = values;
                           });

                           weeks.push(weekDayToHourValues);

                           if (rows.length && week < 52) {
                               queryWeek(week + 1);
                           } else {
                               // done: compute average
                               const result = {
                                   0 : ZERO_24.slice(),
                                   1 : ZERO_24.slice(),
                                   2 : ZERO_24.slice(),
                                   3 : ZERO_24.slice(),
                                   4 : ZERO_24.slice(),
                                   5 : ZERO_24.slice(),
                                   6 : ZERO_24.slice()
                               };
                               weeks.forEach(w => {
                                   Object.keys(w).forEach(weekday => {
                                       for (let h=0; h < 24; h++) {
                                           result[weekday][h] += w[weekday][h];
                                       }
                                   });
                               });
                               // average
                               const N = weeks.length;
                               Object.keys(result).forEach(weekday => {
                                   for (let h=0; h < 24; h++) {
                                       result[weekday][h] /= N;
                                   }
                               });

                               callback(null, result);
                           }
                       }
                   });
        }

        queryWeek(0);
    }
};
