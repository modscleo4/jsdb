const db = require("../commands/db");
const scheme = require("../commands/scheme");
const table = require("../commands/table");
const sql_parser = require("sql-parser/lib/sql_parser");

function run(sql, dbName, schemeName) {
    if (typeof sql === "string") {

        /* Array of all SQL command outputs
        * Organization:
        * [
        *   {
        *     "code": 0,
        *     "message": "",
        *     "data": {
        *       "0": {
        *         "id": 1
        *       }
        *     },
        *     "sql": "SELECT * FROM adm"
        *   },
        *
        *   {
        *     "code": 1,
        *     "message": "Unique ID error: Already exists",
        *     "sql": "INSERT INTO adm '["DEFAULT"]'"
        *   }
        * ]
        * */
        let output = [];
        if (sql[sql.length - 1] !== ";") {
            sql += ";";
        }

        sql = sql.split(';');
        for (let i = 0; i < sql.length; i++) {
            let sqlString = sql[i];
            if (sqlString !== "") {
                let o = {};
                o['command'] = i;
                o['sql'] = sqlString;
                o['code'] = 0;

                let t = sql_parser.lexer.tokenize(sqlString);
                t = t.splice(0, t.length - 1);

                if (schemeName === null) {
                    schemeName = "public";
                }

                for (let i = 0; i < t.length; i++) {
                    if (t[i][0] === "DOT") {
                        /*
                        * Remove scheme.<table> from array to prevent errors
                        * */
                        schemeName = t[i - 1][1];
                        t.splice(i - 1, 2);
                        break;
                    }
                }

                if (t[0][1].toUpperCase() === "SELECT") {
                    if (dbName !== "") {
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
                            /*
                            * Checks if SQL is SELECT * ...
                            * */
                            if (t[i][0] === 'STAR') {
                                cols.push('*');
                                break;
                            } else if (t[i][0] === "LITERAL") {
                                cols.push(t[i][1]);
                            }
                        }

                        /*
                        * Get options
                        * */
                        let options = {};
                        for (let i = a + 1; i < t.length; i++) {
                            /* SQL: WHERE a = b AND c = d AND e > f AND g <= h
                            * "where": {
                            *   "and": [
                            *       [
                            *           {
                            *               "val0": "a",
                            *               "operator": "=",
                            *               "val1": "b"
                            *           },
                            *
                            *           {
                            *               "val0": "c",
                            *               "condition": "=",
                            *               "val1": "d"
                            *           }
                            *       ],
                            *
                            *       [
                            *           {
                            *               "val0": "e",
                            *               "operator": ">",
                            *               "val1": "f"
                            *           },
                            *
                            *           {
                            *               "val0": "g",
                            *               "operator": "<=",
                            *               "val1": "h"
                            *           }
                            *       ]
                            *   ]
                            * }
                            * */
                            if (t[i][0] === "WHERE") {
                                options['where'] = {};
                                /*
                                * @todo: SQL WHERE parameter
                                * */
                                let b = 0;
                                for (let k = i; k < t.length; k++) {
                                    /*
                                    * Stop when find something that is not on WHERE params
                                    * */
                                    if (t[k][0] !== "LITERAL" && t[k][0] !== "OPERATOR" && t[k][0] !== "CONDITIONAL") {
                                        break;
                                    }

                                    let val = {};
                                    let count = 0;
                                    for (let j = i + 1; j < t.length; j++) {
                                        /*
                                        * Find the params for [b]
                                        * */
                                        if (t[j][0] === "LITERAL" || t[j][0] === "NUMBER" || t[j][0] === "STRING") {
                                            val['val' + count++] = t[j][0];
                                        } else if (t[j][0] === "OPERATOR") {
                                            val['operator'] = t[j][1];
                                        } else if (t[j][0] === "CONDITIONAL") {
                                            break;
                                        }
                                    }

                                    options['where'][b++] = val;
                                }
                            } else if (t[i][0] === "ORDER" && t[i + 1][0] === "BY") {
                                options['orderby'] = [];
                                let count = 0;
                                for (let j = i + 2; j < t.length; j++) {
                                    if (t[j][0] === "LITERAL") {
                                        options['orderby'][count] = {};
                                        options['orderby'][count]['column'] = t[j][1];

                                        if (t[j + 1] !== undefined && t[j + 1][0] === "DIRECTION") {
                                            options['orderby'][count]['mode'] = t[j + 1][1];
                                        }
                                    } else if (t[j][0] === "SEPARATOR") {
                                        count++;
                                    } else if (t[j][0] !== "DIRECTION") {
                                        break;
                                    }
                                }
                            }
                        }

                        try {
                            o['data'] = table.select(dbName, schemeName, tableName, cols, options);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    }
                } else if (t[0][1].toUpperCase() === "CREATE") {
                    if (t[1][1].toUpperCase() === "DATABASE") {
                        try {
                            o['data'] = db.create(t[2][1]);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "SCHEME") {
                        try {
                            o['data'] = scheme.create(dbName, t[2][1]);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "TABLE") {
                        /*
                        * @todo Make CREATE TABLE work (need a SQL parser to do that)
                        * */
                        //let cols = {};
                        let tableName = t[2][1];
                        let tableStruct = JSON.parse(t[3][1]);

                        try {
                            o['data'] = table.create(dbName, schemeName, tableName, tableStruct);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    }
                } else if (t[0][1].toUpperCase() === "INSERT") {
                    /*
                    * @todo Make INSERT INTO work (need a SQL parser to do that)
                    * */
                    let tableName = t[2][1];
                    let content = JSON.parse(t[3][1]);

                    try {
                        o['data'] = table.insert(dbName, schemeName, tableName, content);
                    } catch (e) {
                        o['code'] = 1;
                        o['message'] = e.message;
                    }
                } else if (t[0][1].toUpperCase() === "UPDATE") {
                    /*
                    * @todo Make SQL UPDATE
                    * */
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
                } else if (t[0][1].toUpperCase() === "DELETE") {
                    let a = 0;
                    let tableName;
                    let options = {};

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

                    try {
                        o['data'] = table.delete(dbName, schemeName, tableName, options);
                    } catch (e) {
                        o['code'] = 1;
                        o['message'] = e.message;
                    }
                } else {
                    continue;
                }

                output.push(o);
            }
        }
        return output;
    }

}

exports.run = run;