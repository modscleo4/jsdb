/**
 * Copyright 2020 Dhiego Cassiano Fogaça Barbosa

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
 * @file Connection Class
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

module.exports = class Connection {
    constructor(socket = null) {
        this.Socket = socket;
        this.DBName = 'jsdb';
        this.SchemaName = 'public';
        this.Username = null;
    }

    get Socket() {
        return this._socket;
    }

    set Socket(socket) {
        this._socket = socket;
    }

    get DBName() {
        return this._dbName;
    }

    set DBName(dbName) {
        this._dbName = dbName;
    }

    get SchemaName() {
        return this._schemaName;
    }

    set SchemaName(schemaName) {
        this._schemaName = schemaName;
    }

    get Username() {
        return this._username;
    }

    set Username(username) {
        this._username = username;
    }
};
