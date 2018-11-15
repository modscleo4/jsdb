const fs = require('fs');
const db = require('./db');
const schema = require('./schema');
const sequence = require('./sequence');
const server = require('../server');

const f_tablelist = 'tablelist.json';
const f_tablestruct = 'tablestruct.json';
const f_tabledata = 'tabledata.json';

exports.f_tablestruct = f_tablestruct;
exports.f_tabledata = f_tabledata;

/**
 *
 * */
function createTable(dbName, schemaName, tableName, tableStruct, metadata = null) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof tableStruct === "object" && typeof metadata === "object") {
        let TableList = readTableFile(dbName, schemaName);

        if (TableList.indexOf(tableName) !== -1) {
            throw new Error("Table " + schemaName + "." + tableName + " already exists in DB " + dbName);
        } else {
            TableList.push(tableName);
            writeTableFile(dbName, schemaName, JSON.stringify(TableList));
            createTableFolder(dbName, schemaName, tableName);

            if (metadata !== null) {
                tableStruct[tableName + '.metadata'] = metadata;
            }

            for (let key in tableStruct) {
                if (tableStruct.hasOwnProperty(key)) {
                    if (tableStruct[key]['type'] === 'number' && tableStruct[key]['autoIncrement']) {
                        delete(tableStruct[key]['autoIncrement']);
                        tableStruct[key]['default'] = 'sequence(' + key + '_seq)';
                        sequence.create(dbName, schemaName, tableName, key + '_seq');
                    }
                }
            }

            writeTableStructure(dbName, schemaName, tableName, tableStruct);
            writeTableContent(dbName, schemaName, tableName, null);

            return "Created table " + schemaName + "." + tableName + " in DB " + dbName;
        }
    }
}

/**
 *
 * */
function readTableStructure(dbName, schemaName, tableName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string") {
        if (existsTable(dbName, schemaName, tableName)) {
            if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_tablestruct)) {
                dropTable(dbName, schemaName, tableName, true);
                throw new Error("Structure for table " + dbName + ":" + schemaName + ":" + tableName + " is missing. Table dropped");
            }

            return JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_tablestruct, 'utf8'));
        }
    }
}

/**
 *
 * */
function writeTableStructure(dbName, schemaName, tableName, tableStruct) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof tableStruct === "object") {
        if (existsTable(dbName, schemaName, tableName)) {
            fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_tablestruct, JSON.stringify(tableStruct));
        }
    }
}

/**
 *
 * */
function readTableFile(dbName, schemaName) {
    if (typeof dbName === "string" && typeof schemaName === "string") {
        if (schema.exists(dbName, schemaName)) {
            if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + f_tablelist)) {
                writeTableFile(dbName, schemaName, JSON.stringify([]));
                return [];
            }

            let TableList = JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + f_tablelist, 'utf8'));

            fs.readdirSync(server.startDir + "dbs/" + dbName + "/" + schemaName).forEach(tableName => {
                if (tableName !== f_tablelist) {
                    if (TableList.indexOf(tableName) === -1) {
                        TableList.push(tableName);
                        writeTableFile(dbName, schemaName, JSON.stringify(TableList));
                    }
                }
            });

            TableList.forEach(tableName => {
                if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName)) {
                    createTableFolder(tableName);
                }
            });

            return TableList;
        }
    }
}

/**
 *
 * */
function writeTableFile(dbName, schemaName, content) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof content === "string") {
        if (schema.exists(dbName, schemaName)) {
            fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + f_tablelist, content);
        }
    }
}

/**
 *
 * */
function createTableFolder(dbName, schemaName, tableName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string") {
        if (schema.exists(dbName, schemaName)) {
            if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName)) {
                fs.mkdirSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName);
            }
        }
    }
}

/**
 *
 * */
function readTableContent(dbName, schemaName, tableName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string") {
        if (existsTable(dbName, schemaName, tableName)) {
            return JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_tabledata, 'utf8'));
        }
    }
}

/**
 *
 * */
function writeTableContent(dbName, schemaName, tableName, content, override = false) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof content === "object" && typeof override === "boolean") {
        let TableContent = [];

        /*
        * Checks if tabledata.json exists to avoid loops
        * */
        if (fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_tabledata)) {
            TableContent = readTableContent(dbName, schemaName, tableName);
        }

        if (content !== null) {
            if (override) {
                TableContent = content;
            } else {
                TableContent.push(content);
            }
        }

        fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_tabledata, JSON.stringify(TableContent));

        return "Line inserted.";
    }
}

