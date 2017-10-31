/* jshint node:true, esversion:6 */

const config = require('config');
const winston = require('winston');
const express = require('express');
const controllers = require('./controllers');
const morgan = require('morgan');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const basicAuth = require('express-basic-auth')
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./db');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');

const app = express();

// Middlewares

app.use(morgan(config.get('log.format')));
app.use(express.static('public'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    resave: false,
    secret: config.get('server.session-secret'),
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    req.renderContext = {
        user : req.user,
        page: req.path,
        pet_name: db.getLastPetName(),
        messages: t => req.flash(t),
        weightNow: db.getLastWeight(),
        temperature: db.getLastTemperature()
    };
    next();
});

// Authentication
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
    db.findUserById(id, (err, user) => done(err, user));
});

passport.use(new LocalStrategy(
    (username, password, done) => {
        db.findUserByUsername(username, (err, user) => {
            if (err) {
                done(err);
            } else if (!user) {
                done(null, false, { message: 'Incorrect username.' });
            } else {
                bcrypt.compare(password, user.password_hash, (err, res) => {
                    if (err) {
                        done(err);
                    } else if (res) {
                        done(null, user);
                    } else {
                        done(null, false, { message: 'Incorrect password.' });
                    }
                });
            }
        });
    }
));

// Settings

app.set('view engine', 'pug');

// Routes

app.post('/login',
         passport.authenticate('local', { successRedirect: '/',
                                          failureRedirect: '/login',
                                          failureFlash: true })
        );
app.get('/login', controllers.auth.loginForm);
app.get('/logout', controllers.auth.logout);
app.get('/signup', controllers.auth.signupForm);
app.post('/signup', controllers.auth.signup);

app.get('/', controllers.events);
app.get('/events', controllers.events);

app.get('/trends', controllers.trends.page);
app.get('/api/trends', controllers.trends.api);

app.get('/punchcard', controllers.punchcard.page);
app.get('/api/punchcard', controllers.punchcard.api);

app.get('/preferences', controllers.preferences.form);
app.post('/preferences', controllers.preferences.update);

app.use('/api/event/',
      express.Router()
        .use(bodyParser())
        .use(basicAuth({ users: { [config.get('cloud.user')] : config.get('cloud.password') } }))
        .post('/food', controllers.api.foodEvent));

module.exports = app;
