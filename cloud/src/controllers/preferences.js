
/* jshint node:true, esversion:6 */

const passport = require("passport");
const db = require("../db");
const winston = require("winston");

module.exports = {

    form : (req, res) => {
        if (!req.user) {
            req.flash("error", "Please authenticate first");
            res.redirect("/login?r=preferences");
        } else {
            res.render("preferences", {
                ctx : req.renderContext
            });
        }
    },

    update: (req, res) => {
        if (!req.user) {
            req.flash("error", "Please authenticate first");
            res.redirect("/preferences");
        } else {
            winston.debug("Update preferences", req.body);
            db.saveUserPreferences(req.user.id, req.body, err => {
                if (err) {
                    winston.error("Error saving data", err);
                    req.flash("error", "Sorry an error occurred, please try again");
                }
                res.redirect("/preferences");
            });
        }
    }
};
