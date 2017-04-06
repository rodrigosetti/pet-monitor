/* jshint node:true, esversion:6 */

const express = require('express');
const config = require('config');
const morgan = require('morgan');
const winston = require('winston');
const serial = require('./serial');
const controllers = require('./controllers');

winston.level = config.get('log.level');
if (config.get('log.cli_mode')) {
    winston.cli();
}

if (config.get('enable_server')) {
    let app = express();

    app.set('view engine', 'pug');
    app.use(morgan(config.get('log.format')));

    /*
     * "q" can have the following formats:
     * N => since N hour ago
     * N-M => between N and M hours ago
     */
    app.get('/', controllers.main);

    app.get('/aggregate', controllers.aggregate);

    app.listen(8080, () => {
        winston.info('Server running');
    });
}

