const path = require("path");
const fs = require("fs");
const html = require(path.join(process.cwd(), "libs/html.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/search"] = async (req, res) => {
            const template = fs.readFileSync(path.join(process.cwd(), "static/search.html"), "utf-8")
            var params = {config: structuredClone(config)};
            delete params.config.api;
            delete params.config.webserver;
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        }
    }
};
