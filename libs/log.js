const fs = require("fs");
const path = require("path");
const config = require(path.join(process.cwd(), "libs/config.js"));

const logging_start_datetime = new Date();
const logs_directory = path.join(process.cwd(), "logs");
const recent_file = config.logging.path != undefined && config.logging.path.length > 0 ? path.join(process.cwd(), config.logging.path) : undefined;
const active_file = path.join(logs_directory, (() => {
    const datetime = logging_start_datetime.toISOString().split("T");
    const date = datetime[0];
    const time = datetime[1].substring(0, 8);
    return `${date}.${time.replace(/:/g, "-")}.log`;
})());
const file_paths = recent_file == undefined ? [active_file] : [recent_file, active_file];
if (!fs.existsSync(logs_directory))
{
    fs.mkdirSync(logs_directory);
}

function printFileWriteError(error) {
    if (error)
    {
        console.error("Logging error:", error);
    }
}

for (const file of file_paths)
{
    fs.writeFile(file, "Sketchbook logging started at " + logging_start_datetime.toISOString() + "\n\n", printFileWriteError);
}

function categoryEnabled(category) {
    if (category in config.logging.enabled_categories)
    {
        return config.logging.enabled_categories[category];
    }
    return config.logging.enabled_categories.other;
}

module.exports = {
    getActiveFile: function() {
        return active_file;
    },
    message: function (category, ...message) {
        if (!categoryEnabled(category))
        {
            return;
        }
        console.log(`[${category}]`, ...message);
        for (const file of file_paths)
        {
            fs.appendFile(file, `[${category}] ${message.map(x => `${x}`).join(" ")}\n`, printFileWriteError);
        }
    },
    warning: function (category, ...message) {
        console.error(`<${category}>`, ...message);
        for (const file of file_paths)
        {
            fs.appendFile(file, `<${category}> ${message.map(x => `${x}`).join(" ")}\n`, printFileWriteError);
        }
    },
    error: function (category, ...message) {
        console.error(`{${category}}`, ...message);
        for (const file of file_paths)
        {
            fs.appendFile(file, `{${category}} ${message.map(x => `${x}`).join(" ")}\n`, printFileWriteError);
        }
    }
};
