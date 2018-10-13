const fs = require('fs');
const scheme = require('./scheme');

const f_dblist = 'dblist.json';

function createDB(dbName) {
    if (typeof dbName === "string") {
        let DBList = readDBFile();

        if (DBList.indexOf(dbName) === -1) {
            DBList.push(dbName);
            writeDBFile(JSON.stringify(DBList));
            createDBFolder(dbName);
        }

        scheme.create(dbName, "public");
    }
}

function createDBFolder(dbname) {
    try {
        if (!fs.existsSync("dbs/")) {
            fs.mkdirSync("dbs/");
        }

        fs.mkdirSync("dbs/" + dbname);
    } catch (e) {
        console.error(e.message);
    }
}

function readDBFile() {
    try {
        let DBList = JSON.parse(fs.readFileSync(f_dblist, 'utf8'));

        fs.readdirSync("dbs/").forEach(dbname => {
            if (DBList.indexOf(dbname) === -1) {
                DBList.push(dbname);
                writeDBFile(JSON.stringify(DBList));
            }
        });

        DBList.forEach(dbname => {
            if (!fs.existsSync("dbs/" + dbname)) {
                createDBFolder(dbname);
                scheme.create(dbname, "public");
            }
        });

        return DBList;
    } catch (e) {
        writeDBFile('[]');
        return readDBFile();
    }
}

function writeDBFile(content) {
    try {
        fs.writeFileSync(f_dblist, content);
    } catch (e) {
        console.error(e.message);
    }
}

exports.create = createDB;
exports.createFolder = createDBFolder;

exports.readFile = readDBFile;
exports.writeFile = writeDBFile;