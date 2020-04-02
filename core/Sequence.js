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
 * @file Sequence Class
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const commands = require('./commands/sequence');

const Schema = require('./Schema');

module.exports = class Sequence {
    static default = {start: 1, inc: 1};

    /**
     *
     * @param {Schema} schema
     * @param {string} name
     */
    constructor(schema, name) {
        if (!Sequence.exists(schema, name)) {
            throw new Error(`Sequence ${schema.db.name}.${schema.name}.${name} does not exist.`);
        }

        this.schema = schema;
        this.name = name;
    }

    /**
     *
     * @return {DB}
     */
    get db() {
        return this.schema.db;
    }

    /**
     *
     * @returns {Schema}
     */
    get schema() {
        return this._schema;
    }

    /**
     *
     * @param {Schema} schema
     */
    set schema(schema) {
        if (!(schema instanceof Schema)) {
            throw new TypeError(`schema is not Schema.`);
        }

        this._schema = schema;
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

    get start() {
        return this.read().start;
    }

    get inc() {
        return this.read().inc;
    }

    /**
     *
     * @param {Schema} schema
     * @param {string} name
     * @param {Object} options
     * @returns {Sequence}
     */
    static create(schema, name, options = {start: 1, inc: 1}) {
        if (!(schema instanceof Schema)) {
            throw new TypeError(`schema is not Schema.`);
        }

        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        let list = commands.readFile(schema.db.name, schema.name);
        if (list.hasOwnProperty(name)) {
            throw new Error(`Sequence ${schema.db.name}.${schema.name}.${name} already exists.`);
        }

        list[name] = options;
        commands.writeFile(schema.db.name, schema.name, list);

        return new Sequence(schema, name);
    }

    /**
     *
     * @param {Schema} schema
     * @param {string} name
     * @returns {boolean}
     */
    static exists(schema, name) {
        if (!(schema instanceof Schema)) {
            throw new TypeError(`schema is not Schema.`);
        }

        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        const list = commands.readFile(schema.db.name, schema.name);
        return list.hasOwnProperty(name);
    }

    /**
     *
     * @return {number}
     */
    read() {
        if (!Sequence.exists(this.schema, this.name)) {
            throw new Error(`Sequence ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        return commands.readFile(this.schema.db.name, this.schema.name)[this.name];
    }

    /**
     *
     * @return {number}
     */
    increment() {
        if (!Sequence.exists(this.schema, this.name)) {
            throw new Error(`Sequence ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        const content = commands.readFile(this.schema.db.name, this.schema.name)[this.name];
        return this.update({start: content.start += content.inc, inc: content.inc});
    }

    /**
     *
     * @param start
     * @param inc
     * @return {number}
     */
    update({start, inc}) {
        if (!Sequence.exists(this.schema, this.name)) {
            throw new Error(`Sequence ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        let list = commands.readFile(this.schema.db.name, this.schema.name);
        list[this.name] = {start, inc};
        commands.writeFile(this.schema.db.name, this.schema.name, list);

        return start - inc;
    }

    /**
     *
     * @return {boolean}
     */
    drop() {
        if (!Sequence.exists(this.schema, this.name)) {
            throw new Error(`Sequence ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        let list = commands.readFile(this.schema.db.name, this.schema.name);
        delete list[this.name];
        commands.writeFile(this.schema.db.name, this.schema.name, list);

        return true;
    }
};
