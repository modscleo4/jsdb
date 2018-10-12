const dbmgmt = require("./dbmgmt");
const db = require("./commands/db");
const scheme = require("./commands/scheme");
const table = require("./commands/table");

let DBList = dbmgmt.readDBList();
console.log(DBList);
scheme.create('marcos', 'vinicius');
table.create('marcos', 'vinicius', 'lira');


