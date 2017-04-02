/* jshint node:true, esversion:6 */

let SerialPort = require('serialport');
let express = require('express');
let winston = require('winston');
let config = require('config');
let sqlite3 = require('sqlite3');
let morgan = require('morgan');
let dateformat = require('dateformat');

dateformat.masks.dayMinute = "m/d/yyyy h:MM tt"

const RAW_TARE = config.get('raw_tare');
const CONTAINER_TARE = config.get('container_tare');
const CALIBRATION_G = config.get('calibration_g');
const STABLE_N = config.get('stable_n');

winston.level = 'debug';
winston.cli();

var db = new sqlite3.Database('data.db');

let port = new SerialPort(config.get('serial_port'), {
    baudRate: config.get('baudrate'),
    parser: SerialPort.parsers.readline('\n')
});

function atExit(exitCode) {
    winston.info(`finalizing with exit code ${exitCode}`);

    db.close(() => { winston.info('database closed'); });
    port.close(() => { winston.info('serial port closed'); });
}

process.on('exit', atExit);
process.on('SIGEXIT', atExit);

function calibratedScale(raw) {
    return Math.round( (RAW_TARE - raw) / CALIBRATION_G );
}

// shared between "data" events and/or web-server
var ready = false;
let weightWindow = [];
var lastStable = undefined;
var temperature = undefined;

port.on('data', (line) => {
    line = line.trim();

    if (line == 'Readings:') {
        ready = true;
    } else if (ready) {
        let parts = line.split(',');

        let weight = calibratedScale( parseFloat(parts[2]) )
                     - CONTAINER_TARE;
        temperature = parseFloat(parts[3]);
        let now = Date.now() / 1000; // in seconds

        winston.debug('weight: %s g, stable: %s g, temp: %s C',
                weight, lastStable, temperature);

        weightWindow.push( weight );
        if (weightWindow.length > STABLE_N) { weightWindow.shift(); }

        let stable = weightWindow.length >= STABLE_N &&
                     weightWindow.every((e, i, a) =>
                             { return e === a[i>0? i-1 : i] });

        if (stable) {
            if (lastStable !== undefined) {
                let delta = weight - lastStable

                if (Math.abs(delta) > 0) {
                    if (delta > 0) {
                        // fill
                        winston.info('FILL: %s g', delta);
                    } else if (delta < 0) {
                        // consume
                        winston.info('CONSUMED: %s g', -delta);
                    }
                    db.run('INSERT INTO deltas VALUES (NULL, $now, $delta, $weight, $temperature)',
                            {
                                $now: now,
                                $delta: delta,
                                $weight: weight,
                                $temperature: temperature
                            });
                }
            }

            lastStable = weight;
        }
    }
});

let app = express();

app.set('view engine', 'pug');
app.use(morgan('dev'));

/*
 * "q" can have the following formats:
 * N => since N hour ago
 * N-M => between N and M hours ago
 */
app.get('/', (req, res) => {
    let query = req.query.q || '24';
    let parts = query.trim().split('-');
    let sinceH = parseInt(parts[0]);
    let toH = parts.length > 1 ? parseInt(parts[1]) : 0;
    let now = Date.now() / 1000;
    let sinceTS = now - (sinceH * 3600);
    let toTS = now - (toH * 3600);

    db.all(
            'SELECT * FROM deltas WHERE timestamp >= $since AND timestamp <= $to ORDER BY timestamp DESC',
            {
                $since : sinceTS,
                $to : toTS
            },
            (err, rows) => {

        if (err) {
            winston.error(err);
            res.send('Sorry, an error occurred. Go back and try again');
        } else {
            let totalConsumed = rows.reduce((acc, r) => { return acc - (r.delta < 0 ? r.delta : 0); }, 0);
            let totalFilled = rows.reduce((acc, r) => { return acc + (r.delta > 0 ? r.delta : 0); }, 0);

            // some presentation transformations
            rows.forEach((r) => {
                r.timestampStr = dateformat(r.timestamp * 1000, "dayMinute");
            });

            res.render('index', {
                query,
                weightNow: weightWindow.length > 0 ? weightWindow[weightWindow.length-1] : 'unknown',
                rows,
                totalConsumed,
                totalFilled,
                temperature,
                sinceStr : dateformat(sinceTS * 1000, "dayMinute"),
                toStr : dateformat(toTS * 1000, "dayMinute")
            })
        }
    });
});

app.listen(8080, () => {
    winston.info('Server running');
});

