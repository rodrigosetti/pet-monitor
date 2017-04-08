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

const DAY_SECONDS = 24 * 60 * 60;
const DAY_MILLIS = DAY_SECONDS * 1000;
const WEEKS_IN_YEAR = 52;
const WEEK_SECONDS = 7 * DAY_SECONDS;

const MILLIS_IN_MINUTES = 60 * 1000;
const MILLIS_IN_DAYS = 24 * 60 * MILLIS_IN_MINUTES;

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
        const startOfToday = new Date();
        startOfToday.setHours(0);
        startOfToday.setMinutes(0);
        startOfToday.setSeconds(0);
        startOfToday.setMilliseconds(0);

        const startOfThisWeek = new Date(startOfToday.getTime() - (DAY_MILLIS * startOfToday.getDay())).getTime() / 1000;

        const stat = db.prepare("SELECT SUM(delta) AS dsum, weekday, hour FROM deltas WHERE delta < 0 AND timestamp >= $since AND timestamp <= $until GROUP BY weekday, hour");

        const weekData = [];

        function processWeek(week) {
            const $since = startOfThisWeek - ((week + 1) * WEEK_SECONDS);
            const $until = startOfThisWeek - (week * WEEK_SECONDS);

            stat.get({ $since, $until }, (err, row) => {

                for (let $weekday=0; $weekday < 7; $weekday++) {
                    for (let $hour=0; $hour < 24; $hour++) {
                        // TODO
                    }
                }
            });
        }

        processWeek(0);
    }
};
