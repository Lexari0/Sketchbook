const fs = require("fs");
const mime = require("mime-types");
const path = require("path");
const sqlstring = require("sqlstring-sqlite");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const network = require(path.join(process.cwd(), "libs/network.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/tags"] = async (req, res) => {
            const tags_with_counts = await db.select(["tag", "COUNT(*) as count"], "item_tags_with_data", {
                distinct: true,
                order_by: "count, tag",
            });
            const params = {tags: tags_with_counts};
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tags.html"), "utf-8")
            const body = await html.buildTemplate(template, params, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints[/^\/tag\/[^/?]+$/] = async (req, res) => {
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const tag_name = split_url[1];
            var tag = (await db.select("*", "tags_with_categories", {
                    where: `tag=${sqlstring.escape(tag_name)}`
                })).shift();
            if (tag === undefined)
            {
                tag = {
                    tag_id: 0,
                    tag: tag_name,
                    description: "<i id=\"missing\">No such tag exists...</i>",
                    color: null,
                    tag_category_id: 0,
                    category: null,
                    editable: 1
                };
            }
            if (tag.description)
            {
                tag.description = tag.description.replace(/\n/g, "<br />");
            }
            if (!tag.color)
            {
                tag.color = "#000";
            }
            const params = {tag, can_edit: tag.editable && admin.isRequestAdmin(req)};
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tag.html"), "utf-8")
            const body = await html.buildTemplate(template, params, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints[/^\/tag\/[^/?]+\/edit$/] = async (req, res) => {
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const tag_name = split_url[1];
            if (!admin.isRequestAdmin(req))
            {
                res.writeHead(401);
                res.end(`<h1>You cannot edit tags.</h1><h2><a href="/tags">Return to Tag List</a></h2>`);
                return true;
            }
            var tag = (await db.select("*", "tags_with_categories", {
                    where: `tag=${sqlstring.escape(tag_name)}`,
                    limit: 1
                })).shift();
            if (tag && !tag.editable)
            {
                res.writeHead(403);
                res.end(`<h1>The tag "${tag_name}" cannot be edited.</h1><h2><a href="/tags">Return to Tag List</a></h2>`);
                return true;
            }
            const params = await api.getParams(req);
            if ("submitting" in params)
            {
                const tag_updates = {
                    tag: sqlstring.escape(decodeURIComponent(params.name)),
                    description: params.description ? sqlstring.escape(decodeURIComponent(params.description)) : null,
                    tag_category_id: `(SELECT tag_category_id FROM (SELECT tag_category_id FROM tag_categories UNION ALL VALUES(0)) WHERE tag_category_id IN (${sqlstring.escape(params.category)}, 0) LIMIT 1)`
                };
                const new_tag_name_taken = decodeURIComponent(params.name) !== tag_name && (await db.select("*", "tags", {where: `tag=${tag_updates.tag}`})).length !== 0;
                if (new_tag_name_taken)
                {
                    res.writeHead(302, {
                        "Location": `/tag/${tag_name}/edit?error=${encodeURIComponent(`New tag name "${tag_updates.tag}" already exists!`)}&${Object.keys(params).filter(k => k != "submitting").map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&")}`
                    });
                    res.end();
                    return true;
                }
                if (Object.values(tag_updates).filter(String).length > 0)
                {
                    await db.all(`INSERT OR IGNORE INTO tags (tag) VALUES (${sqlstring.escape(tag_name)})`);
                    await db.update("tags", tag_updates, {where: `tag=${sqlstring.escape(tag_name)}`});
                }
                res.writeHead(302, {
                    "Location": `/tag/${params.name ? params.name : tag_name}`
                });
                res.end();
                return true;
            }
            if (tag === undefined)
            {
                tag = {
                    tag_id: 0,
                    tag: tag_name,
                    description: "",
                    color: null,
                    tag_category_id: 0,
                    category: null,
                    editable: 1
                };
            }
            const template_params = {tag};
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tag_edit.html"), "utf-8")
            const body = await html.buildTemplate(template, template_params, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints[/^\/tags\/category\/[^/?]+$/] = async (req, res) => {
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const category_name = split_url[2];
            var category = (await db.select("*", `tag_categories`, {
                    where: `category=${sqlstring.escape(category_name)}`,
                    order_by: "tag_category_id",
                    limit: 1
                })).shift();
            if (category === undefined)
            {
                category = {
                    tag_category_id: 0,
                    category: category_name,
                    description: "<i class=\"missing\">No such category exists...</i>",
                    color: null,
                    editable: 1
                };
            }
            if (category.description)
            {
                category.description = category.description.replace(/\n/g, "<br />");
            }
            const params = {category, can_edit: category.editable && admin.isRequestAdmin(req)};
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tag_category.html"), "utf-8")
            const body = await html.buildTemplate(template, params, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints[/^\/tags\/category\/[^/?]+\/edit$/] = async (req, res) => {
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const category_name = split_url[2];
            if (!admin.isRequestAdmin(req))
            {
                res.writeHead(401);
                res.end(`<h1>You cannot edit tag categories.</h1><h2><a href="/tags">Return to Tag List</a></h2>`);
                return true;
            }
            var category = (await db.select("*", "tag_categories", {
                    where: `category=${sqlstring.escape(category_name)}`,
                    limit: 1
                })).shift();
            if (category && !category.editable)
            {
                res.writeHead(403);
                res.end(`<h1>The tag category "${category_name}" cannot be edited.</h1><h2><a href="/tags">Return to Tag List</a></h2>`);
                return true;
            }
            const params = await api.getParams(req);
            if ("submitting" in params)
            {
                const category_updates = {
                    category: sqlstring.escape(decodeURIComponent(params.name)),
                    description: params.description ? sqlstring.escape(decodeURIComponent(params.description)) : null,
                    color: params.color ? sqlstring.escape(decodeURIComponent(params.color)) : null
                };
                const new_category_name_taken = decodeURIComponent(params.name) !== category_name && (await db.select("*", "tag_categories", {where: `category=${category_updates.category}`})).length !== 0;
                if (new_category_name_taken)
                {
                    res.writeHead(302, {
                        "Location": `/tags/category/${category_name}/edit?error=${encodeURIComponent(`New tag category name "${category_updates.tag}" already exists!`)}&${Object.keys(params).filter(k => k != "submitting").map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&")}`
                    });
                    res.end();
                    return true;
                }
                if (Object.values(category_updates).filter(String).length > 0)
                {
                    await db.all(`INSERT OR IGNORE INTO tag_categories (category) VALUES (${sqlstring.escape(category_name)})`);
                    await db.update("tag_categories", category_updates, {where: `category=${sqlstring.escape(category_name)}`});
                }
                res.writeHead(302, {
                    "Location": `/tags/category/${params.name ? params.name : category_name}`
                });
                res.end();
                return true;
            }
            if (category === undefined)
            {
                category = {
                    tag_category_id: 0,
                    category: category_name,
                    description: "",
                    color: null,
                    editable: 1
                };
            }
            const template_params = {category, can_edit: true};
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tag_category_edit.html"), "utf-8")
            const body = await html.buildTemplate(template, template_params, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
    }
};
