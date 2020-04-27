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
 * @file Contains functions to interact with sequences, like CREATE and UPDATE
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {config} = require('../../config');
const DB = require('../DB');
const Schema = require('../Schema');

const fs = require('fs');

const f_seqlist = 'seqlist.json';

/**
 * @summary Reads the sequences list file
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 *
 * @return {{sequences: Object}} Returns a named Object containing all the sequences
 * @throws {Error} If the schema does not exist, throw an error
 * */
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

    if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${schema}/${f_seqlist}`)) {
        exports.writeFile(db, schema, {
            $schema: "https://raw.githubusercontent.com/modscleo4/jsdb/master/core/schemas/seqlist.schema.json",
            sequences: {}
        });
        return {sequences: {}};
    }

    try {
        return JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${db}/${schema}/${f_seqlist}`, 'utf8'));
    } catch (e) {
        throw new Error(`Error while parsing ${f_seqlist} for ${db}.${schema}: ${e.message}`);
    }
};

/**
 * @summary Writes the sequences list file
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 * @param list {Object} A JSON string of the named Object containing all the sequences
 *
 * @throws {Error} If the schema does not exist, throw an error
 * */
exports.writeFile = function writeFile(db, schema, list) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (typeof list !== 'object') {
        throw new TypeError(`list is not object.`);
    }

    if (!Schema.exists(new DB(db), schema)) {
        throw new Error(`Schema ${db}.${schema} does not exist.`);
    }

    fs.writeFileSync(`${config.server.startDir}dbs/${db}/${schema}/${f_seqlist}`, JSON.stringify(list));
};
