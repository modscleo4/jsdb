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
 * @file Table Class
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const commands = require('./commands/table');

const DB = require('./DB');
const Schema = require('./Schema');
const Sequence = require('./Sequence');

/**
 *
 * @param {Array} array
 * @param {function} fn
 * @return {Array}
 */
function groupBy(array, fn) {
    return array.reduce((prev, curr, i, arr, k = fn(curr)) => ((prev[k] || (prev[k] = [])).push(curr), prev), {});
}

module.exports = class Table {
    /**
     *
     * @param {Schema} schema
     * @param {string} name
     */
    constructor(schema, name) {
        if (!Table.exists(schema, name)) {
            throw new Error(`Table ${schema.db.name}.${schema.name}.${name} does not exist.`);
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

    /**
     *
     * @param {Schema} schema
     * @param {string} name
     * @param {object} tableStructure
     * @param {object} tableMetadata
     * @returns {Table}
     */
    static create(schema, name, tableStructure, tableMetadata = null) {
        if (!(schema instanceof Schema)) {
            throw new TypeError(`schema is not Schema.`);
        }

        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        let list = commands.readFile(schema.db.name, schema.name);
        if (list.includes(name)) {
            throw new Error(`Table ${schema.db.name}.${schema.name}.${name} already exists.`);
        }

        list.push(name);
        commands.writeFile(schema.db.name, schema.name, list);
        commands.createFolder(schema.db.name, schema.name, name);

        if (tableMetadata !== null) {
            tableStructure.__metadata = tableMetadata;
        }

        for (let key in tableStructure) {
            if (tableMetadata !== null && 'primaryKey' in tableMetadata && tableMetadata.primaryKey.includes(key) && !tableStructure[key].notNull) {
                throw new Error(`Primary key column cannot accept null values!`);
            } else if ('maxLength' in tableStructure[key]) {
                tableStructure[key].maxLength = parseInt(tableStructure[key].maxLength);

                if (tableStructure[key].maxLength <= 0) {
                    throw new Error(`Invalid maxLength property for column ${key}.`);
                }
            } else if (tableStructure[key].autoIncrement) {
                if (tableStructure[key].type === 'integer') {
                    delete (tableStructure[key].autoIncrement);
                    tableStructure[key].default = `nextval(${name}_${key}_seq)`;

                    Sequence.create(schema, `${name}_${key}_seq`, Sequence.default);
                } else {
                    throw new Error("Only columns of type integer can have the autoincrement property");
                }
            }
        }

        commands.writeStructure(schema.db.name, schema.name, name, tableStructure);
        commands.writeContent(schema.db.name, schema.name, name, null);

        return new Table(schema, name);
    }

    /**
     *
     * @param {Schema} schema
     * @param {string} name
     *
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
        return list.includes(name);
    }

    /**
     *
     * @returns {number}
     */
    insert(content, columns = null) {
        if (!(Table.exists(this.schema, this.name))) {
            throw new Error(`Table ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        let TableStruct = commands.readStructure(this.schema.db.name, this.schema.name, this.name);
        let TColumns = Object.keys(TableStruct);

        // Remove __metadata from Columns list
        for (let c = 0; c < TColumns.length; c++) {
            if (TColumns[c] === `__metadata`) {
                TColumns.splice(c, 1);
            }
        }

        let ContentW = [];

        if (content === null) {
            throw new Error(`content is null.`);
        }

        if ((columns === null && content.length !== TColumns.length) || columns !== null && content.length !== columns.length) {
            throw new Error(`Number of columns does not match with provided values (required: ${TColumns.length})`);
        }

        let i = 0;
        let F = false;

        if (columns !== null) {
            for (let c = 0; c < TColumns.length; c++) {
                for (let aux = 0; aux < columns.length; aux++) {
                    if (!TColumns.includes(columns[aux])) {
                        throw new Error(`Invalid column: ${columns[aux]}`);
                    }

                    // Get first index
                    if (TColumns[c] === columns[aux]) {
                        i = aux;
                        F = true;
                        break;
                    }
                }

                if (F) {
                    F = false;
                    break;
                }
            }
        }

        for (let c = 0; c < TColumns.length; c++) {
            let key = TColumns[c];

            // Add default val to content if column does not match key
            if (columns !== null) {
                if (key !== columns[i]) {
                    content.push('DEFAULT');
                    columns.push(key);
                    i = columns.length - 1;
                }

                columns[i] = '.ignore';
            }

            // Ignore tablename.metadata Object to avoid errors
            if (key !== `__metadata`) {
                if (TableStruct[key].type === 'object' && content[i].toUpperCase() !== 'DEFAULT') {
                    content[i] = JSON.parse(content[i]);
                }

                // Key is not provided
                if (typeof content[i] === 'undefined') {
                    content[i] = 'DEFAULT';
                }

                if (content[i] === null && TableStruct[key].notNull) {
                    throw new Error(`\`${key}\` cannot be null`);
                }

                if ('maxLength' in TableStruct[key] && content[i].toString().length > TableStruct[key].maxLength) {
                    throw new Error(`Exceded the max length for \`${key}\`: ${TableStruct[key].maxLength}`);
                }

                if (TableStruct[key].unique === true) {
                    let TableContent = commands.readContent(this.schema.db.name, this.schema.name, this.name);
                    TableContent.forEach(c => {
                        if (c[i] !== null && c[i] === content[i]) {
                            // Check for unique values (and ignore the null ones)
                            throw new Error(`Value already exists: ${c[i]}`);
                        }
                    });
                }

                if (typeof content[i] === 'string') {
                    // Replace content with the default value
                    if (content[i].toUpperCase() === 'DEFAULT') {
                        content[i] = TableStruct[key].default;
                    }

                    let a;

                    // If true, it's a sequence
                    if ((a = content[i].search('nextval[(].*[)]')) !== -1) {
                        content[i] = content[i].trim();

                        // The replace method is too slow (+40 ms)
                        //let seqName = content[i].default.replace(/nextval[(](.*)[)]/g, '$1');
                        let seqName = content[i].slice(a + 'nextval('.length, content[i].length - 1);
                        content[i] = new Sequence(this.schema, seqName).increment();
                    }
                }

                if (typeof content[i] !== TableStruct[key].type) {
                    if (!(TableStruct[key].type === 'integer' && Number.isInteger(content[i]))) {
                        // The types are different and the number is not integer
                        throw new Error(`Invalid type for column \`${key}\`: ${content[i]}(${typeof content[i]})`);
                    }
                }

                if (typeof content[i] !== 'undefined') {
                    ContentW[c] = content[i];
                    delete (content[i]);
                }

                if (columns === null) {
                    i++;
                } else {
                    i = 0;

                    let f = true;
                    for (let j = 0; j < columns.length; j++) {
                        if (columns[j] !== '.ignore') {
                            f = false;
                            break;
                        }
                    }

                    if (f) {
                        columns = null;
                        i++;
                    } else {
                        for (let ca = 0; ca < TColumns.length; ca++) {
                            for (let aux = 0; aux < columns.length; aux++) {
                                if (columns[aux] !== '.ignore' && TColumns.indexOf(columns[aux]) === -1) {
                                    throw new Error(`Invalid column: ${columns[aux]}`);
                                }

                                // Get the next index
                                if (TColumns[ca] === columns[aux]) {
                                    i = aux;
                                    F = true;
                                    break;
                                }
                            }

                            if (F) {
                                F = false;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return commands.writeContent(this.schema.db.name, this.schema.name, this.name, ContentW);
    }

    /**
     *
     * @param {Array} columns
     * @param {object} options
     * @returns {Array}
     */
    select(columns, options = {where: null, groupBy: null, orderBy: null, limitOffset: {limit: -1, offset: -1}}) {
        if (!(Table.exists(this.schema, this.name))) {
            throw new Error(`Table ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        let TableContent = commands.readContent(this.schema.db.name, this.schema.name, this.name);
        let TableStruct = commands.readStructure(this.schema.db.name, this.schema.name, this.name);

        if (options.limitOffset && options.limitOffset.limit !== -1 && options.limitOffset.offset !== -1) {
            if (typeof TableContent[options.limitOffset.limit - 1] === 'undefined') {
                throw new Error('LIMIT greater than number of rows');
            }

            if (typeof TableContent[options.limitOffset.offset] === 'undefined') {
                throw new Error('OFFSET greater than number of rows');
            }

            TableContent = TableContent.splice(options.limitOffset.offset, options.limitOffset.limit);
        }

        /*
        * Auxiliary Object for WHERE
        * */
        let aaa = [];
        for (let i = 0; i < TableContent.length; i++) {
            let j = 0;
            aaa[i] = {};
            for (let key in TableStruct) {
                if (TableStruct.hasOwnProperty(key)) {
                    if (key !== `__metadata`) {
                        aaa[i][key] = TableContent[i][j];
                    }
                    j++;
                }
            }
        }

        let r = []; // Array to return
        if (columns[0] === '*') {
            for (let i = 0; i < TableContent.length; i++) {
                let j = 0;
                r[i] = {};
                for (let key in TableStruct) {
                    if (TableStruct.hasOwnProperty(key)) {
                        if (key !== `__metadata`) {
                            r[i][key] = TableContent[i][j];
                        }
                        j++;
                    }
                }
            }
        } else {
            for (let i = 0; i < TableContent.length; i++) {
                r[i] = {};
                columns.forEach(column => {
                    if (!TableStruct.hasOwnProperty(column)) {
                        throw new Error(`Table ${this.schema.db.name}.${this.schema.name}.${this.name} does not have column ${column}`);
                    }

                    let j = 0;
                    for (let key in TableStruct) {
                        if (TableStruct.hasOwnProperty(key)) {
                            if (key !== `__metadata`) {
                                if (key === column) {
                                    r[i][key] = TableContent[i][j];
                                }
                            }
                            j++;
                        }
                    }
                });
            }
        }

        if (options.where) {
            for (let i = 0; i < r.length; i++) {
                let e = options.where;
                for (let key in aaa[i]) {
                    if (aaa[i].hasOwnProperty(key)) {
                        if (e.search(new RegExp(`\`${key}\``, 'g')) !== -1) {
                            // Replace column with values
                            if (TableStruct[key].type === 'string') {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), `'${aaa[i][key].toString()}'`);
                            } else {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), aaa[i][key].toString());
                            }
                        }
                    }
                }

                if (!eval(e)) {
                    // The where clause is false, remove from returning table

                    aaa.splice(i, 1);
                    r.splice(i, 1);
                    i = -1;
                }
            }
        }

        if (options.orderBy) {
            const getC = orderBy => {
                if (!orderBy[0].hasOwnProperty('column')) {
                    // No column specified

                    if (!TableStruct[`__metadata`].hasOwnProperty('primaryKey')) {
                        // There is no primary key on the table

                        // Gets the first column of the table
                        let key;
                        for (key in TableStruct) {
                            if (key !== `__metadata`) {
                                break;
                            }
                        }

                        return TableStruct[key];
                    } else {
                        return TableStruct[`__metadata`].primaryKey[0];
                    }
                } else {
                    if (!TableStruct.hasOwnProperty(orderBy[0].column)) {
                        throw new Error(`Column ${orderBy[0].column} does not exist`);
                    }
                    return orderBy[0].column;
                }
            };

            const getM = orderBy => {
                if (typeof orderBy[0].mode === 'undefined') {
                    return 'ASC';
                } else {
                    return orderBy[0].mode;
                }
            };

            // Check if the column 0 exists
            getC(options.orderBy);

            const sorting = orderBy => function (a, b) {
                let c = getC(orderBy); // Column
                let m = getM(orderBy); // Mode

                if (m.toUpperCase() === 'DESC') {
                    if (a[c] < b[c]) {
                        return 1;
                    } else if (a[c] > b[c]) {
                        return -1;
                    } else {
                        if (orderBy.length > 1) {
                            return sorting(orderBy.slice(1))(a, b);
                        }
                    }
                } else {
                    if (a[c] < b[c]) {
                        return -1;
                    } else if (a[c] > b[c]) {
                        return 1;
                    } else {
                        if (orderBy.length > 1) {
                            return sorting(orderBy.slice(1))(a, b);
                        }
                    }
                }

                return 0;
            };

            r = r.sort(sorting(options.orderBy));
        }

        if (options.groupBy) {

        }

        return r;
    }

    /**
     *
     * @returns {number}
     */
    update(update, options = {where: null, limitOffset: {limit: -1, offset: -1}}) {
        if (!(Table.exists(this.schema, this.name))) {
            throw new Error(`Table ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        let TableContent = commands.readContent(this.schema.db.name, this.schema.name, this.name);
        let TableStruct = commands.readStructure(this.schema.db.name, this.schema.name, this.name);
        let TableIndexes = [];

        if (options.limitOffset && options.limitOffset.limit !== -1 && options.limitOffset.offset !== -1) {
            if (typeof TableContent[options.limitOffset.offset] === 'undefined') {
                throw new Error('OFFSET greater than number of rows');
            }
        }

        // Auxiliary Object for WHERE
        let aaa = [];
        for (let i = 0; i < TableContent.length; i++) {
            let j = 0;
            aaa[i] = {};
            for (let key in TableStruct) {
                if (TableStruct.hasOwnProperty(key)) {
                    if (key !== `__metadata`) {
                        TableIndexes[j] = key;
                        aaa[i][key] = TableContent[i][j];
                    }
                    j++;
                }
            }
        }

        let b = 0;
        let c = 0;
        if (options.where) {
            for (let i = 0; i < TableContent.length; i++) {
                let e = options.where;
                for (let key in aaa[i]) {
                    if (aaa[i].hasOwnProperty(key)) {
                        if (e.search(new RegExp(`\`${key}\``, 'g')) !== -1) {
                            if (TableStruct[key].type === 'string') {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), `'${aaa[i][key].toString()}'`);
                            } else {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), aaa[i][key].toString());
                            }
                        }
                    }
                }

                if (eval(e)) {
                    b++;
                    for (let key in update) {
                        let isDefault = false;
                        let oldString = null;

                        if (update.hasOwnProperty(key)) {
                            if (!aaa[0].hasOwnProperty(key)) {
                                throw new Error(`Column ${key} does not exist.`);
                            }

                            let j = 0;
                            for (j; j < TableIndexes.length; j++) {
                                if (TableIndexes[j] === key) {
                                    break;
                                }
                            }

                            if (TableStruct[key].type === 'object') {
                                update[key] = JSON.parse(update[key]);
                            }

                            if (update[key] === null && TableStruct[key].notNull) {
                                throw new Error(`\`${key}\` cannot be null`);
                            }

                            if ('maxLength' in TableStruct[key] && update[key].toString().length > TableStruct[key].maxLength) {
                                throw new Error(`Exceded the max length for \`${key}\`: ${TableStruct[key].maxLength}`);
                            }

                            if (typeof update[key] === 'string') {
                                // Replace content with the default value
                                if (update[key].toUpperCase() === 'DEFAULT') {
                                    update[key] = TableStruct[key].default;
                                    isDefault = true;
                                }

                                let a;

                                // If true, it's a sequence
                                if ((a = update[key].search('nextval[(].*[)]')) !== -1) {
                                    update[key] = update[key].trim();
                                    oldString = update[key];

                                    // The replace method is too slow (+40 ms)
                                    //let seqName = update[key].default.replace(/nextval[(](.*)[)]/g, '$1');
                                    const seqName = update[key].slice(a + 'nextval('.length, update[key].length - 1);
                                    update[key] = new Sequence(this.schema, seqName).increment();
                                }
                            } else {
                                if (typeof update[key] !== TableStruct[key].type) {
                                    if (!(TableStruct[key].type === 'integer' && Number.isInteger(update[key]))) {
                                        // The types are different and the number is not integer
                                        throw new Error(`Invalid type for column \`${key}\`: ${update[key]}(${typeof update[key]})`);
                                    }
                                }
                            }

                            if (TableStruct[key].unique === true) {
                                TableContent.forEach(c => {
                                    if (c[j] !== null && c[j] === update[key]) {
                                        // Check for unique values (and ignore the null ones)
                                        throw new Error(`Value already exists: ${c[j]}`);
                                    }
                                });
                            }

                            if (options.limitOffset && options.limitOffset.offset !== -1) {
                                TableContent[i + options.limitOffset.offset][j] = update[key];
                            } else {
                                TableContent[i][j] = update[key];
                            }

                            if (isDefault) {
                                update[key] = 'DEFAULT';
                            } else if (oldString !== null) {
                                update[key] = oldString;
                            }
                        }
                    }
                }

                c++;
                if (options.limitOffset && options.limitOffset.limit !== -1) {
                    if (c === options.limitOffset.limit) {
                        break;
                    }
                }
            }
        }

        commands.writeContent(this.schema.db.name, this.schema.name, this.name, TableContent, true);

        return b;
    }

    /**
     *
     * @returns {number}
     */
    delete(options = {where: null, limitOffset: {limit: -1, offset: -1}}) {
        let TableContent = commands.readContent(this.schema.db.name, this.schema.name, this.name);
        let TableStruct = commands.readStructure(this.schema.db.name, this.schema.name, this.name);

        if (options.limitOffset && options.limitOffset.limit !== -1 && options.limitOffset.offset !== -1) {
            if (typeof TableContent[options.limitOffset.limit - 1] === 'undefined') {
                throw new Error('LIMIT greater than number of rows');
            }

            if (typeof TableContent[options.limitOffset.offset] === 'undefined') {
                throw new Error('OFFSET greater than number of rows');
            }
        }

        // Auxiliary Object for WHERE
        let aaa = [];
        for (let i = 0; i < TableContent.length; i++) {
            let j = 0;
            aaa[i] = {};
            for (let key in TableStruct) {
                if (TableStruct.hasOwnProperty(key)) {
                    if (key !== `__metadata`) {
                        aaa[i][key] = TableContent[i][j];
                    }
                    j++;
                }
            }
        }

        let b = 0;
        let c = 0;
        if (options.where) {
            for (let i = 0; i < TableContent.length; i++) {
                let e = options.where;
                for (let key in aaa[i]) {
                    if (aaa[i].hasOwnProperty(key)) {
                        if (e.search(new RegExp(`\`${key}\``, 'g')) !== -1) {
                            if (TableStruct[key].type === 'string') {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), `'${aaa[i][key].toString()}'`);
                            } else {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), aaa[i][key].toString());
                            }
                        }
                    }
                }

                if (eval(e)) {
                    b++;
                    if (options.limitOffset && options.limitOffset.offset !== -1) {
                        TableContent.splice(i + options.limitOffset.offset, 1);
                        aaa.splice(i + offset, 1);
                    } else {
                        TableContent.splice(i, 1);
                        aaa.splice(i, 1);
                    }

                    i = -1;
                }

                c++;
                if (options.limitOffset && options.limitOffset.limit !== -1) {
                    if (c === options.limitOffset.limit) {
                        break;
                    }
                }
            }
        }

        commands.writeContent(this.schema.db.name, this.schema.name, this.name, TableContent, true);

        return b;
    }

    drop() {
        if (this.schema.db.name === 'jsdb' && this.schema.name === 'public' && (this.name === 'users' || this.name === 'registry')) {
            throw new Error('JSDB database tables cannot be dropped');
        }

        if (!(Table.exists(this.schema, this.name))) {
            throw new Error(`Table ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        let List = commands.readFile(this.schema.db.name, this.schema.name);
        let i = List.indexOf(this.name);
        List.splice(i, 1);
        commands.writeFile(this.schema.db.name, this.schema.name, List);

        commands.deleteFolder(this.schema.db.name, this.schema.name, this.name);

        return true;
    }
};
