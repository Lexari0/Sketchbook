const fs = require("fs");
const path = require("path");
const sqlstring = require("sqlstring-sqlite");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/search"] = async (req, res) => {
            const template = fs.readFileSync(path.join(process.cwd(), "templates/search.html"), "utf-8")
            var params = {config: structuredClone(config), query: await api.getParams(req)};
            const query = (params.query.q ? decodeURIComponent(params.query.q) : "").split(/\++/g);
            const searched_tags = query.map(tag => tag.replace(/^[~-]/, ""));
            delete params.config.api;
            delete params.config.webserver;
            if (config.gallery.recommended_tags.length > 0)
            {
                params["tags"] = await db.select(["tag", "COUNT(tag_id) AS count"], "item_tags_with_data", {
                    distinct: true,
                    where: "tag IN (" + config.gallery.recommended_tags.map(sqlstring.escape).join() + ") AND tag NOT IN (" + searched_tags.map(sqlstring.escape) + ")",
                    group_by: "tag_id",
                    order_by: "count DESC, tag",
                    limit: config.gallery.recommended_tags.length
                    });
            }
            else
            {
                params["tags"] = await db.select(["tag", "COUNT(tag_id) AS count"], "item_tags_with_data", {
                    distinct: true,
                    where: "tag NOT IN (" + searched_tags.map(sqlstring.escape) + ")",
                    group_by: "tag_id",
                    order_by: "count DESC, tag",
                    limit: 16
                    });
            }
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        }
    }
};
