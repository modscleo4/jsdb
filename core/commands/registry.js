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
 * @file This file contains functions to interact with registry entries
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {config} = require('../../config');
const db = require('./db');

/**
 * @summary Reads the entire registry
 */
exports.readAll = function readAll() {
    db.checkJSDBIntegrity();

    // Load registry configs
    const Registry = require('../Registry');
    config.server.ignAuth = new Registry('jsdb.server.ignAuth').read();
    config.db.createZip = new Registry('jsdb.db.createZip').read();
    config.server.startDir = new Registry('jsdb.server.startDir').read();
    config.server.listenIP = new Registry('jsdb.server.listenIP').read();
    config.server.port = new Registry('jsdb.server.port').read();
    config.registry.instantApplyChanges = new Registry('jsdb.registry.instantApplyChanges').read();
    config.log.generateLogs = new Registry('jsdb.log.generateLogs').read();
};
