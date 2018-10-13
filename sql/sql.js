const db = require("../commands/db");
const scheme = require("../commands/scheme");
const table = require("../commands/table");
const sql_parser = require("../node_modules/sql-parser/lib/sql_parser");

function run(sql, dbName, schemeName) {
    if (schemeName === undefined) {
        schemeName = "public";
    }

    if (typeof sql === "string") {
        try {
            let t = sql_parser.lexer.tokenize(sql);
            if (t[0][1].toUpperCase() === "SELECT") {
                if (t[1][0] === 'STAR') {
                    return table.select(dbName, schemeName, t[3][1], ['*']);
                } else {
                    let a = 0;
                    let tableName;

                    /*
                    * Gets the table name
                    * */
                    for (let i = 1; i < t.length; i++) {
                        if (t[i][0] === "FROM") {
                            a = i - 1;
                            tableName = t[i + 1][1];
                            break;
                        }
                    }

                    /*
                    * Gets desired columns
                    * */
                    let cols = [];
                    for (let i = 1; i <= a; i++) {
                        if (t[i][0] === "LITERAL") {
                            cols.push(t[i][1]);
                        }
                    }

                    return table.select(dbName, schemeName, tableName, cols);
                }
            } else if (t[0][1].toUpperCase() === "CREATE") {
                if (t[1][1] === "DATABASE") {
                    db.create(t[2][1]);
                } else if (t[1][1] === "SCHEME") {
                    scheme.create(dbName, t[2][1]);
                } else if (t[1][1] === "TABLE") {
                    /*
                    * @todo Make CREATE TABLE work (need a SQL parser to do that)
                    * */
                    let cols = {};

                }
            } else if (t[0][1].toUpperCase() === "INSERT") {
                /*
                * @todo Make INSERT INTO work (need a SQL parser to do that)
                * */
            }
        } catch (e) {
            console.error(e.message);
        }
    }

}

exports.run = run;