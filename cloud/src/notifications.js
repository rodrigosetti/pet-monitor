/* jshint node:true, esversion:6 */

const db = require('./db');
const winston = require('winston');
const config = require('config');
const request = require('request');

const MILLIS_IN_HOURS = 60 * 60 * 1000;

let lastConsumption = Date.now();

function inactiveHours() {
    return Math.round( (Date.now() - lastConsumption) / MILLIS_IN_HOURS );
}

function sendMessage(phone_number, message) {
    winston.debug("Sending message='%s' to %s", message, phone_number);
    const sid = config.get("twillio.sid");

    request.post({
        url: `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        auth: {
            user: sid,
            pass: config.get("twillio.auth_token")
        },
        form : {
            To: phone_number,
            From: config.get("twillio.phone_number"),
            Body: message
        },
        json: true
    }, (err, resp, body) => {
        if (err) {
            winston.error("Error connecting to twillio", err);
        } else {
            winston.debug("Twillio response (code=%s):", resp.statusCode, body);
        }
    });
}

function notifyConsumption(pet_name, phone_number, delta, weight, temperature) {
    sendMessage(
        phone_number,
        `${pet_name} consumed ${-delta} g (now: ${weight} g, ${temperature} C)`
    );
}

function notifyRefilling(pet_name, phone_number, delta, weight, temperature) {
    sendMessage(
        phone_number,
        `${pet_name} food refilled by ${delta} g (now: ${weight} g, ${temperature} C)`
    );
}

function notifyEmpty(pet_name, phone_number, delta, temperature) {
    sendMessage(
        phone_number,
        `${pet_name} consumed ${-delta} g and left empty container (temp: ${temperature} C)`
    );
}

function notifyInactivity(phone_number, amount) {
    const word = amount == 1 ? "hour" : "hours";

    sendMessage(
        phone_number,
        `It has been ${amount} ${word} since any activity of ${pet_name}`
    );
}

function notifyAnomaly(phone_number, consumption, expected) {
    sendMessage(
        phone_number,
        `In the last hour, ${pet_name} consumed ${consumption} g, but usually it's expected ${expected}`
    );
}

function lastHourConsumption() {
    // TODO
    return 0;
}

function lastHourExpectedConsumption() {
    // TODO
    return 0;
}

const tid = setInterval(() => {
    db.getUsers(
        (err, user) => {
            if (err) {
                winston.error(err);
            } else {
                // determine if it needs to notify inactivity
                const inactive_hours = inactiveHours();
                if (inactive_hours > 0 && inactive_hours == user.notify_inactivity_hours) {
                    notifyInactivity(user.phone_number, inactive_hours);
                }

                // determine if it needs to notify anomalous consumption
                const consumption_last_hour = lastHourConsumption();
                const expected_consumption = lastHourExpectedConsumption();
                if (Math.abs(consumption_last_hour - expected_consumption) > user.consumption_anomaly_threshold) {
                    notifyAnomaly(user.phone_number, consumption_last_hour, expected_consumption);
                }
            }
        },
        (err, n) => {
            if (err) {
                winston.error(err);
            } else {
                winston.debug("Processed %s users", n);
            }
        });
    }, MILLIS_IN_HOURS);

module.exports = {

    sendNotifications: (pet_name, delta, weight, temperature) => {
        db.getUsers(
            (err, user) => {
                const phone_number = user.phone_number;

                if (err) {
                    winston.error(err);
                } else if (user.notify_empty && weight <= 0) {
                    notifyEmpty(pet_name, phone_number, delta, temperature);
                } else if (user.notify_consumption && delta < 0) {
                    notifyConsumption(pet_name, phone_number, delta, weight, temperature);
                } else if (user.notify_refilling && delta > 0) {
                    notifyRefilling(pet_name, phone_number, delta, weight, temperature);
                }
            },
            (err, n) => {
                if (err) {
                    winston.error(err);
                } else {
                    winston.debug("Processed %s users", n);
                }
                if (delta < 0) {
                    lastConsumption = Date.now();
                }
            });
    }

};
