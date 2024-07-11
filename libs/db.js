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
        const column_def = ", ".join(columns);
        this.db.run("CREATE ? TABLE ? (?)",
            options.temporary ? "TEMPORARY" : "",
            table_name,
            options.if_not_exists ? "IF NOT EXISTS" : "",
            column_def);
    },
    insert: function (table_name, values, options = {
        }) {
        if (values instanceof Array)
        {
            this.db.run("INSERT INTO ? VALUES (?)",
            table_name,
            ", ".join(values));
        }
        else if (values instanceof Object)
        {
            this.db.run("INSERT INTO ? (?) VALUES (?)",
            table_name,
            ", ".join(Object.keys(values)),
            ", ".join(Object.values(values)));
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
            ", ".join(columns),
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
