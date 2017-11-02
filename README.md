# Pet Monitor

Make your pet's food bowl smarter by tracking refilling and consumption
automatically.

![picture](images/pict1.jpg?raw=true "Picture")

![Screenshot](images/screenshot-1.jpg?raw=true "Screenshot 1") ![Screenshot](images/screenshot-2.jpg?raw=true "Screenshot 2") ![Screenshot](images/screenshot-3.jpg?raw=true "Screenshot 3")

Why
---

We all love our pets. Sometimes they get sick, and they might be masters in
masking their symptoms (specially cats). Lack of appetite or appetite disorders,
in general, can be an indicator of a underlying serious condition. The early we
caught those on, the better. This tool hopefully would allow pet owners to
identify eating habits anomalies prematurely, additionally, provide them with
data to better inform decisions.

Features
--------

 * Track **refilling** and **consumption** events.
 * Compute consumption trends over days.
 * Notification via SMS for events like consumption, refilling, and inactivity period (via [Twillio](https://www.twilio.com/) integration).
 * Compute consumption trends over hours & weekdays (punch card).

### Planned

 * Compute consumption trends over weeks.
 * Identify and notify anomalies (consumption deviated from expectation).
 * Optimization: cache

Requirements
------------

### Software

 * [Node](https://nodejs.org) and [npm](https://www.npmjs.com/)
 * [Sqlite](https://www.sqlite.org/)

#### Installation

 1. clone this repo
 2. create a `config/local.properties` and override the properties to adjust to
    your environment (scale calibration, serial port path, _etc._).
 3. initialize your sqlite database:
  ```console
  $ sqlite3 data.db < schema.sql
  ```
 4. install dependencies: `npm install`
 5. run: `npm start`
 6. your device should be serving a web application at port 8080

#### Extras

 * Use [forever](https://github.com/foreverjs/forever) to manage your server process.
 * Use [ngrok](https://ngrok.com/) to expose your local server.
 
### Hardware

 * A Scale (_e.g._ cheap kitchen scale)
 * [Sparkfun OpenScale](https://www.sparkfun.com/products/13261) or anything that
   will output the same serial data (Arduino + Temperature Sensor), as specified
   by [the firmware](https://github.com/sparkfun/OpenScale).
 * A small computer like [Raspberry PI](https://www.raspberrypi.org/), with
   access to the Internet, so that it can run a server.
   
NOTE: if using OpenScale, you need to configure it first to 1) disable
timestamp, disable remote temperature, and enable raw.

#### Diagram

```
                               ┌───── usb ──────┐
                               │                │
     .───────.                 │                │
   ,'         `.         ┌───────────┐    ┌───────────┐
 ,'             `.       │           │    │           │
;                 :      │           │    │           │
│                 │══════│ OpenScale │    │ Raspberry │
│      scale      │══════│   board   │    │    PI     │
:                 ;      │           │    │           │
 ╲               ╱       │           │    │           │
  `.           ,'        │           │    │           │
    `.       ,'          └───────────┘    └───────────┘
      `─────'
```
