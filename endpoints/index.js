const path = require("path");
const html = require(path.join(process.cwd(), "libs/html.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/"] = async (req, res) => {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.write(html().DOCTYPE().html(
                    html().head(
                        html().link({ href: "/static/main.css" })
                    )
                    .body(
                        html().h1(config.gallery.name, {id: "title"})
                        .div(html().form(
                            html().input("", { name: "q", id: "search-bar" })
                                .br()
                                .input("", { type: "submit", value: "Search", id: "search-button" }),
                            { action: "/search", method: "get", "accept-charset":"utf-8" }
                        ), { id: "front-query" })
                    )
                ).finalize());
            res.end();
            return true;
        }
    }
};
