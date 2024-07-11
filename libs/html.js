const fs = require("fs");
const path = require("path");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const log = require(path.join(process.cwd(), "libs/log.js"));

module.exports = {
    defaultTemplateParameterGetter: async function (req) {
        var params = {
            req: {
                host: req.host,
                method: req.method,
                path: req.path,
                protocol: req.protocol,
                secure: req.secure
            },
            config: config.clone(),
            can_edit: admin.isRequestAdmin(req),
            is_admin: admin.isRequestAdmin(req)
        };
        console.log({params});
        if (req)
        {
            params.query = await api.getParams(req);
        }
        delete params.config.api;
        delete params.config.webserver;
        delete params.config.gallery.admin;
        delete params.config.subscribestar.client_secret;
        return params;
    },
    evalImports: function(template) {
        const re_import = /{#\s*([^\s]+)\s*#}/s;
        while (match = template.match(re_import))
        {
            const imported_path = match[1];
            const imported_template = fs.readFileSync(path.join(process.cwd(), imported_path), "utf-8");
            template = template.replace(match[0], imported_template);
        }
        return template;
    },
    findParam: function(params, path) {
        if (params == undefined)
        {
            return undefined;
        }
        var split_path = path.split(".");
        if (split_path.length === 0)
        {
            return undefined;
        }
        if (split_path.length === 1)
        {
            return params[path];
        }
        return this.findParam(params[split_path.shift()], split_path.join("."));
    },
    evalFor: function(template, params) {
        const re_start = /{%\s*for\s+([^\s]+)\s+in\s+([^\s]+)\s*%}/s;
        const re_end = /{%\s*end\s*%}/s;
        while (start_match = template.match(re_start))
        {
            const looper_key = start_match[1];
            const container_key = start_match[2];
            const pre_section = template.substr(0, start_match.index);
            const template_after_pre_section = template.substr(pre_section.length + start_match[0].length)
            const end_match = template_after_pre_section.match(re_end);
            if (!end_match)
            {
                throw `Bad template! ${start_match[0]} had no {#end#} block!`;
            }
            const section_body_source = template_after_pre_section.substr(0, end_match.index);
            const post_section = template_after_pre_section.substr(end_match.index + end_match[0].length);
            const found_param = this.findParam(params, container_key);
            if (found_param == undefined)
            {
                throw `Bad template! ${start_match[0]} has a bad container key "${container_key}" (not in params)`;
            }
            const looper_re = new RegExp(`{{\\s*${looper_key}(\\.[^\\s]*)?\\s*}}`);
            const global_re = new RegExp(looper_re, "g")
            var section_body = ""
            for (var i = 0; i < found_param.length; ++i)
            {
                var replaced_body = section_body_source;
                const start_match = replaced_body.match(global_re);
                const start_count = start_match ? start_match.length : 0;
                while (looper_match = replaced_body.match(looper_re))
                {
                    const replacement = `{{ ${container_key}.${i}${looper_match[1] ? looper_match[1] : ""} }}`;
                    replaced_body = replaced_body.replace(looper_match[0], replacement);
                    const new_match = replaced_body.match(global_re);
                    const new_count = new_match ? new_match.length : 0;
                    if (new_count >= start_count)
                    {
                        throw `HTML Template {% for %} loop is growing as it's evaluated!\n\tDeclaration: ${start_match[0]}\n\tWhen replacing "${looper_match[0]}" with "${replacement}"`;
                    }
                }
                section_body += replaced_body;
            }
            template = pre_section + section_body + post_section;
        }
        return template;
    },
    evalIf: function(template, params) {
        const re_start = /{\?\s*if\s+([^\s]+)\s*\?}/s;
        const re_else = /{\?\s*else\s*\?}/s;
        const re_end = /{\?\s*end\s*\?}/s;
        while (start_match = template.match(re_start))
        {
            const condition = start_match[1];
            const pre_section = template.substr(0, start_match.index);
            const template_without_pre_section = template.substr(start_match.index);
            var end_match = template_without_pre_section.match(re_end);
            if (!end_match)
            {
                throw `${start_match[0]} had no {?end?} block!`;
            }
            const section_to_eval = template_without_pre_section.substr(0, end_match.index + end_match[0].length);
            const else_match = section_to_eval.match(re_else);
            end_match = section_to_eval.match(re_end); // Bad re-evaluation :(
            const pass_body = () => section_to_eval.substr(start_match[0].length, (else_match ? else_match.index : end_match.index) - start_match[0].length);
            const fail_body = () => else_match ? section_to_eval.substr(else_match.index + else_match[0].length, end_match.index - (else_match.index + else_match[0].length)) : "";
            const post_section = template_without_pre_section.substr(end_match.index + end_match[0].length);
            const found_param = this.findParam(params, condition);
            const replaced_section = (found_param ? pass_body() : fail_body()).replace(/^\s+|\s+$/g, "");
            log.message("html", start_match[0], {section_to_eval, else_match: else_match ? else_match.index : -1, end_match: end_match.index, pass_body: pass_body(), fail_body: fail_body(), replaced_section});
            template = pre_section + replaced_section + post_section;
        }
        return template;
    },
    replaceParams: function(template, params, parentPath) {
        for (const k of Object.keys(params))
        {
            const paramPath = (parentPath.length > 0 ? parentPath + "." : "") + k;
            const value = typeof(params[k]) == "string" ? params[k] : JSON.stringify(params[k]);
            template = template.replace(new RegExp(`{{\\s*${paramPath}\\s*}}`, "g"), value);
            template = template.replace(new RegExp(`{\\(\\s*${paramPath}\\s*\\)}`, "g"), decodeURIComponent(`${value}`.replace(/\+/g, " ")));
            if (params[k] instanceof Object || params[k] instanceof Array)
            {
                template = this.replaceParams(template, params[k], paramPath);
            }
        }
        return template;
    },
    buildTemplate: async function (template, params, req) {
        if (typeof template != "string")
        {
            throw "html.buildTemplate(...) given non-String template";
        }
        if (!(params instanceof Object))
        {
            throw "html.buildTemplate(...) given non-Object params";
        }
        params = {...await this.defaultTemplateParameterGetter(req), ...params};
        template = this.evalImports(template);
        template = this.evalIf(template, params);
        template = this.evalFor(template, params);
        template = this.replaceParams(template, params, "")
        return template.replace(/{[{\(\?\#].*[}\)\?\#]}/g, "");
    }
};
