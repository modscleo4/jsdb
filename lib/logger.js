const config = require('../config');
const fs = require('fs');

Number.prototype.pad = function (size) {
    let s = String(this);
    while (s.length < (size || 2)) {
        s = "0" + s;
    }
    return s;
};

/**
 * @summary Logs to file
 *
 * @param str {string} What to log
 */
function log(str) {
    if (typeof str === "string") {
        let d = new Date();
        let h = `[${d.getHours().pad()}:${d.getMinutes().pad()}:${d.getSeconds().pad()}]`;
        if (!fs.existsSync(`${config.startDir}logs/`)) {
            fs.mkdirSync(`${config.startDir}logs/`);
        }

        if (!str.endsWith("\n")) {
            str += "\n";
        }

        str = `${h} ${str}`;

        let date = config.date;
        let file = `${config.startDir}logs/${date.getFullYear()}-${(date.getMonth() + 1).pad()}-${date.getDate().pad()}_${date.getHours().pad()}_${date.getMinutes().pad()}_${date.getSeconds().pad()}.log`;
        fs.appendFileSync(file, str);
    }
}

exports.log = log;
