# Sketchbook API

## HTTP Endpoints

All HTTP endpoints will respond with a JSON object containing an `error` string (which will be empty if there was no error).

API endpoints can be enabled and disabled via the `api` object within `config.yaml`.

- A value of `"any"` will permit an endpoint to be used for any request over `GET` or `POST` HTTP protocols.
- A value of `"key"` will permit an endpoint to be used by a request containing a permitted `key` in the request body and only allows for `POST` requests.
  - To permit a user or aggregate's `key`, add it to the `api.permitted_keys` list in `config.yaml`.
- A value of `"none"` disallows any requests to the endpoint.

### `/api/server`

Provides information about the active server software. Useful for determining what other API endpoints are available based on the software name and version

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

### `/api/gallery`

Provides information about the gallery, such as how many items exist and when it was last updated.

Clients and aggregators can reference this to determine if their cached data is up-to-date.

Parameters: None

#### Example Response

```json
{
  "error": "",
  "item_count": 621,
  "last_update": "2024-06-21 20:17:40"
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
