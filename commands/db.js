const fs = require('fs');
const schema = require('./schema');
const table = require('./table');
const server = require('../server');
const md5 = require('md5');

const f_dblist = 'dblist.json';

/*
* @todo: Run on a backup DB, then delete the original and rename
* */

/**
 *
 * */
function createDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) !== -1) {
            schema.create(dbName, "public");

            throw new Error(`DB ${dbName} already exists.`);
        } else {
            DBList.push(dbName);
            writeDBFile(JSON.stringify(DBList));
            createDBFolder(dbName);

            schema.create(dbName, "public");

            return `Created DB ${dbName}.`;
        }
    }
}

/**
 *
 * */
function createDBFolder(dbName) {
    if (typeof dbName === "string") {
        if (!fs.existsSync(`${server.startDir}dbs/`)) {
            fs.mkdirSync(`${server.startDir}dbs/`);
        }

        fs.mkdirSync(`${server.startDir}dbs/${dbName}`);
    }
}

/**
 *
 * */
function readDBFile() {
    let DBList = [];

    if (!fs.existsSync(`${server.startDir}dbs/${f_dblist}`)) {
        writeDBFile(JSON.stringify([]));
        return readDBFile();
    }

    DBList = JSON.parse(fs.readFileSync(`${server.startDir}dbs/${f_dblist}`, 'utf8'));

    fs.readdirSync(`${server.startDir}dbs/`).forEach(dbName => {
        if (dbName !== f_dblist) {
            if (DBList.indexOf(dbName) === -1) {
                DBList.push(dbName);
                writeDBFile(JSON.stringify(DBList));
            }
        }
    });

    DBList.forEach(dbName => {
        if (!fs.existsSync(`${server.startDir}dbs/${dbName}`)) {
            createDBFolder(dbName);
            schema.create(dbName, "public");
        }
    });

    /*
    * Creates JSDB admin database
    * */
    if (DBList.indexOf("jsdb") === -1) {
        DBList.push('jsdb');
        writeDBFile(JSON.stringify(DBList));
        if (schema.readFile('jsdb').indexOf('public') === -1) {
            schema.create('jsdb', "public");
        }

        table.create('jsdb', 'public', 'users',
            {
                'id': {
                    'type': 'number',
                    'unique': true,
                    'autoIncrement': true,
                    'notNull': true
                },

                'username': {
                    'type': 'string',
                    'unique': true,
                    'notNull': true
                },

                'password': {
                    'type': 'string',
                    'notNull': true
                },

                'valid': {
                    'type': 'boolean',
                    'default': true,
                    'notNull': true
                },

                'privileges': {
                    'type': 'object',
                    'default': {},
                    'notNull': false
                },
            },

            {
                'primaryKey': [
                    'id'
                ]
            }
        );

        let stdin = process.openStdin();

        console.log('Insert jsdbadmin password: ');
        stdin.addListener("data", function (d) {
            d = d.toLocaleString().trim();
            if (d.length > 8) {
                stdin.removeAllListeners('data');

                table.insert('jsdb', 'public', 'users', ["DEFAULT", 'jsdbadmin', md5(`${d}`), "DEFAULT", "DEFAULT"]);
                console.log("User created.");
            } else {
                console.log('jsdbadmin password must be greater than 8 characters!');
            }
        });
    }

    return DBList;
}

/**
 *
 * */
function writeDBFile(content) {
    if (typeof content === "string") {
        if (!fs.existsSync(`${server.startDir}dbs/`)) {
            fs.mkdirSync(`${server.startDir}dbs/`);
        }

        fs.writeFileSync(`${server.startDir}dbs/${f_dblist}`, content);
    }
}

/**
 *
 * */
function dropDB(dbName, ifExists = false) {
    if (typeof dbName === "string" && typeof ifExists === "boolean") {
        if ((ifExists && readDBFile().indexOf(dbName) !== -1) || (!ifExists && existsDB(dbName))) {
            let DBList = readDBFile();
            let i = DBList.indexOf(dbName);
            DBList.splice(i, 1);
            writeDBFile(JSON.stringify(DBList));
            server.rmdirRSync(`${server.startDir}dbs/${dbName}/`);

            return `Dropped database ${dbName}.`;
        } else {
            return `Database ${dbName} does not exist.`;
        }
    }
}

/**
 *
 * */
function existsDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = readDBFile();
        if (DBList.indexOf(dbName) !== -1) {
            return true;
        } else {
            throw new Error(`Database ${dbName} does not exist.`);
        }
    }
}

exports.create = createDB;
exports.createFolder = createDBFolder;

exports.readFile = readDBFile;
exports.writeFile = writeDBFile;

exports.drop = dropDB;

exports.exists = existsDB;