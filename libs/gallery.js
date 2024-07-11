const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const sqlstring = require("sqlstring-sqlite");
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const log = require(path.join(process.cwd(), "libs/log.js"));

const image_directories = {
    "thumbs": path.join(process.cwd(), "gallery/thumbs"),
    "small": path.join(process.cwd(), "gallery/small")
};
for (const dir of Object.values(image_directories))
{
    if (!fs.existsSync(dir))
    {
        log.message("gallery", "Making missing directory", dir);
        fs.mkdirSync(dir, {recursive: true});
        continue;
    }
}

module.exports = {
    prepareTables: async function() {
        if (db.db == null) {
            db.open();
        }
        await db.createTable("items", ["gallery_item_id INTEGER PRIMARY KEY AUTOINCREMENT", "file_path TEXT", "hash CHARACTER(64)", "created DATETIME DEFAULT CURRENT_TIMESTAMP", "last_update DATETIME DEFAULT CURRENT_TIMESTAMP", "missing INT DEFAULT 0"]);
        await db.createTable("item_tags", ["tag_entry INTEGER PRIMARY KEY AUTOINCREMENT", "gallery_item_id INTEGER", "tag TEXT"]);
    },
    refreshAlternates: async function(source_path) {
        const thumbs_size = 256;
        const small_size = 1024;
        sharp(source_path)
            .resize(thumbs_size, thumbs_size, "contain")
            .webp({quality:80})
            .toFile(path.join(image_directories["thumbs"], path.basename(source_path, path.extname(source_path)) + ".webp"));
        sharp(source_path)
            .resize(small_size, small_size, "inside")
            .webp({quality:80})
            .toFile(path.join(image_directories["small"], path.basename(source_path, path.extname(source_path)) + ".webp"));
    },
    buildSQLFromSearch: function (query) {
        var order_by = undefined;
        const updateOrder = (new_order) => {
            if (order_by == undefined)
            {
                order_by = new_order;
            }
            else
            {
                order_by += ", " + new_order;
            }
        };
        var page = 1;
        var optional_tags = [];
        var excluded_tags = [];
        var required_tags = [];
        for (const tag of query.split(/[ \+]+/).filter(String))
        {
            switch (tag)
            {
                case "order:created":
                    updateOrder("created DESC");
                    continue;
                case "order:created_asc":
                    updateOrder("created ASC");
                    continue;
                case "order:updated":
                    updateOrder("last_update DESC");
                    continue;
                case "order:updated_asc":
                    updateOrder("last_update ASC");
                    continue;
                case "order:random":
                    updateOrder("RANDOM()");
                    continue;
            }
            if (tag.match(/^page:[0-9]+$/))
            {
                page = Math.min(parseInt(tag.substr(5)), 1);
                continue;
            }
            if (tag.startsWith("-"))
            {
                excluded_tags.push(sqlstring.escape(tag.substr(1)));
            }
            else if (tag.startsWith("~"))
            {
                optional_tags.push(sqlstring.escape(tag.substr(1)));
            }
            else
            {
                required_tags.push(sqlstring.escape(tag));
            }
        }
        if (order_by == undefined)
        {
            order_by = "created DESC";
        }
        const limit = 50;
        // Minor optimization; skips optional query step
        if (optional_tags.length == 1)
        {
            required_tags.push(optional_tags.shift());
        }
        const optional_query = optional_tags.length == 0 ? "item_tags" : "SELECT * FROM item_tags WHERE tag IN (" + optional_tags.join(", ") + ")";
        const excluded_query = excluded_tags.length == 0 ? optional_query : "SELECT * FROM (" + optional_query + ") WHERE gallery_item_id NOT IN (SELECT gallery_item_id FROM item_tags WHERE tag in (" + excluded_tags.join(", ") + "))"
        const required_query = required_tags.length == 0 ? excluded_query : "SELECT * FROM (SELECT * FROM (" + excluded_query + ") AS found INNER JOIN item_tags ON item_tags.gallery_item_id = found.gallery_item_id WHERE item_tags.tag IN (" + required_tags.join(", ") + ") GROUP BY item_tags.gallery_item_id HAVING COUNT(DISTINCT item_tags.tag) = " + required_tags.length + ") AS found INNER JOIN items ON items.gallery_item_id = found.gallery_item_id"
        return "SELECT DISTINCT items.* FROM (" + required_query + ") AS found INNER JOIN items ON items.gallery_item_id=found.gallery_item_id WHERE items.missing=0 ORDER BY " + order_by + " LIMIT " + limit + " OFFSET " + ((page - 1) * limit);
    },
    search: async function (query) {
        return await db.all(this.buildSQLFromSearch(query));
    },
    hashFile: async function (file_path) {
        file_path = path.resolve(path.join(process.cwd(), file_path));
        var hash = crypto.createHash("sha256");
        var stream = fs.createReadStream(file_path);
        return new Promise(resolve => {
            stream.on("end", () => resolve(hash.end().digest('hex')));
            stream.pipe(hash);
        });
    },
    updateItem: async function(file_path) {
        if (!fs.existsSync(file_path))
        {
            return false;
        }
        const file_hash = await this.hashFile(file_path);
        const current_entry = (await db.select(["gallery_item_id", "file_path", "hash", "missing"], "items", {
            distinct: true,
            where: "file_path=" + sqlstring.escape(file_path) + "OR hash=" + sqlstring.escape(file_hash)
            })).shift();
        if (current_entry === undefined) {
            log.message("gallery", "Inserted new item:", file_path);
            await db.insert("items", {file_path: sqlstring.escape(file_path), hash: sqlstring.escape(file_hash)});
        }
        else if (current_entry.hash != file_hash) {
            log.message("gallery", "Updating item:", file_path);
            this.refreshAlternates();
            await db.update("items", {hash: sqlstring.escape(file_hash), last_update: "datetime(\"now\", \"localtime\")", missing: 0}, {
                where: "file_path=" + sqlstring.escape(file_path)
            });
        }
        else if (current_entry.missing || file_path != current_entry.file_path)
        {
            if (current_entry.missing) {
                log.message("gallery", "Found missing item:", gallery_item_id);
            }
            log.message("gallery", "Item", current_entry.gallery_item_id,  "moved from", current_entry.file_path, "to", file_path);
            await db.update("items", {file_path: sqlstring.escape(file_hash), last_update: "datetime(\"now\", \"localtime\")", missing: 0}, {
                where: "hash=" + sqlstring.escape(file_hash)
            });
        }
    },
    refreshContent: async function() {
        log.message("gallery", "Refreshing content directory...");
        for (var file of fs.readdirSync(config.gallery.content_path, {recursive: true}))
        {
            file = path.join(config.gallery.content_path, file);
            if (fs.lstatSync(path.join(process.cwd(), file)).isFile()) {
                await this.updateItem(file);
            }
        }
        var new_missing_entries = [];
        for (const entry of await db.select("gallery_entry_id", "items", {
                distinct: true,
                where: "missing=0"
            }))
        {
            if (!fs.existsSync()) {
                log.message("gallery", "Item went missing:", entry.gallery_item_id);
                new_missing_entries.push(sqlstring.escape(entry.gallery_item_id));
            }
        }
        await db.update("items", {missing:1}, {where: "gallery_item_id IN (" + new_missing_entries.join(", ") + ")"});
        log.message("gallery", "Refreshed content!");
    }
};