/**
 *
 * */
function dropTable(dbName, schemaName, tableName, ifExists = false) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof ifExists === "boolean") {
        /*
        * @TODO: DROP TABLE
        * */

        if ((ifExists && readTableFile(dbName, schemaName).indexOf(tableName) !== -1) || (!ifExists && existsTable(dbName, schemaName, tableName))) {
            let TableList = readTableFile(dbName, schemaName);
            let i = TableList.indexOf(tableName);
            TableList.splice(i, 1);
            writeTableFile(dbName, schemaName, JSON.stringify(TableList));
            server.rmdirRSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/");

            return "Dropped table " + tableName;
        } else {
            return "Table " + tableName + " does not exist";
        }
    }
}


/* SQL Commands */

/**
 * @summary This is the table SELECT function scope
 *
 * @param dbName The name of DB
 * @param schemaName The name of the schema
 * @param tableName The table name
 * @param columns The desired columns in an indexed array
 * @param options Options like WHERE, ORDER BY, etc.
 *
 * @returns Array returns an indexed array with multiple named arrays containg the data of each cell
 * */
function selectTableContent(dbName, schemaName, tableName, columns, options) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof columns === "object" && typeof options === "object") {
        let TableList = readTableFile(dbName, schemaName);

        if (TableList.indexOf(tableName) === -1) {
            throw new Error("Table does not exist");
        }

        let TableContent = readTableContent(dbName, schemaName, tableName);
        let TableStruct = readTableStructure(dbName, schemaName, tableName);

        if (typeof options['limoffset'] !== "undefined") {
            let limit = options['limoffset']['limit'];
            let offset = options['limoffset']['offset'];

            if (typeof TableContent[limit] === "undefined") {
                throw new Error("LIMIT greater than number of rows");
            }

            TableContent = TableContent.splice(offset, limit);
        }

        /*
        * Auxiliary array for WHERE
        * */
        let aaa = [];
        for (let i = 0; i < TableContent.length; i++) {
            let j = 0;
            aaa[i] = {};
            for (let key in TableStruct) {
                if (TableStruct.hasOwnProperty(key)) {
                    if (key !== tableName + '.metadata') {
                        aaa[i][key] = TableContent[i][j];
                    }
                    j++;
                }
            }
        }

        let r = [];
        if (columns[0] === "*") {
            for (let i = 0; i < TableContent.length; i++) {
                let j = 0;
                r[i] = {};
                for (let key in TableStruct) {
                    if (TableStruct.hasOwnProperty(key)) {
                        if (key !== tableName + '.metadata') {
                            r[i][key] = TableContent[i][j];
                        }
                        j++;
                    }
                }
            }
        } else {
            for (let i = 0; i < TableContent.length; i++) {
                r[i] = {};
                columns.forEach(column => {
                    let j = 0;
                    for (let key in TableStruct) {
                        if (TableStruct.hasOwnProperty(key)) {
                            if (key !== tableName + '.metadata') {
                                if (key === column) {
                                    r[i][key] = TableContent[i][j];
                                }
                            }
                            j++;
                        }
                    }
                });
            }
        }

        if (typeof options['where'] !== "undefined") {
            /*
            * @todo SQL WHERE
            * */
            for (let i = 0; i < r.length; i++) {
                let e = options['where'];
                for (let key in aaa[i]) {
                    if (aaa[i].hasOwnProperty(key)) {
                        if (e.search(new RegExp(`\`${key}\``, 'g')) !== -1) {
                            e = e.replace(new RegExp(`\`${key}\``, 'g'), "'" + aaa[i][key].toString() + "'");
                        }
                    }
                }

                if (!eval(e)) {
                    aaa.splice(i, 1);
                    r.splice(i, 1);
                    i = -1;
                }
            }
        }

        if (typeof options['orderby'] !== "undefined") {
            function getC(orderby) {
                if (typeof orderby[0]['column'] === "undefined") {
                    if (typeof TableStruct[tableName + '.metadata']['primaryKey'] === "undefined") {
                        let key;
                        for (key in TableStruct) {
                            break;
                        }

                        return TableStruct[key];
                    } else {
                        return TableStruct[tableName + '.metadata']['primaryKey'][0];
                    }
                } else {
                    if (typeof TableStruct[orderby[0]['column']] === "undefined") {
                        throw new Error("Column " + orderby[0]['column'] + " does not exist");
                    }
                    return orderby[0]['column'];
                }
            }

            function getM(orderby) {
                if (typeof orderby[0]['mode'] === "undefined") {
                    return "ASC";
                } else {
                    return orderby[0]['mode'];
                }
            }

            function sorting(orderby) {
                return function (a, b) {
                    let c = getC(orderby);
                    let m = getM(orderby);

                    if (m.toUpperCase() === "DESC") {
                        if (a[c] < b[c]) {
                            return 1;
                        } else if (a[c] > b[c]) {
                            return -1;
                        } else {
                            if (orderby.length > 1) {
                                return sorting(orderby.slice(1))(a, b);
                            }
                        }
                    } else {
                        if (a[c] < b[c]) {
                            return -1;
                        } else if (a[c] > b[c]) {
                            return 1;
                        } else {
                            if (orderby.length > 1) {
                                return sorting(orderby.slice(1))(a, b);
                            }
                        }
                    }

                    return 0;
                }
            }

            r = r.sort(sorting(options['orderby']));
        }


        return r;
    }
}

