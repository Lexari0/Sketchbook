const fs = require("fs");
const mime = require("mime-types");
const path = require("path");
const sqlstring = require("sqlstring-sqlite");
const api = require(path.join(process.cwd(), "libs/api.js"));
const network = require(path.join(process.cwd(), "libs/network.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

function canEdit(req) {
    if (config.gallery.edit_ip_whitelist.length === 0)
    {
        return network.ipv4.ipInSubnet(req.socket.remoteAddress);
    }
    return config.gallery.edit_ip_whitelist.contains(req.socket.remoteAddress);
}

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/tags"] = async (req, res) => {
            const tags_with_counts = await db.select(["tag", "COUNT(*) as count"], "item_tags_with_data", {
                distinct: true,
                order_by: "count, tag",
            });
            var params = {config: structuredClone(config), tags: tags_with_counts, can_edit: canEdit(req)};
            delete params.config.api;
            delete params.config.webserver;
            delete params.config.gallery.edit_ip_whitelist;
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tags.html"), "utf-8")
            const body = html().buildTemplate(template, params).finalize();
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
            var params = {config: structuredClone(config), tag, can_edit: tag.editable && canEdit(req)};
            delete params.config.api;
            delete params.config.webserver;
            delete params.config.gallery.edit_ip_whitelist;
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tag.html"), "utf-8")
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints[/^\/tag\/[^/?]+\/edit$/] = async (req, res) => {
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const tag_name = split_url[1];
            const params = await api.getParams(req);
            if ("submitting" in params)
            {
                const tag_updates = {
                    tag: sqlstring.escape(decodeURIComponent(params.name)),
                    description: sqlstring.escape(decodeURIComponent(params.description)),
                    tag_category_id: `(SELECT tag_category_id FROM (SELECT tag_category_id FROM tag_categories UNION ALL VALUES(0)) WHERE tag_category_id IN (${sqlstring.escape(params.category)}, 0) LIMIT 1)`
                };
                const new_tag_name_taken = (await db.select("*", "tags", {where: `tag=${tag_updates.tag}`})).length !== 0;
                if (new_tag_name_taken)
                {
                    res.writeHead(302, {
                        "Location": `/tag/${tag_name}/edit?error=${encodeURIComponent(`New tag name "${tag_updates.tag}" already exists!`)}&${Object.keys(params).filter(k => k != "submitting").map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&")}`
                    });
                    res.end();
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
            var tag = (await db.select("*", "tags_with_categories", {
                    where: `tag=${sqlstring.escape(tag_name)}`
                })).shift();
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
            if (!tag.editable)
            {
                res.writeHead(403);
                res.end(`<h1>The tag "${tag_name}" cannot be edited.</h1><h2><a href="/tags">Return to Tag List</a></h2>`);
                return true;
            }
            if (!canEdit(req))
            {
                res.writeHead(401);
                res.end(`<h1>You cannot edit tags.</h1><h2><a href="/tags">Return to Tag List</a></h2>`);
                return true;
            }
            var template_params = {config: structuredClone(config), tag, can_edit: tag.editable && canEdit(req)};
            delete template_params.config.api;
            delete template_params.config.webserver;
            delete template_params.config.gallery.edit_ip_whitelist;
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tag_edit.html"), "utf-8")
            const body = html().buildTemplate(template, template_params).finalize();
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
            var params = {config: structuredClone(config), category, can_edit: category.editable && canEdit(req)};
            delete params.config.api;
            delete params.config.webserver;
            delete params.config.gallery.edit_ip_whitelist;
            const template = fs.readFileSync(path.join(process.cwd(), "templates/tag_category.html"), "utf-8")
            console.log(params);
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
    }
};
