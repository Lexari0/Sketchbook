const exec = require("child_process").exec;
const path = require("path");
const fs = require("fs");
const uuid = require("uuid").v4;
const config = require(path.join(process.cwd(), "libs/config.js"));
const cookies = require(path.join(process.cwd(), "libs/cookies.js"));
const log = require(path.join(process.cwd(), "libs/log.js"));

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
    isPasswordCorrect: async function(password) {
        const shadow = fs.readFileSync("/etc/shadow", "utf8")
        const password_hash = String(shadow).split("\n").filter(line => line.startsWith("sketchbook")).pop().split(":")[1].split("$");
        const method = password_hash[0];
        const salt = password_hash[2];
        if (method !== "6")
        {
            log.error("admin", "Only SHA512 passwords are supported. Use the following command as root to update your password: echo 'sketchbook:NEW_PASSWORD' | chpasswd -c SHA512");
            return false;
        }
        await new Promise(resolve => 
            exec(`openssl passwd -6 -salt ${salt} ${password}`, (error, stdout, stderr) => {
                if (error && error.code !== 0)
                {
                    log.error("Running openssl resulted in an error")
                    resolve(false);
                    return;
                }
                resolve(stdout == password_hash)
            })
        );
        return ;
    }
};
