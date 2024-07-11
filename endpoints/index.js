const fs = require("fs");
const path = require("path");
const html = require(path.join(process.cwd(), "libs/html.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/"] = async (req, res) => {
            const template = fs.readFileSync(path.join(process.cwd(), "templates/home.html"), "utf-8");
            const body = await html.buildTemplate(template, {}, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        }
    }
};
