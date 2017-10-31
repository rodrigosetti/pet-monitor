/* jshint node:true, esversion:6 */

/**
Cloud host API
*/
const db = require('../db');
const notifications = require('../notifications');
const winston = require('winston');

module.exports = {

  foodEvent : (req, res) => {
    winston.info("food event request", req.body);
    const pet_name = req.body.pet;
    const delta = req.body.delta;
    const weight = req.body.weight;
    const temperature = req.body.temperature;

    db.addEvent(pet_name, delta, weight, temperature);
    notifications.sendNotifications(pet_name, delta, weight, temperature);
    res.sendStatus(201);
  }
};
