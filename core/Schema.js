/**
 * Copyright 2020 Dhiego Cassiano Fogaça Barbosa

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
 * @file Schema Class
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const commands = require('./commands/schema');

const DB = require('./DB');
//const Sequence = require('./Sequence');
//const Table = require('./Table');

module.exports = class Schema {
    #name;
    #db;

    /**
     *
     * @param {DB} db
     * @param {string} name
     */
    constructor(db, name) {
        if (!Schema.exists(db, name)) {
            throw new Error(`Schema ${db.name}.${name} does not exist.`);
        }

        this.db = db;
        this.name = name;
    }

    /**
     *
     * @returns {DB}
     */
    get db() {
        return this.#db;
    }

    /**
     *
     * @param {DB} db
     */
    set db(db) {
        if (!(db instanceof DB)) {
            throw new TypeError(`db is not DB.`);
        }

        this.#db = db;
    }

    /**
     *
     * @returns {string}
     */
    get name() {
        return this.#name;
    }

    /**
     *
     * @param {string} name
     */
    set name(name) {
        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        this.#name = name;
    }

    /**
     *
     * @param {string} table
     */
    table(table) {
        if (typeof table !== 'string') {
            throw new TypeError(`table is not string.`);
        }

        return new (require('./Table'))(this, table);
    }

    /**
     *
     * @param {string} sequence
     */
    sequence(sequence) {
        if (typeof sequence !== 'string') {
            throw new TypeError(`sequence is not string.`);
        }

        return new (require('./Sequence'))(this, sequence);
    }

    /**
     * @returns {boolean}
     */
    drop() {
        if (this.db.name === 'jsdb' && this.name === 'public') {
            throw new Error('JSDB database public schema cannot be dropped.');
        }

        if (!Schema.exists(this.db, this.name)) {
            throw new Error(`Schema ${this.db.name}.${this.name} does not exist.`);
        }

        let List = commands.readFile(this.db.name);
        List.splice(List.indexOf(this.name), 1);
        commands.writeFile(this.db.name, List);
        commands.deleteFolder(this.db.name, this.name);

        return true;
    }

    /**
     *
     * @param {DB} db
     * @param {string} name
     * @returns {Schema}
     */
    static create(db, name) {
        if (!(db instanceof DB)) {
            throw new TypeError(`db is not DB.`);
        }

        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        let list = commands.readFile(db.name);
        if (list.includes(name)) {
            throw new Error(`Schema ${db.name}.${name} already exists.`);
        }

        list.push(name);
        commands.writeFile(db.name, list);
        commands.createFolder(db.name, name);

        return new Schema(db, name);
    }

    /**
     *
     * @param {DB} db
     * @param {string} name
     * @returns {boolean}
     */
    static exists(db, name) {
        if (!db instanceof DB) {
            throw new TypeError(`db is not DB.`);
        }

        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        const list = commands.readFile(db.name);
        return list.includes(name);
    }
};
