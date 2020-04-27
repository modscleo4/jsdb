/**
 * Copyright 2019 Dhiego Cassiano Fogaça Barbosa

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @file This is the script that runs the SQL
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {config, connections} = require('../../config');
const db = require('../commands/db');
const schema = require('../commands/schema');
const sequence = require('../commands/sequence');
const table = require('../commands/table');
const user = require('../commands/user');
const registry = require('../commands/registry');
const jscsv = require('../lib/jscsv');
const parser = require('./parser');

const DB = require('../DB');
const Schema = require('../Schema');
const Sequence = require('../Sequence');
const Table = require('../Table');
const Registry = require('../Registry');
const User = require('../User');

const sql_parser = require('sql-parser/lib/sql_parser');
const md5 = require('md5');
const {
    performance
} = require('perf_hooks');

module.exports = ((sql, connectionIndex) => {
        const dbs = [];

        const dbName = {
            get: () => connections[connectionIndex].DBName,

            set: dbS => {
                if (DB.exists(dbS)) {
                    // Do not include the DB more than once
                    if (!dbs.includes(dbS)) {
                        dbs.push(dbS);
                        db.backup(dbS);
                    }

                    connections[connectionIndex].DBName = dbS;
                    return `Using database ${dbS}.`;
                }
            }
        };

        const schemaName = {
            get: () => connections[connectionIndex].SchemaName,

            set: schemaS => {
                if (Schema.exists(new DB(dbName.get()), schemaS)) {
                    connections[connectionIndex].SchemaName = schemaS;
                    return `Changed schema to ${schemaS}.`;
                }
            }
        };

        if (typeof sql !== 'string') {
            throw new TypeError(`sql is not string.`);
        }

        dbName.set(dbName.get());
        // Array of SQL command outputs
        let output = {};

        if (!sql.endsWith(';')) {
            sql += ';';
        }

        sql = sql.split(';');

        output.time = performance.now();

        let perf = true;
        for (let i = 0; i < sql.length; i++) {
            let sqlString = sql[i].trim();
            if (sqlString !== '') {
                if (sqlString === 'NOPERF') {
                    perf = false;
                    continue;
                }


                output.command = i;
                output.sql = sqlString;
                output.code = 0;

                if (!perf) {
                    output.time = 'NOTIME';
                }

                if (sqlString.includes('!dbg')) {
                    sqlString = sqlString.replace('!dbg', '');
                    let t = sql_parser.lexer.tokenize(sqlString);
                    t = t.splice(0, t.length - 1);
                    output.data = t;
                    output.time = 'NOTIME';
                    return output;
                }

                let t = sql_parser.lexer.tokenize(sqlString);
                t = t.splice(0, t.length - 1);

                for (let i = 0; i < t.length; i++) {
                    if (t[0][1].toUpperCase() !== 'SHOW' && t[i][0] === 'DOT') {
                        // Remove schema.<table> from array to prevent errors
                        schemaName.set(t[i - 1][1]);
                        t.splice(i - 1, 2);
                        break;
                    }
                }

                // Get user permissions on database
                const getPermissions = (dbN = dbName.get()) => {
                    let userPrivileges = new User(connections[connectionIndex].Username).privileges();
                    if (!userPrivileges.hasOwnProperty('*')) {
                        if (userPrivileges.hasOwnProperty(dbN)) {
                            const dbPerm = parseInt(userPrivileges[dbN]).toString(2);

                            userPrivileges = {
                                create: (dbPerm[0] === '1'),
                                read: (dbPerm[1] === '1'),
                                update: (dbPerm[2] === '1'),
                                delete: (dbPerm[3] === '1'),
                                root: false
                            };
                        } else {
                            userPrivileges = {
                                create: false,
                                read: false,
                                update: false,
                                delete: false,
                                root: false
                            }
                        }
                    } else {
                        const dbPerm = parseInt(userPrivileges['*']).toString(2);

                        userPrivileges = {
                            create: (dbPerm[0] === '1'),
                            read: (dbPerm[1] === '1'),
                            update: (dbPerm[2] === '1'),
                            delete: (dbPerm[3] === '1'),
                            root: true
                        };
                    }

                    return userPrivileges;
                };

                let userPrivileges = getPermissions();

                if (t[0][1].toUpperCase() === 'USE') {
                    try {
                        output.data = dbName.set(t[1][1]);
                    } catch (e) {
                        output.code = 1;
                        output.message = e.message;
                    }
                } else if (t[0][1].toUpperCase() === 'SET') {
                    if (t[1][1].toUpperCase() === 'SEARCH_PATH') {
                        try {
                            output.data = schemaName.set(t[3][1]);
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else {
                        output.code = 2;
                        output.message = `Unrecognized command: ${output.sql}`;
                    }
                } else if (t[0][1].toUpperCase() === 'SELECT') {
                    let a = 0;
                    let tableName;
                    let csv = false;
                    let isFunctions = false;

                    // Gets the table name
                    for (let i = 1; i < t.length; i++) {
                        if (t[i][1].toUpperCase() === 'CSV') {
                            csv = true;
                            t.splice(i, 1);
                        } else if (t[i][0] === 'FROM') {
                            a = i - 1;
                            tableName = t[i + 1][1];
                            break;
                        }
                    }

                    // Gets desired columns
                    let cols = [];
                    for (let i = 1; i <= a; i++) {
                        // Checks if SQL is SELECT * ...
                        if (t[i][0] === 'STAR') {
                            cols.push('*');
                            break;
                        } else if (t[i][0] === 'LITERAL') {
                            cols.push(t[i][1]);
                        }
                    }

                    // Get options
                    let options = {};
                    for (let i = a + 1; i < t.length; i++) {
                        if (t[i][0] === 'WHERE') {
                            options.where = '';
                            for (let k = i + 1; k < t.length; k++) {
                                // Stop when find something that is not on WHERE params
                                if (t[k][0] !== 'LITERAL' && t[k][0] !== 'OPERATOR' && t[k][0] !== 'CONDITIONAL' && t[k][0] !== 'STRING' && t[k][0] !== 'NUMBER' && t[k][0] !== 'BOOLEAN') {
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
                                } else if (t[k][0] === 'STRING') {
                                    t[k][1] = `\`${t[k][1]}\``;
                                }

                                options.where += t[k][1];
                            }
                        } else if (t[i][0] === 'ORDER' && t[i + 1][0] === 'BY') {
                            options.orderBy = [];
                            let count = 0;
                            for (let j = i + 2; j < t.length; j++) {
                                if (t[j][0] === 'LITERAL') {
                                    options.orderBy[count] = {};
                                    options.orderBy[count].column = t[j][1];

                                    if (t[j + 1] !== undefined && t[j + 1][0] === 'DIRECTION') {
                                        options.orderBy[count].mode = t[j + 1][1];
                                    }
                                } else if (t[j][0] === 'SEPARATOR') {
                                    count++;
                                } else if (t[j][0] !== 'DIRECTION') {
                                    break;
                                }
                            }
                        } else if (t[i][0] === 'GROUP' && t[i + 1][0] === 'BY') {
                            options.groupBy = [];
                            let count = 0;
                            for (let j = i + 2; j < t.length; j++) {
                                if (t[j][0] === 'LITERAL') {
                                    options.groupBy[count] = {};
                                    options.groupBy[count].column = t[j][1];
                                } else if (t[j][0] === 'SEPARATOR') {
                                    count++;
                                } else {
                                    break;
                                }
                            }
                        } else if (t[i][0] === 'LIMIT') {
                            options.limitOffset = {};
                            for (let j = i + 1; j < t.length; j++) {
                                if (t[j][0] === 'NUMBER') {
                                    options.limitOffset.limit = parseInt(t[j][1]);
                                    options.limitOffset.offset = 0;
                                } else if (t[j][0] === 'SEPARATOR') {
                                    options.limitOffset.limit = parseInt(t[j + 1][1]);
                                    options.limitOffset.offset = parseInt(t[j - 1][1]);
                                    break;
                                } else if (t[j][0] === 'OFFSET') {
                                    options.limitOffset.limit = parseInt(t[j - 1][1]);
                                    options.limitOffset.offset = parseInt(t[j + 1][1]);
                                    break;
                                }
                            }
                        }
                    }

                    try {
                        if (!userPrivileges.read) {
                            output.code = 1;
                            output.message = 'Not enough permissions';
                        } else {
                            if (dbName.get() === 'jsdb' && schemaName.get() === 'public' && !tableName && isFunctions) {
                                tableName = 'default';
                            }

                            output.data = new DB(dbName.get()).schema(schemaName.get()).table(tableName).select(cols, options);
                            if (csv) {
                                output.data = jscsv.dataToCSV(output.data);
                            }
                        }
                    } catch (e) {
                        output.code = 1;
                        output.message = e.message;
                    }
                } else if (t[0][1].toUpperCase() === 'READ') {
                    if (t[1][1].toUpperCase() === 'ENTRY') {
                        let entryName = t[2][1];

                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = new Registry(entryName).read();
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'SEQUENCE') {
                        let seqName = t[2][1];

                        try {
                            userPrivileges = getPermissions(dbName.get());
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = new DB(dbName.get()).schema(schemaName.get()).sequence(seqName).read().start;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else {
                        output.code = 2;
                        output.message = `Unrecognized command: ${output.sql}`;
                    }
                } else if (t[0][1].toUpperCase() === 'CREATE') {
                    if (t[1][1].toUpperCase() === 'DATABASE') {
                        try {
                            if (!userPrivileges.root) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                DB.create(t[2][1]);
                                output.data = `Created Database ${t[2][1]}.`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'SCHEMA') {
                        try {
                            if (!userPrivileges.create) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                Schema.create(new DB(dbName.get()), t[2][1]);
                                output.data = `Created Schema ${dbName.get()}.${t[2][1]}.`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'SEQUENCE') {
                        try {
                            if (!userPrivileges.create) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                Sequence.create(new DB(dbName.get()).schema(schemaName.get()), t[2][1]);
                                output.data = `Created Sequence ${dbName.get()}.${schemaName.get()}.${t[2][1]};`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'TABLE') {
                        let tableName;
                        let a;
                        let columns = {};
                        let metadata = {
                            primaryKey: []
                        };

                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'TABLE') {
                                a = i + 1;
                                tableName = t[i + 1][1];
                            }

                            // Get columns order
                            if (t[i + 2][0] === 'LEFT_PAREN' || t[i + 2][0] === 'SEPARATOR') {
                                if (t[i + 3][1] === ')') {
                                    break;
                                }

                                // t[i + 3][1] is the name of column
                                columns[t[i + 3][1]] = {};

                                for (let j = i + 3; j < t.length; j++) {
                                    let isType = false;
                                    if (t[j][0] === 'RIGHT_PAREN' || t[j][0] === 'SEPARATOR') {
                                        if (t[j][0] === 'RIGHT_PAREN') {
                                            a = -1;
                                        }

                                        break;
                                    }

                                    if (t[j][0] === 'LITERAL' || t[j][0] === 'BOOLEAN') {
                                        if (t[j][1].toUpperCase() === 'NUMBER') {
                                            isType = true;
                                            columns[t[i + 3][1]].type = 'number';
                                        } else if (t[j][1].toUpperCase() === 'INT' || t[j][1].toUpperCase() === 'INTEGER') {
                                            isType = true;
                                            columns[t[i + 3][1]].type = 'integer';
                                        } else if (t[j][1].toUpperCase() === 'STRING') {
                                            isType = true;
                                            columns[t[i + 3][1]].type = 'string';
                                        } else if (t[j][1].toUpperCase() === 'BOOLEAN') {
                                            isType = true;
                                            columns[t[i + 3][1]].type = 'boolean';
                                        } else if (t[j][1].toUpperCase() === 'OBJECT') {
                                            isType = true;
                                            columns[t[i + 3][1]].type = 'object';
                                        } else if (t[j][1].toUpperCase() === 'KEY') {
                                            if (t[j - 1][1].toUpperCase() === 'PRIMARY') {
                                                metadata.primaryKey.push(t[i + 3][1]);
                                                columns[t[i + 3][1]].notNull = true;
                                                columns[t[i + 3][1]].unique = true;
                                            }
                                        } else if (t[j][1].toUpperCase() === 'UNIQUE') {
                                            columns[t[i + 3][1]].unique = true;
                                        } else if (t[j][1].toUpperCase() === 'DEFAULT') {
                                            if (t[j + 1][0] === 'STRING') {
                                                columns[t[i + 3][1]].default = t[j + 1][1];
                                            } else if (t[j + 1][0] === 'NUMBER') {
                                                columns[t[i + 3][1]].default = parseFloat(t[j + 1][1]);
                                            } else if (t[j + 1][0] === 'BOOLEAN') {
                                                columns[t[i + 3][1]].default = (t[j + 1][1].toUpperCase() === 'TRUE');
                                            }

                                        } else if (t[j][1].toUpperCase() === 'AUTO' && t[j + 1][1].toUpperCase() === 'INCREMENT') {
                                            columns[t[i + 3][1]].autoIncrement = true;
                                        } else if (t[j][1].toUpperCase() === 'NULL') {
                                            columns[t[i + 3][1]].notNull = (t[j - 1][1].toUpperCase() === 'NOT');
                                        }

                                        if (isType && t[j + 1][0] === 'LEFT_PAREN') {
                                            columns[t[i + 3][1]].maxLength = t[j + 2][1];
                                        }
                                    }
                                }
                            }

                            if (a === -1) {
                                break;
                            }
                        }

                        try {
                            if (!userPrivileges.create) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                Table.create(new DB(dbName.get()).schema(schemaName.get()), tableName, columns, metadata);
                                output.data = `Created Table ${dbName.get()}.${schemaName.get()}.${tableName}.`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'USER') {
                        let username = t[2][1];
                        let password = '';
                        let privileges = {'*': 0};
                        let a = 0;
                        let valid = true;

                        for (let i = 1; i < t.length; i++) {
                            if (t[i + 2][0] === 'LEFT_PAREN' || t[i + 2][0] === 'SEPARATOR') {
                                for (let j = i + 3; j < t.length; j++) {
                                    if (t[j][0] === 'RIGHT_PAREN' || t[j][0] === 'SEPARATOR') {
                                        if (t[j][0] === 'RIGHT_PAREN') {
                                            a = -1;
                                        }

                                        break;
                                    }

                                    if (t[j][1].toUpperCase() === 'PASSWORD') {
                                        password = t[j + 2][1];
                                    } else if (t[j][1].toUpperCase() === 'PRIVILEGES') {
                                        privileges = JSON.parse(t[j + 2][1]);
                                    } else if (t[j][1].toUpperCase() === 'VALID') {
                                        valid = (t[j + 2][1].toUpperCase() === 'TRUE');
                                    }
                                }

                                if (a === -1) {
                                    break;
                                }
                            }
                        }

                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.create) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                User.create(username, password, privileges, valid);
                                output.data = `Created User ${username}.`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'ENTRY') {
                        let entryName = t[2][1];
                        let type = 'string';
                        let value = null;
                        let a;

                        for (let i = 1; i < t.length; i++) {
                            // Get columns order
                            if (t[i + 2][0] === 'LEFT_PAREN' || t[i + 2][0] === 'SEPARATOR') {
                                for (let j = i + 3; j < t.length; j++) {
                                    if (t[j][0] === 'RIGHT_PAREN' || t[j][0] === 'SEPARATOR') {
                                        if (t[j][0] === 'RIGHT_PAREN') {
                                            a = -1;
                                        }

                                        break;
                                    }

                                    if (t[j][1].toUpperCase() === 'TYPE') {
                                        type = t[j + 2][1];
                                    } else if (t[j][1].toUpperCase() === 'VALUE') {
                                        if (t[j][0] === 'STRING') {
                                            value = t[j + 2][1];
                                        } else {
                                            value = JSON.parse(t[j + 2][1]);
                                        }
                                    }
                                }
                            }

                            if (a === -1) {
                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.create) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                Registry.create(entryName, type, value);
                                output.data = `Created Registry Entry ${entryName}.`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else {
                        output.code = 2;
                        output.message = `Unrecognized command: ${output.sql}`;
                    }
                } else if (t[0][1].toUpperCase() === 'INSERT') {
                    let tableName;
                    let a = 0;
                    let columns = null;
                    let content;

                    for (let i = 1; i < t.length; i++) {
                        if (t[i][1].toUpperCase() === 'INTO') {
                            a = i + 1;
                            tableName = t[i + 1][1];

                            // Get columns order
                            if (t[i + 2][0] === 'LEFT_PAREN') {
                                columns = [];
                                for (let j = i + 3; j < t.length; j++) {
                                    if (t[j][0] === 'RIGHT_PAREN') {
                                        a = j;
                                        break;
                                    }

                                    if (t[j][0] === 'LITERAL') {
                                        columns.push(t[j][1]);
                                    }
                                }
                            }

                            break;
                        }
                    }

                    for (let i = a + 1; i < t.length; i++) {
                        if (t[i][0] === "LITERAL" && t[i][1].toUpperCase() === 'VALUES' && t[i + 1][0] === 'LEFT_PAREN') {
                            content = [];
                            for (let j = i + 2; j < t.length; j++) {
                                if (t[j][0] === 'RIGHT_PAREN') {
                                    a = j;
                                    break;
                                }

                                if (t[j][0] === 'BOOLEAN' && t[j][1].toUpperCase() === 'NULL') {
                                    t[j][0] = 'NULL';
                                } else if (t[j][0] === 'LITERAL' && t[j][1].toUpperCase() === 'DEFAULT') {
                                    t[j][0] = 'STRING';
                                    t[j][1] = 'DEFAULT';
                                } else if (t[j][0] === 'LITERAL') {
                                    if (t[j][1].toUpperCase() === 'MD5') {
                                        if (t[j + 1][0] === 'LEFT_PAREN' && t[j + 3][0] === 'RIGHT_PAREN') {
                                            t[j][0] = 'STRING';
                                            t[j][1] = md5(t[j + 2][1]);
                                            t.splice(j + 1, 3);
                                        }
                                    } else if (t[j][1].toUpperCase() === 'NEXTVAL') {
                                        if (t[j + 1][0] === 'LEFT_PAREN' && t[j + 3][0] === 'RIGHT_PAREN') {
                                            t[j][0] = 'STRING';
                                            t[j][1] = `nextval(${t[j + 2][1]})`;
                                            t.splice(j + 1, 3);
                                        }
                                    }
                                }

                                if (t[j][0] === 'STRING') {
                                    content.push(t[j][1]);
                                } else if (t[j][0] === 'NUMBER') {
                                    content.push(parseFloat(t[j][1]));
                                } else if (t[j][0] === 'BOOLEAN') {
                                    content.push((t[j][1].toUpperCase() === 'TRUE'));
                                } else if (t[j][0] === 'NULL') {
                                    content.push(null);
                                }
                            }
                        }
                    }

                    try {
                        if (!userPrivileges.update || (dbName.get() === 'jsdb' && schemaName.get() === 'public' && (tableName === 'users' || tableName === 'registry' || tableName === 'default'))) {
                            output.code = 1;
                            output.message = 'Not enough permissions';
                        } else {
                            output.data = new DB(dbName.get()).schema(schemaName.get()).table(tableName).insert(content, columns);
                            output.data = `Inserted ${output.data} rows.`;
                        }
                    } catch (e) {
                        output.code = 1;
                        output.message = e.message;
                    }
                } else if (t[0][1].toUpperCase() === 'UPDATE') {
                    let a = 0;
                    let tableName;
                    let update = {};

                    // Gets the table name
                    for (let i = 1; i < t.length; i++) {
                        if (t[i][1].toUpperCase() === 'SET') {
                            a = i + 1;
                            tableName = t[i - 1][1];

                            // GET update
                            for (let j = 0; j < t.length; j++) {
                                if (t[j][0] !== 'LITERAL' && t[j][0] !== 'STRING' && t[j][0] !== 'NUMBER' && t[j][0] !== 'BOOLEAN' && t[j][0] !== 'OPERATOR' && t[j][0] !== 'SEPARATOR') {
                                    a = i + 1;
                                    break;
                                }

                                if (j + 2 in t && t[j + 2][0] === 'LITERAL') {
                                    if (t[j + 2][1].toUpperCase() === 'DEFAULT') {
                                        t[j + 2][0] = 'STRING';
                                    } else if (t[j + 2][1].toUpperCase() === 'MD5') {
                                        if (t[j + 3][0] === 'LEFT_PAREN' && t[j + 5][0] === 'RIGHT_PAREN') {
                                            t[j + 2][1] = md5(t[j + 4][1]);
                                            t.splice(j + 3, 3);
                                        }
                                    } else if (t[j + 2][0] === 'LITERAL' && t[j + 2][1].toUpperCase() === 'NEXTVAL') {
                                        if (t[j + 3][0] === 'LEFT_PAREN' && t[j + 5][0] === 'RIGHT_PAREN') {
                                            t[j + 2][0] = 'STRING';
                                            t[j + 2][1] = `nextval(${t[j + 4][1]})`;
                                            t.splice(j + 3, 3);
                                        }
                                    }
                                }

                                if (t[j][0] === 'LITERAL' && t[j + 1][1] === '=') {
                                    if (t[j + 2][0] === 'BOOLEAN' && t[j + 2][1].toUpperCase() === 'NULL') {
                                        t[j + 2][0] = 'NULL';
                                    }

                                    if (t[j + 2][0] === 'STRING') {
                                        update[t[j][1]] = t[j + 2][1];
                                    } else if (t[j + 2][0] === 'NUMBER') {
                                        update[t[j][1]] = parseFloat(t[j + 2][1]);
                                    } else if (t[j + 2][0] === 'BOOLEAN') {
                                        update[t[j][1]] = (t[j + 2][1].toUpperCase() === 'TRUE');
                                    } else if (t[j + 2][0] === 'NULL') {
                                        update[t[j][1]] = null;
                                    }
                                }
                            }

                            break;
                        }
                    }

                    // Get options
                    let options = {where: 'true'};
                    for (let i = a + 1; i < t.length; i++) {
                        if (t[i][0] === 'WHERE') {
                            options.where = '';
                            for (let k = i + 1; k < t.length; k++) {
                                // Stop when find something that is not on WHERE params
                                if (t[k][0] !== 'LITERAL' && t[k][0] !== 'OPERATOR' && t[k][0] !== 'CONDITIONAL' && t[k][0] !== 'STRING' && t[k][0] !== 'NUMBER' && t[k][0] !== 'BOOLEAN') {
                                    break;
                                }

                                if (t[k][1] === '=') {
                                    t[k][1] = '==';
                                } else if (t[k][1] === '<>') {
                                    t[k][1] = '!=';
                                } else if (t[k][0] === 'LITERAL') {
                                    if (t[k][1].toUpperCase() === 'DEFAULT') {
                                        t[k][0] = 'STRING';
                                        t[k][1] = `\`${t[k][1]}\``;
                                    } else {
                                        t[k][1] = `\`${t[k][1]}\``;
                                    }
                                } else if (t[k][0] === 'CONDITIONAL') {
                                    t[k][1] = (t[k][1] === 'AND') ? '&&' : '||';
                                } else if (t[k][0] === 'STRING') {
                                    t[k][1] = `\`${t[k][1]}\``;
                                }

                                options.where += t[k][1];
                            }
                        } else if (t[i][0] === 'LIMIT') {
                            options.limitOffset = {};
                            for (let j = i + 1; j < t.length; j++) {
                                if (t[j][0] === 'NUMBER') {
                                    options.limitOffset.limit = parseInt(t[j][1]);
                                    options.limitOffset.offset = 0;
                                } else if (t[j][0] === 'SEPARATOR') {
                                    options.limitOffset.limit = parseInt(t[j + 1][1]);
                                    options.limitOffset.offset = parseInt(t[j - 1][1]);
                                    break;
                                } else if (t[j][0] === 'OFFSET') {
                                    options.limitOffset.limit = parseInt(t[j - 1][1]);
                                    options.limitOffset.offset = parseInt(t[j + 1][1]);
                                    break;
                                }
                            }
                        }
                    }

                    try {
                        if (!userPrivileges.update || (dbName.get() === 'jsdb' && schemaName.get() === 'public' && (tableName === 'users' || tableName === 'registry' || tableName === 'default'))) {
                            output.code = 1;
                            output.message = 'Not enough permissions';
                        } else {
                            output.data = new DB(dbName.get()).schema(schemaName.get()).table(tableName).update(update, options);
                            output.data = `Updated ${output.data} rows.`;
                        }
                    } catch (e) {
                        output.code = 1;
                        output.message = e.message;
                    }
                } else if (t[0][1].toUpperCase() === 'ALTER') {
                    if (t[1][1].toUpperCase() === 'SEQUENCE') {
                        let seqName = t[2][1];
                        let update = {};

                        for (let j = 0; j < t.length; j++) {
                            if (t[j][0] !== 'LITERAL' && t[j][0] !== 'NUMBER') {
                                break;
                            }

                            if (t[j][1].toUpperCase() === 'INCREMENT' && t[j + 1][1].toUpperCase() === 'BY') {
                                update.inc = parseInt(t[j + 2][1]);
                            } else if (t[j][1].toUpperCase() === 'RESTART' && t[j + 1][1].toUpperCase() === 'WITH') {
                                update.start = parseInt(t[j + 2][1]);
                            }
                        }

                        try {
                            if (!userPrivileges.update) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                if (!update.hasOwnProperty('start')) {
                                    update.start = new DB(dbName.get()).schema(schemaName.get()).sequence(seqName).start;
                                }

                                if (!update.hasOwnProperty('inc')) {
                                    update.inc = new DB(dbName.get()).schema(schemaName.get()).sequence(seqName).inc;
                                }

                                new DB(dbName.get()).schema(schemaName.get()).sequence(seqName).update(update);
                                output.data = `Updated Sequence ${dbName.get()}.${schemaName.get()}.${seqName}`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'USER') {
                        let username = t[2][1];
                        let update = {};

                        for (let i = 2; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'SET') {
                                // GET update
                                for (let j = 0; j < t.length; j++) {
                                    if (t[j][0] !== 'LITERAL' && t[j][0] !== 'STRING' && t[j][0] !== 'NUMBER' && t[j][0] !== 'BOOLEAN' && t[j][0] !== 'OPERATOR' && t[j][0] !== 'SEPARATOR') {
                                        break;
                                    }

                                    if (j + 2 in t && t[j + 2][0] === 'LITERAL') {
                                        if (t[j + 2][1].toUpperCase() === 'DEFAULT') {
                                            t[j + 2][0] = 'STRING';
                                        } else if (t[j + 2][1].toUpperCase() === 'MD5') {
                                            if (t[j + 3][0] === 'LEFT_PAREN' && t[j + 5][0] === 'RIGHT_PAREN') {
                                                t[j + 2][1] = md5(t[j + 4][1]);
                                                t.splice(j + 3, 3);
                                            }
                                        } else if (t[j + 2][0] === 'LITERAL' && t[j + 2][1].toUpperCase() === 'NEXTVAL') {
                                            if (t[j + 3][0] === 'LEFT_PAREN' && t[j + 5][0] === 'RIGHT_PAREN') {
                                                t[j + 2][0] = 'STRING';
                                                t[j + 2][1] = `nextval(${t[j + 4][1]})`;
                                                t.splice(j + 3, 3);
                                            }
                                        }
                                    }

                                    if (t[j][0] === 'LITERAL' && t[j + 1][1] === '=') {
                                        if (t[j][0] === 'BOOLEAN' && t[j][1].toUpperCase() === 'NULL') {
                                            t[j][0] = 'NUlL';
                                        }

                                        if (t[j + 2][0] === 'STRING') {
                                            update[t[j][1]] = t[j + 2][1];
                                        } else if (t[j + 2][0] === 'NUMBER') {
                                            update[t[j][1]] = parseFloat(t[j + 2][1]);
                                        } else if (t[j + 2][0] === 'BOOLEAN') {
                                            update[t[j][1]] = (t[j + 2][1].toUpperCase() === 'TRUE');
                                        } else if (t[j + 2][0] === 'NULL') {
                                            update.push(null);
                                        }
                                    }
                                }

                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.update || username === connections[connectionIndex].Username) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                new User(username).update(update);
                                output.data = `Updated User ${username}`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'ENTRY') {
                        let entryName = t[2][1];
                        let value;

                        for (let i = 2; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'SET') {
                                // GET update
                                for (let j = i + 1; j < t.length; j++) {
                                    if (t[j][1].toUpperCase() === 'VALUE' && t[j + 1][1].toUpperCase() === '=') {
                                        if (t[j + 2][0] === 'STRING') {
                                            value = t[j + 2][1];
                                        } else {
                                            value = JSON.parse(t[j + 2][1]);
                                        }
                                    }
                                }

                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (config.registry.instantApplyChanges) {
                                registry.readAllEntries();
                            }
                            if (!userPrivileges.update) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                new Registry(entryName).update(value);
                                output.data = `Updated Entry ${entryName}.`;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    }
                } else if (t[0][1].toUpperCase() === 'DELETE') {
                    let a = 0;
                    let tableName;

                    // Gets the table name
                    for (let i = 1; i < t.length; i++) {
                        if (t[i][0] === 'FROM') {
                            a = i - 1;
                            tableName = t[i + 1][1];
                            break;
                        }
                    }

                    // Get options
                    let options = {where: 'true'};
                    for (let i = a + 1; i < t.length; i++) {
                        if (t[i][0] === 'WHERE') {
                            options.where = '';
                            for (let k = i + 1; k < t.length; k++) {
                                // Stop when find something that is not on WHERE params
                                if (t[k][0] !== 'LITERAL' && t[k][0] !== 'OPERATOR' && t[k][0] !== 'CONDITIONAL' && t[k][0] !== 'STRING' && t[k][0] !== 'NUMBER' && t[k][0] !== 'BOOLEAN') {
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
                                } else if (t[k][0] === 'STRING') {
                                    t[k][1] = `\`${t[k][1]}\``;
                                }

                                options.where += t[k][1];
                            }
                        } else if (t[i][0] === 'LIMIT') {
                            options.limitOffset = {};
                            for (let j = i + 1; j < t.length; j++) {
                                if (t[j][0] === 'NUMBER') {
                                    options.limitOffset.limit = parseInt(t[j][1]);
                                    options.limitOffset.offset = 0;
                                } else if (t[j][0] === 'SEPARATOR') {
                                    options.limitOffset.limit = parseInt(t[j + 1][1]);
                                    options.limitOffset.offset = parseInt(t[j - 1][1]);
                                    break;
                                } else if (t[j][0] === 'OFFSET') {
                                    options.limitOffset.limit = parseInt(t[j - 1][1]);
                                    options.limitOffset.offset = parseInt(t[j + 1][1]);
                                    break;
                                }
                            }
                        }
                    }

                    try {
                        if (!userPrivileges.delete || (dbName.get() === 'jsdb' && schemaName.get() === 'public' && (tableName === 'users' || tableName === 'registry'))) {
                            output.code = 1;
                            output.message = 'Not enough permissions';
                        } else {
                            output.data = new DB(dbName.get()).schema(schemaName.get()).table(tableName).delete(options);
                            output.data = `Deleted ${output.data} rows;`;
                        }
                    } catch (e) {
                        output.code = 1;
                        output.message = e.message;
                    }
                } else if (t[0][1].toUpperCase() === 'DROP') {
                    if (t[1][1].toUpperCase() === 'DATABASE') {
                        let a;
                        let ifExists = false;

                        // Gets the DB name
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'DATABASE') {
                                a = i + 1;
                                dbName.set(t[i + 1][1]);
                            }

                            if (t[i][1].toUpperCase() === 'IF' && t[i + 1][1].toUpperCase() === 'EXISTS') {
                                a = i + 2;
                                dbName.set(t[i + 2][1]);
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions();
                            if (!userPrivileges.root) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                if (ifExists && !DB.exists(dbName.get())) {
                                    output.data = `Warning: Database ${dbName.get()} does not exist.`;
                                } else {
                                    new DB(dbName.get()).drop();
                                    output.data = `Dropped Database ${dbName.get()}.`;
                                }
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'SCHEMA') {
                        let a;
                        let ifExists = false;

                        // Gets the schema name
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'SCHEMA') {
                                a = i + 1;
                                schemaName.set(t[i + 1][1]);
                            }

                            if (t[i][1].toUpperCase() === 'IF' && t[i + 1][1].toUpperCase() === 'EXISTS') {
                                a = i + 2;
                                schemaName.set(t[i + 2][1]);
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            if (!userPrivileges.delete) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                if (ifExists && !Schema.exists(new DB(dbName.get()), schemaName.get())) {
                                    output.data = `Warning: Schema ${dbName.get()}.${schemaName.get()} does not exist.`;
                                } else {
                                    new DB(dbName.get()).schema(schemaName.get()).drop();
                                    output.data = `Dropped Schema ${dbName.get()}.${schemaName.get()}.`;
                                }
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'SEQUENCE') {
                        let seqName;
                        let a;
                        let ifExists = false;

                        // Gets the table name
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'SEQUENCE') {
                                a = i + 1;
                                seqName = t[i + 1][1];
                            }

                            if (t[i][1].toUpperCase() === 'IF' && t[i + 1][1].toUpperCase() === 'EXISTS') {
                                a = i + 2;
                                seqName = t[i + 2][1];
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            if (!userPrivileges.delete) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                if (ifExists && !Sequence.exists(new DB(dbName.get()).schema(schemaName.get()), seqName)) {
                                    output.data = `Warning: Sequence ${dbName.get()}.${schemaName.get()}.${seqName} does not exist.`;
                                } else {
                                    new DB(dbName.get()).schema(schemaName.get()).sequence(seqName).drop();
                                    output.data = `Dropped Sequence ${dbName.get()}.${schemaName.get()}.${seqName}.`;
                                }
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'TABLE') {
                        let tableName;
                        let a;
                        let ifExists = false;

                        // Gets the table name
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'TABLE') {
                                a = i + 1;
                                tableName = t[i + 1][1];
                            }

                            if (t[i][1].toUpperCase() === 'IF' && t[i + 1][1].toUpperCase() === 'EXISTS') {
                                a = i + 2;
                                tableName = t[i + 2][1];
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            if (!userPrivileges.delete) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                if (ifExists && !Sequence.exists(new DB(dbName.get()).schema(schemaName.get()), tableName)) {
                                    output.data = `Warning: Table ${dbName.get()}.${schemaName.get()}.${tableName} does not exist.`;
                                } else {
                                    new DB(dbName.get()).schema(schemaName.get()).table(tableName).drop();
                                    output.data = `Dropped Table ${dbName.get()}.${schemaName.get()}.${tableName}.`;
                                }
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'USER') {
                        let username = t[2][1];
                        let a = 1;
                        let ifExists = false;

                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'USER') {
                                a = i + 1;
                                username = t[i + 1][1];
                            }

                            if (t[i][1].toUpperCase() === 'IF' && t[i + 1][1].toUpperCase() === 'EXISTS') {
                                a = i + 2;
                                username = t[i + 2][1];
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.delete || username === connections[connectionIndex].Username) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                if (ifExists && !User.exists(username)) {
                                    output.data = `Warning: User ${username} does not exist.`;
                                } else {
                                    new User(username).drop();
                                    output.data = `Dropped User ${username}.`;
                                }
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'ENTRY') {
                        let entryName = t[2][1];
                        let a = 1;
                        let ifExists = false;

                        for (let i = 1; i < t.length; i++) {
                            if (t[i][1].toUpperCase() === 'ENTRY') {
                                a = i + 1;
                                entryName = t[i + 1][1];
                            }

                            if (t[i][1].toUpperCase() === 'IF' && t[i + 1][1].toUpperCase() === 'EXISTS') {
                                a = i + 2;
                                entryName = t[i + 2][1];
                                ifExists = true;
                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.delete) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                if (ifExists && !Registry.exists(entryName)) {
                                    output.data = `Warning: Registry Entry ${entryName} does not exist.`;
                                } else {
                                    new Registry(entryName).drop();
                                    output.data = `Dropped Registry Entry ${entryName}.`;
                                }
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else {
                        output.code = 2;
                        output.message = `Unrecognized command: ${output.sql}`;
                    }
                } else if (t[0][1].toUpperCase() === 'SHOW') {
                    if (t[1][1].toUpperCase() === 'DATABASES') {
                        try {
                            let DBList = db.readFile();
                            if (!userPrivileges.root) {
                                DBList.forEach(dbN => {
                                    if (!getPermissions(dbN).read) {
                                        DBList.splice(DBList.indexOf(dbN), 1);
                                    }
                                });
                            }

                            output.data = DBList;
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'SCHEMAS') {
                        // Gets the DB name
                        let d = dbName.get();
                        for (let i = 1; i < t.length; i++) {
                            if (t[i][0] === 'FROM') {
                                dbName.set(t[i + 1][1]);
                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions();
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = schema.readFile(dbName.get());
                            }

                            dbName.set(d);
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;

                            dbName.set(d);
                        }
                    } else if (t[1][1].toUpperCase() === 'SEQUENCES') {
                        // Gets the DB name
                        let d = dbName.get();
                        let s = schemaName.get();

                        for (let i = 1; i < t.length; i++) {
                            if (t[i][0] === 'FROM') {
                                dbName.set(t[i + 1][1]);

                                if (typeof t[i + 2] !== 'undefined' && t[i + 2][0] === 'DOT') {
                                    schemaName.set(t[i + 3][1]);
                                }

                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions();
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = sequence.readFile(dbName.get(), schemaName.get()).sequences;
                            }

                            dbName.set(d);
                            schemaName.set(s);
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;

                            dbName.set(d);
                            schemaName.set(s);
                        }
                    } else if (t[1][1].toUpperCase() === 'TABLES') {
                        // Gets the DB name
                        let d = dbName.get();
                        let s = schemaName.get();

                        for (let i = 1; i < t.length; i++) {
                            if (t[i][0] === 'FROM') {
                                dbName.set(t[i + 1][1]);

                                if (typeof t[i + 2] !== 'undefined' && t[i + 2][0] === 'DOT') {
                                    schemaName.set(t[i + 3][1]);
                                }

                                break;
                            }
                        }

                        try {
                            userPrivileges = getPermissions();
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = table.readFile(dbName.get(), schemaName.get());
                            }

                            dbName.set(d);
                            schemaName.set(s);
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;

                            dbName.set(d);
                            schemaName.set(s);
                        }
                    } else if (t[1][1].toUpperCase() === 'USERS') {
                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = new DB('jsdb').table('users').select(['id', 'username', 'valid', 'privileges'], {});
                                output.data.forEach(r => {
                                    r.valid = (r.valid) ? 'Yes' : 'No';
                                    for (let key in r.privileges) {
                                        if (r.privileges.hasOwnProperty(key)) {
                                            r.privileges[key] = parseInt(r.privileges[key]).toString(2);
                                        }
                                    }
                                });
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else if (t[1][1].toUpperCase() === 'REGISTRY') {
                        try {
                            userPrivileges = getPermissions('jsdb');
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = new DB('jsdb').table('registry').select(['entryName', 'type', 'value'], {});
                                output.data.forEach(r => {
                                    if (r.type !== 'string') {
                                        r.value = JSON.parse(r.value);
                                    }
                                });
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else {
                        output.code = 2;
                        output.message = `Unrecognized command: ${output.sql}`;
                    }
                } else if (t[0][1].toUpperCase() === 'DESCRIBE') {
                    if (t[1][1].toUpperCase() === 'TABLE') {
                        let tableName = t[2][1];

                        try {
                            userPrivileges = getPermissions(dbName.get());
                            if (!userPrivileges.read) {
                                output.code = 1;
                                output.message = 'Not enough permissions';
                            } else {
                                output.data = table.readStructure(dbName.get(), schemaName.get(), tableName);
                                output.data.__metadata.primaryKey.forEach(pk => output.data.columns[pk].primaryKey = true);
                                output.data = output.data.columns;
                            }
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else {
                        output.code = 2;
                        output.message = `Unrecognized command: ${output.sql}`;
                    }
                } else if (t[0][1].toUpperCase() === 'RELOAD') {
                    if (t[1][1].toUpperCase() === 'CONFIG') {
                        try {
                            registry.readAllEntries();
                            output.data = 'All entries were reloaded.';
                        } catch (e) {
                            output.code = 1;
                            output.message = e.message;
                        }
                    } else {
                        output.code = 2;
                        output.message = `Unrecognized command: ${output.sql}`;
                    }
                } else {
                    output.code = 2;
                    output.message = `Unrecognized command: ${output.sql}`;
                }

                if (output.code !== 0) {
                    // Restore backup
                    dbs.forEach(dbN => {
                        db.restore(dbN);
                    });

                    // Stop the code execution if a command fails
                    break;
                }
            }
        }

        if (perf) {
            output.time = performance.now() - output.time;
        }

        return output;

    }
);
