const fs = require("fs");
const mime = require("mime-types");
const path = require("path");
const sqlstring = require("sqlstring-sqlite");
const admin = require(path.join(process.cwd(), "libs/admin.js"));
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints[/^\/item\/[0-9]+$/] = async (req, res) => {
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const gallery_item_id = parseInt(split_url[1]);
            var item = (await db.select("*", "items", {
                    where: `gallery_item_id=${gallery_item_id}`
                })).shift();
            if (item === undefined)
            {
                return false;
            }
            if (item.missing)
            {
                res.writeHead(404);
                res.end(`<h1>Item ${gallery_item_id} is currently missing</h1><h2>Please notify the gallery owner.<br /><a href="/">Return home</a></h2>`);
                return true;
            }
            const tags = (await db.select("tag",
                "item_tags_with_data INNER JOIN items ON item_tags_with_data.gallery_item_id=items.gallery_item_id", {
                distinct: true,
                where: `items.gallery_item_id=${gallery_item_id}`,
                order_by: "tag"
            }));
            const tags_with_counts = await db.select(["tag", "COUNT(*) as count"], "item_tags_with_data", {
                distinct: true,
                where: `tag IN (${tags.map(x => sqlstring.escape(x.tag)).join()})`,
                order_by: "tag",
                group_by: "tag"
            });
            item.description = item.description.replace(/\n/g, "<br />");
            const params = {item, tags: tags_with_counts};
            const template = fs.readFileSync(path.join(process.cwd(), "templates/item.html"), "utf-8")
            const body = await html.buildTemplate(template, params, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints[/^\/item\/[0-9]+\/(thumb|small|large|source)$/] = async (req, res) => {
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const gallery_item_id = parseInt(split_url[1]);
            // TODO: Only censor if the user doesn't have access
            const censored = await getCensoredAlternate(gallery_item_id);
            if (censored != undefined)
            {
                res.writeHead(200, {
                    "Content-Type": mime.lookup(path.extname(entry.file_path)),
                    "Content-Length": file_stat.size
                });
                censored.pipe(res);
                return true;
            }
            else
            {
                return false;
            }
            var size = split_url[2];
            if (size === "source") {
                if (!config.gallery.distribute_source)
                {
                    return false;
                }
                const entry = (await db.select(["file_path", "missing"], "items", {where: `gallery_item_id=${gallery_item_id}`})).shift();
                if (entry === undefined)
                {
                    return false;
                }
                if (entry.missing)
                {
                    res.writeHead(404);
                    res.end(`<h1>Item ${gallery_item_id} is currently missing</h1><h2>Please notify the gallery owner.<br /><a href="/">Return home</a></h2>`);
                    return true;
                }
                const file_stat = fs.statSync(entry.file_path);
                const read_stream = fs.createReadStream(entry.file_path);
                res.writeHead(200, {
                        "Content-Type": mime.lookup(path.extname(entry.file_path)),
                        "Content-Length": file_stat.size
                    });
                read_stream.pipe(res);
                return true;
            }
            const requested_path = path.resolve(path.join(process.cwd(), "gallery", size, `${gallery_item_id}.webp`));
            if (!fs.existsSync(requested_path))
            {
                await gallery.refreshAlternates(gallery_item_id);
            }
            const file_stat = fs.statSync(requested_path);
            const read_stream = fs.createReadStream(requested_path);
            res.writeHead(200, {
                    "Content-Type": mime.lookup(".webp"),
                    "Content-Length": file_stat.size
                });
            read_stream.pipe(res);
            return true;
        };
        endpoints[/^\/item\/[0-9]+\/edit$/] = async (req, res) => {
            if (!admin.isRequestAdmin(req))
            {
                res.writeHead(403);
                res.end(`<h1>You are not permitted to edit items.</h1>`);
                return true;
            }
            const params = await api.getParams(req);
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const gallery_item_id = parseInt(split_url[1]);
            if ("submitting" in params)
            {
                if (params.tags_to_add && params.tags_to_add.length > 0)
                {
                    await gallery.addTags(gallery_item_id, ...decodeURIComponent(params.tags_to_add).split(",").map(tag => sqlstring.escape(tag)));
                }
                if (params.tags_to_remove && params.tags_to_remove.length > 0)
                {
                    await gallery.removeTags(gallery_item_id, ...decodeURIComponent(params.tags_to_remove).split(",").map(tag => sqlstring.escape(tag)));
                }
                const item_updates = {name: sqlstring.escape(decodeURIComponent(params.name)), description: sqlstring.escape(decodeURIComponent(params.description))};
                if (Object.values(item_updates).filter(String).length > 0)
                {
                    await db.update("items", item_updates, {where: `gallery_item_id=${gallery_item_id}`});
                }
                res.writeHead(302, {
                    "Location": "/" + split_url.slice(0, 2).join("/")
                });
                res.end();
                return true;
            }
            const item = (await db.select("*", "items", {
                    where: `gallery_item_id=${gallery_item_id}`
                })).shift();
            if (item === undefined)
            {
                return false;
            }
            if (item.missing)
            {
                res.writeHead(404);
                res.end(`<h1>Item ${gallery_item_id} is currently missing</h1><h2>Please notify the gallery owner.<br /><a href="/">Return home</a></h2>`);
                return true;
            }
            const tags = (await db.select("tag", "item_tags_with_data INNER JOIN items ON item_tags_with_data.gallery_item_id=items.gallery_item_id", {
                distinct: true,
                where: `items.gallery_item_id=${gallery_item_id}`,
                order_by: "tag"
            }));
            const template_params = {item, tags};
            const template = fs.readFileSync(path.join(process.cwd(), "templates/item_edit.html"), "utf-8")
            const body = await html.buildTemplate(template, template_params, req);
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
    }
};
