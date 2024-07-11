# Sketchbook API

## HTTP Endpoints

### `GET` `/api/server`

Provides information about the active server software. Useful for determining what other API endpoints are available based on the software name and version

Parameters: None

#### Example Response

```json
{
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

### `GET` `/api/gallery`

Provides information about the gallery, such as how many items exist and when it was last updated.

Clients and aggregators can reference this to determine if their cached data is up-to-date.

Parameters: None

#### Example Response

```json
{
  "item_count": 621,
  "last_update": "June 21, 2024 20:17:40 GMT+00:00"
}
```

### `GET` `/api/gallery/item/<id>`

Provides information on a specific item in the gallery.

Paramters: None

#### Example Response

```json
{
  "name": "untitled",
  "artist": "SomeDog",
  "uploaded_on": "June 20, 2024 17:17:40 GMT+00:00",
  "last_edited": "June 21, 2024 20:17:40 GMT+00:00",
  "resolutions": {
    "thumb": "/item/4_thumb.jpg",
    "low": "/item/4_low.png",
    "high": "/item/4.png"
  },
  "rating": "safe"
  "tags": [
    "dog",
    "cat",
    "plaid_shirt"
  ],
  "uri": "/4",
  "source": "https://some_dogs_gallery/4"
}
```

### `GET` `/api/gallery/items`

Provides a list of items in the gallery.

Parameters:

- `since`: Date of the earliest expected update. Allows clients and aggregators to only get updates they don't have cached.
- `page`: Page of items to receive, if multiple pages are necessary.

#### Example Response

```json
{
  "page_count": 3,
  "items": [
    42: {
      "_comment": "Contents identical to response from /api/gallery/item/42"
    },
    43: {
      "_comment": "Contents identical to response from /api/gallery/item/43"
    },
    19: {
      "_comment": "Contents identical to response from /api/gallery/item/19"
    }
  ]
}
```

### `GET` `/api/gallery/search`

Queries the gallery with a given search criteria and responds with posts which match that criteria

Parameters:

- `q`: Search query. Specific format TBD.
- `page`: Page of items to receive, if multiple pages are necessary.

#### Example Response

```json
{
  "page_count": 2,
  "items": [
    519: {
      "_comment": "Contents identical to response from /api/gallery/item/519"
    },
    580: {
      "_comment": "Contents identical to response from /api/gallery/item/580"
    },
    926: {
      "_comment": "Contents identical to response from /api/gallery/item/926"
    }
  ]
}
```
