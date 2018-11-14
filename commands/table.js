const fs = require('fs');
const db = require('./db');
const scheme = require('./scheme');
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
function createTable(dbName, schemeName, tableName, tableStruct, metadata = null) {
    if (typeof dbName === "string" && typeof schemeName === "string" && typeof tableName === "string") {
        let TableList = readTableFile(dbName, schemeName);

        if (TableList.indexOf(tableName) === -1) {
            TableList.push(tableName);
            writeTableFile(dbName, schemeName, JSON.stringify(TableList));
            createTableFolder(dbName, schemeName, tableName);

            if (metadata !== null) {
                tableStruct[tableName + '.metadata'] = metadata;
            }

            for (let key in tableStruct) {
                if (tableStruct.hasOwnProperty(key)) {
                    if (tableStruct[key]['type'] === 'number' && tableStruct[key]['autoIncrement'] === 'yes') {
                        delete(tableStruct[key]['autoIncrement']);
                        tableStruct[key]['default'] = 'sequence(' + key + '_seq)';
                        sequence.create(dbName, schemeName, tableName, key + '_seq');
                    }
                }
            }
            writeTableStructure(dbName, schemeName, tableName, tableStruct);
            writeTableContent(dbName, schemeName, tableName, null);

            return "Created table " + schemeName + "." + tableName + " in DB " + dbName;
        } else {
            return "Table " + schemeName + "." + tableName + " already exists in DB " + dbName;
        }
    }
}

/**
 *
 * */
function readTableStructure(dbName, schemeName, tableName) {
    try {
        let r = [];

        let TableList = readTableFile(dbName, schemeName);

        if (TableList.indexOf(tableName) !== -1) {
            r = JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tablestruct, 'utf8'));
        }

        return r;
    } catch (e) {
        writeTableStructure(dbName, schemeName, tableName, []);
        return readTableStructure(dbName, schemeName, tableName);
    }
}

/**
 *
 * */
function writeTableStructure(dbName, schemeName, tableName, tableStruct) {
    fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tablestruct, JSON.stringify(tableStruct));
}

/**
 *
 * */
function readTableFile(dbName, schemeName) {
    try {
        let DBList = db.readFile();
        let SCHList = scheme.readFile(dbName);

        let TableList = [];

        if (DBList.indexOf(dbName) !== -1 && SCHList.indexOf(schemeName) !== -1) {
            TableList = JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + f_tablelist, 'utf8'));

            fs.readdirSync(server.startDir + "dbs/" + dbName + "/" + schemeName).forEach(tablename => {
                if (tablename !== f_tablelist) {
                    if (TableList.indexOf(tablename) === -1) {
                        TableList.push(tablename);
                        writeTableFile(dbName, schemeName, JSON.stringify(TableList));
                    }
                }
            });

            TableList.forEach(tablename => {
                if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tablename)) {
                    createTableFolder(tablename);
                }
            });
        }

        return TableList;
    } catch (e) {
        writeTableFile(dbName, schemeName, '[]');
        return readTableFile(dbName, schemeName);
    }
}

/**
 *
 * */
function writeTableFile(dbName, schemeName, content) {
    fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + f_tablelist, content);
}

/**
 *
 * */
function createTableFolder(dbName, schemeName, tableName) {
    if (!fs.existsSync(server.startDir + "dbs/")) {
        fs.mkdirSync(server.startDir + "dbs/");
    }

    if (!fs.existsSync(server.startDir + "dbs/" + dbName)) {
        throw Error("DB not created");
    }

    if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemeName)) {
        throw Error("Scheme not created");
    }

    fs.mkdirSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName);
}

/**
 *
 * */
function readTableContent(dbName, schemeName, tableName) {
    try {
        let r = [];

        let TableList = readTableFile(dbName, schemeName);

        if (TableList.indexOf(tableName) !== -1) {
            r = JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tabledata, 'utf8'));
        }
        return r;
    } catch (e) {
        writeTableContent(dbName, schemeName, tableName, []);
        return readTableContent(dbName, schemeName, tableName);
    }
}

/**
 *
 * */
function writeTableContent(dbName, schemeName, tableName, content, override = false) {
    let TableContent = [];
    /*
    * Checks if tabledata.json exists to avoid loops
    * */
    if (fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tabledata)) {
        TableContent = readTableContent(dbName, schemeName, tableName);
    }

    if (content !== null) {
        if (typeof override === "boolean") {
            if (override) {
                TableContent = content;
            } else {
                TableContent.push(content);
            }
        }

    }

    fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tabledata, JSON.stringify(TableContent));

    return "Line inserted.";
}

/**
 *
 * */
function dropTable() {

}


/* SQL Commands */

/**
 * @summary This is the table SELECT function scope
 *
 * @param dbName The name of DB
 * @param schemeName The name of the scheme
 * @param tableName The table name
 * @param columns The desired columns in an indexed array
 * @param options Options like WHERE, ORDER BY, etc.
 *
 * @returns Array returns an indexed array with multiple named arrays containg the data of each cell
 * */
