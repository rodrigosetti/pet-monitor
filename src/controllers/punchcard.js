/* jshint node:true, esversion:6 */

const winston = require('winston');
const dateformat = require('dateformat');
const db = require('../db');
const serial = require('../serial');

const WEEKNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

module.exports.api = (req, res) => {
    db.getPunchCard((err, punchcard) => {
        if (err) {
            winston.error(err);
            res.send('Sorry, an error occurred. Go back and try again');
        } else {
            const presentation = [];

            for (let w=0; w<7; w++) {
                presentation.push({
                    label: WEEKNAMES[w],
                    values: punchcard[w].map(v => Math.floor(v * 100) / 100)
                });
            }

            res.json({
                data: presentation
            });
        }
    });
};

module.exports.page = (req, res) => {
    res.render('punchcard', {
        weightNow: serial.getLastWeight(),
        temperature : serial.getLastTemperature()
    });
};
