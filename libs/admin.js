const path = require("path");
const uuid = require("uuid").v4;
const config = require(path.join(process.cwd(), "libs/config.js"));
const cookies = require(path.join(process.cwd(), "libs/cookies.js"));

var active_token = undefined;
var active_token_valid_until = undefined;

module.exports = {
    token_valid_time_min: 60,
    token_valid_time_sec: 60 * this.token_valid_time_min,
    token_valid_time_ms: 1000 * this.token_valid_time_sec,
    revokeToken: function() {
        active_token = undefined;
        active_token_valid_until = undefined;
    },
    isTokenValid: function(token) {
        if (Date.now() > active_token_valid_until)
        {
            revokeToken();
            return false;
        }
        if (active_token === undefined)
        {
            return false;
        }
        return active_token === token;
    },
    generateNewToken: function() {
        this.revokeToken();
        active_token_valid_until = Date.now() + this.token_valid_time_ms;
        active_token = uuid();
        return active_token;
    },
    isRequestAdmin: function(req) {
        return this.isTokenValid(cookies.getRequestCookies(req).session_token);
    },
    isPasswordCorrect: function(password) {
        return config.gallery.admin.password && config.gallery.admin.password.length > 0 && config.gallery.admin.password === password;
    }
};
