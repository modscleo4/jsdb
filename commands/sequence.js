/**
 * @file Contains functions to interact with sequences, like CREATE and UPDATE
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const fs = require('fs');
const schema = require('./schema');
const config = require('../config');

const f_seqlist = 'seqlist.json';
exports.f_seqlist = f_seqlist;

/**
 * @summary Create a sequence
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param seqName {string} The sequence name
 * @param options {Object} The number to the sequence starts and the incremental
 *
 * @returns {string} If everything runs ok, returns 'Created sequence ${schemaName}.${seqName} in DB ${dbName}.'
 * @throws {Error} If the sequence already exists, throw an error
 * */
function createSequence(dbName, schemaName, seqName, options = {"start": 1, "inc": 1}) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string" && typeof  options === "object") {
        let SequenceList = readSequenceFile(dbName, schemaName);

        if (SequenceList.hasOwnProperty(seqName)) {
            throw new Error(`Sequence ${schemaName}.${seqName} already exists in DB ${dbName}`);
        } else {
            SequenceList[seqName] = {'start': options.start, 'inc': options.inc};
            writeSequenceFile(dbName, schemaName, JSON.stringify(SequenceList));

            return `Created sequence ${schemaName}.${seqName} in DB ${dbName}.`;
        }
    }
}

/**
 * @summary Reads the sequences list file
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 *
 * @returns {Object} Returns a named Object containing all the sequences
 * @throws {Error} If the schema does not exist, throw an error
 * */
function readSequenceFile(dbName, schemaName) {
    if (typeof dbName === "string" && typeof schemaName === "string") {
        if (schema.exists(dbName, schemaName)) {
            if (!fs.existsSync(`${config.startDir}dbs/${dbName}/${schemaName}/${f_seqlist}`)) {
                writeSequenceFile(dbName, schemaName, JSON.stringify({}));
                return {};
            }

            return JSON.parse(fs.readFileSync(`${config.startDir}dbs/${dbName}/${schemaName}/${f_seqlist}`, 'utf8'));
        }
    }
}

/**
 * @summary Writes the sequences list file
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param content {string} A JSON string of the named Object containing all the sequences
 *
 * @throws {Error} If the schema does not exist, throw an error
 * */
function writeSequenceFile(dbName, schemaName, content) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof content === "string") {
        if (schema.exists(dbName, schemaName)) {
            fs.writeFileSync(`${config.startDir}dbs/${dbName}/${schemaName}/${f_seqlist}`, content);
        }
    }
}

/**
 * @summary Check if the sequence exists
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param seqName {string} The sequence name
 * @param throws {boolean} If true, throw an error if the sequence does not exist
 *
 * @returns {boolean} Return true if the sequence exists
 * @throws {Error} If the schema/sequence does not exist, throw an error
 * */
function existsSequence(dbName, schemaName, seqName, throws = true) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string") {
        if (schema.exists(dbName, schemaName)) {
            let TableList = readSequenceFile(dbName, schemaName);
            if (TableList.hasOwnProperty(seqName)) {
                return true;
            } else {
                if (throws) {
                    throw new Error(`Sequence ${schemaName}.${seqName} does not exist.`);
                } else {
                    return false;
                }
            }
        }
    }
}

/**
 * @summary This function reads the sequence file and returns the properties from the desired sequence
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param seqName {string} The sequence name
 *
 * @returns {Object} Returns a named Object with the keys start and inc from the sequence
 * @throws {Error} If the sequence does not exist, throw an error
 * */
function readSequence(dbName, schemaName, seqName) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string") {
        if (existsSequence(dbName, schemaName, seqName)) {
            let SequenceList = readSequenceFile(dbName, schemaName);

            return SequenceList[seqName];
        }
    }
}

/**
 * @summary This is the sequence UPDATE function scope
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param seqName {string} The sequence name
 * @param content {Object} A named Object containing the start and inc keys
 *
 * @returns {string} Returns 'Updated sequence ${seqName}.' if no errors happened
 * @throws {Error} If the sequence does not exist, throw an error
 * */
function updateSequence(dbName, schemaName, seqName, content) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string" && typeof content === "object") {
        if (existsSequence(dbName, schemaName, seqName)) {
            let SequenceList = readSequenceFile(dbName, schemaName);

            if (content !== null) {
                SequenceList[seqName] = content;
            }

            writeSequenceFile(dbName, schemaName, JSON.stringify(SequenceList));

            return `Updated sequence ${seqName}.`;
        }
    }
}

/**
 * @summary Drops a sequence from the schema
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param seqName {string} The sequence name
 * @param ifExists {boolean} If true, doesn't throw an error when the sequence does not exist
 *
 * @returns {string} If everything runs without errors, return 'Deleted sequence {seqName}'
 * @throws {Error} If the sequence does not exist and ifExists is false, throw an error
 * */
function dropSequence(dbName, schemaName, seqName, ifExists = false) {
    if (typeof dbName === "string" && typeof schemaName === "string" && typeof seqName === "string" && typeof ifExists === "boolean") {
        if ((ifExists && readSequenceFile(dbName, schemaName).hasOwnProperty(seqName)) || (!ifExists && existsSequence(dbName, schemaName, seqName))) {
            let SequenceList = readSequenceFile(dbName, schemaName);
            delete(SequenceList[seqName]);

            writeSequenceFile(dbName, schemaName, JSON.stringify(SequenceList));

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
