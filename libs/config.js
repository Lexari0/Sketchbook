const fs = require("fs");
const uuid = require("uuid").v4;
const yaml = require("yaml");

const PATH = "./config.yaml";
const DEFAULT = {
    webserver: {
        ip: "0.0.0.0",
        port: 80
    },
    gallery: {
        name: "My Sketchbook Gallery",
        content_path: "content",
        database_path: "gallery.db",
        items_per_page: 50,
        valid_aggregators: []
    },
    api: {
        key: uuid(),
        permitted_keys: [],
        enabled_endpoints: {
            server: "any",
            gallery: {
                _: "any",
                item: "any",
                items: "any",
                search: "any"
            },
            sql: "none",
            echo: "key"
        }
    }
};

if (fs.existsSync(PATH))
{
    module.exports = { ...DEFAULT, ...yaml.parse(fs.readFileSync(PATH, "utf-8")) };
}
else
{
    console.log("Creating default config...");
    module.exports = DEFAULT;
}
fs.writeFileSync(PATH, yaml.stringify(module.exports), "utf-8");

if (!fs.existsSync(module.exports.gallery.content_path))
{
    fs.mkdirSync(module.exports.gallery.content_path);
}
