const http = require("http");
const path = require("path");
const fs = require("fs");
const config = require("./config");

var endpoints = {};

console.log("Loading endpoints...");

for (const item of fs.readdirSync(path.join(process.cwd(), "endpoints"), {withFileTypes: true, recursive: true}))
{
    if (item.isFile()) {
        const module = require(path.join(item.parentPath, item.name));
        if ("register_endpoints" in module) {
            module.register_endpoints(endpoints);
        }
    }
}

const requestListener = function (req, res) {
    try {
        const url = req.url.split("?").shift();
        if (url in endpoints)
        {
            endpoints[url](req, res);
        }
        else
        {
            var handled = false;
            for (const key of Object.keys(endpoints))
            {
                if (key.length < 3 || !key.startsWith("/") || !key.endsWith("/")) {
                    continue;
                }
                if (url.match(key.substring(1, key.length - 1))) {
                    handled = endpoints[key](req, res);
                    if (handled) {
                        break;
                    }
                }
            }
            if (!handled)
            {
                res.writeHead(404);
                res.end("Page not found: " + url);
            }
        }
        console.log("Request:", req.url, "->", res.statusCode);
    } catch (e) {
        try {
            res.writeHead(502);
            res.end("Internal server error... Contact server host or try again later.");
        } catch {
            console.error("Failed to send 502...");
        }
        console.error("Request:", req.url, "->", res.statusCode, "\n\n", e);
    }
};

console.log("Endpoint count: ", Object.keys(endpoints).length);

module.exports = {
    endpoints: endpoints,
    start: () => {
        const server = http.createServer(requestListener);
        server.on("error", e => {
            console.error("Server error:", e.code);
            if (e.code == "EACCES")
            {
                console.error("Failed to start webserver... Perhaps the port", config.webserver.port, "is already in use?");
            }
        });
        server.listen(config.webserver.port, config.webserver.ip, () => {
                console.log(`Server is running on http://${config.webserver.ip}:${config.webserver.port}`);
            });
    }
};