function selectTableContent(dbName, schemeName, tableName, columns, options) {
    let TableList = readTableFile(dbName, schemeName);

    if (TableList.indexOf(tableName) === -1) {
        throw new Error("Table does not exist");
    }

    let TableContent = readTableContent(dbName, schemeName, tableName);
    let TableStruct = readTableStructure(dbName, schemeName, tableName);

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

/**
 *
 * */
function insertTableContent(dbName, schemeName, tableName, content, columns = null) {
    let TableList = readTableFile(dbName, schemeName);

    if (TableList.indexOf(tableName) === -1) {
        throw new Error("Table does not exist");
    }

    let TableStruct = readTableStructure(dbName, schemeName, tableName);
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
        if (columns !== null) {
            if (content.length !== columns.length) {
                throw new Error("Columns length does not match with provided values");
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
                if (typeof content[i] === "undefined") {
                    content[i] = null;
                }

                if (content[i] === null) {
                    if (TableStruct[key]['notNull']) {
                        throw new Error("`" + key + "` cannot be null");
                    }
                }

                if (TableStruct[key]['unique'] === 'yes') {
                    let TableContent = readTableContent(dbName, schemeName, tableName);
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
                        let Seq = sequence.read(dbName, schemeName, tableName, seqName);

                        content[i] = Seq['start'];

                        Seq['start'] = Seq['start'] + Seq['inc'];

                        sequence.update(dbName, schemeName, tableName, seqName, Seq);
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

    return writeTableContent(dbName, schemeName, tableName, ContentW);
}

/**
 *
 * */
function updateTableContent(dbName, schemeName, tableName, update, options) {
    let TableList = readTableFile(dbName, schemeName);

    if (TableList.indexOf(tableName) === -1) {
        throw new Error("Table does not exist");
    }

    /*
    * @todo: Make UPDATE command
    * */
    let TableContent = readTableContent(dbName, schemeName, tableName);
    let TableStruct = readTableStructure(dbName, schemeName, tableName);
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
                        e = e.replace(new RegExp(`\`${key}\``, 'g'), "'" + aaa[i][key].toString() + "'");
                    }
                }
            }

            if (eval(e)) {
                for (let key in update) {
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

                        if (TableStruct[key]['unique'] === 'yes') {
                            let TableContent = readTableContent(dbName, schemeName, tableName);
                            TableContent.forEach(c => {
                                if (c[i] === update[key]) {
                                    throw new Error("Value already exists");
                                }
                            });
                        }

                        if (typeof update[key] === "string" && update[key].toUpperCase() === 'DEFAULT') {
                            let a;
                            /*
                            * If true, it's a sequence
                            * */
                            if (typeof TableStruct[key]['default'] === "string" && (a = TableStruct[key]['default'].search("sequence[(].*[)]")) !== -1) {
                                let seqName = TableStruct[key]['default'].slice(a + "sequence(".length, TableStruct[key]['default'].length - 1);
                                let Seq = sequence.read(dbName, schemeName, tableName, seqName);

                                update[key] = Seq['start'];

                                Seq['start'] = Seq['start'] + Seq['inc'];

                                sequence.update(dbName, schemeName, tableName, seqName, Seq);
                            } else {
                                update[key] = TableStruct[key]['default'];
                            }
                        } else {
                            if (typeof update[key] !== TableStruct[key]['type']) {
                                throw Error("Invalid type");
                            }
                        }

                        if (typeof offset !== "undefined") {
                            TableContent[i + offset][j] = update[key];
                        } else {
                            TableContent[i][j] = update[key];
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

    writeTableContent(dbName, schemeName, tableName, TableContent, true);

    return "Updated " + c + " line(s) from " + dbName + ":" + schemeName + ":" + tableName + ".";
}

/**
 *
 * */
function deleteTableContent(dbName, schemeName, tableName, options) {
    /*
    * @todo: Make DELETE command
    * */

    let TableList = readTableFile(dbName, schemeName);

    if (TableList.indexOf(tableName) === -1) {
        throw new Error("Table does not exist");
    }

    let TableContent = readTableContent(dbName, schemeName, tableName);
    let TableStruct = readTableStructure(dbName, schemeName, tableName);

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
                        e = e.replace(new RegExp(`\`${key}\``, 'g'), "'" + aaa[i][key].toString() + "'");
                    }
                }
            }

            if (eval(e)) {
                if (typeof offset !== "undefined") {
                    TableContent.splice(i + offset, 1);
                } else {
                    TableContent.splice(i, 1);
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

    writeTableContent(dbName, schemeName, tableName, TableContent, true);

    return "Deleted " + c + " line(s) from " + dbName + ":" + schemeName + ":" + tableName + ".";
}

exports.create = createTable;
exports.drop = dropTable;
exports.select = selectTableContent;
exports.insert = insertTableContent;
exports.update = updateTableContent;
exports.delete = deleteTableContent;

exports.readFile = readTableFile;
exports.writeFile = writeTableFile;