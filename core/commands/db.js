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

'use strict';

const {config} = require('../../config');
const utils = require('../lib/utils');

const fs = require('fs');
const admzip = require('adm-zip');

const f_dblist = 'dblist.json';

const DB = require('../DB');
const Schema = require('../Schema');
const Table = require('../Table');
const Registry = require('../Registry');

exports.writeFile = function writeFile(list) {
    if (!Array.isArray(list)) {
        throw new TypeError(`list is not Array.`);
    }

    // Check if the working directory exists
    if (!fs.existsSync(`${config.server.startDir}`)) {
        fs.mkdirSync(`${config.server.startDir}`);
    }

    if (!fs.existsSync(`${config.server.startDir}dbs/`)) {
        fs.mkdirSync(`${config.server.startDir}dbs/`);
    }

    fs.writeFileSync(`${config.server.startDir}dbs/${f_dblist}`, JSON.stringify(list));
};

exports.readFile = function readFile() {
    let List = [];

    if (!fs.existsSync(`${config.server.startDir}dbs/${f_dblist}`)) {
        exports.writeFile([]);
        return readFile();
    }

    try {
        List = JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${f_dblist}`, 'utf8'));
    } catch (e) {
        throw new Error(`Error while parsing ${f_dblist}: ${e.message}`);
    }

    fs.readdirSync(`${config.server.startDir}dbs/`).forEach(name => {
        if (name !== f_dblist && !name.endsWith('.jsdb')) {
            if (!List.includes(name)) {
                List.push(name);
                exports.writeFile(List);
            }
        }
    });

    // Compress/decompress .jsdb files
    if (config.db.createZip) {
        List.forEach(name => {
            if (fs.existsSync(`${config.server.startDir}dbs/${name}`)) {
                backup(name);

                utils.rmdirRSync(`${config.server.startDir}dbs/${name}/`);
            }

            restore(name);
        });
    }

    // Creates JSDB admin database
    if (!List.includes('jsdb')) {
        List.push('jsdb');
        if (!fs.existsSync(`${config.server.startDir}dbs/jsdb/`)) {
            exports.createFolder('jsdb');
        }

        exports.writeFile(JSON.stringify(List));
        if (!Schema.exists(new DB('jsdb'), 'public')) {
            Schema.create(new DB('jsdb'), 'public');
        }
    }

    List.forEach(name => {
        if (!fs.existsSync(`${config.server.startDir}dbs/${name}`) && !fs.existsSync(`${config.server.startDir}dbs/${name}.jsdb`)) {
            List.splice(List.indexOf(name), 1);
            exports.writeFile(List);
        }
    });

    return List;
};

exports.createFolder = function createFolder(name) {
    if (typeof name !== 'string') {
        throw new TypeError(`name is not string.`);
    }

    if (!fs.existsSync(`${config.server.startDir}dbs/`)) {
        fs.mkdirSync(`${config.server.startDir}dbs/`);
    }

    fs.mkdirSync(`${config.server.startDir}dbs/${name}`);
};

exports.deleteFolder = function deleteFolder(name) {
    if (typeof name !== 'string') {
        throw new TypeError(`name is not string.`);
    }

    if (!fs.existsSync(`${config.server.startDir}dbs/`)) {
        fs.mkdirSync(`${config.server.startDir}dbs/`);
    }

    utils.rmdirRSync(`${config.server.startDir}dbs/${name}/`);
};

exports.backup = function backup(name) {
    if (typeof name !== 'string') {
        throw new TypeError(`name is not string.`);
    }

    if (!DB.exists(name)) {
        throw new Error(`Database ${name} does not exist.`);
    }

    let zip = new admzip();
    zip.addLocalFolder(`${config.server.startDir}dbs/${name}`);
    zip.writeZip(`${config.server.startDir}dbs/${name}.jsdb`);
};

exports.restore = function restore(name) {
    if (typeof name !== 'string') {
        throw new TypeError(`name is not string.`);
    }

    if (!DB.exists(name)) {
        throw new Error(`Database ${name} does not exist.`);
    }

    if (fs.existsSync(`${config.server.startDir}dbs/${name}.jsdb`)) {
        utils.rmdirRSync(`${config.server.startDir}dbs/${name}`);

        let zip = new admzip(`${config.server.startDir}dbs/${name}.jsdb`);
        zip.extractAllTo(`${config.server.startDir}dbs/${name}`, true);
    } else {
        throw new Error(`Backup file for ${name} does not exist`);
    }
};

/**
 * @summary Checks the JSDB database integrity
 */
exports.checkJSDBIntegrity = function checkJSDBIntegrity() {
    exports.readFile();

    if (!Schema.exists(new DB('jsdb'), 'public')) {
        Schema.create(new DB('jsdb'), 'public');
    }

    if (!Table.exists(new Schema(new DB('jsdb'), 'public'), 'users')) {
        Table.create(new Schema(new DB('jsdb'), 'public'), 'users',
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

    if (!Table.exists(new Schema(new DB('jsdb'), 'public'), 'registry')) {
        Table.create(new Schema(new DB('jsdb'), 'public'), 'registry',
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

    if (!Registry.exists('jsdb.server.ignAuth')) {
        Registry.create('jsdb.server.ignAuth', 'boolean', false);
    }

    if (!Registry.exists('jsdb.server.listenIP')) {
        Registry.create('jsdb.server.listenIP', 'string', '0.0.0.0');
    }

    if (!Registry.exists('jsdb.server.port')) {
        Registry.create('jsdb.server.port', 'number', 6637);
    }

    if (!Registry.exists('jsdb.server.startDir')) {
        Registry.create('jsdb.server.startDir', 'string', './data/');
    }

    if (!Registry.exists('jsdb.db.createZip')) {
        Registry.create('jsdb.db.createZip', 'boolean', false);
    }

    if (!Registry.exists('jsdb.registry.instantApplyChanges')) {
        Registry.create('jsdb.registry.instantApplyChanges', 'boolean', false);
    }

    if (!Registry.exists('jsdb.log.generateLogs')) {
        Registry.create('jsdb.log.generateLogs', 'boolean', true);
    }
};
