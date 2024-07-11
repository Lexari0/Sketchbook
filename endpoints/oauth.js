const fs = require("fs");
const path = require("path");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));
const subscribestar = require(path.join(process.cwd(), "libs/subscribestar.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

const oauth_template = fs.readFileSync(path.join(process.cwd(), "templates/oauth.html"), "utf-8");
async function sendOAuthPage(res, code, platform, params, req, token, lifetime, refresh_token) {
    const body = await html.buildTemplate(oauth_template, {...params, platform}, req);
    var options = {"Content-Type": "text/html"};
    if (token)
    {
        options["Set-Cookie"] = [`${platform.toLowerCase()}_access_token=${token}; Path=/; Max-Age=${lifetime}`];
        if (refresh_token)
        {
            options["Set-Cookie"].push(`${platform.toLowerCase()}_refresh_token=${refresh_token}; Path=/; Max-Age=${lifetime * 2}`)
        }
    }
    res.writeHead(code, options);
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
                await sendOAuthPage(res, 200, "SubscribeStar", {}, req, post_response.access_token, post_response.expires_in, post_response.refresh_token);
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
