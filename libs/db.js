const path = require("path");
const sqlite3 = require("sqlite3");
const sqlstring = require("sqlstring-sqlite");
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
    createTable: async function (table_name, columns, options = {
            temporary: false,
            if_not_exists: true
        }) {
        const command = "CREATE" + (options.temporary ? " TEMPORARY" : "") + " TABLE"
            + (options.if_not_exists ? " IF NOT EXISTS" : "") + " "
            + table_name + " (" + columns.join(", ") + ")";
        console.log("[SQL]", command);
        return new Promise((resolve, reject) => {
            this.db.run(command, error => {
                    if (error)
                    {
                        console.error("Failed to make table", table_name, "due to error:", error);
                        reject();
                    }
                    else
                    {
                        console.log("Created table:", table_name);
                        resolve();
                    }
                });
        });
    },
    insert: async function (table_name, values, options = {
        }) {
        var command = "INSERT INTO " + sqlstring.escape(table_name);
        if (values instanceof Array)
        {
            command += " VALUES ("
            for (const i in values)
            {
                if (i > 0)
                {
                    command += ", ";
                }
                command += values[i];
            }
            command += ")";
        }
        else if (values instanceof Object)
        {
            const keys = Object.keys(values)
            command += "("
            for (const i in keys)
            {
                if (i > 0)
                {
                    command += ", ";
                }
                command += sqlstring.escape(keys[i]);
            }
            command += ") VALUES ("
            values = Object.values(values);
            for (const i in values)
            {
                if (i > 0)
                {
                    command += ", ";
                }
                command += values[i];
            }
            command += ")";
        }
        else
        {
            throw "Bad type for 'values' given to db.insert(...)";
        }
        console.log("[SQL]", command);
        return new Promise((resolve, reject) => this.db.run(command, error => {
                if (error)
                {
                    console.error("Failed to insert into table", table_name, "due to error:", error);
                    reject();
                }
                else
                {
                    console.log("Inserted values into table", table_name, ":", values);
                    resolve();
                }
            })
        );
    },
    update: async function (table_name, fields, options = {
        where: undefined,
        }) {
        var fields_sql = "";
        for (const column of Object.keys(fields))
        {
            if (fields_sql.length > 0)
            {
                fields_sql += ", ";
            }
            fields_sql += sqlstring.escape(column) + "=" + fields[column];
        }
        var command = "UPDATE " + sqlstring.escape(table_name) + " SET " + fields_sql;
        if (options.where)
        {
            command += " WHERE " + options.where;
        }
        console.log("[SQL]", command);
        return new Promise((resolve, reject) => {
            this.db.run(command, error => {
                    if (error)
                    {
                        console.error("Failed to update", table_name, "due to error:", error);
                        reject();
                    }
                    else
                    {
                        console.log("Updated:", table_name);
                        resolve();
                    }
                });
        });
    },
    select: async function (columns, table_name, options = {
        distinct: false,
        all: false,
        where: undefined,
        group_by: undefined,
        having: undefined,
        order_by: undefined,
        limit: 50,
        offset: undefined
        }) {
        var column_list = "";
        if (columns instanceof Array)
        {
            for (const column of columns)
            {
                if (column_list.length > 0)
                {
                    column_list += ", ";
                }
                column_list += sqlstring.escape(column);
            }
        }
        else
        {
            column_list = columns;
        }
        var command = "SELECT";
        if (options.distinct !== undefined)
        {
            command += " DISTINCT";
        }
        if (options.all !== undefined)
        {
            command += " ALL";
        }
        command += " " + columns + " FROM " + table_name;
        if (options.where !== undefined)
        {
            command += " WHERE " + options.where;
        }
        if (options.group_by !== undefined)
        {
            command += " GROUP BY " + options.group_by;
        }
        if (options.having !== undefined)
        {
            command += " HAVING " + options.having;
        }
        if (options.order_by !== undefined)
        {
            command += " ORDER BY " + options.order_by;
        }
        if (options.limit !== undefined)
        {
            command += " LIMIT " + options.limit;
            if (options.offset !== undefined)
            {
                command += " OFFSET " + options.offset;
            }
        }
        return await this.all(command);
    },
    all: async function (sql, params) {
        return new Promise(resolve => {
            if (params) {
                for (const param of params)
                {
                    sql = sql.replace("?", sqlstring.escape(param));
                }
            }
            console.log("[SQL]", sql);
            this.db.all(sql,
                (err, result) => { resolve(err ? [] : result); }
            );
        })
    }
};
