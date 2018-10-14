const fs = require('fs');
const db = require('./db');
const scheme = require('./scheme');

const f_tablelist = 'tablelist.json';
const f_tablestruct = 'tablestruct.json';
const f_tabledata = 'tabledata.json';

function createTable(dbName, schemeName, tableName, tableStruct) {
    if (typeof dbName === "string" && typeof schemeName === "string" && typeof tableName === "string") {
        let TableList = readTableFile(dbName, schemeName);

        if (TableList.indexOf(tableName) === -1) {
            TableList.push(tableName);
            writeTableFile(dbName, schemeName, JSON.stringify(TableList));
            createTableFolder(dbName, schemeName, tableName);

            writeTableStructure(dbName, schemeName, tableName, tableStruct);
            writeTableContent(dbName, schemeName, tableName, null);

            return "Created table " + schemeName + "." + tableName + " in DB " + dbName;
        } else {
            return "Table " + schemeName + "." + tableName + " already exists in DB " + dbName;
        }
    }
}

function readTableStructure(dbName, schemeName, tableName) {
    try {
        let r = [];

        let TableList = readTableFile(dbName, schemeName);

        if (TableList.indexOf(tableName) !== -1) {
            r = JSON.parse(fs.readFileSync("dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tablestruct, 'utf8'));
        }

        return r;
    } catch (e) {
        console.error(e);
        writeTableStructure(dbName, schemeName, tableName, []);
        return readTableStructure(dbName, schemeName, tableName);
    }
}

function writeTableStructure(dbName, schemeName, tableName, tableStruct) {
    try {
        fs.writeFileSync("dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tablestruct, JSON.stringify(tableStruct));
    } catch (e) {
        console.error(e.message);
    }
}

function readTableFile(dbName, schemeName) {
    try {
        let DBList = db.readFile();
        let SCHList = scheme.readFile(dbName);

        let TableList = [];

        if (DBList.indexOf(dbName) !== -1 && SCHList.indexOf(schemeName) !== -1) {
            TableList = JSON.parse(fs.readFileSync("dbs/" + dbName + "/" + schemeName + "/" + f_tablelist, 'utf8'));

            fs.readdirSync("dbs/" + dbName + "/" + schemeName).forEach(tablename => {
                if (tablename !== f_tablelist) {
                    if (TableList.indexOf(tablename) === -1) {
                        TableList.push(tablename);
                        writeTableFile(dbName, schemeName, JSON.stringify(TableList));
                    }
                }
            });

            TableList.forEach(tablename => {
                if (!fs.existsSync("dbs/" + dbName + "/" + schemeName + "/" + tablename)) {
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

function writeTableFile(dbName, schemeName, content) {
    try {
        fs.writeFileSync("dbs/" + dbName + "/" + schemeName + "/" + f_tablelist, content);
    } catch (e) {
        console.error(e.message);
    }
}

function createTableFolder(dbName, schemeName, tableName) {
    try {
        if (!fs.existsSync("dbs/")) {
            fs.mkdirSync("dbs/");
        }

        if (!fs.existsSync("dbs/" + dbName)) {
            throw "DB not created.";
        }

        if (!fs.existsSync("dbs/" + dbName + "/" + schemeName)) {
            throw "Scheme not created.";
        }

        fs.mkdirSync("dbs/" + dbName + "/" + schemeName + "/" + tableName);
    } catch (e) {
        console.error(e.message);
    }
}

function readTableContent(dbName, schemeName, tableName) {
    try {
        let r = [];

        let TableList = readTableFile(dbName, schemeName);

        if (TableList.indexOf(tableName) !== -1) {
            r = JSON.parse(fs.readFileSync("dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tabledata, 'utf8'));
        }
        return r;
    } catch (e) {
        console.error(e);
        writeTableContent(dbName, schemeName, tableName, []);
        return readTableContent(dbName, schemeName, tableName);
    }
}

function writeTableContent(dbName, schemeName, tableName, content) {
    try {
        let TableContent = [];
        /*
        * Checks if tabledata.json exists to avoid loops
        * */
        if (fs.existsSync("dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tabledata)) {
            TableContent = readTableContent(dbName, schemeName, tableName);
        }

        if (content !== null) {
            TableContent.push(content);
        }

        fs.writeFileSync("dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_tabledata, JSON.stringify(TableContent));

        return "Line inserted.";
    } catch (e) {
        console.error(e.message);
    }
}

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

function insertTableContent(dbName, schemeName, tableName, content) {
    try {
        let TableStruct = readTableStructure(dbName, schemeName, tableName);
        if (typeof content === "object") {
            let i = 0;

            for (let key in TableStruct) {
                /*
                * @todo Make sequences
                * */
                /*if (content[i] === 'DEFAULT' && TableStruct[key]['type'] === 'number' && TableStruct[key]['autoIncrement'] === 'yes') {
                    let TableSequences = readTableSequences(dbName, schemeName, tableName);

                    content[i] = TableSequences[TableContent.length - 1][i];
                } else {*/
                if (typeof content[i] !== TableStruct[key]['type']) {
                    throw "Invalid type";
                }
                //}
                i++;
            }

            return writeTableContent(dbName, schemeName, tableName, content);
        }

    } catch (e) {
        console.error(e);
    }
}

function updateTableContent(dbName, schemeName, tableName, content) {

}

exports.create = createTable;
exports.select = selectTableContent;
exports.insert = insertTableContent;
exports.update = updateTableContent;