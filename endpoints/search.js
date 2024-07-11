const path = require("path");
const fs = require("fs");
const html = require(path.join(process.cwd(), "libs/html.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/search"] = async (req, res) => {
            const template = fs.readFileSync(path.join(process.cwd(), "templates/search.html"), "utf-8")
            var params = {config: structuredClone(config), query: await api.getParams(req)};
            delete params.config.api;
            delete params.config.webserver;
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        }
    }
};
