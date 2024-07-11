const path = require("path");
const html = require(path.join(process.cwd(), "libs/html.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/search"] = (req, res) => {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.write(html().DOCTYPE().html(
                    html().head(
                        html().link({ href: "/static/main.css" })
                    )
                    .body(
                        html().h1(config.gallery.name, {id: "small-title"})
                        .div(html().h2("NYI " + html().a("Return to Home", { href: "/" }).finalize()))
                    )
                ).finalize());
            res.end();
            return true;
        }
    }
};
