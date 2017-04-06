/* jshint node:true, esversion:6 */

const winston = require('winston');
const dateformat = require('dateformat');
const db = require('../db');
const serial = require('../serial');

const DAY_SECONDS = 24 * 60 * 60;

module.exports.api = (req, res) => {
    const maxDays = req.query.days || 7;

    // get start of this day
    const dayStart = new Date();
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayStart.setMilliseconds(0);

    const dayStartSec = dayStart.getTime() / 1000;

    const entries = [];

    function runThis(nDay) {
        if (nDay === maxDays) {

            res.json({
                data: entries
            });
        } else {
            const since = dayStartSec - (DAY_SECONDS * (nDay+1));

            db.getConsumptionSum(
                since,
                dayStartSec - (DAY_SECONDS * nDay),
                (err, dsum) => {
                    if (err) {
                        winston.error(err);
                        res.send('Sorry, an error occurred. Go back and try again');
                    } else {
                        entries.unshift({
                            day: dateformat(since * 1000, "m/d"),
                            consumption: -dsum
                        });

                        runThis(nDay + 1);
                    }
                });
        }
    }

    runThis(0);
};

module.exports.page = (req, res) => {
    res.render('trends', {
        weightNow: serial.getLastWeight(),
        temperature : serial.getLastTemperature()
    });
};
