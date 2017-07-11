/* jshint node:true, esversion:6 */

const winston = require('winston');

const CACHE = {};

/**
 * will retrieve value stored in key, if not set,
 * will run the createValue callback thunk, and store the result in key
 * using ttl (milliseconds to live from now)
 */
module.exports = (key, ttl, createValue, callback) => {
    const now = Date.now();
    let value;

    if (CACHE[key]) {
        if (now - CACHE[key].createdTime > CACHE[key].ttl) {
            winston.debug("cache key expired: {}", key);
            delete CACHE[key];
        } else {
            winston.debug("cache hit: {}", key);
            value = CACHE[key].value;
        }
    } else {
        winston.debug("cache miss: {}, ttl={}", key, ttl);
    }

    if (value === undefined) {
        createValue((err, value) => {
            if (err) {
                callback(err);
            } else {
                CACHE[key] = {
                    createdTime: now,
                    ttl,
                    value
                };
                callback(err, value);
            }
        });
    } else {
        callback(null, value);
    }
};

