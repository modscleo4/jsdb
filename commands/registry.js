/**
 * @file This file contains functions to interact with registry entries
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const table = require("./table");

/**
 * @summary Create a registry entry
 *
 * @param entryName {String} The entry name
 * @param type {String} The entry type
 * @param value {*} The value for the entry
 *
 * @returns {String} If Ok, returns 'Created entry ${entryName}'
 * @throws {Error} If the entry already exists, throw an error
 */
function createEntry(entryName, type, value) {
    if (typeof entryName === "string" && typeof type === "string") {
        let entry = table.select(
            'jsdb',
            'public',
            'registry',
            ["type"],
            {
                'where': `\`entryName\` == '${entryName}'`
            }
        );

        if (entry.length === 0) {
            if (typeof value !== type) {
                throw new Error("Invalid type");
            }

            if (typeof value === "string") {
                table.insert('jsdb', 'public', 'registry', ["DEFAULT", entryName, type, value]);
            } else {
                table.insert('jsdb', 'public', 'registry', ["DEFAULT", entryName, type, JSON.stringify(value)]);
            }

            return `Created entry ${entryName}`;
        } else {
            throw new Error(`Entry ${entryName} already exists`);
        }
    }
}

/**
 * @summary Read an entry value
 *
 * @param entryName {String} The entry name
 *
 * @returns {Object} If the entry exists, return the entry value
 * @throws {Error} If the entry does not exist, throw an error
 */
function readEntry(entryName) {
    if (typeof entryName === "string") {
        let entry = table.select(
            'jsdb',
            'public',
            'registry',
            ["value", "type"],
            {
                'where': `\`entryName\` == '${entryName}'`
            }
        );

        if (entry.length === 0) {
            throw new Error(`Entry ${entryName} does not exist`);
        }

        if (entry[0].type === "string") {
            return entry[0].value;
        } else {
            return JSON.parse(entry[0].value);
        }
    }
}

/**
 * @summary Update an entry value
 *
 * @param entryName {String} The entry name
 * @param value {*} The new value for the entry
 *
 * @returns {String} If Ok, returns 'Updated entry ${entryName}'
 * @throws {Error} If the entry does not exist, throw an error
 */
function updateEntry(entryName, value) {
    if (typeof entryName === "string") {
        let entry = table.select(
            'jsdb',
            'public',
            'registry',
            ["type"],
            {
                'where': `\`entryName\` == '${entryName}'`
            }
        );

        if (entry.length === 0) {
            throw new Error(`Entry ${entryName} does not exist`);
        }

        if (typeof value !== entry[0].type) {
            throw new Error("Invalid type");
        }

        if (typeof value === "string") {
            table.update('jsdb', 'public', 'registry', {"value": value}, {'where': `\`entryName\` == '${entryName}'`});
        } else {
            table.update('jsdb', 'public', 'registry', {"value": JSON.stringify(value)}, {'where': `\`entryName\` == '${entryName}'`});
        }
        return `Updated entry ${entryName}`;
    }
}

/**
 * @summary Delete an entry
 *
 * @param entryName {String} The entry name
 *
 * @returns {String} If Ok, returns 'Deleted entry ${entryName}'
 * @throws {Error} If the entry does not exist, throw an error
 */
function deleteEntry(entryName) {
    if (typeof entryName === "string") {
        if (existsEntry(entryName)) {
            if (entryName.startsWith('jsdb.')) {
                throw new Error('JSDB entries cannot be deleted');
            }

            table.delete('jsdb', 'public', 'registry', {'where': `\`entryName\` == '${entryName}'`});

            return `Deleted entry ${entryName}`;
        }
    }
}

/**
 * @summary Check if the registry entry exists
 *
 * @param entryName {String} The entry name
 * @param throws {boolean} If true, throw an error if the sequence does not exist
 *
 * @returns {boolean} Return true if the entry exists
 * @throws {Error} If the entry does not exist, throw an error
 */
function existsEntry(entryName, throws = true) {
    if (typeof entryName === "string") {
        let entry = table.select(
            'jsdb',
            'public',
            'registry',
            ["type"],
            {
                'where': `\`entryName\` == '${entryName}'`
            }
        );

        if (entry.length === 0) {
            if (throws) {
                throw new Error(`Entry ${entryName} does not exist`);
            } else {
                return false;
            }
        }

        return true;
    }
}

exports.create = createEntry;
exports.read = readEntry;
exports.update = updateEntry;
exports.delete = deleteEntry;

exports.exists = existsEntry;