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

if (config.get('server.enabled')) {
    const app = express();
    const port = config.get('server.port');

    app.set('view engine', 'pug');
    app.use(morgan(config.get('log.format')));

    /*
     * "q" can have the following formats:
     * N => since N hour ago
     * N-M => between N and M hours ago
     */
    app.get('/', controllers.main);

    app.get('/trends', controllers.trends.page);
    app.get('/api/trends', controllers.trends.api);

    app.listen(port, () => {
        winston.info(`Server running at port ${port}`);
    });
}

