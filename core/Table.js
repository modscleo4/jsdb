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

class Table {
    #name;
    #schema;

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
     * @return {Schema}
     */
    get schema() {
        return this.#schema;
    }

    /**
     *
     * @param {Schema} schema
     */
    set schema(schema) {
        if (!(schema instanceof Schema)) {
            throw new TypeError(`schema is not Schema.`);
        }

        this.#schema = schema;
    }

    /**
     *
     * @return {string}
     */
    get name() {
        return this.#name;
    }

    /**
     *
     * @param {string} name
     */
    set name(name) {
        if (typeof name !== 'string') {
            throw new TypeError(`name is not string.`);
        }

        this.#name = name;
    }

    /**
     * @return {number}
     */
    get numberOfRows() {
        const TableContent = commands.readContent(this.schema.db.name, this.schema.name, this.name);
        return TableContent.length;
    }

    get numberOfColumns() {
        const TableStruct = commands.readStructure(this.schema.db.name, this.schema.name, this.name);
        return Object.keys(TableStruct.columns).length;
    }

    /**
     *
     * @param {Schema} schema
     * @param {string} name
     * @param {object} columns
     * @param {object} metadata
     * @return {Table}
     */
    static create(schema, name, columns, metadata = {primaryKey: []}) {
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

        for (let key in columns) {
            if (metadata !== null && 'primaryKey' in metadata && metadata.primaryKey.includes(key) && !columns[key].notNull) {
                throw new Error(`Primary key column cannot accept null values!`);
            }

            if ('minLength' in columns[key]) {
                columns[key].minLength = parseInt(columns[key].minLength);

                if (columns[key].minLength <= 0) {
                    throw new Error(`Invalid minLength property for column ${key}.`);
                }
            }

            if ('maxLength' in columns[key]) {
                columns[key].maxLength = parseInt(columns[key].maxLength);

                if (columns[key].maxLength <= 0 || 'minLength' in columns[key] && columns[key].maxLength < columns[key].minLength) {
                    throw new Error(`Invalid maxLength property for column ${key}.`);
                }
            }

            if ('minValue' in columns[key]) {
                if (columns[key].type !== 'integer' && columns[key].type !== 'number') {
                    throw new Error('Only columns of type number/integer can have the minimum value property.');
                }
            }

            if ('maxValue' in columns[key]) {
                if (columns[key].type !== 'integer' && columns[key].type !== 'number') {
                    throw new Error('Only columns of type number/integer can have the maximum value property.');
                }
            }

            if ('enum' in columns[key]) {
                if (columns[key].type !== 'integer') {
                    throw new Error('Only columns of type integer can have the autoincrement property.');
                }

                if (!Array.isArray(columns[key].enum)) {
                    throw new Error('Invalid enum property.');
                }

                if ('minValue' in columns[key] || 'maxValue' in columns[key]) {
                    throw new Error('Invalid minValue / maxValue properties.');
                }

                columns[key].minValue = 0;
                columns[key].maxValue = columns[key].enum.length - 1;
            }

            if ('autoIncrement' in columns[key]) {
                if (columns[key].type !== 'integer') {
                    throw new Error('Only columns of type integer can have the autoincrement property.');
                }

                delete columns[key].autoIncrement;
                columns[key].default = `nextval(${name}_${key}_seq)`;

                Sequence.create(schema, `${name}_${key}_seq`);
            }
        }

        commands.writeStructure(schema.db.name, schema.name, name, {
            $schema: "https://raw.githubusercontent.com/modscleo4/jsdb/master/core/schemas/tablestruct.schema.json",
            columns: columns,
            __metadata: metadata
        });
        commands.writeContent(schema.db.name, schema.name, name, null);

        return new Table(schema, name);
    }

    /**
     *
     * @param {Schema} schema
     * @param {string} name
     *
     * @return {boolean}
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
     * @return {number}
     */
    insert(content, columns = null) {
        if (!(Table.exists(this.schema, this.name))) {
            throw new Error(`Table ${this.schema.db.name}.${this.schema.name}.${this.name} does not exist.`);
        }

        let TableStruct = commands.readStructure(this.schema.db.name, this.schema.name, this.name);
        let TColumns = Object.keys(TableStruct.columns);

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

            if (TableStruct.columns[key].type === 'object' || TableStruct.columns[key].type === 'array' && content[i].toUpperCase() !== 'DEFAULT') {
                content[i] = JSON.parse(content[i]);
            }

            // Key is not provided
            if (typeof content[i] === 'undefined') {
                content[i] = 'DEFAULT';
            }

            if (content[i] === null && TableStruct.columns[key].notNull) {
                throw new Error(`\`${key}\` cannot be null`);
            }

            if ('maxLength' in TableStruct.columns[key] && content[i].toString().length > TableStruct.columns[key].maxLength) {
                throw new Error(`Exceded the max length for \`${key}\`: ${TableStruct.columns[key].maxLength}`);
            }

            if (TableStruct.columns[key].unique) {
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
                    content[i] = TableStruct.columns[key].default;
                }

                let a;

                // If true, it's a sequence
                if ((a = content[i].search('nextval[(].*[)]')) !== -1) {
                    content[i] = content[i].trim();

                    // The replace method is too slow (+40 ms)
                    //const seqName = content[i].default.replace(/nextval[(](.*)[)]/g, '$1');
                    const seqName = content[i].slice(a + 'nextval('.length, content[i].length - 1);
                    content[i] = new Sequence(this.schema, seqName).increment();
                }
            }

