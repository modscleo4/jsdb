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
function createTable(dbName, schemeName, tableName, tableStruct) {
    if (typeof dbName === "string" && typeof schemeName === "string" && typeof tableName === "string") {
        let TableList = readTableFile(dbName, schemeName);

        if (TableList.indexOf(tableName) === -1) {
            TableList.push(tableName);
            writeTableFile(dbName, schemeName, JSON.stringify(TableList));
            createTableFolder(dbName, schemeName, tableName);

            writeTableStructure(dbName, schemeName, tableName, tableStruct);
            writeTableContent(dbName, schemeName, tableName, null);

            for (let key in tableStruct) {
                if (tableStruct[key]['type'] === 'number' && tableStruct[key]['autoIncrement'] === 'yes') {
                    sequence.create(dbName, schemeName, tableName, key + '_seq');
                }
            }

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
function writeTableContent(dbName, schemeName, tableName, content) {
    let TableContent = [];
    /*
    * Checks if tabledata.json exists to avoid loops
    * */
    if (fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tabledata)) {
        TableContent = readTableContent(dbName, schemeName, tableName);
    }

    if (content !== null) {
        TableContent.push(content);
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
 *
 * */
function selectTableContent(dbName, schemeName, tableName, columns) {
    try {
        let TableContent = readTableContent(dbName, schemeName, tableName);
        let TableStruct = readTableStructure(dbName, schemeName, tableName);

        let r = {};
        if (columns[0] === "*") {
            for (let i = 0; i < TableContent.length; i++) {
                let j = 0;
                r[i] = {};
                for (let key in TableStruct) {
                    r[i][key] = TableContent[i][j];
                    j++;
                }
            }

            return r;
        } else {
            for (let i = 0; i < TableContent.length; i++) {
                let j = 0;
                r[i] = {};
                columns.forEach(column => {
                    for (let key in TableStruct) {
                        if (key === column) {
                            r[i][key] = TableContent[i][j];
                            j++;
                        }
                    }
                });

            }

            return r;
        }

    } catch (e) {
        console.error(e);
    }
}

/**
 *
 * */
function insertTableContent(dbName, schemeName, tableName, content) {
    let TableStruct = readTableStructure(dbName, schemeName, tableName);
    if (content !== null) {
        let i = 0;

        for (let key in TableStruct) {
            /*
            * @todo Make sequences
            * */
            if (TableStruct[key]['unique'] === 'yes') {
                let TableContent = readTableContent(dbName, schemeName, tableName);
                TableContent.forEach(c => {
                    if (c[i] === content[i]) {
                        throw new Error("Value already exists");
                    }
                });
            }

            if (content[i] === 'DEFAULT' && TableStruct[key]['type'] === 'number' && TableStruct[key]['autoIncrement'] === 'yes') {
                let seqName = key + "_seq";
                let Seq = sequence.read(dbName, schemeName, tableName, seqName);
                content[i] = Seq['start'];

                Seq['start'] = Seq['start'] + Seq['inc'];

                sequence.update(dbName, schemeName, tableName, seqName, Seq);
            } else {
                if (typeof content[i] !== TableStruct[key]['type']) {
                    throw Error("Invalid type");
                }
            }
            i++;
        }

        return writeTableContent(dbName, schemeName, tableName, content);
    }
}

/**
 *
 * */
function updateTableContent(dbName, schemeName, tableName, content) {
    /*
    * @todo: Make SQL UPDATE
    * */
}

/**
 *
 * */
function deleteTableContent(dbName, schemeName, tableName, content) {

}

exports.create = createTable;
exports.drop = dropTable;
exports.select = selectTableContent;
exports.insert = insertTableContent;
exports.update = updateTableContent;
exports.delete = deleteTableContent;

exports.readFile = readTableFile;
exports.writeFile = writeTableFile;