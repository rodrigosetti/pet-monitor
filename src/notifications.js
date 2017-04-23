/* jshint node:true, esversion:6 */

const db = require('./db');
const winston = require('winston');
const config = require('config');
const request = require('request');

const MILLIS_IN_HOURS = 60 * 60 * 1000;
const pet_name = config.get("pet_name");

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

function notifyConsumption(phone_number, delta, weight, temperature) {
    sendMessage(
        phone_number,
        `${pet_name} consumed ${-delta} g (now: ${weight} g, ${temperature} C)`
    );
}

function notifyRefilling(phone_number, delta, weight, temperature) {
    sendMessage(
        phone_number,
        `${pet_name} food refilled by ${delta} g (now: ${weight} g, ${temperature} C)`
    );
}

function notifyEmpty(phone_number, delta, temperature) {
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

const tid = setInterval(() => {
    db.getUsers(
        (err, user) => {
            if (err) {
                winston.error(err);
            } else {
                const inactive_hours = inactiveHours();
                if (inactive_hours > 0 && inactive_hours == user.notify_inactivity_hours) {
                    notifyInactivity(user.phone_number, inactive_hours);
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

    sendNotifications: (delta, weight, temperature) => {
        db.getUsers(
            (err, user) => {
                const phone_number = user.phone_number;

                if (err) {
                    winston.error(err);
                } else if (user.notify_empty && weight <= 0) {
                    notifyEmpty(phone_number, delta, temperature);
                } else if (user.notify_consumption && delta < 0) {
                    notifyConsumption(phone_number, delta, weight, temperature);
                } else if (user.notify_refilling && delta > 0) {
                    notifyRefilling(phone_number, delta, weight, temperature);
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
