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
 * @file This is the script that parses the SQL
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

'use strict';

const tokenizer = require('./tokenizer');

/**
 *
 * @param {string} sqlString
 * @return {Object}
 */
module.exports = sqlString => {
    if (typeof sqlString !== "string") {
        throw new TypeError(`sqlString is not string.`);
    }

    sqlString = sqlString.trim();
    let ret = {};

    const tokens = tokenizer(sqlString);

    if (tokens[0].type !== 'command') {
        throw new Error(`Invalid command: ${sqlString}`);
    }

    ret.command = tokens[0].value;

    switch (ret.command) {
        case 'SELECT':
            ret.columns = [];

            let index = 0;
            while (tokens[++index].value !== 'FROM') {
                if (tokens[index].type === 'function') {
                    if (tokens[index + 1].value !== '(') {
                        throw new Error(`Invalid command: ${sqlString}`);
                    }

                    let fn = tokens[index].value;

                    while (tokens[++index].value !== ')') {
                        fn += tokens[index].value;
                    }

                    fn += ')';

                    ret.columns.push(fn);
                    continue;
                }

                if (tokens[index].value !== ',') {
                    ret.columns.push(tokens[index].value);
                }
            }

            ret.schema = (tokens[index + 2].value === '.') ? tokens[index + 1].value : 'public';
            ret.table = (tokens[index + 2].value === '.') ? tokens[index + 3].value : tokens[index + 1].value;

            index += 2;
            if (tokens[index].value === '.') {
                index += 2;
            }

            for (let i = index; i < tokens.length; i++) {
                if (tokens[i].value === 'LIMIT') {
                    ret.limitOffset = {};

                    while (++index < tokens.length && tokens[index].type !== 'command') {
                        if (tokens[index].type === 'number') {
                            ret.limitOffset.limit = tokens[index].value;
                            ret.limitOffset.offset = 0;
                        } else if (tokens[index].type === 'separator') {
                            if (tokens[index - 1].type !== 'number' || tokens[index + 1].type !== 'number') {
                                throw new Error(`Invalid command: ${sqlString}`);
                            }

                            ret.limitOffset.limit = tokens[index + 1].value;
                            ret.limitOffset.offset = tokens[index - 1].value;
                            index++;
                            break;
                        } else if (tokens[index].value === 'OFFSET') {
                            if (tokens[index - 1].type !== 'number' || tokens[index + 1].type !== 'number') {
                                throw new Error(`Invalid command: ${sqlString}`);
                            }

                            ret.limitOffset.limit = tokens[index - 1].value;
                            ret.limitOffset.offset = tokens[++index].value;
                            break;
                        } else {
                            throw new Error(`Invalid command: ${sqlString}`);
                        }
                    }
                }

                if (tokens[i].value === 'WHERE') {
                    ret.where = '';
                    while (++index < tokens.length && tokens[index].type !== 'command') {
                        ret.where += `${tokens[index].value} `;
                    }

                    ret.where = ret.where.trim();
                }

                if (tokens[i].value === 'GROUP') {
                    if (tokens[++index].value !== 'BY') {
                        throw new Error(`Invalid command: ${sqlString}`);
                    }

                    ret.groupBy = [];

                    let comma = true;

                    while (++index < tokens.length && tokens[index].type !== 'command') {
                        if (tokens[index].type !== 'literal' && tokens[index].type !== 'separator') {
                            throw new Error(`Invalid command: ${sqlString}`);
                        }

                        if (tokens[index].type === 'separator') {
                            comma = true;
                            continue;
                        }

                        if (!comma) {
                            throw new Error(`Invalid command: ${sqlString}`);
                        } else {
                            ret.groupBy.push({column: tokens[index].value});
                            comma = false;
                        }
                    }
                }

                if (tokens[i].value === 'ORDER') {
                    if (tokens[++index].value !== 'BY') {
                        throw new Error(`Invalid command: ${sqlString}`);
                    }

                    ret.orderBy = [];

                    let comma = true;

                    while (++index < tokens.length && tokens[index].type !== 'command') {
                        if (tokens[index].type !== 'literal' && tokens[index].type !== 'separator') {
                            throw new Error(`Invalid command: ${sqlString}`);
                        }

                        let col = {column: tokens[index].value, mode: 'ASC'};

                        if (index + 1 < tokens.length && (tokens[index + 1].value === 'ASC' || tokens[index + 1].value === 'DESC')) {
                            col.mode = tokens[index + 1].value;
                            index++;
                        }

                        if (tokens[index].type === 'separator') {
                            comma = true;
                            continue;
                        }

                        if (!comma) {
                            throw new Error(`Invalid command: ${sqlString}`);
                        } else {
                            ret.orderBy.push(col);
                            comma = false;
                        }
                    }
                }
            }

            break;

        case 'INSERT':
            if (tokens[1].value !== 'INTO') {
                throw new Error(`Invalid command: ${sqlString}`);
            }

            break;

        default:
            throw new Error(`Invalid command: ${sqlString}`);
    }

    return ret;
};