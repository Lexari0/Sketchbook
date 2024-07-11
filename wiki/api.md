# Sketchbook API

## HTTP Endpoints

All HTTP endpoints will always respond with a JSON object containing an `error` string which will be an empty string if there was no error.

API endpoints can be restricted via the `api.enabled_endpoints` object within `config.yaml`.

- A value of `"any"` will permit an endpoint to be used for any request over `GET` or `POST` HTTP protocols.
- A value of `"key"` will permit an endpoint to be used by a request containing a permitted `key` in the request body and only allows for `POST` requests.
  - To permit a user or aggregate's `key`, add it to the `api.permitted_keys` list in `config.yaml`.
- A value of `"admin"` will only allow an endpoint to be used by a request from the actively logged-in admin user and only allows for `POST` requests.
- A value of `"none"` disallows any requests to the endpoint.

If an endpoint has child pages which are also valid endpoints, the parent endpoint's access level is determined by the `_` member of the config object. For example, if `/api/foo` and `/api/foo/bar` are both valid endpoints, the config section will look something like this:

```yaml
api:
  enabled_endpoints:
    foo:
      _: any,
      bar: admin
```

In this case, `api.enabled_endpoints.foo._` sets the access level of `/api/foo` to `"any"` and `api.enabled_endpoints.foo.bar` sets the access level of `/api/foo/bar` `"admin"`.

In most situations, the default settings for `api.enabled_endpoints` should be sufficient. A setting can be reverted to the default value by simply removing it from the config file and restarting Sketchbook.

### `/api/config`

Provides a copy of the contents of `config.yaml`. Used by the internal `/admin` page to show server information.

Parameters: None

#### Example Response

```json
{
  "error": "",
  "config": {
    "webserver": {
      "ip": "0.0.0.0",
      "port": 8090
    },
    "server": {
      "software": {
        "name": "Sketchbook",
        "version": "0.1",
        "source": "https://github.com/Lexari0/Sketchbook",
        "author": "Lexario",
        "license": "MIT"
      },
      "owner": {
        "name": "Artist",
        "email": ""
      },
      "domain": ""
    },
    "gallery": {
      "name": "My Sketchbook Gallery",
      "content_path": "content",
      "database_path": "gallery.db",
      "items_per_page": 50,
      "distribute_source": false,
      "recommended_tags": [],
      "top_links": [
        {
          "text": "Home",
          "link": "/"
        },
        {
          "text": "Tags",
          "link": "/tags"
        },
        {
          "text": "Admin",
          "link": "/admin"
        },
        {
          "text": "Sourcecode",
          "link": "https://github.com/Lexari0/Sketchbook"
        }
      ]
    },
    "api": {
      "key": "xxxxxxxx-xxx-xxx-xxxx-xxxxxxxxxxxx",
      "permitted_keys": [],
      "enabled_endpoints": {}
    },
    "subscribestar": {
      "client_id": "",
      "client_secret": "",
      "adult": false,
      "auth_token": {}
    },
    "logging": {
      "path": "last.log",
      "enabled_categories": {
        "admin": true,
        "api": false,
        "config": true,
        "db": true,
        "gallery": true,
        "html": false,
        "other": true,
        "program": true,
        "sql": false,
        "webserver": true,
        "subscribestar": true
      }
    }
  }
}
```

### `/api/config/update`

Updates fields of `config.yaml` to the specified values. Used by the `/admin` page to allow updating the server's config remotely. The response includes both `params` as a list of requested fields to be changed and `changed_config` for the values which were actually changed (values which were already identical to the requested result will not be included in `changed_config`).

Parameters: Any field path of `config.yaml`. For example, `gallery.name=Cool Artbook` will set `gallery.name` in `config.yaml` to `Cool Artbook`. If a field path is not valid (eg: `invalid.config.path=foo`), an error is returned and no changes are made. 

#### Example Response

Parameters: `gallery.name=My Gallery`

```json
{
  "error": "",
  "params": {
    "gallery.name": "My Gallery"
  },
  "changed_config": {
    "gallery": {
      "name": "My Gallery"
    }
  }
}
```

### `/api/echo`

Intended for testing access to the API. Responds with any parameters provided.

Parameters: Any

#### Example Response

Parameters:

```
foo=bar
baz=42
```

```json
{
  "error": "",
  "params": {
    "foo": "bar",
    "baz": "42"
  }
}
```

### `/api/gallery`

Provides information about the gallery, such as how many items exist and when it was last updated.

Clients and aggregators can reference this to determine if their cached data is up-to-date.

Parameters: None

#### Example Response

```json
{
  "error": "",
  "item_count": 621,
  "last_update": "2024-06-21 20:17:40",
  "tag_count": 926
}
```

### `/api/gallery/item/<id>`

Provides information on a specific item in the gallery. The response includes an `item` object and a `visibility` object.

`item` contains metadata about the item itself, such as tags, relevant URIs, and if the content is `missing`. Items with `missing` being `1` cannot be served as its files are unavailable, but its metadata is currently retained.

