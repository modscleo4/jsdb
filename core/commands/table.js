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
 * @file Contains functions to interact with tables, like SELECT and UPDATE
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {config} = require('../../config');
const utils = require('../lib/utils');

const fs = require('fs');

const DB = require('../DB');
const Schema = require('../Schema');
const Table = require('../Table');

const f_tablelist = 'tablelist.json';
const f_tablestruct = 'tablestruct.json';
const f_tabledata = 'tabledata.json';

/**
 * @summary Reads the structure of the table
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 * @param table {string} The table name
 *
 * @returns {Object} Return the structure of the table in a named Object
 * @throws {Error} If the table does not exist, throw an error
 * */
exports.readStructure = function readStructure(db, schema, table) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }
    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof table !== 'string') {
        throw new TypeError(`table is not string.`);
    }

    if (!Schema.exists(new DB(db), schema)) {
        throw new Error(`Schema ${db}.${schema} does not exist.`);
    }

    if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/${f_tablestruct}`)) {
        exports.deleteFolder(db, schema, table);
        throw new Error(`Structure for table ${schema}.${table} is missing. Table dropped`);
    }

    try {
        return JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/${f_tablestruct}`, 'utf8'));
    } catch (e) {
        throw new Error(`Error while parsing ${f_tablestruct} for ${schema}.${table}: ${e.message}`);
    }
};

/**
 * @summary Writes the structure of the table
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 * @param table {string} The table name
 * @param structure {object} Named Object containing the structure for the table
 * */
exports.writeStructure = function writeStructure(db, schema, table, structure) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }
    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof table !== 'string') {
        throw new TypeError(`table is not string.`);
    }

    if (typeof structure !== 'object') {
        throw new TypeError(`structure is not object.`);
    }

    if (!Schema.exists(new DB(db), schema)) {
        throw new Error(`Schema ${db}.${schema} does not exist.`);
    }

    fs.writeFileSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/${f_tablestruct}`, JSON.stringify(structure));
};

/**
 * @summary Reads the tables list file
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 *
 * @returns {Object} Returns a indexed Object containing all the tables
 * @throws {Error} If the schema does not exist, throw an error
 */
exports.readFile = function readFile(db, schema) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (!Schema.exists(new DB(db), schema)) {
        throw new Error(`Schema ${db}.${schema} does not exist.`);
    }

    if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${schema}/${f_tablelist}`)) {
        exports.writeFile(db, schema, []);
        return [];
    }

    let List;
    try {
        List = JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${db}/${schema}/${f_tablelist}`, 'utf8'));
    } catch (e) {
        throw new Error(`Error while parsing ${f_tablelist}: ${e.message}`);
    }

    fs.readdirSync(`${config.server.startDir}dbs/${db}/${schema}/`).forEach(table => {
        if (table !== f_tablelist && table !== 'seqlist.json') {
            if (!List.includes(table)) {
                List.push(table);
                exports.writeFile(db, schema, List);
            }
        }
    });

    List.forEach(tableName => {
        if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${schema}/${tableName}/`)) {
            List.splice(List.indexOf(tableName), 1);
            exports.writeFile(db, schema, List);
        }
    });

    return List;


};

/**
 * @summary Write the tables list file
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 * @param content {object} an object containing all the tables
 *
 * @throws {Error} If the schema does not exist, throw an error
 */
exports.writeFile = function writeFile(db, schema, content) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof content !== 'object') {
        throw new TypeError(`content is not object`);
    }

    if (!Schema.exists(new DB(db), schema)) {
        throw new Error(`Schema ${db}.${schema} does not exist.`);
    }

    fs.writeFileSync(`${config.server.startDir}dbs/${db}/${schema}/${f_tablelist}`, JSON.stringify(content));
};

/**
 * @summary Create the folder for the table
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 * @param table {string} The table name
 *
 * @throws {Error} If the schema does not exist, throw an error
 * */
exports.createFolder = function createFolder(db, schema, table) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof table !== 'string') {
        throw new TypeError(`table is not string.`);
    }

    if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/`)) {
        fs.mkdirSync(`${config.server.startDir}dbs/${db}/${schema}/${table}`);
    }
};

exports.deleteFolder = function deleteFolder(db, schema, table) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof table !== 'string') {
        throw new TypeError(`table is not string.`);
    }

    utils.rmdirRSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/`);
};

/**
 * @summary Reads the table content from the file
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 * @param table {string} The table name
 *
 * @returns {Object} Returns a indexed Object containing the data in the table
 * @throws {Error} If the table does not exist, throw an error
 * */
exports.readContent = function readContent(db, schema, table) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof table !== 'string') {
        throw new TypeError(`table is not string.`);
    }

    if (!Schema.exists(new DB(db), schema)) {
        throw new Error(`Schema ${db}.${schema} does not exist.`);
    }

    try {
        return JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/${f_tabledata}`, 'utf8'));
    } catch (e) {
        throw new Error(`Error while parsing ${f_tabledata} for ${db}.${schema}.${table}: ${e.message}`);
    }
};

/**
 * @summary Writes the table content to the file
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 * @param table {string} The table name
 * @param content {object} Indexed Array containing the data in the table
 * @param override {boolean} If true, overrides the existing table data
 *
 * @returns {number} Returns the number of lines written
 * */
exports.writeContent = function writeContent(db, schema, table, content, override = false) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof table !== 'string') {
        throw new TypeError(`table is not string.`);
    }

    if (typeof content !== 'object') {
        throw new TypeError(`content is not object.`);
    }

    if (typeof override !== 'boolean') {
        throw new TypeError(`override is not boolean.`);
    }

    let TableContent = [];

    if (fs.existsSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/${f_tabledata}`)) {
        TableContent = exports.readContent(db, schema, table);
    }

    if (content !== null) {
        if (override) {
            TableContent = content;
        } else {
            TableContent.push(content);
        }
    }

    fs.writeFileSync(`${config.server.startDir}dbs/${db}/${schema}/${table}/${f_tabledata}`, JSON.stringify(TableContent));

    return override ? TableContent.length : 1;
};
