const fs = require('fs');
const dbmgmt = require('../dbmgmt');

const f_schlist = 'schlist.json';

function createScheme(dbName, schemeName) {
    if (typeof dbName === "string" && typeof schemeName === "string") {
        let SCHList = readSchemeFile(dbName);

        if (SCHList.indexOf(schemeName) === -1) {
            SCHList.push(schemeName);
            writeSchemeFile(dbName, JSON.stringify(SCHList));
        } else {
            fs.readdirSync("dbs/" + dbName + "/").forEach(schname => {
                if (schname !== "schlist.json") {
                    if (SCHList.indexOf(schname) === -1) {
                        SCHList.push(schname);
                        writeSchemeFile(dbName, JSON.stringify(SCHList));
                    }
                }
            });
        }

        createSchemeFolder(dbName, schemeName);
    }
}

function createSchemeFolder(dbname, schemeName) {
    try {
        fs.mkdirSync("dbs/" + dbname + "/" + schemeName);
    } catch (e) {
        if (!fs.existsSync("dbs/")) {
            fs.mkdirSync("dbs/");
        }

        if (!fs.existsSync("dbs/" + dbname)) {
            fs.mkdirSync("dbs/" + dbname);
            fs.mkdirSync("dbs/" + dbname + "/" + schemeName);
        }
    }
}

function readSchemeFile(dbName) {
    if (typeof dbName === "string") {
        let r;
        try {
            r = JSON.parse(fs.readFileSync("dbs/" + dbName + "/" + f_schlist, 'utf8'));
            r.forEach(schName => {
                if (!fs.existsSync("dbs/" + dbName + "/" + schName)) {
                    createSchemeFolder(dbName, schName);
                }
            });

            fs.readdirSync("dbs/" + dbName + "/").forEach(schName => {
                if (schName !== "schlist.json") {
                    if (r.indexOf(schName) === -1) {
                        r.push(schName);
                        writeSchemeFile(dbName, JSON.stringify(r));
                    }
                }
            });
        } catch (e) {
            writeSchemeFile(dbName, JSON.stringify(["public"]));
            r = JSON.parse(fs.readFileSync("dbs/" + dbName + "/" + f_schlist, 'utf8'));
        }
        return r;
    }
}

function writeSchemeFile(dbname, content) {
    fs.writeFileSync("dbs/" + dbname + "/" + f_schlist, content);
}

exports.create = createScheme;
exports.createFolder = createSchemeFolder;

exports.readSchemeFile = readSchemeFile;
exports.writeSchemeFile = writeSchemeFile;
