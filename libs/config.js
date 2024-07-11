const fs = require("fs");
const path = require("path");
const uuid = require("uuid").v4;
const yaml = require("yaml");
const log = require(path.join(process.cwd(), "libs/log.js"));

const PATH = "./config.yaml";
const DEFAULT = {
    webserver: {
        ip: "0.0.0.0",
        port: 80
    },
    server: {
        software: {
            name: "Sketchbook",
            version: "1.0",
            source: "https://github.com/Lexari0/Sketchbook",
            author: "Lexario",
            license: "MIT"
        },
        owner: {
            name: "Artist",
            email: ""
        }
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
                text: "Sourcecode",
                link: "https://github.com/Lexari0/Sketchbook"
            }
        ]
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
    },
    logging: {
        path: "last.log",
        enabled_categories: {
            db: true,
            gallery: true,
            other: true,
            program: true,
            sql: true,
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

if (fs.existsSync(PATH))
{
    var config_file = yaml.parse(fs.readFileSync(PATH, "utf-8"));
    delete config_file.server.software;
    module.exports = merge(DEFAULT, config_file);
}
else
{
    module.exports = DEFAULT;
    log.message("program", "Creating default config...");
}
fs.writeFileSync(PATH, yaml.stringify(module.exports), "utf-8");

if (!fs.existsSync(module.exports.gallery.content_path))
{
    fs.mkdirSync(module.exports.gallery.content_path);
}
