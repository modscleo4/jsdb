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

class Connection {
    #socket;
    #dbName;
    #schemaName;
    #username;

    constructor(socket = null) {
        this.Socket = socket;
        this.DBName = 'jsdb';
        this.SchemaName = 'public';
        this.Username = null;
    }

    get Socket() {
        return this.#socket;
    }

    set Socket(socket) {
        this.#socket = socket;
    }

    get DBName() {
        return this.#dbName;
    }

    set DBName(dbName) {
        this.#dbName = dbName;
    }

    get SchemaName() {
        return this.#schemaName;
    }

    set SchemaName(schemaName) {
        this.#schemaName = schemaName;
    }

    get Username() {
        return this.#username;
    }

    set Username(username) {
        this.#username = username;
    }
}

module.exports = Connection;
