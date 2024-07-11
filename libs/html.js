const fs = require("fs");
const path = require("path");
const log = require(path.join(process.cwd(), "libs/log.js"));

function addGenerator(page, htmlTag, defaultAttributeMap = {}, hasContent = true) {
    if (hasContent)
    {
        page[htmlTag] = function (content = "", attributeMap = {}) {
            attributeMap = {...defaultAttributeMap, ...attributeMap};
            Object.keys(attributeMap).forEach(key => attributeMap[key] === undefined && delete attributeMap[key]);
            if (Object.keys(attributeMap).length == 0)
            {
                this.append(`<${htmlTag}>${content}</${htmlTag}>`);
            }
            else
            {
                let attributeList = [];
                for (const key in attributeMap)
                {
                    attributeList.push(`${key}="${attributeMap[key]}"`);
                }
                this.append(`<${htmlTag} ${attributeList.join(" ")}>${content}</${htmlTag}>`)
            }
            return this;
        }
    }
    else
    {
        page[htmlTag] = function (attributeMap) {
            attributeMap = {...defaultAttributeMap, ...attributeMap};
            Object.keys(attributeMap).forEach(key => attributeMap[key] === undefined && delete attributeMap[key]);
            if (Object.keys(attributeMap).length == 0)
            {
                this.append(`<${htmlTag} />`);
            }
            else
            {
                let attributeList = [];
                for (const key in attributeMap)
                {
                    attributeList.push(`${key}="${attributeMap[key]}"`);
                }
                this.append(`<${htmlTag} ${attributeList.join(" ")} />`)
            }
            return this;
        }
    }
}

module.exports = function (defaultContents = undefined) {
    let page = {
        content: (function () {
            if (typeof(defaultContents) == "string")
            {
                return [defaultContents];
            }
            if (defaultContents instanceof Array)
            {
                for (const i in defaultContents)
                {
                    defaultContents[i] = `${defaultContents}`;
                }
                return defaultContents;
            }
            return []
        })(),
        finalize: function () { return this.content.join(""); },
        toString: function () { return this.finalize(``); },
        append: function (element) {
            if (typeof(element) != "string")
            {
                element = `${element}`;
            }
            if (element.length > 0)
            {
                this.content.push(element);
            }
            return this;
        },
        appendTag: function (htmlTag, content = undefined, attributeMap = {}) {
            if (Object.keys(attributeMap).length == 0)
            {
                if (content == undefined)
                {
                    this.append(`<${htmlTag} />`);
                }
                else
                {
                    this.append(`<${htmlTag}>${content}</${htmlTag}>`);
                }
            }
            else
            {
                let attributeList = [];
                for (const key in attributeMap)
                {
                    attributeList.push(`${key}="${attributeMap[key]}"`);
                }
                if (content == undefined)
                {
                    this.append(`<${htmlTag} ${attributeList.join(" ")} />`)
                }
                else
                {
                    this.append(`<${htmlTag} ${attributeList.join(" ")}>${content}</${htmlTag}>`)
                }
            }
            return this;
        },
        DOCTYPE: function (doctype = "html") {
            this.append(`<!DOCTYPE ${doctype}>`);
            return this;
        },
        buildTemplate: function (template, params) {
            if (typeof template != "string")
            {
                throw "html.buildTemplate(...) given non-String template";
            }
            if (!(params instanceof Object))
            {
                throw "html.buildTemplate(...) given non-Object params";
            }
            function evalImports(template) {
                const re_import = /{#\s*([^\s]+)\s*#}/s;
                while (match = template.match(re_import))
                {
                    const imported_path = match[1];
                    const imported_template = fs.readFileSync(path.join(process.cwd(), imported_path), "utf-8");
                    template = template.replace(match[0], imported_template);
                }
                return template;
            }
            function findParam(params, path) {
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
                return findParam(params[split_path.shift()], split_path.join("."));
            }
            function evalFor(template, params) {
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
                    const found_param = findParam(params, container_key);
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
            }
            function evalIf(template, params) {
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
                    const found_param = findParam(params, condition);
                    template = pre_section + (found_param ? pass_body() : fail_body()).replace(/^\s+|\s+$/g, "") + post_section;
                }
                return template;
            }
            function replaceParams(template, params, parentPath) {
                for (const k of Object.keys(params))
                {
                    const paramPath = (parentPath.length > 0 ? parentPath + "." : "") + k;
                    template = template.replace(new RegExp(`{{\\s*${paramPath}\\s*}}`, "g"), params[k]);
                    template = template.replace(new RegExp(`{\\(\\s*${paramPath}\\s*\\)}`, "g"), decodeURIComponent(`${params[k]}`.replace(/\+/g, " ")));
                    if (params[k] instanceof Object || params[k] instanceof Array)
                    {
                        template = replaceParams(template, params[k], paramPath);
                    }
                }
                return template;
            };
            template = evalImports(template);
            template = evalIf(template, params);
            template = evalFor(template, params);
            template = replaceParams(template, params, "")
            this.append(template.replace(/{[{\(\?\#].*[}\)\?\#]}/g, ""));
            return this;
        }
    }
    addGenerator(page, "html");
    addGenerator(page, "head");
    addGenerator(page, "body");
    addGenerator(page, "header");
    addGenerator(page, "footer");

    addGenerator(page, "style");
    addGenerator(page, "script");
    addGenerator(page, "noscript");
    
    addGenerator(page, "a", {href: undefined});
    addGenerator(page, "p");
    addGenerator(page, "b");
    addGenerator(page, "i");
    addGenerator(page, "u");
    addGenerator(page, "s");
    addGenerator(page, "sub");
    addGenerator(page, "sup");
    addGenerator(page, "pre");
    addGenerator(page, "code");
    
    addGenerator(page, "h1");
    addGenerator(page, "h2");
    addGenerator(page, "h3");
    addGenerator(page, "h4");
    addGenerator(page, "h5");
    addGenerator(page, "h6");
    
    addGenerator(page, "ol");
    addGenerator(page, "ul");
    addGenerator(page, "li");
    
    addGenerator(page, "table");
    addGenerator(page, "tr");
    addGenerator(page, "th");
    addGenerator(page, "td");
    
    addGenerator(page, "div");
    addGenerator(page, "span");
    
    addGenerator(page, "img", { src: undefined }, false);
    addGenerator(page, "br", {}, false);
    addGenerator(page, "hr", {}, false);
    addGenerator(page, "link", { rel: "stylesheet", type: "text/css", href: undefined }, false);
    
    addGenerator(page, "form", { action: undefined, method: "post" });
    addGenerator(page, "input", { type: "text", name: undefined });
    addGenerator(page, "textarea", { rows: 5, cols: 40, name: undefined });
    addGenerator(page, "button", { type: "button", value: undefined });
    
    addGenerator(page, "colgroup", { span: undefined });
    addGenerator(page, "col", { width: 100});
    return page;
};
