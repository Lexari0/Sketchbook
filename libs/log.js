const fs = require("fs");
const path = require("path");
const config = require(path.join(process.cwd(), "libs/config.js"));

const logging_start_datetime = new Date();
const file_paths = [
    path.join(process.cwd(), config.logging.path),
    path.join(process.cwd(), (() => {
        const datetime = logging_start_datetime.toISOString().split("T");
        const date = datetime[0];
        const time = datetime[1].substring(0, 8);
        return `${date}.${time.replace(/:/g, "-")}.log`;
    })())
];

function printFileWriteError(error) {
    if (error)
    {
        console.error("Logging error:", error);
    }
}

for (const file of file_paths) {
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
    message: function (category, ...message) {
        if (!categoryEnabled(category))
        {
            return;
        }
        console.log(`[${category}]`, ...message);
        for (const file of file_paths)
        {
            fs.appendFile(file, `[${category}] ${message.join(" ")}\n`, printFileWriteError);
        }
    },
    error: function (category, ...message) {
        console.error(`{${category}}`, ...message);
        for (const file of file_paths)
        {
            fs.appendFile(file, `{${category}} ${message.join(" ")}\n`, printFileWriteError);
        }
    }
};
