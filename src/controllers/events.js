/* jshint node:true, esversion:6 */

const dateformat = require('dateformat');
const winston = require('winston');
const serial = require('../serial');
const db = require('../db');

dateformat.masks.dayMinute = "m/d/yyyy h:MM tt";

module.exports = (req, res) => {
    let query = req.query.q || '24';
    let parts = query.trim().split('-');
    let sinceH = parseInt(parts[0]);
    let toH = parts.length > 1 ? parseInt(parts[1]) : 0;
    let now = Date.now() / 1000;
    let sinceTS = now - (sinceH * 3600);
    let toTS = now - (toH * 3600);

    db.getEvents(
        sinceTS, toTS,
        (err, rows) => {

            if (err) {
                winston.error(err);
                res.send('Sorry, an error occurred. Go back and try again');
            } else {
                let totalConsumed = rows.reduce((acc, r) => { return acc - (r.delta < 0 ? r.delta : 0); }, 0);
                let totalFilled = rows.reduce((acc, r) => { return acc + (r.delta > 0 ? r.delta : 0); }, 0);

                // some presentation transformations
                rows.forEach((r) => {
                    r.timestampStr = dateformat(r.timestamp * 1000, "dayMinute");
                });

                res.render('events', {
                    weightNow: serial.getLastWeight(),
                    temperature : serial.getLastTemperature(),
                    query,
                    rows,
                    totalConsumed,
                    totalFilled,
                    sinceStr : dateformat(sinceTS * 1000, "dayMinute"),
                    toStr : dateformat(toTS * 1000, "dayMinute")
                });
            }
        });
};
