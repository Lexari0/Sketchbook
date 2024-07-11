const https = require("https");
const path = require("path");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    key: config.api.key,
    requestIsValid: async function(req, res, endpoint_enabled) {
        if (endpoint_enabled == null || endpoint_enabled === "none") {
            this.sendResponse(res, 503, {error: "Endpoint is disabled."});
            return false;
        }
        if (endpoint_enabled === "key" || endpoint_enabled === "admin") {
            if (req.method !== "POST") {
                this.sendResponse(res, 405, {error: "Incorrect method: \"" + req.method + "\". Only POST is allowed for this API endpoint."});
                return false;
            }
            if (endpoint_enabled === "key")
            {
                const params = await this.getParams(req);
                if (!("key" in params)) {
                    this.sendResponse(res, 401, {error: "Missing \"key\" parameter in request body."});
                    return false;
                }
                if (!this.keyIsValid(params.key)) {
                    this.sendResponse(res, 403, {error: "Provided API key is not permitted access."});
                    return false;
                }
            }
            else if (endpoint_enabled === "admin")
            {
                if (!await admin.isRequestAdmin(req))
                {
                    this.sendResponse(res, 403, {error: "Endpoint is admin-only."});
                    return false;
                }
            }
        }
        if (req.method !== "POST" && req.method !== "GET") {
            this.sendResponse(res, 405, {error: "Incorrect method: \"" + req.method + "\". Only POST and GET are allowed for this API endpoint."});
            return false;
        }
        return true;
    },
    getParams: async function(req) {
        if ("params" in req) {
            return req.params;
        }
        req.params = {};
        if (req.method === "GET") {
            var url = req.url.split("?");
            const url_page = url.shift();
            const url_params = url.shift();
            if (url_params)
            {
                for (const url_param of url_params.split("&"))
                {
                    var split_param = url_param.split("=");
                    const k = split_param.shift();
                    const v = split_param.join("=");
                    req.params[k] = v !== undefined ? decodeURIComponent(v) : null;
                }
            }
        }
        else if (req.method === "POST") {
            return new Promise((resolve, reject) => {
                var body = "";
                req.on("data", chunk => {
                    body += chunk;
                    if (body.length > 1e6)
                    {
                        req.connection.destroy();
                        body = "";
                        reject();
                    }
                });
                req.on("end", () => {
                    const boundary_match = /multipart\/form-data;(.+;)*\s*boundary=(.+)/.exec(req.headers["content-type"]);
                    const boundary = boundary_match ? boundary_match[2] : undefined;
                    for (const url_param of body.split(/[&\n]/))
                    {
                        // Hack to deal with forms which submit files
                        if (boundary != undefined && url_param.startsWith("--" + boundary))
                        {
                            break;
                        }
                        var split_param = url_param.split("=");
                        const k = split_param.shift();
                        const v = split_param.join("=");
                        req.params[k] = v !== undefined ? decodeURIComponent(v) : null;
                    }
                    resolve(req.params);
                });
            });
        }
        return req.params;
    },
    sendPOST: function(hostname, page, data, content_type, headers) {
        return new Promise((resolve, reject) => {
            // if (Object.keys(params).length > 0)
            // {
            //     page += "?" + Object.keys(params).map(key => params[key] == undefined ? encodeURIComponent(`${key}`) : encodeURIComponent(`${key}`) + "=" + encodeURIComponent(`${params[key]}`)).join("&");
            // }
            var options = {
                hostname: hostname,
                port: 443,
                path: page,
                method: "POST",
                headers: headers ? headers : {}
            };
            console.log("Sending POST request: " + path.join(hostname, page));
            if (data != undefined)
            {
                if (typeof(data) == "object")
                {
                    data = JSON.stringify(data);
                    content_type = "application/json";
                    console.log(`POST JSON data: ${data}`);
                }
                if (content_type == undefined)
                {
                    content_type = "application/octet-stream";
                }
                options.headers["Content-Length"] = data.length
            }
            options.headers["Content-Type"] = content_type;
            const req = https.request(options, (res) => {
                res.setEncoding("utf8");
                var responseBody = "";
                res.on("data", (chunk) => {
                    if (chunk != undefined)
                    {
                        responseBody += chunk;
                    }
                });
                res.on("end", () => {
                    resolve(JSON.parse(responseBody));
                })
            });
            req.on("error", (err) => reject(err));
            req.write(data);
            req.end();
        });
    },
    sendResponse: function(res, code, data) {
        res.writeHead(code, {"Content-Type": "application/json"});
        res.end(JSON.stringify(data, undefined, 2));
    },
    keyIsValid: function(key) {
        return this.key == key || key in config.api.permitted_keys;
    }
};
