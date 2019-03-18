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
 * @file Contains functions to interact with DBs, like CREATE and DROP
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const config = require('../config');
const schema = require('./schema');
const table = require('./table');
const registry = require('./registry');

const fs = require('fs');
const admzip = require('adm-zip');

const f_dblist = 'dblist.json';
exports.f_dblist = f_dblist;

/**
 * @summary Create a DB
 *
 * @param dbName {string} The name of DB
 *
 * @returns {string} If everything runs ok, returns 'Created DB ${dbName}.'
 * @throws {Error} If the DB already exists, throw an error
 */
function createDB(dbName) {
    if (typeof dbName === 'string') {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) !== -1) {
            schema.create(dbName, 'public');

            throw new Error(`DB ${dbName} already exists.`);
        } else {
            DBList.push(dbName);
            writeDBFile(JSON.stringify(DBList));
            createDBFolder(dbName);

            schema.create(dbName, 'public');

            return `Created DB ${dbName}.`;
        }
    }
}

/**
 * @summary Create the folder for the DB
 *
 * @param dbName {string} The name of DB
 */
function createDBFolder(dbName) {
    if (typeof dbName === 'string') {
        if (!fs.existsSync(`${config.server.startDir}dbs/`)) {
            fs.mkdirSync(`${config.server.startDir}dbs/`);
        }

        fs.mkdirSync(`${config.server.startDir}dbs/${dbName}`);
    }
}

/**
 * @summary Reads the DB list file
 *
 * @returns {Object} Returns a indexed Object containing all the DBs
 */
function readDBFile() {
    let DBList = [];

    if (!fs.existsSync(`${config.server.startDir}dbs/${f_dblist}`)) {
        writeDBFile(JSON.stringify([]));
        return readDBFile();
    }

    try {
        DBList = JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${f_dblist}`, 'utf8'));
    } catch (e) {
        throw new Error(`Error while parsing ${f_dblist}: ${e.message}`);
    }

    fs.readdirSync(`${config.server.startDir}dbs/`).forEach(dbName => {
        if (dbName !== f_dblist && !dbName.endsWith('.jsdb')) {
            if (DBList.indexOf(dbName) === -1) {
                DBList.push(dbName);
                writeDBFile(JSON.stringify(DBList));
            }
        }
    });

    // Compress/decompress .jsdb files
    if (config.db.createZip) {
        DBList.forEach(dbName => {
            if (fs.existsSync(`${config.server.startDir}dbs/${dbName}`)) {
                backupDB(dbName);

                config.rmdirRSync(`${config.server.startDir}dbs/${dbName}/`);
            }

            restoreDB(dbName);
        });
    }

    // Creates JSDB admin database
    if (DBList.indexOf('jsdb') === -1) {
        DBList.push('jsdb');
        if (!fs.existsSync(`${config.server.startDir}dbs/jsdb/`)) {
            createDBFolder('jsdb');
        }

        writeDBFile(JSON.stringify(DBList));
        if (schema.readFile('jsdb').indexOf('public') === -1) {
            schema.create('jsdb', 'public');
        }
    }

    DBList.forEach(dbName => {
        if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}`) && !fs.existsSync(`${config.server.startDir}dbs/${dbName}.jsdb`)) {
            DBList.splice(DBList.indexOf(dbName), 1);
            writeDBFile(JSON.stringify(DBList));
        }
    });

    return DBList;
}

/**
 * @summary Writes the DB list file
 *
 * @param content {string} A JSON string of the indexed Object containing all the DBs
 */
function writeDBFile(content) {
    if (typeof content === 'string') {
        if (!fs.existsSync(`${config.server.startDir}dbs/`)) {
            fs.mkdirSync(`${config.server.startDir}dbs/`);
        }

        fs.writeFileSync(`${config.server.startDir}dbs/${f_dblist}`, content);
    }
}

/**
 * @summary Drops a DB
 *
 * @param dbName {string} The name of DB
 * @param ifExists {boolean} If true, doesn't throw an error when the DB does not exist
 *
 * @returns {string} If everything runs without errors, return 'Dropped database ${dbName}.'
 * @throws {Error} If the DB does not exist and ifExists is false, throw an error
 */
function dropDB(dbName, ifExists = false) {
    if (typeof dbName === 'string' && typeof ifExists === 'boolean') {
        if (dbName === 'jsdb') {
            throw new Error('JSDB database cannot be dropped');
        }

        if ((ifExists && readDBFile().indexOf(dbName) !== -1) || (!ifExists && existsDB(dbName))) {
            let DBList = readDBFile();
            let i = DBList.indexOf(dbName);
            DBList.splice(i, 1);
            writeDBFile(JSON.stringify(DBList));
            config.rmdirRSync(`${config.server.startDir}dbs/${dbName}/`);

            return `Dropped database ${dbName}.`;
        } else {
            return `Database ${dbName} does not exist.`;
        }
    }
}

