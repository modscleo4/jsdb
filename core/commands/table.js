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
 * @file Contains functions to interact with tables, like SELECT and UPDATE
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const config = require('../../config');
const schema = require('./schema');
const sequence = require('./sequence');

const fs = require('fs');

const f_tablelist = 'tablelist.json';
const f_tablestruct = 'tablestruct.json';
const f_tabledata = 'tabledata.json';
exports.f_tablelist = f_tablelist;
exports.f_tablestruct = f_tablestruct;
exports.f_tabledata = f_tabledata;

/**
 * @summary Create a table
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param tableStruct {Object} Named Object containing the structure for the table
 * @param metadata {Object} Some table metadata, like the primary key <optional>
 *
 * @returns {string} If OK, returns 'Created table ${schemaName}.${tableName} in DB ${dbName}'
 * @throws {Error} If the table already exists, throw an error
 * */
function createTable(dbName, schemaName, tableName, tableStruct, metadata = null) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof tableStruct === 'object' && typeof metadata === 'object') {
        let TableList = readTableFile(dbName, schemaName);

        if (TableList.indexOf(tableName) !== -1) {
            // Table already exists
            throw new Error(`Table ${schemaName}.${tableName} already exists in DB ${dbName}`);
        } else {
            TableList.push(tableName);
            writeTableFile(dbName, schemaName, JSON.stringify(TableList));
            createTableFolder(dbName, schemaName, tableName);

            if (metadata !== null) {
                // Metadata specified
                tableStruct[`${tableName}.metadata`] = metadata;
            }

            for (let key in tableStruct) {
                if (tableStruct.hasOwnProperty(key)) {
                    if (metadata != null && 'primaryKey' in metadata && metadata.primaryKey.indexOf(key) !== -1 && !tableStruct[key].notNull) {
                        throw new Error(`Primary key column cannot accept null values!`);
                    } else if ('maxLength' in tableStruct[key]) {
                        tableStruct[key].maxLength = parseInt(tableStruct[key].maxLength);

                        if (tableStruct[key].maxLength <= 0) {
                            throw new Error(`Invalid maxLength property!`);
                        }
                    } else if (tableStruct[key].autoIncrement) {
                        // Auto increment property specified
                        if (tableStruct[key].type === 'integer') {
                            delete (tableStruct[key].autoIncrement);
                            tableStruct[key].default = `nextval(${tableName}_${key}_seq)`;

                            // Create the sequence for auto increment
                            sequence.create(dbName, schemaName, `${tableName}_${key}_seq`);
                        } else {
                            throw new Error("Only columns of type integer can have the autoincrement property");
                        }
                    }
                }
            }

            writeTableStructure(dbName, schemaName, tableName, JSON.stringify(tableStruct));
            writeTableContent(dbName, schemaName, tableName, null);

            return `Created table ${schemaName}.${tableName} in DB ${dbName}`;
        }
    }
}

/**
 * @summary Reads the structure of the table
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 *
 * @returns {Object} Return the structure of the table in a named Object
 * @throws {Error} If the table does not exist, throw an error
 * */
function readTableStructure(dbName, schemaName, tableName) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string') {
        if (existsTable(dbName, schemaName, tableName)) {
            if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/${f_tablestruct}`)) {
                // No structure for the table

                dropTable(dbName, schemaName, tableName, true);
                throw new Error(`Structure for table ${schemaName}.${tableName} is missing. Table dropped`);
            }

            try {
                return JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/${f_tablestruct}`, 'utf8'));
            } catch (e) {
                throw new Error(`Error while parsing ${f_tablestruct} for ${schemaName}.${tableName}: ${e.message}`);
            }
        }
    }
}

/**
 * @summary Writes the structure of the table
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param tableStruct {string} Named Object containing the structure for the table
 * */
