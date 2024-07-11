const path = require("path");
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));

db.open();
db.createTable("items", ["gallery_item_id INTEGER PRIMARY KEY AUTOINCREMENT", "file_path TEXT", "created DATETIME", "last_update DATETIME"]);
db.createTable("item_tags", ["tag_entry INTEGER PRIMARY KEY AUTOINCREMENT", "gallery_item_id INTEGER", "tag TEXT"]);

module.exports = {
    search: function (query) {
        var where = query;
        return db.select(["gallery_item_id", ""], "item_tags", {
            distinct: true,
            all: false,
            where: where,
            group_by: undefined,
            having: undefined,
            order_by: undefined
            });
    }
};
