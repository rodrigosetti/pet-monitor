/* jshint node:true, esversion:6 */

const passport = require("passport");
const db = require("../db");

module.exports = {

    loginForm : (req, res) => {
        res.render("login", {
            ctx : req.renderContext
        });
    },

    signupForm : (req, res) => {
        res.render("signup", {
            ctx : req.renderContext
        });
    },

    logout : (req, res) => {
        req.logout();
        res.redirect("/");
    },

    signup : (req, res) => {
        const username = req.body.username;
        const password = req.body.password;

        if (!username || username.length < 3) {
            req.flash("error", "username needs a minimum of three letters");
            res.redirect("/signup");
        } else if (! /^[0-9a-zA-Z_.-]+$/.test(username)) {
            req.flash("error", "invalid username (only alphanumeric, dot, underscore and dash allowed)");
            res.redirect("/signup");
        } else if (!password || password.length < 6) {
            req.flash("error", "password needs at least 6 characters");
            res.redirect("/signup");
        } else if (password !== req.body.password_verify) {
            req.flash("error", "password and verification doesn't match");
            res.redirect("/signup");
        } else {
            db.registerUser(username, password, (err, ok) => {
                if (err) {
                    winston.error(err);
                    res.send('Sorry, an error occurred. Go back and try again');
                } else if (!ok) {
                    req.flash("error",`Sorry, the username ${username} is already taken`);
                    res.redirect("/signup");
                } else {
                    passport.authenticate('local')(req, res, () => {
                        req.flash("success","You are signed up");
                        res.redirect('/preferences');
                    });
                }
            });
        }
    }
};
