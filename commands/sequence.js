const fs = require('fs');
const table = require('./table');
const server = require('../server');

const f_seqlist = 'seqlist.json';

/**
 *
 * */
function createSequence(dbName, schemaName, tableName, seqName, options = [1, 1]) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof seqName === "string" && typeof  options === "object") {
        let SequenceList = readSequenceFile(dbName, schemaName, tableName);

        if (SequenceList.hasOwnProperty(seqName)) {
            throw new Error("Sequence " + schemaName + "." + tableName + "." + seqName + " already exists in DB " + dbName);
        } else {
            SequenceList[seqName] = {'start': options[0], 'inc': options[1]};
            writeSequenceFile(dbName, schemaName, tableName, SequenceList);

            return "Created sequence " + schemaName + "." + tableName + "." + seqName + " in DB " + dbName;
        }
    }
}

/**
 *
 * */
function readSequenceFile(dbName, schemaName, tableName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string") {
        if (table.exists(dbName, schemaName, tableName)) {
            if (!fs.existsSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_seqlist)) {
                writeSequenceFile(dbName, JSON.stringify({}));
                return {};
            }

            return JSON.parse(fs.readFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_seqlist, 'utf8'));
        }
    }
}

/**
 *
 * */
function writeSequenceFile(dbName, schemaName, tableName, content) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof content === "object") {
        if (table.exists(dbName, schemaName, tableName)) {
            fs.writeFileSync(server.startDir + "dbs/" + dbName + "/" + schemaName + "/" + tableName + "/" + f_seqlist, JSON.stringify(content));
        }
    }
}

/**
 *
 * */
function readSequence(dbName, schemaName, tableName, seqName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof seqName === "string") {
        let SequenceList = readSequenceFile(dbName, schemaName, tableName);

        if (SequenceList.hasOwnProperty(seqName)) {
            return SequenceList[seqName];
        } else {
            throw new Error("Sequence " + seqName + " does not exist.");
        }
    }
}

/**
 *
 * */
function updateSequence(dbName, schemaName, tableName, seqName, content) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof tableName === "string" && typeof seqName === "string" && typeof  content === "object") {
        let SequenceList;

        if (typeof (SequenceList = readSequenceFile(dbName, schemaName, tableName)) !== "undefined") {
            if (content !== null) {
                SequenceList[seqName] = content;
            }
        }

        writeSequenceFile(dbName, schemaName, tableName, SequenceList);
    }
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