const chokidar = require("chokidar");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const sqlstring = require("sqlstring-sqlite");
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const log = require(path.join(process.cwd(), "libs/log.js"));

const content_path = path.join(process.cwd(), config.gallery.content_path);

module.exports = {
    image_directories: {
        "thumb": path.join(process.cwd(), "gallery/thumb"),
        "small": path.join(process.cwd(), "gallery/small"),
        "large": path.join(process.cwd(), "gallery/large")
    },
    prepareTables: async function() {
        if (db.db == null) {
            db.open();
        }
        await db.createTable("items", ["gallery_item_id INTEGER PRIMARY KEY AUTOINCREMENT", "file_path TEXT", "hash CHARACTER(64)", "created DATETIME DEFAULT CURRENT_TIMESTAMP", "last_update DATETIME DEFAULT CURRENT_TIMESTAMP", "missing INT DEFAULT 0"]);
        await db.createTable("item_tags", ["tag_entry INTEGER PRIMARY KEY AUTOINCREMENT", "gallery_item_id INTEGER REFERENCES items", "tag TEXT"]);
    },
    refreshAlternates: async function(gallery_item_id) {
        const entry = (await db.select(["file_path", "missing"], "items", {where: `gallery_item_id=${gallery_item_id}`})).shift();
        if (entry === undefined)
        {
            log.error("gallery", `No database entry for item ${gallery_item_id}, so there are no alternates to refresh.`);
            return;
        }
        else if (entry.missing)
        {
            log.error("gallery", "Item", gallery_item_id, "is currently missing, so there are no alternates to refresh.");
            return;
        }
        log.message("gallery", "Refreshing alternates for item", gallery_item_id);
        const file_path = entry.file_path;
        if (!fs.existsSync(file_path))
        {
            log.error("gallery", "Item", gallery_item_id, "has a file_path which doesn't exist.");
            return;
        }
        async function createAlternate(destination_file_path, size, fit, quality) {
            var image = await sharp(file_path);
            if (size)
            {
                const metadata = await image.metadata();
                size = Math.min(size, metadata.width, metadata.height);
                await image.resize(size, size, {fit});
            }
            await image.webp({quality})
            await image.toFile(destination_file_path);
        }
        await Promise.all([
            createAlternate(path.join(this.image_directories["thumb"], `${gallery_item_id}.webp`), 256, "cover", 60),
            createAlternate(path.join(this.image_directories["small"], `${gallery_item_id}.webp`), 1024, "inside", 80),
            createAlternate(path.join(this.image_directories["large"], `${gallery_item_id}.webp`), undefined, undefined, 100)
        ]);
        log.message("gallery", "Rebuilt alternates for item", gallery_item_id);
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
        const selected_columns = "items.gallery_item_id, items.hash, items.created, items.last_update"

        if (required_tags.length === 0 && excluded_tags.length === 0 && optional_tags.length === 0)
        {
            return "SELECT DISTINCT * FROM items WHERE missing=0 ORDER BY " + order_by + " LIMIT " + limit + " OFFSET " + ((page - 1) * limit);
        }
        const optional_query = optional_tags.length === 0 ? "item_tags" : "SELECT * FROM item_tags WHERE tag IN (" + optional_tags.join(", ") + ")";
        const excluded_query = excluded_tags.length === 0 ? optional_query : "SELECT * FROM (" + optional_query + ") WHERE gallery_item_id NOT IN (SELECT gallery_item_id FROM item_tags WHERE tag IN (" + excluded_tags.join(", ") + "))"
        const required_query = required_tags.length === 0 ? excluded_query : "SELECT * FROM (" + excluded_query + ") AS found INNER JOIN item_tags ON item_tags.gallery_item_id = found.gallery_item_id WHERE item_tags.tag IN (" + required_tags.join(", ") + ") GROUP BY item_tags.gallery_item_id HAVING COUNT(DISTINCT item_tags.tag) = " + required_tags.length
        return "SELECT DISTINCT " + selected_columns + " FROM (" + required_query + ") AS found INNER JOIN items ON items.gallery_item_id=found.gallery_item_id WHERE items.missing=0 ORDER BY " + order_by + " LIMIT " + limit + " OFFSET " + ((page - 1) * limit);
    },
    search: async function (query) {
        return await db.all(this.buildSQLFromSearch(query));
    },
    hashFile: async function (file_path) {
        if (!path.isAbsolute(file_path))
        {
            file_path = path.resolve(path.join(content_path, file_path));
        }
        var hash = crypto.createHash("sha256");
        var stream = fs.createReadStream(file_path);
        return new Promise(resolve => {
            stream.on("end", () => resolve(hash.end().digest('hex')));
            stream.pipe(hash);
        });
    },
    updateItem: async function(file_path) {
        if (!path.isAbsolute(file_path))
        {
            file_path = path.resolve(path.join(content_path, file_path));
        }
        if (!fs.existsSync(file_path))
        {
            log.message("gallery", "Item went missing: " + file_path);
            await db.update("items", {missing:1}, {where: "file_path=" + sqlstring.escape(file_path)});
            return;
        }
        const file_hash = await this.hashFile(file_path);
        const current_entry = (await db.select(["gallery_item_id", "file_path", "hash", "missing"], "items", {
            distinct: true,
            where: "file_path=" + sqlstring.escape(file_path) + "OR hash=" + sqlstring.escape(file_hash)
            })).shift();
        if (current_entry === undefined)
        {
            log.message("gallery", "Inserted new item:", file_path);
            await db.insert("items", {file_path: sqlstring.escape(file_path), hash: sqlstring.escape(file_hash)});
            const new_entry = (await db.select("gallery_item_id", "items", {
                distinct: true,
                where: "hash=" + sqlstring.escape(file_hash)
                })).shift();
            if (new_entry === undefined)
            {
                log.error("gallery", "No entry with the hash of", file_path, "exists after it should have been inserted, cannot give it the default tag.");
                return;
            }
            await db.all(`INSERT OR REPLACE INTO item_tags (gallery_item_id, tag) SELECT ${new_entry.gallery_item_id}, 'untagged' WHERE NOT EXISTS (SELECT * FROM item_tags WHERE gallery_item_id=${new_entry.gallery_item_id})`);
            return;
        }
        await db.all(`DELETE FROM item_tags WHERE gallery_item_id=${current_entry.gallery_item_id} AND tag_entry IN (SELECT a.tag_entry FROM item_tags AS a INNER JOIN item_tags AS b WHERE b.gallery_item_id=a.gallery_item_id AND a.tag="untagged" AND NOT b.tag="untagged");`);
        if (current_entry.hash != file_hash) {
            log.message("gallery", "Updating item:", file_path);
            this.refreshAlternates(current_entry.gallery_item_id);
            await db.update("items", {hash: sqlstring.escape(file_hash), last_update: "datetime(\"now\", \"localtime\")", missing: 0}, {
                where: "file_path=" + sqlstring.escape(file_path)
            });
        }
        else if (current_entry.missing || file_path != current_entry.file_path)
        {
            if (current_entry.missing) {
                log.message("gallery", "Found missing item:", current_entry.gallery_item_id);
            }
            log.message("gallery", "Item", current_entry.gallery_item_id,  "moved from", current_entry.file_path, "to", file_path);
            this.refreshAlternates(current_entry.gallery_item_id);
            await db.update("items", {file_path: sqlstring.escape(file_path), last_update: "datetime(\"now\", \"localtime\")", missing: 0}, {
                where: "hash=" + sqlstring.escape(file_hash)
            });
        }
        const tag_query_result = (await db.select("COUNT(tag) AS count", "item_tags", {
                distinct: true,
                where: `gallery_item_id=${current_entry.gallery_item_id}`
            })).shift();
        if (tag_query_result === undefined || tag_query_result.count == 0)
        {
            log.message("gallery", "Item", current_entry.gallery_item_id, "is untagged, giving it the default tag.");
            await db.all(`INSERT OR REPLACE INTO item_tags (gallery_item_id, tag) SELECT ${current_entry.gallery_item_id}, 'untagged' WHERE NOT EXISTS (SELECT * FROM item_tags WHERE gallery_item_id=6)`);
        }
    },
    refreshContent: async function() {
        log.message("gallery", "Refreshing content directory...");
        log.message("gallery", "  Checking existing files...");
        for (var file of fs.readdirSync(content_path, {recursive: true}))
        {
            log.message("gallery", "  File:", file);
            file = path.join(content_path, file);
            log.message("gallery", "    ->:", file);
            if (fs.lstatSync(file).isFile()) {
                await this.updateItem(file);
            }
        }
        log.message("gallery", "  Checking for missing files...");
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

for (const dir of Object.values(module.exports.image_directories))
{
    if (!fs.existsSync(dir))
    {
        log.message("gallery", "Making missing directory", dir);
        fs.mkdirSync(dir, {recursive: true});
        continue;
    }
}

const content_watcher = chokidar.watch(content_path, {persistent: false});
content_watcher.on("add", file_path => {
    if (path.basename(file_path).startsWith("."))
    {
        return;
    }
    file_path = path.relative(content_path, file_path);
    log.message("gallery", "Content added:", file_path);
    module.exports.updateItem(file_path);
});
content_watcher.on("change", file_path => {
    if (path.basename(file_path).startsWith("."))
    {
        return;
    }
    log.message("gallery", "Content was changed:", file_path);
    module.exports.updateItem(file_path);
});
content_watcher.on("unlink", file_path => {
    if (path.basename(file_path).startsWith("."))
    {
        return;
    }
    log.message("gallery", "Content was removed:", file_path);
    module.exports.updateItem(file_path);
});
content_watcher.on("error", error => { log.error("gallery", "Content file error:", error); });
