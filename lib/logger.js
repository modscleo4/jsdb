/**
 * @file Script to the logging system
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

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
 * @param status {number} The status code (0 - Info, 1 - Warning, 2 - Error)
 * @param str {string} What to log
 */
function log(status, str) {
    if (typeof status === "number" && typeof str === "string") {
        let d = new Date();
        let h = d.toISOString();
        if (!fs.existsSync(`${config.startDir}logs/`)) {
            fs.mkdirSync(`${config.startDir}logs/`);
        }

        if (!str.endsWith("\n")) {
            str += "\n";
        }

        str = `${h}: ${str}`;

        if (status === 0) {
            str = `(-) ${str}`;
        } else if (status === 1) {
            str = `(!) ${str}`;
        } else if (status === 1) {
            str = `(*) ${str}`;
        }

        let date = config.date;
        let file = `${config.startDir}logs/${date.getFullYear()}-${(date.getMonth() + 1).pad()}-${date.getDate().pad()}_${date.getHours().pad()}_${date.getMinutes().pad()}_${date.getSeconds().pad()}.log`;
        fs.appendFileSync(file, str);
    }
}

exports.log = log;
