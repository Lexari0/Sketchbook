const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/server"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.server)) {
                return true;
            }
            api.sendResponse(res, 200, {error: "", ...config.server});
            return true;
        };
    }
};
