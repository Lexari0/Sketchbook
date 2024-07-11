const fs = require("fs");
const path = require("path");
const html = require(path.join(process.cwd(), "libs/html.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/"] = async (req, res) => {
            const template = fs.readFileSync(path.join(process.cwd(), "templates/home.html"), "utf-8");
            var params = {config: structuredClone(config)};
            delete params.config.api;
            delete params.config.webserver;
            delete params.config.gallery.edit_ip_whitelist;
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        }
    }
};
