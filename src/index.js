/* jshint node:true, esversion:6 */

const config = require('config');
const winston = require('winston');
const serial = require('./serial');
const server = require('./server');

winston.level = config.get('log.level');
if (config.get('log.cli_mode')) {
    winston.cli();
}

if (config.get('server.enabled')) {
    const port = config.get('server.port');

    server.listen(port, () => {
        winston.info(`Server running at port ${port}`);
    });
}
