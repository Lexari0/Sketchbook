const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/gallery"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery._)) {
                return true;
            }
            const response = (await db.all("SELECT COUNT(*) AS item_count, MIN(last_update) AS last_update FROM items")).shift();
            if (response === undefined) {
                api.sendResponse(res, 502, {error: "Database query result was undefined"});
            }
            api.sendResponse(res, 200, {error: "", ...response});
            return true;
        };
        endpoints["/api/gallery/search"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.search)) {
                return true;
            }
            const query = await api.getParams(req);
            if (!("q" in query)) {
                api.sendResponse(res, 400, {error: "Missing query parameter 'q'"});
                return true;
            }
            api.sendResponse(res, 200, {error: "", q: query.q, r: await gallery.search(decodeURIComponent(query.q))});
            return true;
        };
    }
};
