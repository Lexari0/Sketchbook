const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const uuid = require("uuid").v4;
const yaml = require("yaml");

const PATH = path.join(process.cwd(), "config.yaml");
const DEFAULT = {
    webserver: {
        ip: "0.0.0.0",
        port: 8090
    },
    server: {
        software: {
            name: "Sketchbook",
            version: "0.1",
            source: "https://github.com/Lexari0/Sketchbook",
            author: "Lexario",
            license: "MIT"
        },
        owner: {
            name: "Artist",
            email: ""
        },
        domain: ""
    },
    gallery: {
        name: "My Sketchbook Gallery",
        content_path: "content",
        database_path: "gallery.db",
        items_per_page: 50,
        distribute_source: false,
        recommended_tags: [],
        top_links: [
            {
                text: "Home",
                link: "/"
            },
            {
                text: "Tags",
                link: "/tags"
            },
            {
                text: "Admin",
                link: "/admin"
            },
            {
                text: "Sourcecode",
                link: "https://github.com/Lexari0/Sketchbook"
            }
        ],
        admin: {
            password: ""
        }
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
                tags: "any",
                search: "any"
            },
            sql: "admin",
            echo: "key"
        }
    },
    logging: {
        path: "last.log",
        enabled_categories: {
            api: false,
            config: true,
            db: true,
            gallery: true,
            html: false,
            other: true,
            program: true,
            sql: false,
            webserver: true,
        }
    }
};

function isObject(x) {
    return (x && typeof x === "object" && !Array.isArray(x));
}

function merge(target, ...sources) {
    if (!sources.length)
    {
        return target;
    }
    const source = sources.shift();

    if (isObject(target) && isObject(source))
    {
        for (const key in source)
        {
            if (isObject(source[key]))
            {
                if (!target[key])
                {
                    Object.assign(target, { [key]: {} });
                }
                merge(target[key], source[key]);
            }
            else
            {
                Object.assign(target, { [key]: source[key] })
            }
        }
    }

    return merge(target, ...sources);
}

function clone() {
    var config = {};
    for (const k of Object.keys(module.exports))
    {
        if (typeof this[k] !== "function")
        {
            config[k] = structuredClone(module.exports[k]);
        }
    }
    return config;
}

function save() {
    fs.writeFileSync(PATH, yaml.stringify(module.exports.clone()), "utf-8");
}

function reload() {
    if (fs.existsSync(PATH))
    {
        var config_file = yaml.parse(fs.readFileSync(PATH, "utf-8"));
        config_file.server.software = {...DEFAULT.server.software};
        config_file = merge(DEFAULT, config_file);
        config_file.save = save;
        config_file.clone = clone;
        module.exports = config_file;
    }
    else
    {
        module.exports = {...DEFAULT, save, clone};
        console.log("program", "Creating default config...");
    }
    save();
    if (!fs.existsSync(module.exports.gallery.content_path))
    {
        fs.mkdirSync(module.exports.gallery.content_path);
    }
}
reload();

const config_watcher = chokidar.watch(PATH, {persistent: false});
function configChangeHandler() {
    require(path.join(process.cwd(), "libs/log.js")).message("config", "Config file changed. Reloading...");
    reload();
}
config_watcher.on("add", configChangeHandler);
config_watcher.on("change", configChangeHandler);
config_watcher.on("error", error => require(path.join(process.cwd(), "libs/log.js")).error("config", "Config file error:", error));
