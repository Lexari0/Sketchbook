const path = require("path");
const fs = require("fs");

module.exports = {
    register_endpoints: endpoints => {
        endpoints[/^\/static\/.+$/] = (req, res) => {
            const url = req.url.split("?").shift();
            const requested_path = path.resolve(path.join(process.cwd(), url));
            const relative_path = path.relative(process.cwd(), url);
            if (relative_path && relative_path.startsWith("..") && !path.isAbsolute(relative_path) && fs.existsSync(requested_path))
            {
                const file = fs.readFileSync(requested_path);
                res.writeHead(200);
                res.end(file);
                return true;
            }
            return false;
        };
        endpoints["/favicon.ico"] = (req, res) => {
            const requested_path = path.resolve(path.join(process.cwd(), "static/favicon.ico"));
            if (fs.existsSync(requested_path))
            {
                const file = fs.readFileSync(requested_path);
                res.writeHead(200);
                res.end(file);
            }
            res.writeHead(404);
            res.end("File not found /favicon.ico");
            return true;
        }
    }
};