`visibility` contains information relevant to criteria required to view the content. For example, an artist may restrict access to certain content to a subscription or payment platform like [SubscribeStar](https://subscribestar.com/). `visibility.censored` will be `true` if the content is unviewable based on the request's Parameters

Paramters:

- `simple` (optional): If provided, no database or external API (eg: visibility) lookups are performed. Useful for only getting relevant URIs.
- `subscribestar_access_token` (optional): API Bearer Token for SubscribeStar. Used to determine if the requester has access to view content restricted by a SubscribeStar subscription.

#### Example Response

Endpoint: `/api/gallery/item/1`

```json
{
  "error": "",
  "item": {
    "resolutions": {
      "thumb": "/item/1/thumb",
      "small": "/item/1/small",
      "large": "/item/1/large"
    },
    "uri": "/item/1",
    "name": "untitled",
    "description": "",
    "uploaded_on": "2024-07-01 19:37:47",
    "last_edited": "2024-07-04 13:07:55",
    "source": null,
    "missing": 0,
    "tags": [
      "dog",
      "cat",
      "plaid_shirt"
    ]
  },
  "visibility": {
    "censored": false,
    "platforms": []
  }
}
```

### `/api/gallery/item/<id>/new_file`

Form submission destination for replacing the source file of an item in the gallery. Used by the `/item/<id>/edit` pages to allow for updating of content.

Paramters:

- `file`: New file to save for item `<id>` in the gallery.

#### Example Response

Endpoint: `/api/gallery/item/1/new_file`

```json
{
  "error": "",
  "gallery_item_id": 1,
  "new_file_path": "/home/sketchbook/content/f7a66678b15e8af6362d87e16d6b3b4a2ad04090b4cdc8a12be130530eb83f6f.png"
}
```

### `/api/gallery/items`

Provides a list of items in the gallery with some metadata, though not as much as `/api/gallery/item/<id>`.

Parameters:

- `since`: (optional) Date of the earliest expected update. Allows clients and aggregators to only get updates they don't have cached.
- `page`: (optional) Page of items to receive, if multiple pages are necessary. Response will include `page_count` to determine if more pages are available.

#### Example Response

```json
{
  "error": "",
  "item_count": 83,
  "page": 1,
  "page_count": 2,
  "items": {
    "3": {
      "name": "untitled",
      "uploaded_on": "2024-07-04 08:20:54",
      "last_edited": "2024-07-04 08:20:54",
      "source": null,
      "missing": 0,
      "tags": [
        "cat"
      ],
      "resolutions": {
        "thumb": "/item/3/thumb",
        "small": "/item/3/small",
        "large": "/item/3/large"
      },
      "uri": "/item/3"
    },
    "4": {
      "name": "untitled",
      "uploaded_on": "2024-07-04 08:20:54",
      "last_edited": "2024-07-04 08:30:26",
      "source": null,
      "missing": 0,
      "tags": [
        "dog"
      ],
      "resolutions": {
        "thumb": "/item/4/thumb",
        "small": "/item/4/small",
        "large": "/item/4/large"
      },
      "uri": "/item/4"
    }
  }
}
```

### `/api/gallery/search`

Queries the gallery with a given search criteria and responds with posts which match that criteria.

Parameters:

- `q`: Search query as a `+` delimited series of tags. See the Search wiki page for more information.
- `simple` (optional): If provided, no database or external API (eg: visibility) lookups are performed. Useful for only getting relevant URIs.

#### Example Response

Parameters: `q=flannel+page:1`

```json
{
  "error": "",
  "q": "flannel+page:1",
  "item_count": 1,
  "items": {
    "7": {
      "resolutions": {
        "thumb": "/item/7/thumb",
        "small": "/item/7/small",
        "large": "/item/7/large"
      },
      "uri": "/item/7",
      "name": "untitled",
      "description": "",
      "uploaded_on": "2024-07-04 08:20:54",
      "last_edited": "2024-07-04 08:20:54",
      "source": null,
      "missing": 0,
      "tags": [
        "deer",
        "flannel"
      ]
    },
  }
}
```

### `/api/gallery/tags`

Retrieves tags in the gallery database. Used by the search bar to generate auto-complete suggestions.

Parameters:

- `like`: (optional): Partial tag used for requesting auto-complete suggestions.
- `item` (optional): Item to search the the tags of. If provided, only tags on this item will be returned.
- `count` (optional): Number of tags to return.
- `category` (optional): Tag category to limit the results to.

#### Example Response

Parameters: `like=night`

```json
{
  "error": "",
  "like": "night",
  "count": 20,
  "tags": [
    {
      "tag": "night_in_the_woods",
      "description": null,
      "category": "copyright",
      "color": "#a84632",
      "count": 4
    }
  ]
}
```

### `/api/gallery/tags/categories`

Retrieves tags in the gallery database. Used by the search bar to generate auto-complete suggestions.

Parameters:

- `like`: (optional): Partial category used for requesting auto-complete suggestions.
- `count` (optional): Number of categories to return.

#### Example Response

```json
{
  "error": "",
  "like": "",
  "count": 20,
  "categories": [
    {
      "id": 2,
      "category": "character",
      "description": "Tags of this category denote a specific character.",
      "color": "#a88932",
      "count": 4
    },
    {
      "id": 3,
      "category": "copyright",
      "description": "Tags of this category denote a specific copyright or franchise.",
      "color": "#a84632",
      "count": 2
    },
    {
      "id": 1,
      "category": "artist",
      "description": "Tags of this category denote artists involved in the creation of an item.",
      "color": "#b37dff",
      "count": 1
    },
    {
      "id": 4,
      "category": "meta",
      "description": "Tags of this category are either automatically applied based on a specified rule or apply special rules to a search query.",
      "color": "#0871c2",
      "count": 1
    },
    {
      "id": 5,
      "category": "species",
      "description": "Tags of this category denote the species of character(s) depicted in an item.",
      "color": "#60a38e",
      "count": 0
    }
  ]
}
```

### `/api/gallery/refresh`

Forces a content refresh of the gallery. Usually unnecessary as the gallery should automatically refresh when the server is started and when a file is added to or removed from the content folder.

Parameters:

- `subdir`: (optional): Subdirectory of the content directory to refresh.

#### Example Response

```json
{
  "error": "",
  "like": "",
  "count": 20,
  "categories": [
    {
      "id": 2,
      "category": "character",
      "description": "Tags of this category denote a specific character.",
      "color": "#a88932",
      "count": 4
    },
    {
      "id": 3,
      "category": "copyright",
      "description": "Tags of this category denote a specific copyright or franchise.",
      "color": "#a84632",
      "count": 2
    },
    {
      "id": 1,
      "category": "artist",
      "description": "Tags of this category denote artists involved in the creation of an item.",
      "color": "#b37dff",
      "count": 1
    },
    {
      "id": 4,
      "category": "meta",
      "description": "Tags of this category are either automatically applied based on a specified rule or apply special rules to a search query.",
      "color": "#0871c2",
      "count": 1
    },
    {
      "id": 5,
      "category": "species",
      "description": "Tags of this category denote the species of character(s) depicted in an item.",
      "color": "#60a38e",
      "count": 0
    }
  ]
}
```

### `/api/log/current`

Provides recent lines from the current session's active log file. Used on the `/admin` page to display recent log messages

Parameters:

- `lines` (optional): Number of lines to get.

#### Example Response

```json
{
  "error": "",
  "total_lines": 544,
  "lines": 20,
  "logs": "[webserver] [Response] GET /static/main.css..."
}
```

### `/api/log/file/<filename>`

Provides the final lines from the provided session's log file.

Parameters:

- `lines` (optional): Number of lines to get.
- `plaintext` (optional): If provided, the raw log file will be provided instead of a JSON representation. This is not intended to be machine-readable.

#### Example Response

```json
{
  "error": "",
  "total_lines": 544,
  "lines": 20,
  "logs": "[webserver] [Response] GET /static/main.css..."
}
```

### `/api/server`

Provides information about the active server software. Useful for determining what other API endpoints are available based on the software name and version.

Parameters: None

#### Example Response

```json
{
  "error": "",
  "software": {
    "name": "Sketchbook",
    "version": "1.0",
    "source": "https://github.com/Lexari0/Sketchbook"
  },
  "owner": {
    "name": "Lexario",
    "email": "lexario.makes@gmail.com"
  }
}
```

### `/api/sql`

Runs the provided SQL query on the gallery database. This is very powerful, but can also be dangerous, so a backup of the database should be made *before* interacting directly with the database. For example, `DELETE * FROM items;` will effectively reset the gallery, but leave significant junk data behind.

The result of the query (eg: `SELECT`) is contained in the `r` object of the response.

Parameters:

- `q`: SQL query to run.

#### Example Response

Parameters: `q=SELECT * FROM tags LIMIT 2;`

```json
{
  "error": "",
  "q": "SELECT * FROM tags LIMIT 2;",
  "r": [
    {
      "tag_id": 1,
      "tag": "untagged",
      "description": "Item has no other tags.",
      "tag_category_id": 4,
      "editable": 0
    },
    {
      "tag_id": 169,
      "tag": "night_in_the_woods",
      "description": null,
      "tag_category_id": 3,
      "editable": 1
    }
  ]
}
```

### `/api/subscriptions/subscribestar/tiers`

Gets the tiers of the linked SubscribeStar creator profile.

Parameters: None

#### Example Response

```json
{
  "error": "",
  "tiers": [
    {
      "cost": 500,
      "title": "Bronze",
      "description": "Test",
      "hidden": false,
      "id": 53575,
      "removed": false,
      "tag": "subscribestar:bronze"
    }
  ]
}
```