function writeTableStructure(dbName, schemaName, tableName, tableStruct) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof tableStruct === 'string') {
        if (existsTable(dbName, schemaName, tableName)) {
            fs.writeFileSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/${f_tablestruct}`, tableStruct);
        }
    }
}

/**
 * @summary Reads the tables list file
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 *
 * @returns {Object} Returns a indexed Object containing all the tables
 * @throws {Error} If the schema does not exist, throw an error
 */
function readTableFile(dbName, schemaName) {
    if (typeof dbName === 'string' && typeof schemaName === 'string') {
        if (schema.exists(dbName, schemaName)) {
            if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${f_tablelist}`)) {
                // List of tables is missing, generate a new one

                writeTableFile(dbName, schemaName, JSON.stringify([]));
                return [];
            }

            let TableList;
            try {
                TableList = JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${f_tablelist}`, 'utf8'));
            } catch (e) {
                throw new Error(`Error while parsing ${f_tablelist}: ${e.message}`);
            }

            // Get the existing tables that are not on the file
            fs.readdirSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/`).forEach(tableName => {
                if (tableName !== f_tablelist && tableName !== sequence.f_seqlist) {
                    if (TableList.indexOf(tableName) === -1) {
                        TableList.push(tableName);
                        writeTableFile(dbName, schemaName, JSON.stringify(TableList));
                    }
                }
            });

            // Remove the tables that don't have a folder
            TableList.forEach(tableName => {
                if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/`)) {
                    TableList.splice(TableList.indexOf(tableName), 1);
                    writeTableFile(dbName, schemaName, JSON.stringify(TableList));
                }
            });

            return TableList;
        }
    }
}

/**
 * @summary Write the tables list file
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param content {string} a JSON string of the indexed Object containing all the tables
 *
 * @throws {Error} If the schema does not exist, throw an error
 */
function writeTableFile(dbName, schemaName, content) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof content === 'string') {
        if (schema.exists(dbName, schemaName)) {
            fs.writeFileSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${f_tablelist}`, content);
        }
    }
}

/**
 * @summary Create the folder for the table
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 *
 * @throws {Error} If the schema does not exist, throw an error
 * */
function createTableFolder(dbName, schemaName, tableName) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string') {
        if (schema.exists(dbName, schemaName)) {
            if (!fs.existsSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/`)) {
                fs.mkdirSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}`);
            }
        }
    }
}

/**
 * @summary Reads the table content from the file
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 *
 * @returns {Object} Returns a indexed Object containing the data in the table
 * @throws {Error} If the table does not exist, throw an error
 * */
