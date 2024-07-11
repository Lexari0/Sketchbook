const fs = require("fs");
const path = require("path");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/admin"] = async (req, res) => {
            if (admin.isRequestAdmin(req))
            {
                var params = {config: structuredClone(config)};
                delete params.config.api;
                delete params.config.webserver;
                delete params.config.gallery.admin;
                const template = fs.readFileSync(path.join(process.cwd(), "templates/admin.html"), "utf-8")
                const body = html().buildTemplate(template, params).finalize();
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(body);
                return true;
            }
            var params = {config: structuredClone(config)};
            delete params.config.api;
            delete params.config.webserver;
            delete params.config.gallery.admin;
            const template = fs.readFileSync(path.join(process.cwd(), "templates/admin_login.html"), "utf-8")
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints["/admin/login"] = async (req, res) => {
            if (req.method !== "POST")
            {
                res.writeHead(405, {"Content-Type": "text/html"});
                res.end(`<h1>HTTP POST method must be used for login.</h1>`);
                return true;
            }
            const params = await api.getParams(req);
            if ("password" in params)
            {
                if (admin.isPasswordCorrect(params.password))
                {
                    console.log("Successful login");
                    res.writeHead(302, {
                        "Set-Cookie": admin.stringifyCookies({session_token: admin.generateNewToken()}),
                        "Location": "/admin"
                    });
                    res.end();
                    return true;
                }
                console.log("Failed login");
            }
            res.writeHead(302, {
                "Location": "/admin?error=Login failed... Password was incorrect."
            });
            res.end();
            return true;
        };
        endpoints["/admin/logout"] = async (req, res) => {
            if (admin.isRequestAdmin(req))
            {
                admin.revokeToken();
            }
            res.writeHead(302, {
                "Set-Cookie": admin.stringifyCookies({session_token: null}),
                "Location": "/"
            });
            res.end();
            return true;
        };
    }
};
