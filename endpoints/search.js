const path = require("path");
const html = require(path.join(process.cwd(), "libs/html.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/search"] = async (req, res) => {
            var url = req.url.split("?");
            const url_page = url.shift();
            const url_params = url.shift();
            var query = {};
            for (const url_param of url_params.split("&"))
            {
                var split_param = url_param.split("=");
                query[split_param.shift()] = split_param.shift();
            }
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
