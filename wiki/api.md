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

Provides information on a specific item in the gallery.

Paramters: None

#### Example Response

```json
{
  "1": {
    "name": "untitled",
    "uploaded_on": "2024-06-20 11:12:04"
    "last_edited": "2024-06-21 20:17:40"
    "source": "https://some_dogs_gallery/4",
    "missing": 0,
    "tags": [
      "dog",
      "cat",
      "plaid_shirt"
    ],
    "resolutions": {
      "thumb": "/item/1/thumb",
      "small": "/item/1/small",
      "large": "/item/1/large"
    },
    "uri": "/item/1"
  },
  "error": ""
}
```

### `/api/gallery/items`

Provides a list of items in the gallery.

Parameters:

- `since`: Date of the earliest expected update. Allows clients and aggregators to only get updates they don't have cached.
- `page`: Page of items to receive, if multiple pages are necessary.

#### Example Response

```json
{
  "error": "",
  "page": 1,
  "page_count": 3,
  "items": {
    "42": {
      "_comment": "Contents identical to response from /api/gallery/item/42"
    },
    "43": {
      "_comment": "Contents identical to response from /api/gallery/item/43"
    },
    "19": {
      "_comment": "Contents identical to response from /api/gallery/item/19"
    }
  }
}
```

### `/api/gallery/search`

Queries the gallery with a given search criteria and responds with posts which match that criteria

Parameters:

- `q`: Search query. Specific format TBD.
- `page`: Page of items to receive, if multiple pages are necessary.

#### Example Response

```json
{
  "page_count": 2,
  "q": "foo"
  "item_count": 3,
  "items": {
    "519": {
      "_comment": "Contents identical to response from /api/gallery/item/519"
    },
    "580": {
      "_comment": "Contents identical to response from /api/gallery/item/580"
    },
    "926": {
      "_comment": "Contents identical to response from /api/gallery/item/926"
    }
  }
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
