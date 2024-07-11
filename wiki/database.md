# Sketchbook Database

## Tables

### items

`gallery_item_id INTEGER PRIMARY KEY AUTOINCREMENT`: 
`name TEXT DEFAULT 'untitled'`: 
`description TEXT DEFAULT ''`: 
`file_path TEXT`: 
`hash CHARACTER(64)`: 
`source TEXT`: 
`created DATETIME DEFAULT CURRENT_TIMESTAMP`: 
`last_update DATETIME DEFAULT CURRENT_TIMESTAMP`: 
`missing INTEGER DEFAULT 0`: 

### tag_categories

`tag_category_id INTEGER PRIMARY KEY AUTOINCREMENT`: 
`category TEXT UNIQUE NOT NULL`: 
`description TEXT`: 
`color TEXT`: 
`editable INTEGER DEFAULT 1`: 

### tags

`tag_id INTEGER PRIMARY KEY AUTOINCREMENT`: 
`tag TEXT UNIQUE NOT NULL`: 
`description TEXT`: 
`tag_category_id INTEGER REFERENCES tag_categories DEFAULT 0`: 
`editable INTEGER DEFAULT 1`: 

### item_tags

`item_tag_entry INTEGER PRIMARY KEY AUTOINCREMENT`: 
`gallery_item_id INTEGER REFERENCES items NOT NULL`: 
`tag_id INTEGER REFERENCES tags NOT NULL`: 

## Views

### item_tags_with_data

### tags_with_categories
