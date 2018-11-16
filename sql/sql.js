const db = require("../commands/db");
const schema = require("../commands/schema");
const table = require("../commands/table");
const sequence = require("../commands/sequence");
const sql_parser = require("sql-parser/lib/sql_parser");
const server = require("../server");

function run(sql, socketIndex) {
    let dbName = {
        get: function () {
            return server.sockets[socketIndex].dbName;
        },

        set: function (dbS) {
            if (db.exists(dbS)) {
                server.sockets[socketIndex].dbName = dbS;
                return `Using database ${dbS}.`;
            }
        }
    };

    let schemaName = {
        get: function () {
            return server.sockets[socketIndex].schemaName;
        },

        set: function (schemaS) {
            if (schema.exists(dbName.get(), schemaS)) {
                server.sockets[socketIndex].schemaName = schemaS;
                return `Changed schema to ${schemaS}.`;
            }
        }
    };

    console.log(schemaName.get());

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

                if (sqlString.includes("!dbg")) {
                    sqlString = sqlString.replace("!dbg", "");
                    let t = sql_parser.lexer.tokenize(sqlString);
                    t = t.splice(0, t.length - 1);
                    o['data'] = t;
                    o['code'] = 0;
                    output.push(o);
                    return output;
                }

                let t = sql_parser.lexer.tokenize(sqlString);
                t = t.splice(0, t.length - 1);

                for (let i = 0; i < t.length; i++) {
                    if (t[0][1].toUpperCase() !== "SHOW" && t[i][0] === "DOT") {
                        /*
                        * Remove schema.<table> from array to prevent errors
                        * */
                        schemaName.set(t[i - 1][1]);
                        t.splice(i - 1, 2);
                        break;
                    }
                }

                if (t[0][1].toUpperCase() === "USE") {
                    try {
                        o['data'] = dbName.set(t[1][1]);
                    } catch (e) {
                        o['code'] = 1;
                        o['message'] = e.message;
                    }
                } else if (t[0][1].toUpperCase() === "SET") {
                    if (t[1][1].toUpperCase() === "SEARCH_PATH") {
                        try {
                            o['data'] = schemaName.set(t[3][1]);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else {
                        o['code'] = 1;
                        o['message'] = `Unrecognized command: ${o['sql']}`;
                    }
                } else if (t[0][1].toUpperCase() === "SELECT") {
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
                        if (t[i][0] === "WHERE") {
                            options['where'] = "";
                            /*
                            * @todo: SQL WHERE parameter
                            * */
                            for (let k = i + 1; k < t.length; k++) {
                                /*
                                * Stop when find something that is not on WHERE params
                                * */
                                if (t[k][0] !== "LITERAL" && t[k][0] !== "OPERATOR" && t[k][0] !== "CONDITIONAL" && t[k][0] !== "STRING" && t[k][0] !== "NUMBER" && t[k][0] !== "BOOLEAN") {
                                    break;
                                }

                                if (t[k][1] === '=') {
                                    t[k][1] = '==';
                                } else if (t[k][1] === '<>') {
                                    t[k][1] = '!=';
                                } else if (t[k][0] === 'LITERAL') {
                                    t[k][1] = `\`${t[k][1]}\``;
                                } else if (t[k][0] === 'CONDITIONAL') {
                                    t[k][1] = (t[k][1] === 'AND') ? '&&' : '||';
                                } else if (t[k][0] === "STRING") {
                                    t[k][1] = `\`${t[k][1]}\``;
                                }

                                options['where'] += t[k][1];
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
                        } else if (t[i][0] === "LIMIT") {
                            options['limoffset'] = {};
                            for (let j = i + 1; j < t.length; j++) {
                                if (t[j][0] === "NUMBER") {
                                    options['limoffset']['limit'] = t[j][1];
                                } else if (t[j][0] === "SEPARATOR") {
                                    options['limoffset']['limit'] = t[j + 1][1];
                                    options['limoffset']['offset'] = t[j - 1][1];
                                    break;
                                } else if (t[j][0] === "OFFSET") {
                                    options['limoffset']['limit'] = t[j - 1][1];
                                    options['limoffset']['offset'] = t[j + 1][1];
                                    break;
                                }
                            }
                        }
                    }

                    try {
                        o['data'] = table.select(dbName.get(), schemaName.get(), tableName, cols, options);
                    } catch (e) {
                        o['code'] = 1;
                        o['message'] = e.message;
                    }
                } else if (t[0][1].toUpperCase() === "CREATE") {
                    if (t[1][1].toUpperCase() === "DATABASE") {
                        try {
                            o['data'] = db.create(t[2][1]);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "SCHEMA") {
                        try {
                            o['data'] = schema.create(dbName.get(), t[2][1]);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "SEQUENCE") {
                        try {
                            o['data'] = sequence.create(dbName.get(), schemaName.get(), t[2][1]);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "TABLE") {
                        /*
                        * @todo Make CREATE TABLE work (need a SQL parser to do that)
                        * */
                        //let cols = {};
                        let tableName;
                        let a;
                        let tableStruct = {};
                        let metadata = {};

                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === "TABLE") {
                                a = i + 1;
                                tableName = t[i + 1][1];

                                /*
                                * Get columns order
                                * */
                                if (t[i + 2][0] === "LEFT_PAREN") {
                                    /*
                                    * t[i + 3][1] is the name of column
                                    * */
                                    tableStruct[t[i + 3][1]] = {};
                                    metadata['primaryKey'] = [];

                                    for (let j = i + 3; j < t.length; j++) {
                                        if (t[j][0] === "RIGHT_PAREN" || t[j][0] === "SEPARATOR") {
                                            break;
                                        }

                                        if (t[j][0] === "LITERAL" || t[j][0] === "BOOLEAN") {
                                            if (t[j][1].toUpperCase() === "NUMBER") {
                                                tableStruct[t[i + 3][1]]['type'] = "number";
                                            } else if (t[j][1].toUpperCase() === "STRING") {
                                                tableStruct[t[i + 3][1]]['type'] = "string";
                                            } else if (t[j][1].toUpperCase() === "BOOLEAN") {
                                                tableStruct[t[i + 3][1]]['type'] = "boolean";
                                            } else if (t[j][1].toUpperCase() === "OBJECT") {
                                                tableStruct[t[i + 3][1]]['type'] = "object";
                                            } else if (t[j][1].toUpperCase() === "KEY") {
                                                if (t[j - 1][1].toUpperCase() === "PRIMARY") {
                                                    metadata['primaryKey'].push(t[i + 3][1]);
                                                    tableStruct[t[i + 3][1]]['unique'] = true;
                                                } else if (t[j - 1][1].toUpperCase() === "UNIQUE") {
                                                    tableStruct[t[i + 3][1]]['unique'] = true;
                                                }
                                            } else if (t[j][1].toUpperCase() === "DEFAULT") {
                                                if (t[j + 1][0] === "STRING") {
                                                    tableStruct[t[i + 3][1]]['default'] = t[j + 1][1];
                                                } else if (t[j + 1][0] === "NUMBER") {
                                                    tableStruct[t[i + 3][1]]['default'] = parseFloat(t[j + 1][1]);
                                                } else if (t[j + 1][0] === "BOOLEAN") {
                                                    tableStruct[t[i + 3][1]]['default'] = (t[j + 1][1].toUpperCase() === "TRUE");
                                                }

                                            } else if (t[j][1].toUpperCase() === "AUTO" && t[j + 1][1].toUpperCase() === "INCREMENT") {
                                                tableStruct[t[i + 3][1]]['autoIncrement'] = true;
                                            } else if (t[j][1].toUpperCase() === "NULL") {
                                                tableStruct[t[i + 3][1]]['notNull'] = (t[j - 1][1].toUpperCase() === "NOT");
                                            }
                                        }
                                    }
                                }

                                break;
                            }
                        }

                        try {
                            o['data'] = table.create(dbName.get(), schemaName.get(), tableName, tableStruct, metadata);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else {
                        o['code'] = 1;
                        o['message'] = `Unrecognized command: ${o['sql']}`;
                    }
                } else if (t[0][1].toUpperCase() === "INSERT") {
                    /*
                    * @todo Make INSERT INTO work (need a SQL parser to do that)
                    * */
                    let tableName;
                    let a = 0;
                    let columns = null;
                    let content;

                    for (let i = 1; i < t.length; i++) {
                        if (t[i][1].toUpperCase() === "INTO") {
                            a = i + 1;
                            tableName = t[i + 1][1];

                            /*
                            * Get columns order
                            * */
                            if (t[i + 2][0] === "LEFT_PAREN") {
                                columns = [];
                                for (let j = i + 3; j < t.length; j++) {
                                    if (t[j][0] === "RIGHT_PAREN") {
                                        a = j;
                                        break;
                                    }

                                    if (t[j][0] === "LITERAL") {
                                        columns.push(t[j][1]);
                                    }
                                }
                            }

                            break;
                        }
                    }

                    for (let i = a + 1; i < t.length; i++) {
                        if (t[i][1].toUpperCase() === "VALUES" && t[i + 1][0] === "LEFT_PAREN") {
                            content = [];
                            for (let j = i + 2; j < t.length; j++) {
                                if (t[j][0] === "RIGHT_PAREN") {
                                    a = j;
                                    break;
                                }

                                if (t[j][0] === "BOOLEAN" && t[j][1].toUpperCase() === "NULL") {
                                    t[j][0] = "NULL";
                                } else if (t[j][0] === "LITERAL" && t[j][1].toUpperCase() === "DEFAULT") {
                                    t[j][0] = "STRING";
                                    t[j][1] = "DEFAULT";
                                }

                                if (t[j][0] === "STRING") {
                                    content.push(t[j][1]);
                                } else if (t[j][0] === "NUMBER") {
                                    content.push(parseFloat(t[j][1]));
                                } else if (t[j][0] === "BOOLEAN") {
                                    content.push((t[j][1].toUpperCase() === "TRUE"));
                                } else if (t[j][0] === "NULL") {
                                    content.push(null);
                                }
                            }
                        }
                    }

                    try {
                        o['data'] = table.insert(dbName.get(), schemaName.get(), tableName, content, columns);
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
                    let update = {};

                    /*
                    * Gets the table name
                    * */
                    for (let i = 1; i < t.length; i++) {
                        if (t[i][1].toUpperCase() === "SET") {
                            a = i + 1;
                            tableName = t[i - 1][1];

                            /* GET update */
                            for (let j = 0; j < t.length; j++) {
                                if (t[j][0] !== "LITERAL" && t[j][0] !== "STRING" && t[j][0] !== "NUMBER" && t[j][0] !== "BOOLEAN" && t[j][0] !== "OPERATOR" && t[j][0] !== "SEPARATOR") {
                                    a = i + 1;
                                    break;
                                }

                                if (t[j][0] === "LITERAL") {
                                    if (t[j][1].toUpperCase() === "DEFAULT") {
                                        t[j][0] = "STRING";
                                    }
                                }

                                if (t[j][0] === "LITERAL" && t[j + 1][1] === "=") {
                                    if (t[j][0] === "BOOLEAN" && t[j][1].toUpperCase() === "NULL") {
                                        t[j][0] = "NUlL";
                                    }

                                    if (t[j + 2][0] === "STRING") {
                                        update[t[j][1]] = t[j + 2][1];
                                    } else if (t[j + 2][0] === "NUMBER") {
                                        update[t[j][1]] = parseFloat(t[j + 2][1]);
                                    } else if (t[j + 2][0] === "BOOLEAN") {
                                        update[t[j][1]] = (t[j + 2][1].toUpperCase() === "TRUE");
                                    } else if (t[j + 2][0] === "NULL") {
                                        update.push(null);
                                    }
                                }
                            }

                            break;
                        }
                    }

                    /*
                    * Get options
                    * */
                    let options = {'where': 'true'};
                    for (let i = a + 1; i < t.length; i++) {
                        if (t[i][0] === "WHERE") {
                            options['where'] = "";
                            /*
                            * @todo: SQL WHERE parameter
                            * */
                            for (let k = i + 1; k < t.length; k++) {
                                /*
                                * Stop when find something that is not on WHERE params
                                * */
                                if (t[k][0] !== "LITERAL" && t[k][0] !== "OPERATOR" && t[k][0] !== "CONDITIONAL" && t[k][0] !== "STRING" && t[k][0] !== "NUMBER" && t[k][0] !== "BOOLEAN") {
                                    break;
                                }

                                if (t[k][1] === '=') {
                                    t[k][1] = '==';
                                } else if (t[k][1] === '<>') {
                                    t[k][1] = '!=';
                                } else if (t[k][0] === 'LITERAL') {
                                    if (t[k][1].toUpperCase() === "DEFAULT") {
                                        t[k][0] = "STRING";
                                        t[k][1] = `\`${t[k][1]}\``;
                                    } else {
                                        t[k][1] = `\`${t[k][1]}\``;
                                    }
                                } else if (t[k][0] === 'CONDITIONAL') {
                                    t[k][1] = (t[k][1] === 'AND') ? '&&' : '||';
                                } else if (t[k][0] === "STRING") {
                                    t[k][1] = `\`${t[k][1]}\``;
                                }

                                options['where'] += t[k][1];
                            }
                        } else if (t[i][0] === "LIMIT") {
                            options['limoffset'] = {};
                            for (let j = i + 1; j < t.length; j++) {
                                if (t[j][0] === "NUMBER") {
                                    options['limoffset']['limit'] = t[j][1];
                                } else if (t[j][0] === "SEPARATOR") {
                                    options['limoffset']['limit'] = t[j + 1][1];
                                    options['limoffset']['offset'] = t[j - 1][1];
                                    break;
                                } else if (t[j][0] === "OFFSET") {
                                    options['limoffset']['limit'] = t[j - 1][1];
                                    options['limoffset']['offset'] = t[j + 1][1];
                                    break;
                                }
                            }
                        }
                    }

                    try {
                        o['data'] = table.update(dbName.get(), schemaName.get(), tableName, update, options);
                    } catch (e) {
                        o['code'] = 1;
                        o['message'] = e.message;
                    }
                } else if (t[0][1].toUpperCase() === "DELETE") {
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
                    * Get options
                    * */
                    let options = {'where': 'true'};
                    for (let i = a + 1; i < t.length; i++) {
                        if (t[i][0] === "WHERE") {
                            options['where'] = "";
                            /*
                            * @todo: SQL WHERE parameter
                            * */
                            for (let k = i + 1; k < t.length; k++) {
                                /*
                                * Stop when find something that is not on WHERE params
                                * */
                                if (t[k][0] !== "LITERAL" && t[k][0] !== "OPERATOR" && t[k][0] !== "CONDITIONAL" && t[k][0] !== "STRING" && t[k][0] !== "NUMBER" && t[k][0] !== "BOOLEAN") {
                                    break;
                                }

                                if (t[k][1] === '=') {
                                    t[k][1] = '==';
                                } else if (t[k][1] === '<>') {
                                    t[k][1] = '!=';
                                } else if (t[k][0] === 'LITERAL') {
                                    t[k][1] = `\`${t[k][1]}\``;
                                } else if (t[k][0] === 'CONDITIONAL') {
                                    t[k][1] = (t[k][1] === 'AND') ? '&&' : '||';
                                } else if (t[k][0] === "STRING") {
                                    t[k][1] = `\`${t[k][1]}\``;
                                }

                                options['where'] += t[k][1];
                            }
                        } else if (t[i][0] === "LIMIT") {
                            options['limoffset'] = {};
                            for (let j = i + 1; j < t.length; j++) {
                                if (t[j][0] === "NUMBER") {
                                    options['limoffset']['limit'] = t[j][1];
                                } else if (t[j][0] === "SEPARATOR") {
                                    options['limoffset']['limit'] = t[j + 1][1];
                                    options['limoffset']['offset'] = t[j - 1][1];
                                    break;
                                } else if (t[j][0] === "OFFSET") {
                                    options['limoffset']['limit'] = t[j - 1][1];
                                    options['limoffset']['offset'] = t[j + 1][1];
                                    break;
                                }
                            }
                        }
                    }

                    try {
                        o['data'] = table.delete(dbName.get(), schemaName.get(), tableName, options);
                    } catch (e) {
                        o['code'] = 1;
                        o['message'] = e.message;
                    }
                } else if (t[0][1].toUpperCase() === "DROP") {
                    if (t[1][1].toUpperCase() === "DATABASE") {
                        let a;
                        let ifExists = false;

                        /*
                        * Gets the table name
                        * */
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === "DATABASE") {
                                a = i + 1;
                                dbName.set(t[i + 1][1]);
                            }

                            if (t[i][1].toUpperCase() === "IF" && t[i + 1][1].toUpperCase() === "EXISTS") {
                                a = i + 2;
                                dbName.set(t[i + 2][1]);
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            o['data'] = db.drop(dbName.get(), ifExists);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "SCHEMA") {

                    } else if (t[1][1].toUpperCase() === "SEQUENCE") {

                    } else if (t[1][1].toUpperCase() === "TABLE") {
                        let tableName;
                        let a;
                        let ifExists = false;

                        /*
                        * Gets the table name
                        * */
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === "TABLE") {
                                a = i + 1;
                                tableName = t[i + 1][1];
                            }

                            if (t[i][1].toUpperCase() === "IF" && t[i + 1][1].toUpperCase() === "EXISTS") {
                                a = i + 2;
                                tableName = t[i + 2][1];
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            o['data'] = table.drop(dbName.get(), schemaName.get(), tableName, ifExists);
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else {
                        o['code'] = 1;
                        o['message'] = `Unrecognized command: ${o['sql']}`;
                    }
                } else if (t[0][1].toUpperCase() === "SHOW") {
                    if (t[1][1].toUpperCase() === "DATABASES") {
                        try {
                            o['data'] = db.readFile();
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "SCHEMAS") {
                        /*
                        * Gets the DB name
                        * */
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][0] === "FROM") {
                                dbName.set(t[i + 1][1]);
                                break;
                            }
                        }

                        try {
                            o['data'] = schema.readFile(dbName.get());
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === "SEQUENCES") {

                    } else if (t[1][1].toUpperCase() === "TABLES") {
                        /*
                        * Gets the DB name
                        * */
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][0] === "FROM") {
                                dbName.set(t[i + 1][1]);

                                if (typeof t[i + 2] !== "undefined" && t[i + 2][0] === "DOT") {
                                    schemaName.set(t[i + 3][1]);
                                }

                                break;
                            }
                        }

                        try {
                            o['data'] = table.readFile(dbName.get(), schemaName.get());
                        } catch (e) {
                            o['code'] = 1;
                            o['message'] = e.message;
                        }
                    } else {
                        o['code'] = 1;
                        o['message'] = `Unrecognized command: ${o['sql']}`;
                    }
                } else {
                    o['code'] = 1;
                    o['message'] = `Unrecognized command: ${o['sql']}`;

                    continue;
                }

                output.push(o);
            }
        }
        return output;
    }

}

exports.run = run;