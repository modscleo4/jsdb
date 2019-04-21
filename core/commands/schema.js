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
 * @file Contains functions to interact with schemas, like CREATE and DROP
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const config = require('../../config');
const db = require('./db');

const fs = require('fs');

const f_schlist = 'schlist.json';
exports.f_schlist = f_schlist;

/**
 * @summary Create a schema
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 *
 * @returns {string} If everything runs ok, returns 'Created schema ${schemaName} in DB ${dbName}.'
 * @throws {Error} If the schema already exists, throw an error
 */
function createSchema(dbName, schemaName) {
    if (typeof dbName === 'string' && typeof schemaName === 'string') {
        let SCHList = readSchemaFile(dbName);

        if (SCHList.indexOf(schemaName) !== -1) {
            throw new Error(`Schema ${schemaName} already exists in DB ${dbName}`);
        } else {
            SCHList.push(schemaName);
            writeSchemaFile(dbName, JSON.stringify(SCHList));
            createSchemaFolder(dbName, schemaName);

            return `Created schema ${schemaName} in DB ${dbName}.`;
        }
    }
}

/**
 * @summary Create the folder for the schema
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 *
 * @throws {Error} If the DB does not exist, throw an error
 */
function createSchemaFolder(dbName, schemaName) {
    if (typeof dbName === 'string' && typeof schemaName === 'string') {
        if (db.exists(dbName)) {
            if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}/${schemaName}`)) {
                fs.mkdirSync(`${config.server.startDir}dbs/${dbName}/${schemaName}`);
            }
        }
    }
}

/**
 * @summary Reads the schemas list file
 *
 * @param dbName {string} The name of DB
 *
 * @returns {Object} Returns a indexed Object containing all the schemas
 * @throws {Error} If the DB does not exist, throw an error
 */
function readSchemaFile(dbName) {
    if (typeof dbName === 'string') {
        let SCHList = [];

        // Checking if the database exists
        if (db.exists(dbName)) {
            if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}/${f_schlist}`)) {
                writeSchemaFile(dbName, JSON.stringify([]));
                return [];
            }

            try {
                SCHList = JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${dbName}/${f_schlist}`, 'utf8'));
            } catch (e) {
                throw new Error(`Error while parsing ${f_schlist} for ${dbName}: ${e.message}`);
            }

            SCHList.forEach(schName => {
                if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}/${schName}`)) {
                    SCHList.splice(SCHList.indexOf(schName), 1);
                    writeSchemaFile(dbName, JSON.stringify(SCHList));
                }
            });

            fs.readdirSync(`${config.server.startDir}dbs/${dbName}/`).forEach(schName => {
                if (schName !== f_schlist) {
                    if (SCHList.indexOf(schName) === -1) {
                        SCHList.push(schName);
                        writeSchemaFile(dbName, JSON.stringify(SCHList));
                    }
                }
            });
        }

        return SCHList;
    }
}

/**
 * @summary Writes the schemas list file
 *
 * @param dbName {string} The name of DB
 * @param content {string} A JSON string of the indexed Object containing all the schemas
 *
 * @throws {Error} If the DB does not exist, throw an error
 */
function writeSchemaFile(dbName, content) {
    if (typeof dbName === 'string' && typeof content === 'string') {
        if (db.exists(dbName)) {
            fs.writeFileSync(`${config.server.startDir}dbs/${dbName}/${f_schlist}`, content);
        }
    }
}

/**
 * @summary Drops a schema from DB
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param ifExists {boolean} If true, doesn't throw an error when the schema does not exist
 *
 * @returns {string} If everything runs without errors, return 'Dropped schema ${schemaName}.'
 * @throws {Error} If the schema does not exist and ifExists is false, throw an error
 */
function dropSchema(dbName, schemaName, ifExists = false) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof ifExists === 'boolean') {
        if (dbName === 'jsdb' && schemaName === 'public') {
            throw new Error('JSDB database public schema cannot be dropped');
        }

        if ((ifExists && readSchemaFile(dbName).indexOf(schemaName) !== -1) || (!ifExists && existsSchema(dbName, schemaName))) {
            let SCHList = readSchemaFile(dbName);
            let i = SCHList.indexOf(schemaName);
            SCHList.splice(i, 1);
            writeSchemaFile(dbName, JSON.stringify(SCHList));
            config.rmdirRSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/`);

            return `Dropped schema ${schemaName}.`;
        } else {
            return `Schema ${schemaName} does not exist.`;
        }
    }
}

/**
 * @summary Check if the schema exists
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param throws {boolean} If true, throw an error if the schema does not exist
 *
 * @returns {boolean} Return true if the schema exists
 * @throws {Error} If the schema does not exist, throw an error
 */
function existsSchema(dbName, schemaName, throws = true) {
    if (typeof dbName === 'string' && typeof schemaName === 'string') {
        if (db.exists(dbName)) {
            let SCHList = readSchemaFile(dbName);
            if (SCHList.indexOf(schemaName) !== -1) {
                return true;
            } else {
                if (throws) {
                    throw new Error(`Schema ${schemaName} does not exist.`);
                } else {
                    return false;
                }
            }
        }
    }
}

exports.create = createSchema;
exports.createFolder = createSchemaFolder;

exports.readFile = readSchemaFile;
exports.writeFile = writeSchemaFile;

exports.drop = dropSchema;

exports.exists = existsSchema;