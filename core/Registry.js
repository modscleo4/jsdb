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
 * @file Registry Class
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const DB = require('./DB');
const Schema = require('./Schema');
const Table = require('./Table');

module.exports = class Registry {
    /**
     *
     * @param {string} name
     */
    constructor(name) {
        if (!Registry.exists(name)) {
            throw new Error(`Registry Entry ${name} does not exist.`);
        }

        this.table = new DB('jsdb').table('registry');
        this.name = name;
    }

    /**
     *
     * @returns {Table}
     */
    get table() {
        return this._table;
    }

    /**
     *
     * @param {Table} table
     */
    set table(table) {
        if (!(table instanceof Table)) {
            throw new TypeError(`table is not Table.`);
        }

        this._table = table;
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
     * @param {string} type
     * @param {*} value
     * @returns {Registry}
     */
    static create(name, type, value) {
        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        if (typeof type !== 'string') {
            throw new TypeError(`type is not string.`);
        }

        if (typeof value !== type) {
            throw new TypeError(`value is not ${type}.`);
        }

        if (this.exists(name)) {
            throw new Error(`Registry entry ${name} already exists.`);
        }

        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }

        new DB('jsdb').table('registry').insert([name, type, value], ['entryName', 'type', 'value']);

        return new Registry(name);
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

        return new DB('jsdb').table('registry').select(['*'], {where: `\`entryName\` == '${name}'`}).length > 0;
    }

    read() {
        const entry = this.table.select(['value', 'type'], {where: `\`entryName\` == '${this.name}'`,});

        if (entry.length === 0) {
            throw new Error(`Entry ${this.name} does not exist.`);
        }

        if (entry[0].type !== 'string') {
            entry[0].value = JSON.parse(entry[0].value)
        }

        return entry[0].value;
    }

    update(value) {
        const entry = this.table.select(['type', 'value'], {where: `\`entryName\` == '${this.name}'`});

        if (entry.length === 0) {
            throw new Error(`Entry ${this.name} does not exist.`);
        }

        if (typeof value !== entry[0].type) {
            if (!(entry[0].type === 'integer' && Number.isInteger(value))) {
                throw new Error(`Invalid type: ${typeof value}.`);
            }
        }

        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }

        this.table.update({value}, {where: `\`entryName\` == '${this.name}'`});

        return entry[0].type === 'string' ? entry[0].value : JSON.parse(entry[0].value);
    }

    drop() {
        if (!Registry.exists(this.name)) {
            throw new Error(`Entry ${this.name} does not exist.`);
        }

        if (this.name.startsWith('jsdb.')) {
            throw new Error('JSDB entries cannot be deleted.');
        }

        this.table.delete({where: `\`entryName\` == '${this.name}'`});

        return true;
    }
};
