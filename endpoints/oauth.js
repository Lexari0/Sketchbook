const fs = require("fs");
const https = require("https");
const path = require("path");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));
const subscribestar = require(path.join(process.cwd(), "libs/subscribestar.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

const oauth_template = fs.readFileSync(path.join(process.cwd(), "templates/oauth.html"), "utf-8");
async function sendOAuthPage(res, code, params)
{
    const body = await html.buildTemplate(oauth_template, params, req);
    res.writeHead(code, {"Content-Type": "text/html"});
    res.end(body);
}

const PLATFORMS = {
    "SubscribeStar": async function (req, res) {
        const query = await api.getParams(req);
        if (query.error != undefined)
        {
            return false;
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
            subscribestar.updateOauth(post_response);
        }
        catch
        {
            await sendOAuthPage(res, 503, {platform: "SubscribeStar", error: "Server side error getting POST response from SubscribeStar"});
            return true;
        }
        return false;
    }
};

module.exports = {
    register_endpoints: endpoints => {
        for (const platform in Object.keys(PLATFORMS))
        {
            endpoints[path.join("/oauth", platform.toLowerCase())] = async (req, res) => {
                if (!admin.isRequestAdmin(req))
                {
                    res.writeHead(302, {
                        "Location": "/admin?error=Must be logged in as admin to update OAuth data."
                    });
                    res.end();
                    return true;
                }
                if (!await PLATFORMS[platform](req, res))
                {
                    await sendOAuthPage(res, 200, {platform});
                }
                return true;
            }
        }
    }
};