/**
 * @summary Check if the DB exists
 *
 * @param dbName {string} The name of DB
 * @param throws {boolean} If true, throw an error if the DB does not exist
 *
 * @returns {boolean} Return true if the DB exists
 * @throws {Error} If the DB does not exist, throw an error
 */
function existsDB(dbName, throws = true) {
    if (typeof dbName === 'string' && typeof throws === 'boolean') {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) !== -1) {
            return true;
        } else {
            if (throws) {
                throw new Error(`Database ${dbName} does not exist.`);
            } else {
                return false;
            }
        }
    }
}

/**
 * @summary Backup a database
 *
 * @param dbName {String} The DB name
 *
 * @throws {Error} If the DB does not exist, throw an error
 */
function backupDB(dbName) {
    if (typeof dbName === 'string') {
        if (existsDB(dbName)) {
            let zip = new admzip();
            zip.addLocalFolder(`${config.server.startDir}dbs/${dbName}`);
            zip.writeZip(`${config.server.startDir}dbs/${dbName}.jsdb`);
        }
    }
}

/**
 * @summary Restore a backup
 *
 * @param dbName {String} The DB name
 *
 * @throws {Error} If the backup file does not exits, throw an error
 */
function restoreDB(dbName) {
    if (typeof dbName === 'string') {
        if (fs.existsSync(`${config.server.startDir}dbs/${dbName}.jsdb`)) {
            config.rmdirRSync(`${config.server.startDir}dbs/${dbName}`);

            let zip = new admzip(`${config.server.startDir}dbs/${dbName}.jsdb`);
            zip.extractAllTo(`${config.server.startDir}dbs/${dbName}`, true);
        } else {
            throw new Error(`Backup file for ${dbName} does not exist`);
        }
    }
}

/**
 * @summary Checks the JSDB database integrity
 */
function checkJSDBIntegrity() {
    readDBFile();

    if (!schema.exists('jsdb', 'public', false)) {
        schema.create('jsdb', 'public');
    }

    if (!table.exists('jsdb', 'public', 'users', false)) {
        table.create('jsdb', 'public', 'users',
            {
                'id': {
                    'type': 'integer',
                    'unique': true,
                    'autoIncrement': true,
                    'notNull': true
                },

                'username': {
                    'type': 'string',
                    'unique': true,
                    'notNull': true
                },

                'password': {
                    'type': 'string',
                    'notNull': true
                },

                'valid': {
                    'type': 'boolean',
                    'default': true,
                    'notNull': true
                },

                'privileges': {
                    'type': 'object',
                    'default': {},
                    'notNull': false
                },
            },

            {
                'primaryKey': [
                    'id'
                ]
            }
        );
    }

    if (!table.exists('jsdb', 'public', 'registry', false)) {
        table.create('jsdb', 'public', 'registry',
            {
                'entryName': {
                    'type': 'string',
                    'unique': true,
                    'notNull': true
                },

                'type': {
                    'type': 'string',
                    'notNull': true
                },

                'value': {
                    'type': 'string',
                    'notNull': true
                },
            },
            {
                'primaryKey': [
                    'entryName'
                ]
            }
        );
    }

    if (!registry.exists('jsdb.server.ignAuth', false)) {
        registry.create('jsdb.server.ignAuth', 'boolean', false);
    }

    if (!registry.exists('jsdb.server.port', false)) {
        registry.create('jsdb.server.port', 'number', 6637);
    }

    if (!registry.exists('jsdb.server.startDir', false)) {
        registry.create('jsdb.server.startDir', 'string', './');
    }

    if (!registry.exists('jsdb.db.createZip', false)) {
        registry.create('jsdb.db.createZip', 'boolean', false);
    }

    if (!registry.exists('jsdb.registry.instantApplyChanges', false)) {
        registry.create('jsdb.registry.instantApplyChanges', 'boolean', false);
    }
}

exports.create = createDB;
exports.createFolder = createDBFolder;

exports.readFile = readDBFile;
exports.writeFile = writeDBFile;

exports.drop = dropDB;

exports.exists = existsDB;

exports.backup = backupDB;
exports.restore = restoreDB;

exports.checkJSDBIntegrity = checkJSDBIntegrity;
