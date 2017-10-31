/* jshint node:true, esversion:6 */

const config = require('config');
const winston = require('winston');
const serial = require('./serial');

winston.level = config.get('log.level');
if (config.get('log.cli_mode')) {
    winston.cli();
}
