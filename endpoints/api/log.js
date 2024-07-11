const fs = require("fs");
const readline = require("readline");
const path = require("path");
const Stream = require("stream");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const log = require(path.join(process.cwd(), "libs/log.js"));

async function getFileLineOffsets(file_path) {
    try
    {
        var read_stream = fs.createReadStream(file_path);
        var out_stream = new Stream;
        return await new Promise((resolve, reject) => {
            var readline_interface = readline.createInterface(read_stream, out_stream);
            var offsets = [];
            var current_offset = 0;
            readline_interface.on("line", (line) => {
                offsets.push(current_offset);
                current_offset += line.length;
            });
            readline_interface.on("error", reject);
            readline_interface.on("close", () => resolve(offsets));
        });
    }
    catch (err)
    {
        log.error("api", "Failed to get file line count for path: ", file_path)
        return undefined;
    }
}

async function getLogLines(file_path, lines, line_offsets = undefined) {
    try
    {
        const params = await api.getParams(req);
        if (line_offsets == undefined)
        {
            line_offsets = await getFileLineOffsets(file_path);
        }
        const total_lines = line_offsets.length;
        const start_offset = line_offsets[total_lines.length - lines];
        return await new Promise(async (resolve, reject) => {
            console.log("Opening file: ", file_path);
            fs.open(file_path, (err, fd) => {
                if (err != undefined)
                {
                    reject(err);
                    return;
                }
                console.log("fstat...");
                fs.fstat(fd, function(err, stats) {
                    if (err != undefined)
                    {
                        reject(err);
                        return;
                    }
                    const buffer_size = stats.size - start_offset;
                    var buffer = new Buffer(buffer_size);
                    console.log("buffer_size: ", buffer_size);
                    console.log("read...");
                    fs.read(fd, buffer, 0, buffer_size, start_offset, (err, bytes_read, buffer) => {
                        if (err != undefined)
                        {
                            reject(err);
                            return;
                        }
                        console.log("bytes_read: ", bytes_read);
                        resolve(buffer);
                    });
                });
            });
        });
    }
    catch (err)
    {
        log.error("api", "Failed to get log contents of file:", file_path, "; error:", err);
        return undefined;
    }
}

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/log/current"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.log.current))
            {
                return true;
            }
            const params = await api.getParams(req);
            const file_path = log.getActiveFile();
            console.log("Getting line_offsets");
            const line_offsets = await getFileLineOffsets(file_path);
            const total_lines = line_offsets.length;
            console.log("total_lines: ", total_lines);
            const lines = Math.max(0, Math.min(params.lines == undefined ? 20 : params.lines, total_lines));
            console.log("Getting ", lines, " lines...");
            const logs = await getLogLines(file_path, lines, line_offsets);
            if (logs === undefined)
            {
                api.sendResponse(res, 502, {error:"Failed to read log file"});
                return true;
            }
            api.sendResponse(res, 200, {error:"", total_lines, lines, logs});
            return true;
        };
        endpoints["/api/log/files"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.log.files))
            {
                return true;
            }
            const files = fs.readdirSync(log.getDirectory()).map(file => [file, fs.statSync(path.join(log.getDirectory(), file))]).filter(file => file[1].isDirectory()).sort((a, b) => a[1].ctimeMs - b[1].ctimeMs);
            const params = await api.getParams(req);
            const count = Math.max(0, Math.min(params.count == undefined ? 20 : params.count, files.length));
            api.sendResponse(res, 200, {error:"", total_count: files.length, count, files: files.slice(0, count).map(file => file[0])});
            return true;
        };
        endpoints[/^\/api\/log\/file\/[^\/]+\.log$/] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.log.file))
            {
                return true;
            }
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const file_name = split_url[3];
            const file_path = path.join(log.getDirectory(), file_name);
            if (!fs.existsSync(file_path) || !fs.statSync(file_path).isDirectory())
            {
                api.sendResponse(res, 400, {error:"No log file with the provided file name.", file_name});
                return true;
            }
            const params = await api.getParams(req);
            const line_offsets = await getFileLineOffsets(file_path);
            const total_lines = line_offsets.length;
            const lines = Math.max(0, Math.min(params.lines == undefined ? 20 : params.lines, total_lines));
            const logs = await getLogLines(file_path, lines, line_offsets);
            if (logs === undefined)
            {
                api.sendResponse(res, 502, {error:"Failed to read log file"});
                return true;
            }
            api.sendResponse(res, 200, {error:"", file_name, total_lines, lines, logs});
            return true;
        };
    }
};
