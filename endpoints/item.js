const fs = require("fs");
const mime = require("mime-types");
const path = require("path");
const sqlstring = require("sqlstring-sqlite");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));
const html = require(path.join(process.cwd(), "libs/html.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints[/^\/item\/[0-9]+$/] = async (req, res) => {
            const url = req.url.split("?").shift();
            const split_url = url.split("/").filter(String);
            const gallery_item_id = parseInt(split_url[1]);
            const template = fs.readFileSync(path.join(process.cwd(), "templates/item.html"), "utf-8")
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
            const tags = (await db.select("item_tags.tag", "item_tags INNER JOIN items ON item_tags.gallery_item_id=items.gallery_item_id", {
                distinct: true,
                where: `item_tags.gallery_item_id=${gallery_item_id}`,
                order_by: "tag"
            }));
            const tags_with_counts = await db.select(["tag", "COUNT(item_tags.tag) AS count"], "item_tags", {
                where: `tag IN (${tags.map(x => sqlstring.escape(x.tag)).join()})`,
                order_by: "tag"
            });
            var params = {config: structuredClone(config), item, query: {q:"", ...(await api.getParams(req))}, tags: tags_with_counts };
            delete params.config.api;
            delete params.config.webserver;
            const body = html().buildTemplate(template, params).finalize();
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(body);
            return true;
        };
        endpoints[/^\/item\/[0-9]+\/(thumb|small|large|source)$/] = async (req, res) => {
            const url = req.url.split("?").shift();
            const split_url = url.split("/").filter(String);
            const gallery_item_id = parseInt(split_url[1]);
            var size = split_url[2];
            if (size === "source") {
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
        }
    }
};
