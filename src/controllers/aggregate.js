/* jshint node:true, esversion:6 */

const winston = require('winston');
const db = require('../db');

const DAY_SECONDS = 24 * 60 * 60;

module.exports = (req, res) => {

    // get start of this day
    const dayStart = new Date();
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayStart.setMilliseconds(0);

    const dayStartSec = dayStart.getTime() / 1000;

    // do 7 queries (past seven days)
    const consumptionPerDay = [];
    let consumptionSum = 0;

    function runThis(nDay) {
        if (nDay === 7) {
            winston.info('consumptionPerDay:', consumptionPerDay);
            res.render('aggregate');
        } else {
            db.getConsumptionSum(
                dayStartSec - (DAY_SECONDS * (nDay+1)),
                dayStartSec - (DAY_SECONDS * nDay),
                (err, dsum) => {
                    if (err) {
                        winston.error(err);
                        res.send('Sorry, an error occurred. Go back and try again');
                    } else {
                        consumptionPerDay.push( -dsum );
                        runThis(nDay + 1);
                    }
                });
        }
    }

    runThis(0);
};
