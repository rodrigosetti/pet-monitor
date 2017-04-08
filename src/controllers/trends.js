/* jshint node:true, esversion:6 */

const winston = require('winston');
const dateformat = require('dateformat');
const db = require('../db');
const serial = require('../serial');

const DAY_SECONDS = 24 * 60 * 60;

module.exports.api = (req, res) => {
    const maxDays = req.query.days || 7;

    db.getTrends(maxDays, (err, rows) => {
        if (err) {
            winston.error(err);
            res.send('Sorry, an error occurred. Go back and try again');
        } else {
            const formattedData = {};
            const entries = [];
            rows.forEach(r => {
                entries.push({
                    day: dateformat(r.timestamp * 1000, "m/d"),
                    consumption: -r.dsum
                });
            });

            res.json({
                data: entries
            });
        }
    });
};

module.exports.page = (req, res) => {
    res.render('trends', {
        weightNow: serial.getLastWeight(),
        temperature : serial.getLastTemperature()
    });
};
