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
 * @file Script to the logging system
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const {date, config} = require('../../config');

const fs = require('fs');

Number.prototype.pad = function (size) {
    let s = String(this);
    while (s.length < (size || 2)) {
        s = '0' + s;
    }
    return s;
};

/**
 * @summary Logs to file
 *
 * @param status {number} The status code (0 - DEBUG, 1 - Info, 2 - Warning, 3 - Error)
 * @param str {string} What to log
 */
function log(status, str) {
    if (typeof status !== 'number') {
        throw new TypeError(`status is not number.`);
    }

    if (typeof str !== 'string') {
        throw new TypeError(`str is not string.`);
    }

    if (!config.log.generateLogs) {
        return;
    }

    if (status < config.log.minLevel) {
        return;
    }

    const d = new Date();
    const h = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString();
    if (!fs.existsSync(`${config.server.startDir}logs/`)) {
        fs.mkdirSync(`${config.server.startDir}logs/`);
    }

    if (!str.endsWith('\n')) {
        str += '\n';
    }

    str = `${h}: ${str}`;

    switch (status) {
        case 0:
            str = `(DEBUG) ${str}`;
            break;

        case 1:
            str = `(-) ${str}`;
            break;

        case 2:
            str = `(!) ${str}`;
            break;

        case 3:
            str = `(*) ${str}`;
            break;

        default:
            throw new RangeError(`status out of range (0-3)`);
    }

    const file = `${config.server.startDir}logs/${date.getFullYear()}-${(date.getMonth() + 1).pad()}-${date.getDate().pad()}_${date.getHours().pad()}_${date.getMinutes().pad()}_${date.getSeconds().pad()}.log`;
    fs.appendFileSync(file, str);
}

module.exports = {
    /**
     *
     * @param {string} str
     */
    debug: (str) => {
        log(0, str);
    },

    /**
     *
     * @param {string} str
     */
    info: (str) => {
        log(1, str);
    },

    /**
     *
     * @param {string} str
     */
    warning: (str) => {
        log(2, str);
    },

    /**
     *
     * @param {string} str
     */
    error: (str) => {
        log(3, str);
    },
};
