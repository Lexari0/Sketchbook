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
        },
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
                tag.description = tag.description.replace("\n", "<br />")
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
                category.description = category.description.replace("\n", "<br />")
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
