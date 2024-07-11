const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

async function getWifiSSID() {
    return new Promise(resolve => 
        exec("which iwgetid", error => {
            if (error.code !== 0)
            {
                console.log("No iwgetid")
                resolve("");
                return;
            }
            exec("iwgetid -r", (error, stdout, stderr) => {
                const ssid = stdout.substring(0, stdout.indexOf("\n"));
                console.log("ssid:", ssid);
                resolve(ssid);
            });
        }
        )
    );
}

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/admin"] = async (req, res) => {
            if (admin.isRequestAdmin(req))
            {
                const template = fs.readFileSync(path.join(process.cwd(), "templates/admin.html"), "utf-8")
                const body = await html.buildTemplate(template, {}, req);
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(body);
                return true;
            }
            const template = fs.readFileSync(path.join(process.cwd(), "templates/admin_login.html"), "utf-8")
            const body = await html.buildTemplate(template, {ssid: await getWifiSSID()}, req);
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
                    res.writeHead(302, {
                        "Set-Cookie": `session_token=${admin.generateNewToken()}; Path=/; Max-Age=${admin.token_valid_time_sec}`,
                        "Location": "/admin"
                    });
                    res.end();
                    return true;
                }
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
        endpoints["/admin/update_config"] = async (req, res) => {
            if (req.method !== "POST")
            {
                res.writeHead(405, {"Content-Type": "text/html"});
                res.end(`<h1>HTTP POST method must be used for updating the config.</h1>`);
                return true;
            }
            var errors = "";
            if (admin.isRequestAdmin(req))
            {
                const params = await api.getParams(req);
                if ("server.owner.name" in params)
                {
                    config.server.owner.name = params["server.owner.name"];
                }
                if ("server.owner.email" in params)
                {
                    config.server.owner.email = params["server.owner.email"];
                }
                if ("gallery.name" in params)
                {
                    config.gallery.name = params["gallery.name"];
                }
                if ("gallery.distribute_source" in params)
                {
                    config.gallery.distribute_source = params["gallery.distribute_source"];
                }
                if ("gallery.recommended_tags" in params)
                {
                    config.gallery.recommended_tags = params["gallery.recommended_tags"];
                }
                if ("gallery.top_links.add" in params)
                {
                    config.gallery.top_links.push({
                        text: params["gallery.top_links.add.text"],
                        link: params["gallery.top_links.add.link"]
                    });
                }
                if ("gallery.admin.password" in params)
                {
                    if (!admin.isPasswordCorrect(params.password))
                    {
                        errors += "error.gallery.admin.password=Current password is incorrect!";
                    }
                    else
                    {
                        config.gallery.admin.password = params["gallery.admin.password"];
                    }
                    config.gallery.top_links.push({
                        text: params["gallery.top_links.add.text"],
                        link: params["gallery.top_links.add.link"]
                    });
                }
                config.save();
            }
            else
            {
                errors += `error=Must be logged in as admin to update the config!`
            }
            res.writeHead(302, {
                "Location": errors ? `/admin?${errors}` : "/admin"
            });
            res.end();
            return true;
        };
    }
};
