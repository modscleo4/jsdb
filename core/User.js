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
 * @file User Class
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {config} = require('../config');
const md5 = require('md5');

const DB = require('./DB');
const Schema = require('./Schema');
const Table = require('./Table');

module.exports = class User {
    /**
     *
     * @param {string} name
     */
    constructor(name) {
        if (name !== 'grantall::jsdbadmin' && !User.exists(name)) {
            throw new Error(`User ${name} does not exist.`);
        }

        this.table = new DB('jsdb').table('users');
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
     * @param {string} password
     * @return {boolean}
     */
    static auth(name, password) {
        if (name === 'grantall::jsdbadmin') {
            throw new Error('AUTHERR: Wrong password');
        }

        let users = new DB('jsdb').table('users').select(['password', 'valid', 'privileges'], {
            where: `\`username\` == '${name}'`,
            orderBy: [{column: 'username', mode: 'ASC'}]
        });

        if (users.length === 0 || !users[0].valid) {
            throw new Error(`AUTHERR: Invalid username: ${name}`);
        }

        return users[0].password === md5(password);
    }

    static create(name, password, privileges, valid = true) {
        if (name === 'grantall::jsdbadmin') {
            throw new Error('Invalid username');
        }

        if (User.exists(name)) {
            throw new Error(`User ${name} already exists`);
        }

        new DB('jsdb').table('users').insert(['DEFAULT', name, md5(`${password}`), valid, JSON.stringify(privileges)]);

        return new User(name);
    }

    static exists(name) {
        if (config.server.ignAuth && name === 'grantall::jsdbadmin') {
            return true;
        }

        const user = new DB('jsdb').table('users').select(['id', 'valid'], {where: `\`username\` == '${name}'`});

        if (user.length === 0) {
            return false;
        } else if (!user[0].valid) {
            throw new Error(`User ${name} is disabled`);
        }

        return true;
    }

    privileges() {
        if (this.name === 'grantall::jsdbadmin') {
            return {'*': 15};
        }

        let users = new DB('jsdb').table('users').select(['valid', 'privileges'], {
            where: `\`username\` == '${this.name}'`,
            orderBy: [{column: 'username', mode: 'ASC'}]
        });

        if (users.length === 0 || !users[0].valid) {
            throw new Error(`AUTHERR: Invalid username: ${this.name}`);
        }

        return users[0].privileges;
    }

    update(update = {username: null, password: null, privileges: null, valid: null}) {
        // grantall::jsdbadmin is not a real user, this is for avoid errors
        if (this.name === 'grantall::jsdbadmin') {
            throw new Error(`Invalid username: ${this.name}`);
        }

        let users = new DB('jsdb').table('users').select(['password', 'privileges'], {
            where: `\`username\` == '${this.name}'`,
            orderBy: [{column: 'username', mode: 'ASC'}]
        });

        if (users.length === 0) {
            throw new Error(`Invalid username: ${this.name}`);
        }

        // Do not allow renaming user jsdbadmin
        if (update.username && this.name === 'jsdbadmin') {
            throw new Error('User jsdbadmin cannot be renamed');
        }

        if (update.password) {
            update.password = md5(update.password);
        }

        if (update.privileges) {
            update.privileges = JSON.parse(update.privileges);

            for (let key in update.privileges) {
                if (update.privileges.hasOwnProperty(key)) {
                    update.privileges[key] = parseInt(update.privileges[key], 2);
                }
            }

            update.privileges = JSON.stringify(update.privileges);
        }

        new DB('jsdb').table('users').update(update, {where: `\`username\` == '${this.name}'`});

        return true;
    }

    drop() {
        // grantall::jsdbadmin is not a real user, this is for avoid errors
        // Do not allow delete user jsdbadmin
        if (this.name === 'grantall::jsdbadmin' || this.name === 'jsdbadmin') {
            throw new Error(`Invalid username: ${this.name}`);
        }

        new DB('jsdb').table('users').delete({where: `\`username\` == '${this.name}'`});

        return true;
    }
};
