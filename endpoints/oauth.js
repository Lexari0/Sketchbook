const fs = require("fs");
const path = require("path");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));
const subscribestar = require(path.join(process.cwd(), "libs/subscribestar.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

const oauth_template = fs.readFileSync(path.join(process.cwd(), "templates/oauth.html"), "utf-8");
async function sendOAuthPage(res, code, platform, params, req, token, lifetime) {
    const body = await html.buildTemplate(oauth_template, {...params, platform}, req);
    res.writeHead(code, {
        "Content-Type": "text/html",
        "Set-Cookie": token ? `${platform.toLowerCase()}_auth_token=${token}; Path=/; Max-Age=${lifetime}` : "",
    });
    res.end(body);
}

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/oauth/subscribestar"] = async (req, res) => {
            const query = await api.getParams(req);
            if (query.error != undefined)
            {
                await sendOAuthPage(res, 503, "SubscribeStar", {error: req.error}, req);
                return true;
            }
            try
            {
                const post_response = await api.sendPOST("www.subscribestar." + (config.subscribestar.adult ? "adult" : "com"), "/oauth2/token", {
                    client_id: config.subscribestar.client_id,
                    client_secret: config.subscribestar.client_secret,
                    code: query.code,
                    grant_type: "authorization_code",
                    redirect_uri: subscribestar.getRedirectURI()
                });
                console.log("OAuth response: " + JSON.stringify(post_response));
                if (post_response.error != undefined)
                {
                    await sendOAuthPage(res, 503, "SubscribeStar", {error: `Failed to get OAuth token from SubscribeStar: ${post_response.error_description}`}, req);
                    return true;
                }
                if (admin.isRequestAdmin(req))
                {
                    subscribestar.updateOAuth(post_response);
                }
                await sendOAuthPage(res, 200, "SubscribeStar", {}, req, post_response.auth_token, post_response.expires_in);
            }
            catch (error)
            {
                await sendOAuthPage(res, 503, "SubscribeStar", {error: `Server side error getting POST response from SubscribeStar: ${error}`}, req);
                return true;
            }
            return true;
        }
    }
};