            if (typeof content[i] !== TableStruct.columns[key].type) {
                if (!(TableStruct.columns[key].type === 'integer' && Number.isInteger(content[i]))
                    && !(TableStruct.columns[key].type === 'array' && Array.isArray(content[i]))) {
                    // The types are different and the number is not integer/array
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
                            if (columns[aux] !== '.ignore' && !TColumns.includes(columns[aux])) {
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

        return commands.writeContent(this.schema.db.name, this.schema.name, this.name, ContentW);
    }

    /**
     *
     * @param {Array} columns
     * @param {object} options
     * @return {Array}
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
            for (let key in TableStruct.columns) {
                if (TableStruct.columns.hasOwnProperty(key)) {
                    aaa[i][key] = TableContent[i][j++];
                }
            }
        }

        let r = []; // Array to return
        if (columns[0] === '*') {
            for (let i = 0; i < TableContent.length; i++) {
                let j = 0;
                r[i] = {};
                for (let key in TableStruct.columns) {
                    if (TableStruct.columns.hasOwnProperty(key)) {
                        r[i][key] = TableContent[i][j++];
                    }
                }
            }
        } else {
            for (let i = 0; i < TableContent.length; i++) {
                r[i] = {};
                columns.forEach(column => {
                    if (!TableStruct.columns.hasOwnProperty(column)) {
                        throw new Error(`Table ${this.schema.db.name}.${this.schema.name}.${this.name} does not have column ${column}`);
                    }

                    let j = 0;
                    for (let key in TableStruct.columns) {
                        if (TableStruct.columns.hasOwnProperty(key)) {
                            if (key === column) {
                                r[i][key] = TableContent[i][j];
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
                            if (TableStruct.columns[key].type === 'string') {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), `'${aaa[i][key].toString()}'`);
                            } else {
                                e = e.replace(new RegExp(`\`${key}\``, 'g'), aaa[i][key].toString());
                            }
                        }
                    }
                }

                if (!eval(e)) {
                    aaa.splice(i, 1);
                    r.splice(i, 1);
                    i = -1;
                }
            }
        }

        if (options.orderBy) {
            const getC = orderBy => {
                if (orderBy[0].hasOwnProperty('column')) {
                    if (!TableStruct.columns.hasOwnProperty(orderBy[0].column)) {
                        throw new Error(`Column ${orderBy[0].column} does not exist`);
                    }

                    return orderBy[0].column;
                } else {
                    if (TableStruct.__metadata.hasOwnProperty('primaryKey')) {
                        return TableStruct.__metadata.primaryKey[0];
                    } else {
                        let key;
                        // noinspection LoopStatementThatDoesntLoopJS
                        for (key in TableStruct.columns) {
                            break;
                        }

                        return TableStruct.columns[key];
                    }
                }
            };

            const getM = orderBy => {
                if (orderBy[0].mode) {
                    return orderBy[0].mode;
                } else {
                    return 'ASC';
                }
            };

            // Check if the column 0 exists
            getC(options.orderBy);

            const sorting = orderBy => (a, b) => {
                const c = getC(orderBy); // Column
                const m = getM(orderBy); // Mode

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
            //r = r.reduce((acc, curr, i, arr, k = options.groupBy.map(val => `\`${val.column}\`:${JSON.stringify(curr[val.column])};`)) => ((acc[k] || (acc[k] = [])).push(curr), acc), {});
        }

        return r;
    }

    /**
     *
     * @return {number}
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
            for (let key in TableStruct.columns) {
                if (TableStruct.columns.hasOwnProperty(key)) {
                    TableIndexes[j] = key;
                    aaa[i][key] = TableContent[i][j++];
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
                            if (TableStruct.columns[key].type === 'string') {
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

                            if (TableStruct.columns[key].type === 'object' || TableStruct.columns[key].type === 'array') {
                                update[key] = JSON.parse(update[key]);
                            }

                            if (update[key] === null && TableStruct.columns[key].notNull) {
                                throw new Error(`\`${key}\` cannot be null`);
                            }

                            if ('maxLength' in TableStruct.columns[key] && update[key].toString().length > TableStruct.columns[key].maxLength) {
                                throw new Error(`Exceded the max length for \`${key}\`: ${TableStruct.columns[key].maxLength}`);
                            }

                            if (typeof update[key] === 'string') {
                                // Replace content with the default value
                                if (update[key].toUpperCase() === 'DEFAULT') {
                                    update[key] = TableStruct.columns[key].default;
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
                                if (typeof update[key] !== TableStruct.columns[key].type) {
                                    if (!(TableStruct.columns[key].type === 'integer' && Number.isInteger(update[key]))
                                        && !(TableStruct.columns[key].type === 'array' && Array.isArray(update[key]))) {
                                        // The types are different and the number is not integer
                                        throw new Error(`Invalid type for column \`${key}\`: ${update[key]}(${typeof update[key]})`);
                                    }
                                }
                            }

                            if (TableStruct.columns[key].unique === true) {
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
     * @return {number}
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
            for (let key in TableStruct.columns) {
                if (TableStruct.columns.hasOwnProperty(key)) {
                    aaa[i][key] = TableContent[i][j++];
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
                            if (TableStruct.columns[key].type === 'string') {
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

    /**
     *
     * @return {boolean}
     */
    drop() {
        if (this.schema.db.name === 'jsdb' && this.schema.name === 'public' && (this.name === 'users' || this.name === 'registry' || this.name === 'default')) {
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
}

module.exports = Table;
