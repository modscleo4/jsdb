const fs = require('fs');
const table = require('./table');
const server = require('../server');

const f_seqlist = 'seqlist.json';

/**
 *
 * */
function createSequence(dbName, schemeName, tableName, seqName) {
    if (typeof dbName === "string" && typeof schemeName === "string" && typeof tableName === "string") {
        let SequenceList = readSequenceFile(dbName, schemeName, tableName);

        if (SequenceList[seqName] === undefined) {
            SequenceList[seqName] = {'start': 1, 'inc': 1};
            writeSequenceFile(dbName, schemeName, tableName, SequenceList);

            return "Created sequence " + schemeName + "." + tableName + "." + seqName + " in DB " + dbName;
        } else {
            return "Sequence " + schemeName + "." + tableName + "." + seqName + " already exists in DB " + dbName;
        }
    }
}

/**
 *
 * */
function readSequenceFile(dbName, schemeName, tableName) {
    try {
        let TableList = table.readFile(dbName, schemeName);
        let SequenceList = {};

        if (TableList.indexOf(tableName) !== -1) {
            SequenceList = JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_seqlist, 'utf8'));
        }

        return SequenceList;
    } catch (e) {
        writeSequenceFile(dbName, schemeName, tableName, {});
        return readSequenceFile(dbName, schemeName, tableName);
    }
}

/**
 *
 * */
function writeSequenceFile(dbName, schemeName, tableName, content) {
    fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemeName + "/" + tableName + "/" + f_seqlist, JSON.stringify(content));
}

/**
 *
 * */
function readSequence(dbName, schemeName, tableName, seqName) {
    try {
        let SequenceList = readSequenceFile(dbName, schemeName, tableName);

        if (SequenceList[seqName] !== undefined) {
            return SequenceList[seqName];
        } else {
            return {};
        }
    } catch (e) {
        writeSequenceFile(dbName, schemeName, tableName, {});
        return readSequence(dbName, schemeName, tableName, seqName);
    }
}

/**
 *
 * */
function updateSequence(dbName, schemeName, tableName, seqName, content) {
    let SequenceList;

    if ((SequenceList = readSequenceFile(dbName, schemeName, tableName)) !== undefined) {
        if (content !== null) {
            SequenceList[seqName] = content;
        }
    }

    writeSequenceFile(dbName, schemeName, tableName, SequenceList);
}

/**
 *
 * */
function deleteSequence() {

}

exports.create = createSequence;
exports.read = readSequence;
exports.update = updateSequence;
exports.delete = deleteSequence;

exports.readFile = readSequenceFile;
exports.writeFile = writeSequenceFile;