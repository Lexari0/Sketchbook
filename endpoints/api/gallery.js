const path = require("path");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));

async function apiGalleryIDLookup(gallery_item_id, res) {
    const item_query_result = (await db.select(
            ["name", "created AS uploaded_on", "last_update AS last_edited", "source", "missing"],
            "items",
            {where: `gallery_item_id=${gallery_item_id}`}
        )).shift();
    if (item_query_result === undefined)
    {
        if (res)
        {
            api.sendResponse(res, 404, {error: `No item exists with the id ${gallery_item_id}`});
        }
        return undefined;
    }
    var item = {...item_query_result,
        tags: (await db.select("tag", "item_tags", {where: `gallery_item_id=${gallery_item_id}`})).map(x => x.tag),
        resolutions: {
            thumb: `/item/${gallery_item_id}/thumb`,
            small: `/item/${gallery_item_id}/small`,
            large: `/item/${gallery_item_id}/large`
        },
        uri: `/item/${gallery_item_id}`
    };
    if (config.gallery.distribute_source)
    {
        item.resolutions.source = `/item/${gallery_item_id}/source`
    }
    return item;
}

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/gallery"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery._)) {
                return true;
            }
            const response = (await db.select(["COUNT(*) AS item_count", "MAX(last_update) AS last_update"], "items", {where:"missing=0"})).shift();
            if (response === undefined) {
                api.sendResponse(res, 502, {error: "Database query result was undefined"});
            }
            api.sendResponse(res, 200, {error: "", ...response});
            return true;
        };
        endpoints[/\/api\/gallery\/item\/[0-9]+/] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.item)) {
                return true;
            }
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const gallery_item_id = parseInt(split_url[3]);
            const item = await apiGalleryIDLookup(gallery_item_id, res);
            if (item !== undefined)
            {
                api.sendResponse(res, 200, {error: "", [gallery_item_id]: item});
            }
            return true;
        };
        endpoints["/api/gallery/items"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.items)) {
                return true;
            }
            const query = await api.getParams(req);
            const page = "page" in query ? Math.max(parseInt(query.page), 1) : 1;
            const item_count = (await db.select(["COUNT(*) AS item_count"], "items")).shift().item_count;
            const page_count = Math.ceil(item_count / 50);
            const items_query_result = (await db.select(
                    ["gallery_item_id", "name", "created AS uploaded_on", "last_update AS last_edited", "source", "missing"],
                    "items",
                    {
                        where: "since" in query ? `last_update>${sqlstring.escape(query.since)}` : undefined,
                        order_by: "last_update",
                        limit: 50,
                        offset: (page - 1) * 50
                    }
                ));
            var items = {};
            for (const item of items_query_result)
            {
                items[item.gallery_item_id] = item;
                items[item.gallery_item_id].tags = (await db.select("tag", "item_tags", {where: `gallery_item_id=${item.gallery_item_id}`})).map(x => x.tag);
                items[item.gallery_item_id].resolutions = {
                    thumb: `/item/${item.gallery_item_id}/thumb`,
                    small: `/item/${item.gallery_item_id}/small`,
                    large: `/item/${item.gallery_item_id}/large`
                };
                if (config.gallery.distribute_source)
                {
                    items[item.gallery_item_id].resolutions.source = `/item/${item.gallery_item_id}/source`
                }
                items[item.gallery_item_id].uri = `/item/${item.gallery_item_id}`;
                delete items[item.gallery_item_id].gallery_item_id;
            }
            api.sendResponse(res, 200, {error: "", page, page_count, items});
            return true;
        };
        endpoints["/api/gallery/search"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.search)) {
                return true;
            }
            const query = await api.getParams(req);
            if (!("q" in query)) {
                api.sendResponse(res, 400, {error: "Missing query parameter 'q'"});
                return true;
            }
            const query_results = await gallery.search(decodeURIComponent(query.q));
            var search_results = {};
            for (const search_result of query_results.items)
            {
                search_results[search_result.gallery_item_id] = await apiGalleryIDLookup(search_result.gallery_item_id);
            }
            api.sendResponse(res, 200, {error: "", q: query.q, item_count: query_results.item_count, items: search_results});
            return true;
        };
    }
};
