const path = require("path");
const sqlite3 = require("sqlite3");
const config = require(path.join(process.cwd(), "libs/config.js"));

module.exports = {
    db: null,
    open: function() {
        this.close();
        console.log("Opening database", config.gallery.database_path);
        this.db = new sqlite3.Database(path.join(process.cwd(), config.gallery.database_path));
    },
    close: function() {
        if (this.db)
        {
            console.log("Closing database");
            this.db.close();
        }
        this.db = null;
    },
    createTable: function (table_name, columns, options = {
            temporary: false,
            if_not_exists: true
        }) {
        const command = "CREATE" + (options.temporary ? " TEMPORARY" : "") + " TABLE"
            + (options.if_not_exists ? " IF NOT EXISTS" : "") + " "
            + table_name + " (" + columns.join(", ") + ")";
        console.log("[SQL]", command);
        this.db.run(command,
            error => {
                if (error)
                {
                    console.error("Failed to make table", table_name, "due to error:", error);
                }
                else
                {
                    console.log("Created table:", table_name);
                }
            });
    },
    insert: function (table_name, values, options = {
        }) {
        const callback = error => {
            if (error)
            {
                console.error("Failed to insert into table", table_name, "due to error:", error);
            }
            else
            {
                console.log("Inserted values into table", table_name, ":", values);
            }
        };
        if (values instanceof Array)
        {
            this.db.run("INSERT INTO ? VALUES (?)",
                [table_name, values.join(", ")],
                callback);
        }
        else if (values instanceof Object)
        {
            this.db.run("INSERT INTO ? (?) VALUES (?)",
                [table_name,
                Object.keys(values).join(", "),
                Object.values(values).join(", ")],
                callback);
        }
        else
        {
            throw "Bad type for 'values' given to db.insert(...)";
        }
    },
    select: async function (columns, table_name, options = {
        distinct: false,
        all: false,
        where: undefined,
        group_by: undefined,
        having: undefined,
        order_by: undefined
        }) {
        return await this.all("SELECT ? ? ? FROM ? ? ? ? ?",
            [options.distinct ? "DISTINCT" : "",
            options.all ? "ALL" : "",
            columns.join(", "),
            table_name,
            options.where !== undefined ? "WHERE " + options.where : "",
            options.group_by !== undefined ? "GROUP BY " + options.group_by : "",
            options.having !== undefined ? "HAVING " + options.having : "",
            options.order_by !== undefined ? "ORDER BY " + options.order_by : ""]
        );
    },
    all: async function (sql, params) {
        return new Promise(resolve => {
            if (params) {
                this.db.all(sql,
                    ...params,
                    (err, result) => { resolve(err ? [] : result); }
                );
            }
            else {
                this.db.all(sql,
                    (err, result) => { resolve(err ? [] : result); }
                );
            }
        })
    }
};
