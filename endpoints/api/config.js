const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/config"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.config._)) {
                return true;
            }
            api.sendResponse(res, 200, {error:"", config})
            return true;
        };
        endpoints["/api/config/update"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.config.update)) {
                return true;
            }
            const params = await api.getParams(req);
            var new_config = config.clone();
            var changed_config = {};
            var errors = [];
            for (const key of Object.keys(params))
            {
                var key_layers = key.split(".");
                const last_key_layer = key_layers.pop();
                var config_obj = new_config;
                var changed_config_obj = changed_config;
                for (const key_layer of key_layers)
                {
                    if (changed_config_obj[key_layer] === undefined)
                    {
                        changed_config_obj[key_layer] = {};
                    }
                    config_obj = config_obj[key_layer];
                    changed_config_obj = changed_config_obj[key_layer];
                    if (typeof(config_obj) !== "object")
                    {
                        config_obj = undefined;
                        break;
                    }
                }
                if (config_obj == undefined || config_obj[last_key_layer] == undefined)
                {
                    errors.push(`Key referenced invalid path: ${key}`);
                }
                else if (typeof(config_obj[last_key_layer]) == "object")
                {
                    errors.push(`Key referenced an object, which cannot be set via the API: ${key}`);
                }
                if (errors.length == 0)
                {
                    config_obj[last_key_layer] = params[key];
                    changed_config_obj[last_key_layer] = params[key];
                }
            }
            if (errors.length > 0)
            {
                api.sendResponse(res, 200, {error: errors.join("; "), params})
                return true;
            }
            for (const k of Object.keys(params).map(key => key.substring(0, key.indexOf("."))))
            {
                config[k] = structuredClone(new_config[k]);
            }
            config.save();
            api.sendResponse(res, 200, {error: "", params, changed_config})
            return true;
        };
    }
};
