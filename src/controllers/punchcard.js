/* jshint node:true, esversion:6 */

const winston = require('winston');
const dateformat = require('dateformat');
const db = require('../db');
const serial = require('../serial');

function formatHour(h) {
    if (h === 0) {
        return "12 am";
    } else if (h < 12) {
        return `${h} am`;
    } else if (h === 12) {
        return "12 pm";
    } else {
        return `${h-12} pm`;
    }
}

module.exports.api = (req, res) => {
    db.getPunchCard((err, punchcard) => {
        if (err) {
            winston.error(err);
            res.send('Sorry, an error occurred. Go back and try again');
        } else {
            const presentation = [];

            for (let h=0; h<24; h++) {
                presentation.push({
                    label: formatHour(h),
                    values: [0,1,2,3,4,5,6].map(w => Math.round(punchcard[w][h]*100)/100)
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
        page: "punchcard",
        weightNow: serial.getLastWeight(),
        temperature : serial.getLastTemperature()
    });
};
