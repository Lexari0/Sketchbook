const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const sqlstring = require("sqlstring-sqlite");
const api = require(path.join(process.cwd(), "libs/api.js"));
const config = require(path.join(process.cwd(), "libs/config.js"));
const db = require(path.join(process.cwd(), "libs/db.js"));
const gallery = require(path.join(process.cwd(), "libs/gallery.js"));
const log = require(path.join(process.cwd(), "libs/log.js"));

async function apiGalleryIDLookup(gallery_item_id, res, simple = false) {
    const simple_item = {
        resolutions: {
            thumb: `/item/${gallery_item_id}/thumb`,
            small: `/item/${gallery_item_id}/small`,
            large: `/item/${gallery_item_id}/large`,
            source: config.gallery.distribute_source ? `/item/${gallery_item_id}/source` : undefined
        },
        uri: `/item/${gallery_item_id}`
    };
    if (simple)
    {
        return simple_item;
    }
    const item_query_result = (await db.select(
            ["name", "description", "created AS uploaded_on", "last_update AS last_edited", "source", "missing"],
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
    return {
        ...simple_item,
        ...item_query_result,
        tags: (await db.select("tag", "item_tags INNER JOIN tags ON tags.tag_id=item_tags.tag_id", {where: `gallery_item_id=${gallery_item_id}`})).map(x => x.tag)
    };
}

module.exports = {
    register_endpoints: endpoints => {
        endpoints["/api/gallery"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery._)) {
                return true;
            }
            const item_response = (await db.select(["COUNT(*) AS item_count", "MAX(last_update) AS last_update"], "items", {where:"missing=0"})).shift();
            if (item_response === undefined) {
                api.sendResponse(res, 502, {error: "Item database query result was undefined"});
            }
            const tag_response = (await db.select(["COUNT(*) AS tag_count"], "tags")).shift();
            if (tag_response === undefined) {
                api.sendResponse(res, 502, {error: "Tag database query result was undefined"});
            }
            api.sendResponse(res, 200, {error: "", ...item_response, ...tag_response});
            return true;
        };
        endpoints[/^\/api\/gallery\/item\/[0-9]+$/] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.item._)) {
                return true;
            }
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const gallery_item_id = parseInt(split_url[3]);
            const query = await api.getParams(req);
            const item = await apiGalleryIDLookup(gallery_item_id, res, "simple" in query);
            if (item !== undefined)
            {
                api.sendResponse(res, 200, {error: "", item});
            }
            return true;
        };
        endpoints[/^\/api\/gallery\/item\/[0-9]+\/new_file$/] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.item.new_file)) {
                return true;
            }
            const split_url = req.url.split("?").shift().split("/").filter(String);
            const gallery_item_id = parseInt(split_url[3]);
            try
            {
                await new Promise((resolve, reject) => {
                    var form = new formidable.IncomingForm();
                    form.parse(req, async (err, fields, form) => {
                        if (err)
                        {
                            reject(`Error getting form data: ${err}`);
                            return;
                        }
                        if (form.file.length == 0)
                        {
                            reject("Missing field: 'file'");
                            return;
                        }
                        const uploaded_file = form.file[0];
                        const temp_file_path = uploaded_file.filepath;
                        const file_hash = await gallery.hashFile(temp_file_path);
                        const final_file_path = path.join(gallery.content_path, file_hash + path.extname(uploaded_file.originalFilename));
                        log.message("api", `Updating file for item ${gallery_item_id}`);
                        try
                        {
                            const old_file_path = await gallery.getFilePathOfItem(gallery_item_id);
                            if (gallery.isItemMissing(gallery_item_id) === false)
                            {
                                log.message("api", `Deleting old file: ${old_file_path}`);
                                fs.unlinkSync(old_file_path);
                            }
                            log.message("api", "Updating DB file path");
                            await db.update("items", {file_path: final_file_path, hash: file_hash}, {
                                where: `gallery_item_id=${sqlstring.escape(gallery_item_id)}`,
                                });
                            log.message("api", `Copying temp file to content folder: ${temp_file_path} -> ${final_file_path}`);
                            fs.copyFileSync(temp_file_path, final_file_path);
                            log.message("api", "Forcing gallery refresh of item data");
                            if (!await gallery.updateItem(final_file_path))
                            {
                                throw "Failed to update item in gallery.";
                            }
                            try
                            {
                                log.message("api", "Deleting temp file");
                                fs.unlinkSync(temp_file_path);
                            }
                            catch
                            {
                                // Failing to delete the temp file is not a big deal
                            }
                            log.message("api", "Forcing refresh of alternates");
                            await gallery.refreshAlternates(gallery_item_id);
                        }
                        catch (err)
                        {
                            reject(`Error while managing files or gallery: ${err}`);
                            return;
                        }
                        resolve();
                    });
                });
            }
            catch (err)
            {
                api.sendResponse(res, 503, {error: `${err}`});
                return true;
            }
            api.sendResponse(res, 200, {error: "", gallery_item_id, new_file_path: await gallery.getFilePathOfItem(gallery_item_id)});
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
                items[item.gallery_item_id].tags = (await db.select("tag", "item_tags_with_data", {where: `gallery_item_id=${item.gallery_item_id}`})).map(x => x.tag);
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
            api.sendResponse(res, 200, {error: "", item_count, page, page_count, items});
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
                search_results[search_result.gallery_item_id] = await apiGalleryIDLookup(search_result.gallery_item_id, undefined, "simple" in query);
            }
            api.sendResponse(res, 200, {error: "", q: query.q, item_count: query_results.item_count, items: search_results});
            return true;
        };
        endpoints["/api/gallery/tags"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.tags)) {
                return true;
            }
            const query = await api.getParams(req);
            const use_like = query.like && query.like.length > 0;
            const like = use_like ? query.like.replace(/\\/g, "\\\\").replace(/_/g, "\\_").replace(/%/g, "\\%") + "%" : undefined;
            const item = parseInt(query.item);
            const count = parseInt(query.count);
            const category = query.category;
            var where = [];
            if (use_like)
            {
                where.push(`tag LIKE ${sqlstring.escape(like)} ESCAPE '\\'`);
            }
            if (category)
            {
                where.push(`category=${sqlstring.escape(category)}`);
            }
            if (!isNaN(item))
            {
                where.push(`tag_id IN (SELECT tag_id FROM item_tags WHERE gallery_item_id=${sqlstring.escape(item)})`);
            }
            if (where.length === 0)
            {
                where = undefined;
            }
            else
            {
                where = where.join(" AND ");
            }
            // TODO: Use query.q to search for items and count tags on those items
            const limit = Math.max(Math.min(isNaN(count) ? 20 : count, 100), 1);
            const tags = await db.select(["tag", "description", "category", "color", "(SELECT COUNT(*) FROM item_tags WHERE item_tags.tag_id=tags_with_categories.tag_id) AS count"],
                "tags_with_categories", {
                    where,
                    order_by: "count DESC, tag",
                    limit: limit
                }
            );
            api.sendResponse(res, 200, {error: "", like: use_like ? query.like : "", count: limit, tags});
            return true;
        };
        endpoints["/api/gallery/tags/categories"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.tags)) {
                return true;
            }
            const query = await api.getParams(req);
            const use_like = query.like && query.like.length > 0;
            const like = use_like ? query.like.replace(/\\/g, "\\\\").replace(/_/g, "\\_").replace(/%/g, "\\%") + "%" : undefined;
            const count = parseInt(query.count);
            // TODO: Use query.q to search for items and count tags on those items
            const limit = Math.max(isNaN(count) ? 20 : count, 1);
            // TODO: Add meta "None" category via query
            const categories = await db.select(["tag_categories.tag_category_id AS id", "tag_categories.category", "tag_categories.description", "tag_categories.color", "(SELECT COUNT(*) FROM tags WHERE tags.tag_category_id=tag_categories.tag_category_id) AS count"], "tag_categories", {
                where: use_like ? "tag_categories.category LIKE " + sqlstring.escape(like) + " ESCAPE \\" : undefined,
                order_by: "count DESC, tag_categories.category",
                limit: limit
            });
            api.sendResponse(res, 200, {error: "", like: use_like ? query.like : "", count: limit, categories});
            return true;
        };
        endpoints["/api/gallery/refresh"] = async (req, res) => {
            if (!await api.requestIsValid(req, res, config.api.enabled_endpoints.gallery.refresh)) {
                return true;
            }
            const query = await api.getParams(req);
            if (query.subdir && query.subdir.startsWith(".."))
            {
                api.sendResponse(res, 502, {error: "Provided path must be a subdirectory."});
                return;
            }
            const original_base_path = query.subdir ? path.join(process.cwd(), "content", query.subdir) : path.join(process.cwd(), "content");
            var base_path = original_base_path;
            var refreshed_items = 0;
            if (!fs.existsSync(base_path))
            {
                api.sendResponse(res, 502, {error: "Provided path does not exist."});
                return;
            }
            var dir_stat = fs.lstatSync(base_path);
            while (dir_stat.isSymbolicLink())
            {
                const link_path = fs.realpathSync(base_path);
                if (link_path === base_path)
                {
                    api.sendResponse(res, 502, {error: "Provided path links to itself."});
                    return;
                }
                base_path = link_path;
                if (!fs.existsSync(base_path))
                {
                    api.sendResponse(res, 502, {error: "Provided path linked to something that does not exist."});
                    return;
                }
                dir_stat = fs.lstatSync(base_path);
            }
            base_path = original_base_path;
            if (dir_stat.isDirectory())
            {
                for (const item of fs.readdirSync(base_path))
                {
                    const item_path = path.join(base_path, item);
                    if (!fs.lstatSync(item_path).isFile())
                    {
                        continue;
                    }
                    gallery.updateItem(item_path);
                    refreshed_items += 1;
                }
            }
            else if (dir_stat.isFile())
            {
                gallery.updateItem(item_path);
                refreshed_items += 1;
            }
            else
            {
                api.sendResponse(res, 502, {error: "Provided path is not a directory or file."});
                return;
            }
            api.sendResponse(res, 200, {error: "", subdir: query.subdir ? query.subdir : "", refreshed_items});
            return true;
        };
    }
};
