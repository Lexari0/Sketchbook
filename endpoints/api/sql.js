const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/sql"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.sql)) {
                return true;
            }
            const query = await api.getParams(req);
            if (!("q" in query)) {
                api.sendResponse(res, 400, {error: "Missing query parameter 'q'"});
                return true;
            }
            api.sendResponse(res, 200, {error: "", q: query.q, r: await db.all(query.q) });
            return true;
        }
    }
};
