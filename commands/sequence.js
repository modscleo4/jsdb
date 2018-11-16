const fs = require('fs');
const schema = require('./schema');
const server = require('../server');

const f_seqlist = 'seqlist.json';

/**
 *
 * */
function createSequence(dbName, schemaName, seqName, options = [1, 1]) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string" && typeof  options === "object") {
        let SequenceList = readSequenceFile(dbName, schemaName);

        if (SequenceList.hasOwnProperty(seqName)) {
            throw new Error(`Sequence ${schemaName}.${seqName} already exists in DB ${dbName}`);
        } else {
            SequenceList[seqName] = {'start': options[0], 'inc': options[1]};
            writeSequenceFile(dbName, schemaName, SequenceList);

            return `Created sequence ${schemaName}.${seqName} in DB ${dbName}.`;
        }
    }
}

/**
 *
 * */
function readSequenceFile(dbName, schemaName) {
    if (typeof dbName === "string" && typeof schemaName === "string") {
        if (schema.exists(dbName, schemaName)) {
            if (!fs.existsSync(`${server.startDir}dbs/${dbName}/${schemaName}/${f_seqlist}`)) {
                writeSequenceFile(dbName, JSON.stringify({}));
                return {};
            }

            return JSON.parse(fs.readFileSync(`${server.startDir}dbs/${dbName}/${schemaName}/${f_seqlist}`, 'utf8'));
        }
    }
}

/**
 *
 * */
function writeSequenceFile(dbName, schemaName, content) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof content === "object") {
        if (schema.exists(dbName, schemaName)) {
            fs.writeFileSync(`${server.startDir}dbs/${dbName}/${schemaName}/${f_seqlist}`, JSON.stringify(content));
        }
    }
}

function existsSequence(dbName, schemaName, seqName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string") {
        if (schema.exists(dbName, schemaName)) {
            let TableList = readSequenceFile(dbName, schemaName);
            if (TableList.hasOwnProperty(seqName)) {
                return true;
            } else {
                throw new Error(`Sequence ${schemaName}.${seqName} does not exist.`);
            }
        }
    }
}

/**
 *
 * */
function readSequence(dbName, schemaName, seqName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string") {
        let SequenceList = readSequenceFile(dbName, schemaName);

        if (SequenceList.hasOwnProperty(seqName)) {
            return SequenceList[seqName];
        } else {
            throw new Error(`Sequence ${schemaName}.${seqName} does not exist.`);
        }
    }
}

/**
 *
 * */
function updateSequence(dbName, schemaName, seqName, content) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string" && typeof content === "object") {
        let SequenceList;

        if (typeof (SequenceList = readSequenceFile(dbName, schemaName)) !== "undefined") {
            if (content !== null) {
                SequenceList[seqName] = content;
            }
        }

        writeSequenceFile(dbName, schemaName, SequenceList);
    }
}

/**
 *
 * */
function dropSequence(dbName, schemaName, seqName, ifExists = false) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string" && typeof ifExists === "boolean") {
        if ((ifExists && readSequenceFile(dbName, schemaName).indexOf(seqName) !== -1) || (!ifExists && existsSequence(dbName, schemaName, seqName))) {
            let SequenceList = readSequenceFile(dbName, schemaName);
            delete(SequenceList[seqName]);

            writeSequenceFile(dbName, schemaName, SequenceList);

            return `Deleted sequence ${schemaName}.${seqName}.`;
        } else {
            return `Sequence ${schemaName}.${seqName} does not exist.`;
        }
    }
}

exports.create = createSequence;
exports.read = readSequence;
exports.update = updateSequence;
exports.drop = dropSequence;

exports.exists = existsSequence;

exports.readFile = readSequenceFile;
exports.writeFile = writeSequenceFile;