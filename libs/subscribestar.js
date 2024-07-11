const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    isOAuthValid: function(quick) {
        if (config.subscribestar.auth_token.expires_at == undefined)
        {
            return false;
        }
        if (Date.now() >= config.subscribestar.auth_token.expires_at)
        {
            return false;
        }
        if (quick)
        {
            return true;
        }
        // TODO: check validity with remote server
        return false;
    },
    getRedirectURI: function() {
        return "https://" + path.join(config.server.domain, "/oauth/subscribestar");
    },
    clearOAuth: function() {
        for (const key of Object.keys(config.subscribestar.auth_token))
        {
            config.subscribestar.auth_token[key] = undefined;
        }
        config.save();
    },
    updateOAuth: function(oauth_response) {
        for (const key of Object.keys(config.subscribestar.auth_token))
        {
            config.subscribestar.auth_token[key] = oauth_response[key];
        }
        config.subscribestar.auth_token.issued_at = Date.now() / 1000;
        config.subscribestar.auth_token.expires_at = config.subscribestar.auth_token.issued_at + config.subscribestar.auth_token.expires_in
        config.save();
    },
    refreshOAuth: async function() {
        const post_response = await api.sendPOST("www.subscribestar." + (config.subscribestar.adult ? "adult" : "com"), "/oauth2/token", {
            client_id: config.subscribestar.client_id,
            client_secret: config.subscribestar.client_secret,
            refresh_token: config.subscribestar.auth_token.refresh_token,
            grant_type: "refresh_token",
            redirect_uri: getRedirectURI()
        });
        if (post_response.error)
        {
            return false;
        }
        this.updateOAuth(post_response);
        return true;
    }
};

if (!module.exports.isOAuthValid())
{
    if (!module.exports.refreshOAuth())
    {
        module.exports.clearOAuth();
    }
}