function readTableContent(dbName, schemaName, tableName) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string') {
        if (existsTable(dbName, schemaName, tableName)) {
            try {
                return JSON.parse(fs.readFileSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/${f_tabledata}`, 'utf8'));
            } catch (e) {
                throw new Error(`Error while parsing ${f_tabledata} for ${schemaName}.${tableName}: ${e.message}`);
            }
        }
    }
}

/**
 * @summary Writes the table content to the file
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param content {Array} Indexed Array containing the data in the table
 * @param override {boolean} If true, overrides the existing table data
 *
 * @returns {string} If Ok, returns 'Line inserted.'
 * */
function writeTableContent(dbName, schemaName, tableName, content, override = false) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof content === 'object' && typeof override === 'boolean') {
        let TableContent = [];

        // Checks if tabledata.json exists to avoid loops
        if (fs.existsSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/${f_tabledata}`)) {
            TableContent = readTableContent(dbName, schemaName, tableName);
        }

        if (content !== null) {
            if (override) {
                TableContent = content;
            } else {
                TableContent.push(content);
            }
        }

        fs.writeFileSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/${f_tabledata}`, JSON.stringify(TableContent));

        return 'Line inserted.';
    }
}

/**
 * @summary Drops a table from the schema
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param ifExists {boolean} If true, doesn't throw an error when the table does not exist
 *
 * @returns {string} If everything runs without errors, return 'Dropped table {tablename}"
 * @throws {Error} If the table does not exist and ifExists is false, throw an error
 * */
function dropTable(dbName, schemaName, tableName, ifExists = false) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof ifExists === 'boolean') {
        if (dbName === 'jsdb' && schemaName === 'public' && (tableName === 'users' || tableName === 'registry')) {
            throw new Error('JSDB database tables cannot be dropped');
        }

        if ((ifExists && readTableFile(dbName, schemaName).indexOf(tableName) !== -1) || (!ifExists && existsTable(dbName, schemaName, tableName))) {
            let TableList = readTableFile(dbName, schemaName);
            let i = TableList.indexOf(tableName);
            TableList.splice(i, 1);
            writeTableFile(dbName, schemaName, JSON.stringify(TableList));
            config.rmdirRSync(`${config.server.startDir}dbs/${dbName}/${schemaName}/${tableName}/`);

            return `Dropped table ${tableName}.`;
        } else {
            return `Table ${schemaName}.${tableName} does not exist`;
        }
    }
}

/**
 * @summary This is the table SELECT function scope
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param columns {Object} The desired columns in an indexed Object
 * @param options {Object} Options like WHERE, ORDER BY, etc.
 *
 * @returns {Object} returns an indexed Object with multiple named Objects containg the data of each cell
 * @throws {Error} If the table does not exist, throw an error
 * */
function selectTableContent(dbName, schemaName, tableName, columns, options) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof columns === 'object' && typeof options === 'object') {
        let TableList = readTableFile(dbName, schemaName);

        if (TableList.indexOf(tableName) === -1) {
            throw new Error(`Table ${tableName} does not exist`);
        }

        let TableContent = readTableContent(dbName, schemaName, tableName);
        let TableStruct = readTableStructure(dbName, schemaName, tableName);

        if ('limoffset' in options) {
            let limit = options.limoffset.limit;
            let offset = options.limoffset.offset;

            if (typeof TableContent[limit - 1] === 'undefined') {
                throw new Error('LIMIT greater than number of rows');
            }

            if (typeof TableContent[offset] === 'undefined') {
                throw new Error('OFFSET greater than number of rows');
            }

            TableContent = TableContent.splice(offset, limit);
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
                    if (key !== `${tableName}.metadata`) {
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
                        if (key !== `${tableName}.metadata`) {
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
                        throw new Error(`Table ${schemaName}.${tableName} does not have column ${column}`);
                    }

                    let j = 0;
                    for (let key in TableStruct) {
                        if (TableStruct.hasOwnProperty(key)) {
                            if (key !== `${tableName}.metadata`) {
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

        if ('where' in options) {
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

        if ('orderby' in options) {
            function getC(orderBy) {
                if (!orderBy[0].hasOwnProperty('column')) {
                    // No column specified

                    if (!TableStruct[`${tableName}.metadata`].hasOwnProperty('primaryKey')) {
                        // There is no primary key on the table

                        // Gets the first column of the table
                        let key;
                        for (key in TableStruct) {
                            if (key !== `${tableName}.metadata`) {
                                break;
                            }
                        }

                        return TableStruct[key];
                    } else {
                        return TableStruct[`${tableName}.metadata`].primaryKey[0];
                    }
                } else {
                    if (!TableStruct.hasOwnProperty(orderBy[0].column)) {
                        throw new Error(`Column ${orderBy[0].column} does not exist`);
                    }
                    return orderBy[0].column;
                }
            }

            function getM(orderBy) {
                if (typeof orderBy[0].mode === 'undefined') {
                    return 'ASC';
                } else {
                    return orderBy[0].mode;
                }
            }

            // Check if the column 0 exists
            getC(options.orderby);

            function sorting(orderBy) {
                return function (a, b) {
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
                }
            }

            r = r.sort(sorting(options.orderby));
        }

        return r;
    }
}

/**
 * @summary This is the table INSERT INTO function scope
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param content {Object} The values to insert
 * @param columns {Object} The columns of content and the order (optional)
 *
 * @returns {string} If inserted, return 'Line inserted.'
 * @throws {Error} If the table does not exist, throw an error
 * */
function insertTableContent(dbName, schemaName, tableName, content, columns = null) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof content === 'object' && typeof columns === 'object') {
        let TableList = readTableFile(dbName, schemaName);

        if (TableList.indexOf(tableName) === -1) {
            throw new Error(`Table ${tableName} does not exist`);
        }

        let TableStruct = readTableStructure(dbName, schemaName, tableName);
        let TColumns = Object.keys(TableStruct);

        // Remove <tableName>.metadata from Columns list
        for (let c = 0; c < TColumns.length; c++) {
            if (TColumns[c] === `${tableName}.metadata`) {
                TColumns.splice(c, 1);
            }
        }
        let ContentW = [];

        if (content !== null) {
            if ((columns === null && content.length !== TColumns.length) || columns !== null && content.length !== columns.length) {
                throw new Error(`Number of columns does not match with provided values (required: ${TColumns.length})`);
            }

            let i = 0;
            let F = false;

            if (columns !== null) {
                for (let c = 0; c < TColumns.length; c++) {
                    for (let aux = 0; aux < columns.length; aux++) {
                        if (TColumns.indexOf(columns[aux]) === -1) {
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
                if (key !== `${tableName}.metadata`) {
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
                        let TableContent = readTableContent(dbName, schemaName, tableName);
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
                            content[i] = sequence.increment(dbName, schemaName, seqName);
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
        }

        return writeTableContent(dbName, schemaName, tableName, ContentW);
    }
}

/**
 * @summary This is the table UPDATE function scope
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param update {Object} The values to update in a named Object
 * @param options {Object} Options like WHERE, ORDER BY, etc.
 *
 * @returns {string} Returns a string containing the count of affected rows
 * @throws {Error} If the table does not exist, throw an error
 * */
function updateTableContent(dbName, schemaName, tableName, update, options) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof update === 'object' && typeof options === 'object') {
        if (existsTable(dbName, schemaName, tableName)) {
            let TableContent = readTableContent(dbName, schemaName, tableName);
            let TableStruct = readTableStructure(dbName, schemaName, tableName);
            let TableIndexes = [];

            let limit;
            let offset;
            if ('limoffset' in options) {
                limit = options.limoffset.limit;
                offset = options.limoffset.offset;

                if (typeof TableContent[offset] === 'undefined') {
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
                        if (key !== `${tableName}.metadata`) {
                            TableIndexes[j] = key;
                            aaa[i][key] = TableContent[i][j];
                        }
                        j++;
                    }
                }
            }

            let b = 0;
            let c = 0;
            if ('where' in options) {
                for (let i = 0; i < TableContent.length; i++) {
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

                    if (eval(e)) {
                        // The where clause is true

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
                                        let seqName = update[key].slice(a + 'nextval('.length, update[key].length - 1);
                                        update[key] = sequence.increment(dbName, schemaName, seqName);
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

                                if (typeof offset !== 'undefined') {
                                    TableContent[i + offset][j] = update[key];
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
                    if (typeof limit !== 'undefined') {
                        if (c === limit) {
                            break;
                        }
                    }
                }
            }

            writeTableContent(dbName, schemaName, tableName, TableContent, true);

            return `Updated ${b} line(s) from ${schemaName}:${tableName}.`;
        }
    }
}

/**
 * @summary This is the table DELETE function scope
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param options {Object} Options like WHERE, ORDER BY, etc.
 *
 * @returns {string} Returns a string containing the count of affected rows
 * @throws {Error} If the table does not exist, throw an error
 * */
function deleteTableContent(dbName, schemaName, tableName, options) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string' && typeof options === 'object') {
        if (existsTable(dbName, schemaName, tableName)) {

            let TableContent = readTableContent(dbName, schemaName, tableName);
            let TableStruct = readTableStructure(dbName, schemaName, tableName);

            let limit;
            let offset;
            if ('limoffset' in options) {
                limit = options.limoffset.limit;
                offset = options.limoffset.offset;

                if (typeof TableContent[limit - 1] === 'undefined') {
                    throw new Error('LIMIT greater than number of rows');
                }

                if (typeof TableContent[offset] === 'undefined') {
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
                        if (key !== `${tableName}.metadata`) {
                            aaa[i][key] = TableContent[i][j];
                        }
                        j++;
                    }
                }
            }

            let b = 0;
            let c = 0;
            if ('where' in options) {
                for (let i = 0; i < TableContent.length; i++) {
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

                    if (eval(e)) {
                        // The where clause is true

                        b++;
                        if (typeof offset !== 'undefined') {
                            TableContent.splice(i + offset, 1);
                            aaa.splice(i + offset, 1);
                        } else {
                            TableContent.splice(i, 1);
                            aaa.splice(i, 1);
                        }

                        i = -1;
                    }

                    c++;
                    if (typeof limit !== 'undefined') {
                        if (c === limit) {
                            break;
                        }
                    }
                }
            }

            writeTableContent(dbName, schemaName, tableName, TableContent, true);

            return `Deleted ${b} line(s) from ${schemaName}:${tableName}.`;
        }
    }
}

/**
 * @summary Check if the table exists
 *
 * @param dbName {string} The name of DB
 * @param schemaName {string} The name of the schema
 * @param tableName {string} The table name
 * @param throws {boolean} If true, throw an error if the table does not exist
 *
 * @returns {boolean} Return true if the table exists
 * @throws {Error} If the table does not exist, throw an error
 */
function existsTable(dbName, schemaName, tableName, throws = true) {
    if (typeof dbName === 'string' && typeof schemaName === 'string' && typeof tableName === 'string') {
        if (schema.exists(dbName, schemaName)) {
            let TableList = readTableFile(dbName, schemaName);
            if (TableList.indexOf(tableName) !== -1) {
                return true;
            } else {
                if (throws) {
                    throw new Error(`Table ${schemaName}:${tableName} does not exist.`);
                } else {
                    return false;
                }
            }
        }
    }
}

exports.create = createTable;
exports.drop = dropTable;
exports.select = selectTableContent;
exports.insert = insertTableContent;
exports.update = updateTableContent;
exports.delete = deleteTableContent;

exports.readFile = readTableFile;
exports.writeFile = writeTableFile;

exports.exists = existsTable;