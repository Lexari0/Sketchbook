const http = require("http");
const config = require("./config");

const requestListener = function (req, res) {
    res.writeHead(200);
    res.end("My first server!");
};

module.exports = {
    start: () => {
        const server = http.createServer(requestListener);
        server.on("error", e => {
            console.error("Server error: ", e.code);
            if (e.code == "EACCES")
            {
                console.error("Failed to start webserver... Perhaps the port is already in use?");
            }
        });
        server.listen(config.webserver.port, config.webserver.ip, () => {
                console.log(`Server is running on http://${config.webserver.ip}:${config.webserver.port}`);
            });
    }
};
