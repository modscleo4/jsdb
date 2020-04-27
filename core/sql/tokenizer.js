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
 * @file This is the script that tokenize the SQL
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

/**
 *
 * @param {string} sqlString
 * @return {Array}
 */
module.exports = sqlString => {
    if (typeof sqlString !== "string") {
        throw new TypeError(`sqlString is not string.`);
    }

    let ret = [];
    let par = [];
    let quo = [];
    let bkt = [];

    sqlString.replace(/\(/g, ' ( ')
        .replace(/\)/g, ' ) ')
        .replace(/,/g, ' , ')
        .replace(/\./g, ' . ')
        .split(/ +/)
        .forEach(word => {
            switch (word.toUpperCase()) {
                case 'SELECT':
                case 'INSERT':
                case 'UPDATE':
                case 'DELETE':

                case 'READ':
                case 'CREATE':
                case 'ALTER':
                case 'DROP':

                case 'DATABASE':
                case 'SCHEMA':
                case 'SEQUENCE':
                case 'TABLE':
                case 'USER':
                case 'ENTRY':
                case 'REGISTRY':

                case 'USE':
                case 'SET':
                case 'SHOW':

                case 'FROM':
                case 'INTO':
                case 'VALUES':
                case 'AS':
                case 'WHERE':
                case 'ORDER':
                case 'GROUP':
                case 'BY':
                case 'LIMIT':
                case 'OFFSET':

                case 'INNER':
                case 'LEFT':
                case 'RIGHT':
                case 'JOIN':

                case 'UNION':
                    ret.push({type: 'command', value: word.toUpperCase()});
                    break;

                case '(':
                    ret.push({type: 'token', value: word});
                    par.push(null);
                    break;

                case ')':
                    ret.push({type: 'token', value: word});
                    par.pop();
                    break;

                case '.':
                case 'NOT':
                case 'IN':
                case 'ANY':
                case 'ALL':
                case 'SOME':
                case 'NULL':
                case 'DEFAULT':
                    ret.push({type: 'token', value: word.toUpperCase()});
                    break;

                case ',':
                    ret.push({type: 'separator', value: word});
                    break;

                case 'AVG':
                case 'COUNT':
                case 'MIN':
                case 'MAX':
                case 'SUM':
                case 'MD5':
                    ret.push({type: 'function', value: word});
                    break;

                case '+':
                case '-':
                case '*':
                case '/':
                    ret.push({type: 'math', value: word});
                    break;

                case '<':
                case '<=':
                case '>':
                case '>=':
                case '=':
                case '<>':
                case 'LIKE':
                case 'IS':
                    ret.push({type: 'operator', value: word.toUpperCase()});
                    break;

                case 'ASC':
                case 'DESC':
                    ret.push({type: 'sortmode', value: word.toUpperCase()});
                    break;

                case 'AND':
                case 'OR':
                    ret.push({type: 'conditional', value: word.toUpperCase()});
                    break;

                case 'TRUE':
                case 'FALSE':
                    ret.push({type: 'boolean', value: word.toLowerCase()});
                    break;

                case '\'':
                    (quo.length === 0) ? quo.push(null) : quo.pop();
                    break;

                case '`':
                    (bkt.length === 0) ? bkt.push(null) : bkt.pop();
                    break;

                default:
                    if (word.match(/^\d+(\.\d+)?/g)) {
                        ret.push({type: 'number', value: parseFloat(word)});
                    } else if (word.match(/^'[^']*'/g)) {
                        ret.push({type: 'string', value: word.replace(/'/g, '')});
                    } else if (word.match(/'/g)) {
                        (quo.length === 0) ? quo.push(null) : quo.pop();
                    } else if (word.match(/^`[^`]*`/g)) {
                        ret.push({type: 'literal', value: word.replace(/`/g, '')});
                    } else if (word.match(/`/g)) {
                        (bkt.length === 0) ? bkt.push(null) : bkt.pop();
                    } else {
                        ret.push({type: 'literal', value: word});
                    }

                    break;
            }
        });

    if (par.length > 0) {
        throw new Error(`Missing (`);
    }

    if (quo.length > 0) {
        throw new Error(`Missing '`);
    }

    if (bkt.length > 0) {
        throw new Error(`Missing \``);
    }

    return ret;
};
