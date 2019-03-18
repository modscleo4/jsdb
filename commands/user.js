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
 * @file Contains functions to interact with users
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const config = require('../config');
const table = require('./table');

const md5 = require('md5');

/**
 * @summary Authenticates the user
 *
 * @param username {string} The username
 * @param password {string} The matching password
 *
 * @returns {Object} If the username and the provided password matches, returns true
 * @throws {Error} If the username or the password is wrong, throw an error
 */
function authUser(username, password) {
    if (typeof username === 'string' && typeof password === 'string') {
        if (username === 'grantall::jsdbadmin') {
            throw new Error('AUTHERR: Wrong password');
        }

        let users = table.select(
            'jsdb',
            'public',
            'users',
            ['password', 'valid', 'privileges'],
            {
                'where': `\`username\` == '${username}'`,
                'orderby': [{'column': 'username', 'mode': 'ASC'}]
            }
        );

        if (users.length === 0 || !users[0].valid) {
            throw new Error(`AUTHERR: Invalid username: ${username}`);
        }

        if (users[0].password === md5(password)) {
            return true;
        } else {
            throw new Error('AUTHERR: Wrong password');
        }
    }
}

/**
 * @summary Creates a new user
 *
 * @param username {string} The username
 * @param password {string} The password
 * @param privileges {Object} The user privileges
 * @param valid {boolean} If the new user is valid or not
 *
 * @returns {String} If Ok, Returns 'Created user ${username}'
 * @throws {Error} If the user already exists, throw an error
 */
function createUser(username, password, privileges, valid = true) {
    if (typeof username === 'string' && typeof password === 'string' && typeof privileges === 'object') {
        if (username === 'grantall::jsdbadmin') {
            throw new Error('Invalid username');
        }

        let user = table.select(
            'jsdb',
            'public',
            'users',
            ['id'],
            {
                'where': `\`username\` == '${username}'`
            }
        );

        if (user.length === 0) {
            table.insert('jsdb', 'public', 'users', ['DEFAULT', username, md5(`${password}`), valid, JSON.stringify(privileges)]);
            return `Created user ${username}`;
        } else {
            throw new Error(`User ${username} already exists`);
        }
    }
}

/**
 * @summary Update a user
 *
 * @param username {String} The username
 * @param update {Object} A named array containing the values to update
 *
 * @returns {String} If Ok, Returns 'User ${username} updated'
 * @throws {Error} If the username is invalid, throw an error
 */
function updateUser(username, update) {
    if (typeof username === 'string' && typeof update === 'object') {

        // grantall::jsdbadmin is not a real user, this is for avoid errors
        if (username === 'grantall::jsdbadmin') {
            throw new Error('Invalid username');
        }

        let users = table.select(
            'jsdb',
            'public',
            'users',
            ['password', 'privileges'],
            {
                'where': `\`username\` == '${username}'`,
                'orderby': [{'column': 'username', 'mode': 'ASC'}]
            }
        );

        if (users.length === 0) {
            throw new Error(`Invalid username: ${username}`);
        }

        // Do not allow renaming user jsdbadmin
        if (update.hasOwnProperty('username') && username === 'jsdbadmin') {
            throw new Error('User jsdbadmin cannot be renamed');
        }

        if (update.hasOwnProperty('password')) {
            update.password = md5(update.password);
        }

        if (update.hasOwnProperty('privileges')) {
            update.privileges = JSON.parse(update.privileges);
            for (let key in update.privileges) {
                if (update.privileges.hasOwnProperty(key)) {
                    update.privileges[key] = parseInt(update.privileges[key], 2);
                }
            }
            update.privileges = JSON.stringify(update.privileges);
        }

        table.update('jsdb', 'public', 'users', update, {'where': `\`username\` == '${username}'`});
        return `User ${username} updated`;
    }
}

/**
 * @summary Delete a user
 *
 * @param username {String} The username
 *
 * @returns {String} If Ok, Returns 'User ${username} deleted'
 * @throws {Error} If the username is invalid, throw an error
 */
function dropUser(username) {
    if (typeof username === 'string') {
        // grantall::jsdbadmin is not a real user, this is for avoid errors
        // Do not allow delete user jsdbadmin

        if (username === 'grantall::jsdbadmin' || username === 'jsdbadmin') {
            throw new Error('Invalid username');
        }

        table.delete('jsdb', 'public', 'users', {'where': `\`username\` == '${username}'`});
        return `User ${username} deleted`;
    }
}

/**
 * @summary Gets the user privileges
 *
 * @param username {string} The username
 *
 * @returns {Object} If the username exists on database, returns all the user privileges
 * @throws {Error} If the username is wrong, throw an error
 */
function getUserPrivileges(username) {
    if (typeof username === 'string') {
        if (username === 'grantall::jsdbadmin') {
            return {'*': 15};
        }

        let users = table.select(
            'jsdb',
            'public',
            'users',
            ['valid', 'privileges'],
            {
                'where': `\`username\` == '${username}'`,
                'orderby': [{'column': 'username', 'mode': 'ASC'}]
            }
        );

        if (users.length === 0 || !users[0].valid) {
            throw new Error(`AUTHERR: Invalid username: ${username}`);
        }

        return users[0].privileges;
    }
}

/**
 * @summary Check if the user exists
 *
 * @param username {String} The username
 * @param throws {boolean} If true, throw an error if the user does not exist
 *
 * @returns {boolean} Return true if the user exists
 * @throws {Error} If the user does not exist, throw an error
 */
function existsUser(username, throws = true) {
    if (typeof username === 'string') {
        if (config.server.ignAuth && username === 'grantall::jsdbadmin') {
            return true;
        }

        let user = table.select(
            'jsdb',
            'public',
            'users',
            ['id'],
            {
                'where': `\`username\` == '${username}'`
            }
        );

        if (user.length === 0) {
            if (throws) {
                throw new Error(`User ${username} does not exist`);
            } else {
                return false;
            }
        } else if (!user[0].valid) {
            throw new Error(`User ${username} is disabled`);
        }

        return true;
    }
}

exports.auth = authUser;
exports.create = createUser;
exports.update = updateUser;
exports.drop = dropUser;
exports.getPrivileges = getUserPrivileges;

exports.exists = existsUser;