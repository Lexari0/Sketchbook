const exec = require("child_process").exec;
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const cookies = require(path.join(process.cwd(), "libs/cookies.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

async function getWifiSSID() {
    return new Promise(resolve => 
        exec("which iwgetid", error => {
            if (error && error.code !== 0)
            {
                console.log("No iwgetid")
                resolve("");
                return;
            }
            exec("iwgetid -r", (error, stdout, stderr) => {
                const ssid = stdout.substring(0, stdout.indexOf("\n"));
                resolve(ssid);
            });
        })
    );
}

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/admin"] = async (req, res) => {
            if (admin.isRequestAdmin(req))
            {
                const template = fs.readFileSync(path.join(process.cwd(), "templates/admin.html"), "utf-8")
                const body = await html.buildTemplate(template, {ssid: await getWifiSSID()}, req);
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(body);
                return true;
            }
            const template = fs.readFileSync(path.join(process.cwd(), "templates/admin_login.html"), "utf-8")
            const body = await html.buildTemplate(template, {}, req);
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
                if (await admin.isPasswordCorrect(params.password))
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
                "Set-Cookie": cookies.stringifyCookies({session_token: null}),
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
            if (!admin.isRequestAdmin(req))
            {
                res.writeHead(302, {
                    "Location": "/admin?$error=Must be logged in as admin to update the config!"
                });
                res.end();
                return true;
            }
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
                if (!await admin.isPasswordCorrect(params.password))
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
            res.writeHead(302, {
                "Location": "/admin"
            });
            res.end();
            return true;
        };
        endpoints["/admin/upload_item"] = async (req, res) => {
            if (req.method !== "POST")
            {
                res.writeHead(405, {"Content-Type": "text/html"});
                res.end(`<h1>HTTP POST method must be used for updating the config.</h1>`);
                return true;
            }
            if (!admin.isRequestAdmin(req))
            {
                res.writeHead(302, {
                    "Location": "/admin?error=Must be logged in as admin to upload an item!"
                });
                res.end();
                return true;
            }
            var item_id;
            try
            {
                item_id = await new Promise((resolve, reject) => {
                    var form = new formidable.IncomingForm();
                    form.parse(req, async (err, fields, form) => {
                        if (err)
                        {
                            reject(err);
                            return;
                        }
                        const uploaded_file = form.file[0];
                        const temp_file_path = uploaded_file.filepath;
                        const file_hash = await gallery.hashFile(temp_file_path);
                        const final_file_path = path.join(gallery.content_path, file_hash + path.extname(uploaded_file.originalFilename));
                        try
                        {
                            fs.copyFileSync(temp_file_path, final_file_path);
                            if (!await gallery.updateItem(final_file_path))
                            {
                                throw "Failed to update item in gallery.";
                            }
                            try
                            {
                                fs.unlinkSync(temp_file_path);
                            }
                            catch
                            {
                                // Failing to delete the temp file is not a big deal
                            }
                        }
                        catch (err)
                        {
                            if (fs.existsSync(final_file_path))
                            {
                                fs.unlinkSync(final_file_path);
                            }
                            reject(err);
                            return;
                        }
                        resolve(await gallery.getItemIDOfFile(final_file_path));
                    });
                });
            }
            catch (error)
            {
                res.writeHead(503);
                res.end(`Failed to upload file: ${error}`);
                return true;
            }
            if (item_id == undefined)
            {
                res.writeHead(302, {
                    "Location": "/admin?error=Item had no gallery ID after uploading"
                });
                res.end(`Failed to upload file: ${error}`);
                return true;
            }
            res.writeHead(302, {
                "Location": `/item/${item_id}/edit`
            });
            res.end();
            return true;
        };
    }
};
