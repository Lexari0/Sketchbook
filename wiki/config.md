# Sketchbook Config

Sketchbook's settings are stored in `config.yaml`. Editing this file should result in it being reloaded by the server without needing to restart it. The following is a list of fields in the config file and their purpose:

- `webserver`: HTTP server hosting settings
-- `webserver.ip`: IP address of the local interface to bind. If set to `0.0.0.0`, all local interfaces should be bound.
-- `webserver.port`: Port to bind. It's recommended to not expose this directly on port 80, but instead use an intermediate webserver like nginx as a reverse proxy to handle SSL/HTTPS and enable some forms of DDoS protection.
- `server`: Information about this server; mostly used by back-end.
-- `server.software`: Information about the software powering this server. Cannot be set from the config file and will always be replaced by the server software.
-- `server.owner`: Information about the owner of this server.
-- `server.domain`: Domain at which this server should be reachable. For example: `sketchbook.my-website.com`
- `gallery`: Information about the gallery.
-- `gallery.name`: Name of the gallery in the page headers and title bar.
-- `gallery.content_path`: Subdirectory to find gallery content.
-- `gallery.database_path`: File of the SQL database.
-- `gallery.items_per_page`: How many gallery items to provide in search queries. Smaller numbers are likely to result in faster page loads, but requires users look through more pages.
-- `gallery.distribute_source`: If enabled, users can access `/item/<id>/source` pages to view the original source content. This can result in the highest quality content distribution, but can use a lot of bandwidth.
-- `gallery.recommended_tags`: Tags to list in the sidebar. If empty, the most popular tags will be used instead.
-- `gallery.top_links`: Links to provide in the header section. Useful if you have other websites you'd like to link to, recommended/common searches, etc.
- `api`: API configuration.
-- `api.key`: Unique value with which this server uses to identify itself to other servers.
-- `api.permitted_keys`: Keys of other servers which have been granted access to API endpoints with the `"key"` access level.
-- `api.enabled_endpoints`: API endpoint access levels. See the API documentation for a full description of this field and its members.
- `subscribestar`: [SubscribeStar](https://subscribestar.com) API settings
-- `subscribestar.client_id`: Client ID of the SubscribeStar integration.
-- `subscribestar.client_secret`: Client ID of the SubscribeStar integration.
-- `subscribestar.adult`: If true, `https://subscribestar.adult` will be used instead of `https://subscribestar.com`.
-- `subscribestar.auth_token`: OAuth token information. Managed internally and updated using the `/admin` page with `subscribestar.client_id` and `subscribestar.client_secret` set.
- `logging`: Logging configuration.
-- `logging.path`: Active/recent session log file.
-- `logging.enabled_categories`: Determines which modules should log information.
