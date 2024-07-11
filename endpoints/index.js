module.exports = {
    register_endpoints: endpoints => {
        endpoints["/"] = (req, res) => {
            res.writeHead(200, {"Content-Type": "text/plain"});
            res.end("Dynamically loaded endpoint");
        }
    }
};
