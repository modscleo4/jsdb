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

'use strict';

const {config} = require('../../config');
const utils = require('../lib/utils');

const DB = require('../DB');

const fs = require('fs');

const f_schlist = 'schlist.json';
exports.f_schlist = f_schlist;

/**
 * @summary Writes the schemas list file
 *
 * @param db {string} The name of DB
 * @param list {Array} An Array containing all the schemas
 *
 * @throws {Error} If the DB does not exist, throw an error
 */
exports.writeFile = function writeFile(db, list) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (!Array.isArray(list)) {
        throw new TypeError(`list is not Array.`);
    }

    if (!DB.exists(db)) {
        throw new Error(`Database ${db} does not exist.`);
    }

    fs.writeFileSync(`${config.server.startDir}dbs/${db}/${f_schlist}`, JSON.stringify(list));
};

/**
 * @summary Reads the schemas list file
 *
 * @param {string} db The name of DB
 *
 * @return {Object} Returns a indexed Object containing all the schemas
 * @throws {Error} If the DB does not exist, throw an error
 */
exports.readFile = function readFile(db) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (!DB.exists(db)) {
        throw new Error(`Database ${db} does not exist.`);
    }

    let SCHList = [];

    if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${f_schlist}`)) {
        exports.writeFile(db, []);
        return [];
    }

    try {
        SCHList = JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${db}/${f_schlist}`, 'utf8'));
    } catch (e) {
        throw new Error(`Error while parsing ${f_schlist} for ${db}: ${e.message}`);
    }

    SCHList.forEach(schName => {
        if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${schName}`)) {
            SCHList.splice(SCHList.indexOf(schName), 1);
            exports.writeFile(db, SCHList);
        }
    });

    fs.readdirSync(`${config.server.startDir}dbs/${db}/`).forEach(schName => {
        if (schName !== f_schlist) {
            if (!SCHList.includes(schName)) {
                SCHList.push(schName);
                exports.writeFile(db, SCHList);
            }
        }
    });

    return SCHList;
};

/**
 * @summary Create the folder for the schema
 *
 * @param db {string} The name of DB
 * @param schema {string} The name of the schema
 *
 * @throws {Error} If the DB does not exist, throw an error
 */
exports.createFolder = function createFolder(db, schema) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    if (!fs.existsSync(`${config.server.startDir}dbs/${db}/${schema}`)) {
        fs.mkdirSync(`${config.server.startDir}dbs/${db}/${schema}`);
    }
};

exports.deleteFolder = function deleteFolder(db, schema) {
    if (typeof db !== 'string') {
        throw new TypeError(`db is not string.`);
    }

    if (typeof schema !== 'string') {
        throw new TypeError(`schema is not string.`);
    }

    utils.rmdirRSync(`${config.server.startDir}dbs/${db}/${schema}/`);
};
