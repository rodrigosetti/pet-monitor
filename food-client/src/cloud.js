/* jshint node:true, esversion:6 */

/**
 Interface to cloud API
**/
const winston = require('winston');
const config = require('config');
const request = require('request');

const cloud_host = config.get('cloud.host');
const location = config.get('scale.location');

module.exports = {

  sendData: (pet_name, delta, weight, temperature) => {
    // TODO: store and retry
    const timestamp = Date.now();

    request.post({
      url: `${cloud_host}/api/event/food`,
      auth: {
        user: config.get('cloud.user'),
        pass: config.get('cloud.password')
      },
      json : {
        pet: pet_name,
        delta,
        weight,
        temperature,
        timestamp,
        location
      }
    }, (err, resp, body) => {
      if (err) {
        winston.error("Error connecting to cloud host", err);
      } else {
        winston.debug("Cloud host response (code=%s):", resp.statusCode, body);
      }
    });
  }

};
