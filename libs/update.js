const fs = require("fs");
const https = require("https");
const stream_zip = require("node-stream-zip");

const releases_api_endpoint = "https://api.github.com/repos/Lexari0/Sketchbook/releases"

module.exports = {
    getLatestVersion: async function () {
        return new Promise(resolve => {
            https.get(releases_api_endpoint, res => {
                var data = "";
                res.on("data", chunk => data += chunk);
                data.on("end", () => {
                    const json = JSON.parse(data);
                    if (!(0 in json))
                    {
                        resolve(undefined);
                    }
                    resolve(json[0].tag_name);
                });
            });
        });
    },
    getUpdateZip: async function () {
        return new Promise((resolve, reject) => {
            https.get(releases_api_endpoint, res => {
                var data = "";
                res.on("data", chunk => data += chunk);
                data.on("end", () => {
                    const json = JSON.parse(data);
                    if (!(0 in json) || !json[0].zipball_url)
                    {
                        reject("No zipball_url from Releases API");
                    }
                    var file_stream;
                    try {
                        file_stream = fs.createWriteStream("update.zip");
                    } catch (error) {
                        reject(error);
                    }
                    https.get(json[0].zipball_url, res => {
                        res.on("end", resolve);
                        res.pipe(file_stream);
                    });
                });
            });
        });
    },
    updateToLatest: async function () {
        await getUpdateZip();
        // TODO: extract update.zip and restart node
    }
};
