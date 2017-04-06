/* jshint node:true, esversion:6 */

const SerialPort = require('serialport');
const config = require('config');
const winston = require('winston');
const db = require('./db');

const RAW_TARE = config.get('raw_tare');
const CONTAINER_TARE = config.get('container_tare');
const CALIBRATION_G = config.get('calibration_g');
const STABLE_N = config.get('stable_n');

const weightWindow = [];
let ready = false;
let lastStable;
let temperature;

function calibratedScale(raw) {
    return Math.round( (RAW_TARE - raw) / CALIBRATION_G );
}


if (config.get('serial.enabled')) {
    const port = new SerialPort(config.get('serial.port'), {
        baudRate: config.get('serial.baudrate'),
        parser: SerialPort.parsers.readline('\n')
    });

    function atExit(exitCode) {
        port.close(() => { winston.info('serial port closed'); });
    }

    process.on('exit', atExit);
    process.on('SIGEXIT', atExit);

    port.on('data', (line) => {
        line = line.trim();

        if (line == 'Readings:') {
            ready = true;
        } else if (ready) {
            const parts = line.split(',');

            const weight = calibratedScale( parseFloat(parts[2]) ) - CONTAINER_TARE;
            temperature = parseFloat(parts[3]);
            const now = Date.now() / 1000; // in seconds

            winston.debug('weight: %s g, stable: %s g, temp: %s C',
                    weight, lastStable, temperature);

            weightWindow.push( weight );
            if (weightWindow.length > STABLE_N) { weightWindow.shift(); }

            let stable = weightWindow.length >= STABLE_N &&
                         weightWindow.every((e, i, a) => e === a[i>0? i-1 : i]);

            if (stable) {
                if (lastStable !== undefined) {
                    const delta = weight - lastStable;

                    if (Math.abs(delta) > 1) {
                        if (delta > 0) {
                            // fill
                            winston.info('FILL: %s g', delta);
                        } else if (delta < 0) {
                            // consume
                            winston.info('CONSUMED: %s g', -delta);
                        }
                        db.insert(now, delta, weight, temperature);
                    }
                }

                lastStable = weight;
            }
        }
    });
}

module.exports = {
    getLastWeight: () => weightWindow.length > 0 ? weightWindow[weightWindow.length-1] : undefined,
    getLastTemperature: () => temperature
};
