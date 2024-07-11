const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const subscribestar = require(path.join(process.cwd(), "libs/subscribestar.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints[/^\/api\/subscriptions\/subscribestar\/tiers$/] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.subscriptions.subscribestar.tiers)) {
                return true;
            }
            if (!subscribestar.isOAuthValid())
            {
                api.sendResponse(res, 200, {error: "Server doesn't have an active OAuth access token."})
                return true;
            }
            const tiers = await subscribestar.getTiers();
            api.sendResponse(res, 200, {error: tiers ? "" : "Failed to get tiers", tiers})
            return true;
        }
    }
};