/**
 * @summary This is the table INSERT INTO function scope
 *
 * @param dbName The name of DB
 * @param schemaName The name of the schema
 * @param tableName The table name
 * @param content The values to insert
 * @param columns The columns of content and the order (optional)
 *
 * @returns string If inserted, returns a string
 * */
function insertTableContent(dbName, schemaName, tableName, content, columns = null) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof content === "object" && typeof columns === "object") {
        let TableList = readTableFile(dbName, schemaName);

        if (TableList.indexOf(tableName) === -1) {
            throw new Error("Table does not exist");
        }

        let TableStruct = readTableStructure(dbName, schemaName, tableName);
        let TColumns = Object.keys(TableStruct);
        /*
        * Remove <tableName>.metadata from Columns list
        * */
        for (let c = 0; c < TColumns.length; c++) {
            if (TColumns[c] === tableName + ".metadata") {
                TColumns.splice(c, 1);
            }
        }
        let ContentW = [];

        if (content !== null) {
            if (columns === null && content.length !== TColumns.length) {
                throw new Error("Number of columns does not match with provided values (required: " + TColumns.length + ")");
            }

            if (columns !== null) {
                if (content.length !== columns.length) {
                    throw new Error("Number of columns does not match with provided values");
                }
            }

            let i = 0;
            let F = false;

            if (columns !== null) {
                for (let c = 0; c < TColumns.length; c++) {
                    for (let aux = 0; aux < columns.length; aux++) {
                        if (TColumns.indexOf(columns[aux]) === -1) {
                            throw new Error("Invalid column: " + columns[aux]);
                        }

                        /*
                        * Get first index
                        * */
                        if (TColumns[c] === columns[aux]) {
                            i = aux;
                            F = true;
                            break;
                        }
                    }

                    if (F) {
                        F = false;
                        break;
                    }
                }
            }

            for (let c = 0; c < TColumns.length; c++) {
                let key = TColumns[c];

                /*
                * Add null val to content if column does not match key
                * */
                if (columns !== null) {
                    if (key !== columns[i]) {
                        content.push(null);
                        columns.push(key);
                        i = columns.length - 1;
                    }

                    columns[i] = ".ignore";
                }

                /*
                * Ignore tablename.metadata array to avoid errors
                * */
                if (key !== tableName + ".metadata") {

                    /*
                    * Key is not provided
                    * */
                    if (typeof content[i] === "undefined") {
                        content[i] = "DEFAULT";
                    }

                    if (content[i] === null) {
                        if (TableStruct[key]['notNull']) {
                            throw new Error("`" + key + "` cannot be null");
                        }
                    }

                    if (TableStruct[key]['unique'] === true) {
                        let TableContent = readTableContent(dbName, schemaName, tableName);
                        TableContent.forEach(c => {
                            if (c[i] === content[i]) {
                                throw new Error("Value already exists: " + c[i]);
                            }
                        });
                    }

                    if (typeof content[i] === "string" && content[i].toUpperCase() === 'DEFAULT') {
                        let a;

                        /*
                        * If true, it's a sequence
                        * */
                        if (typeof TableStruct[key]['default'] === "string" && (a = TableStruct[key]['default'].search("sequence[(].*[)]")) !== -1) {
                            let seqName = TableStruct[key]['default'].slice(a + "sequence(".length, TableStruct[key]['default'].length - 1);
                            let Seq = sequence.read(dbName, schemaName, tableName, seqName);

                            content[i] = Seq['start'];

                            Seq['start'] = Seq['start'] + Seq['inc'];

                            sequence.update(dbName, schemaName, tableName, seqName, Seq);
                        } else {
                            content[i] = TableStruct[key]['default'];
                        }
                    }

                    if (typeof content[i] !== TableStruct[key]['type']) {
                        throw new Error("Invalid type for column `" + key + "`: " + content[i] + " (" + typeof content[i] + ")");
                    }

                    if (typeof content[i] !== "undefined") {
                        ContentW[c] = content[i];
                        delete(content[i]);
                    }

                    if (columns === null) {
                        i++;
                    } else {
                        i = 0;

                        let f = true;
                        for (let j = 0; j < columns.length; j++) {
                            if (columns[j] !== ".ignore") {
                                f = false;
                                break;
                            }
                        }

                        if (f) {
                            columns = null;
                            i++;
                        } else {
                            for (let ca = 0; ca < TColumns.length; ca++) {
                                for (let aux = 0; aux < columns.length; aux++) {
                                    if (columns[aux] !== ".ignore" && TColumns.indexOf(columns[aux]) === -1) {
                                        throw new Error("Invalid column: " + columns[aux]);
                                    }

                                    /*
                                    * Get the next index
                                    * */
                                    if (TColumns[ca] === columns[aux]) {
                                        i = aux;
                                        F = true;
                                        break;
                                    }
                                }

                                if (F) {
                                    F = false;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        return writeTableContent(dbName, schemaName, tableName, ContentW);
    }
}

/**
 * @summary This is the table UPDATE function scope
 *
 * @param dbName The name of DB
 * @param schemaName The name of the schema
 * @param tableName The table name
 * @param update The values to update in a named array
 * @param options Options like WHERE, ORDER BY, etc.
 *
 * @returns string Returns a string containing the count of affected rows
 * */
function updateTableContent(dbName, schemaName, tableName, update, options) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof update === "object" && typeof options === "object") {
        if (existsTable(dbName, schemaName, tableName)) {
            /*
            * @todo: Make UPDATE command
            * */
            let TableContent = readTableContent(dbName, schemaName, tableName);
            let TableStruct = readTableStructure(dbName, schemaName, tableName);
            let TableIndexes = [];

            /*
            * Auxiliary array for WHERE
            * */
            let aaa = [];
            for (let i = 0; i < TableContent.length; i++) {
                let j = 0;
                aaa[i] = {};
                for (let key in TableStruct) {
                    if (TableStruct.hasOwnProperty(key)) {
                        if (key !== tableName + '.metadata') {
                            TableIndexes[j] = key;
                            aaa[i][key] = TableContent[i][j];
                        }
                        j++;
                    }
                }
            }

            let b = 0;
            let c = 0;
            if (typeof options['where'] !== "undefined") {
                /*
                * @todo SQL WHERE
                * */
                for (let i = 0; i < TableContent.length; i++) {
                    let e = options['where'];
                    for (let key in aaa[i]) {
                        if (aaa[i].hasOwnProperty(key)) {
                            if (e.search(new RegExp(`\`${key}\``, 'g')) !== -1) {
                                if (TableStruct[key]['type'] === "string") {
                                    e = e.replace(new RegExp(`\`${key}\``, 'g'), "'" + aaa[i][key].toString() + "'");
                                } else {
                                    e = e.replace(new RegExp(`\`${key}\``, 'g'), aaa[i][key].toString());
                                }
                            }
                        }
                    }

                    if (eval(e)) {
                        b++;
                        for (let key in update) {
                            let isDefault = false;
                            if (update.hasOwnProperty(key)) {
                                if (!aaa[0].hasOwnProperty(key)) {
                                    throw new Error("Column " + key + " does not exist.");
                                }

                                let j = 0;
                                for (j; j < TableIndexes.length; j++) {
                                    if (TableIndexes[j] === key) {
                                        break;
                                    }
                                }

                                if (typeof update[key] === "string" && update[key].toUpperCase() === 'DEFAULT') {
                                    let a;
                                    /*
                                    * If true, it's a sequence
                                    * */
                                    if (typeof TableStruct[key]['default'] === "string" && (a = TableStruct[key]['default'].search("sequence[(].*[)]")) !== -1) {
                                        let seqName = TableStruct[key]['default'].slice(a + "sequence(".length, TableStruct[key]['default'].length - 1);
                                        let Seq = sequence.read(dbName, schemaName, tableName, seqName);

                                        update[key] = Seq['start'];
                                        isDefault = true;

                                        Seq['start'] = Seq['start'] + Seq['inc'];

                                        sequence.update(dbName, schemaName, tableName, seqName, Seq);
                                    } else {
                                        update[key] = TableStruct[key]['default'];
                                    }
                                } else {
                                    if (typeof update[key] !== TableStruct[key]['type']) {
                                        throw Error("Invalid type");
                                    }
                                }

                                if (TableStruct[key]['unique'] === true) {
                                    //let TableContentA = readTableContent(dbName, schemaName, tableName);
                                    TableContent.forEach(c => {
                                        if (c[j] === update[key]) {
                                            throw new Error("Value already exists: " + c[j]);
                                        }
                                    });
                                }

                                if (typeof offset !== "undefined") {
                                    TableContent[i + offset][j] = update[key];
                                } else {
                                    TableContent[i][j] = update[key];
                                }

                                if (isDefault) {
                                    update[key] = "DEFAULT";
                                }
                            }
                        }
                    }

                    c++;
                    if (typeof limit !== "undefined") {
                        if (c === limit) {
                            break;
                        }
                    }
                }
            }

            writeTableContent(dbName, schemaName, tableName, TableContent, true);

            return "Updated " + b + " line(s) from " + dbName + ":" + schemaName + ":" + tableName + ".";
        }
    }
}

/**
 * @summary This is the table DELETE function scope
 *
 * @param dbName The name of DB
 * @param schemaName The name of the schema
 * @param tableName The table name
 * @param options Options like WHERE, ORDER BY, etc.
 *
 * @returns string Returns a string containing the count of affected rows
 * */
function deleteTableContent(dbName, schemaName, tableName, options) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof options === "object") {
        /*
        * @todo: Make DELETE command
        * */

        if (existsTable(dbName, schemaName, tableName)) {

            let TableContent = readTableContent(dbName, schemaName, tableName);
            let TableStruct = readTableStructure(dbName, schemaName, tableName);

            if (typeof options['limoffset'] !== "undefined") {
                let limit = options['limoffset']['limit'];
                let offset = options['limoffset']['offset'];

                if (typeof TableContent[limit] === "undefined") {
                    throw new Error("LIMIT greater than number of rows");
                }
            }

            /*
            * Auxiliary array for WHERE
            * */
            let aaa = [];
            for (let i = 0; i < TableContent.length; i++) {
                let j = 0;
                aaa[i] = {};
                for (let key in TableStruct) {
                    if (TableStruct.hasOwnProperty(key)) {
                        if (key !== tableName + '.metadata') {
                            aaa[i][key] = TableContent[i][j];
                        }
                        j++;
                    }
                }
            }

            let b = 0;
            let c = 0;
            if (options['where'] !== null) {
                /*
                * @todo SQL WHERE
                * */
                for (let i = 0; i < TableContent.length; i++) {
                    let e = options['where'];
                    for (let key in aaa[i]) {
                        if (aaa[i].hasOwnProperty(key)) {
                            if (e.search(new RegExp(`\`${key}\``, 'g')) !== -1) {
                                if (TableStruct[key]['type'] === "string") {
                                    e = e.replace(new RegExp(`\`${key}\``, 'g'), "'" + aaa[i][key].toString() + "'");
                                } else {
                                    e = e.replace(new RegExp(`\`${key}\``, 'g'), aaa[i][key].toString());
                                }
                            }
                        }
                    }

                    if (eval(e)) {
                        b++;
                        if (typeof offset !== "undefined") {
                            TableContent.splice(i + offset, 1);
                            aaa.splice(i + offset, 1);
                        } else {
                            TableContent.splice(i, 1);
                            aaa.splice(i, 1);
                        }

                        i = -1;
                    }

                    c++;
                    if (typeof limit !== "undefined") {
                        if (c === limit) {
                            break;
                        }
                    }
                }
            }

            writeTableContent(dbName, schemaName, tableName, TableContent, true);

            return "Deleted " + b + " line(s) from " + dbName + ":" + schemaName + ":" + tableName + ".";
        }
    }
}

/**
 *
 * */
function existsTable(dbName, schemaName, tableName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string") {
        if (schema.exists(dbName, schemaName)) {
            let TableList = readTableFile(dbName, schemaName);
            if (TableList.indexOf(tableName) !== -1) {
                return true;
            } else {
                throw new Error("Table " + dbName + ":" + schemaName + ":" + tableName + " does not exist.");
            }
        }
    }
}

exports.create = createTable;
exports.drop = dropTable;
exports.select = selectTableContent;
exports.insert = insertTableContent;
exports.update = updateTableContent;
exports.delete = deleteTableContent;

exports.readFile = readTableFile;
exports.writeFile = writeTableFile;

exports.exists = existsTable;