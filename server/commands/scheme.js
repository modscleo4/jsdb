const fs = require('fs');

const db = require("./db");

const f_schlist = 'schlist.json';

function createScheme(dbName, schemeName) {
    if (typeof dbName === "string" && typeof schemeName === "string") {
        let SCHList = readSchemeFile(dbName);

        if (SCHList.indexOf(schemeName) === -1) {
            SCHList.push(schemeName);
            writeSchemeFile(dbName, JSON.stringify(SCHList));
            createSchemeFolder(dbName, schemeName);

            return "Created scheme " + schemeName;
        } else {
            return "Scheme " + schemeName + " already exists in DB " + dbName;
        }
    }
}

function createSchemeFolder(dbname, schemeName) {
    try {
        if (!fs.existsSync("dbs/")) {
            db.readFile();
        }

        if (!fs.existsSync("dbs/" + dbname)) {
            throw "DB not created.";
        }

        if (!fs.existsSync("dbs/" + dbname + "/" + schemeName)) {
            fs.mkdirSync("dbs/" + dbname + "/" + schemeName);
        }
    } catch (e) {
        console.error(e.message);
    }
}

function readSchemeFile(dbName) {
    if (typeof dbName === "string") {
        try {
            let DBList = db.readFile();
            let r = [];

            /*
            * Checking if the database exists
            * */
            if (DBList.indexOf(dbName) !== -1) {
                r = JSON.parse(fs.readFileSync("dbs/" + dbName + "/" + f_schlist, 'utf8'));

                r.forEach(schName => {
                    if (!fs.existsSync("dbs/" + dbName + "/" + schName)) {
                        createSchemeFolder(dbName, schName);
                    }
                });

                fs.readdirSync("dbs/" + dbName + "/").forEach(schName => {
                    if (schName !== f_schlist) {
                        if (r.indexOf(schName) === -1) {
                            r.push(schName);
                            writeSchemeFile(dbName, JSON.stringify(r));
                        }
                    }
                });
            }

            return r;
        } catch (e) {
            console.error(e.message);
            writeSchemeFile(dbName, JSON.stringify(["public"]));
            return readSchemeFile(dbName);
        }

    }
}

function writeSchemeFile(dbname, content) {
    try {
        fs.writeFileSync("dbs/" + dbname + "/" + f_schlist, content);
    } catch (e) {
        console.error(e.message);
    }
}

exports.create = createScheme;
exports.createFolder = createSchemeFolder;

exports.readFile = readSchemeFile;
exports.writeFile = writeSchemeFile;
