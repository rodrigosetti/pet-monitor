/* jshint node:true, esversion:6 */

const SerialPort = require('serialport');
const config = require('config');
const winston = require('winston');
const cloud = require('./cloud');

const RAW_TARE = config.get('scale.raw_tare');
const CONTAINER_TARE = config.get('scale.container_tare');
const CALIBRATION_G = config.get('scale.calibration_g');
const STABLE_N = config.get('scale.stable_n');

const weightWindow = [];
let ready = false;
let lastStable;

function calibratedScale(raw) {
    return Math.round( (RAW_TARE - raw) / CALIBRATION_G );
}

function processReading(weight, temperature) {
    weightWindow.push( weight );
    if (weightWindow.length > STABLE_N) { weightWindow.shift(); }

    let stable = weightWindow.length >= STABLE_N &&
                    weightWindow.every((e, i, a) => e === a[i>0? i-1 : i]);

    winston.debug('weight: %s g, stable: %s g, temp: %s C',
                  weight, lastStable, temperature);

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
                const pet_name = config.get('pet.name');
                cloud.sendData(pet_name, delta, weight, temperature)
            }
        }

        lastStable = weight;
    }
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
            const temperature = parseFloat(parts[3]);

            processReading(weight, temperature);
        }
    });
}
