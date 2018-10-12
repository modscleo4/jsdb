const fs = require('fs');
const db = require("./commands/db");
const scheme = require("./commands/scheme");
const f_dblist = 'dblist.json';

function readDBList() {
    try {
        let DBList = JSON.parse(fs.readFileSync(f_dblist, 'utf8'));

        fs.readdirSync("dbs/").forEach(dbname => {
            if (DBList.indexOf(dbname) === -1) {
                DBList.push(dbname);
                writeDBList(JSON.stringify(DBList));
            }
        });

        DBList.forEach(dbname => {
            if (!fs.existsSync("dbs/" + dbname)) {
                db.createFolder(dbname);
            }

            scheme.create(dbname, "public");
        });

        return DBList;
    } catch (e) {
        writeDBList('[]');
        readDBList();
    }
}

function writeDBList(content) {
    fs.writeFileSync(f_dblist, content);
}

exports.readDBList = readDBList;

exports.writeDBList = function (content) {
    writeDBList(content);
};