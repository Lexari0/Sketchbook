const path = require("path");
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    key: config.api.key,
    requestIsValid: async function(req, res, endpoint_enabled) {
        if (endpoint_enabled === "none") {
            this.sendResponse(res, 503, {error: "Endpoint is disabled."});
            return false;
        }
        if (endpoint_enabled === "key") {
            if (req.method !== "POST") {
                this.sendResponse(res, 405, {error: "Incorrect method: \"" + req.method + "\". Only POST is allowed for this API endpoint."});
                return false;
            }
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
            for (const url_param of url_params.split("&"))
            {
                var split_param = url_param.split("=");
                const k = split_param.shift();
                const v = split_param.shift();
                req.params[k] = v !== undefined ? v : null;
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
                    for (const url_param of body.split(/[&\n]/))
                    {
                        var split_param = url_param.split("=");
                        const k = split_param.shift();
                        const v = split_param.shift();
                        req.params[k] = v !== undefined ? v : null;
                    }
                    resolve(req.params);
                });
            });
        }
        return req.params;
    },
    sendResponse: function(res, code, data) {
        res.writeHead(code, {"Content-Type": "application/json"});
        res.end(JSON.stringify(data, undefined, 2));
    },
    keyIsValid: function(key) {
        return this.key == key || key in config.api.permitted_keys;
    }
};
