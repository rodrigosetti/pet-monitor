/* jshint node:true, esversion:6 */

let SerialPort = require('serialport');
let express = require('express');
let winston = require('winston');
let config = require('config');

// ----------------------------------------------
const RAW_TARE = config.get('raw_tare');
const CALIBRATION_G = config.get('calibration_g');
const STABLE_N = config.get('stable_n');

winston.level = 'debug';
winston.cli();

let port = new SerialPort(config.get('serial_port'), {
    baudRate: config.get('baudrate'),
    parser: SerialPort.parsers.readline('\n')
});

function atExit(exitCode) {
    winston.info(`finalizing with exit code ${exitCode}`);
    port.close(() => {
        winston.info('serial port closed');
    });
}

function calibratedScale(raw) {
    return Math.round( (RAW_TARE - raw) / CALIBRATION_G );
}

var ready = false;
let weightWindow = [];
var lastStable = undefined;

port.on('data', function (line) {
    line = line.trim();

    if (line == 'Readings:') {
        ready = true;
    } else if (ready) {
        let parts = line.split(',');

        let weight = calibratedScale( parseFloat(parts[2]) );
        let localTemp = parseFloat(parts[3]);
        let now = Date.now()

        winston.debug('weight: %s g, stable: %s g, temp: %s C',
                weight, lastStable, localTemp);

        weightWindow.push( weight );
        if (weightWindow.length > STABLE_N) { weightWindow.shift(); }

        let stable = weightWindow.length >= STABLE_N &&
                     weightWindow.every((e, i, a) =>
                             { return e === a[i>0? i-1 : i] });

        if (stable) {
            if (lastStable !== undefined) {
                let delta = weight - lastStable
                if (delta > 0) {
                    // fill
                    winston.info('FILL: %s g', delta);
                } else if (delta < 0) {
                    // consume
                    winston.info('CONSUMED: %s g', -delta);
                }
            }

            lastStable = weight;
        }
    }
});

process.on('exit', atExit);
process.on('SIGEXIT', atExit);

