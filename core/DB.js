/**
 * Copyright 2019 Dhiego Cassiano Fogaça Barbosa

 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @file DB Class
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const commands = require('./commands/db');

//const Schema = require('./Schema');
//const Table = require('./Table');

module.exports = class DB {
    /**
     *
     * @param {string} name
     */
    constructor(name) {
        if (!DB.exists(name)) {
            throw new Error(`Database ${name} does not exist.`);
        }

        this.name = name;
    }

    /**
     *
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     *
     * @param {string} name
     */
    set name(name) {
        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        this._name = name;
    }

    /**
     *
     * @param {string} name
     * @returns {DB}
     */
    static create(name) {
        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        let list = commands.readFile();
        if (list.includes(name)) {
            throw new Error(`Database ${name} already exists.`);
        }

        list.push(name);
        commands.writeFile(list);
        commands.createFolder(name);

        require('./Schema').create(new DB(name), 'public');

        return new DB(name);
    }

    /**
     *
     * @param {string} name
     * @returns {boolean}
     */
    static exists(name) {
        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        const list = commands.readFile();
        return list.includes(name);
    }

    /**
     *
     * @returns {boolean}
     */
    drop() {
        if (this.name === 'jsdb') {
            throw new Error('JSDB database cannot be dropped.');
        }

        if (!DB.exists(this.name)) {
            throw new Error(`Database ${this.name} does not exist.`);
        }

        let List = commands.readFile();
        List.splice(List.indexOf(this.name), 1);
        commands.writeFile(List);
        commands.deleteFolder(this.name);

        return true;
    }

    /**
     *
     * @param {string} schema
     * @returns {Schema}
     */
    schema(schema) {
        if (typeof schema !== 'string') {
            throw new TypeError(`schema is not string.`);
        }

        return new (require('./Schema'))(this, schema);
    }

    /**
     *
     * @param {string} table
     * @returns {Table}
     */
    table(table) {
        if (typeof table !== 'string') {
            throw new TypeError(`table is not string.`);
        }

        return new (require('./Table'))(this.schema('public'), table);
    }
};
