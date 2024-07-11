const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/echo"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.echo)) {
                return true;
            }
            const params = await api.getParams(req);
            api.sendResponse(res, 200, {error:"", params: params})
            return true;
        }
    }
};
