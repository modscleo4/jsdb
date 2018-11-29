/**
 * @summary
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 *
 * @type {module:fs}
 */

const table = require("./table");
const md5 = require('md5');

/**
 * @summary
 *
 * @param username {string}
 * @param password {string}
 *
 * @returns {Object}
 */
function authUser(username, password) {
    let users = table.select(
        'jsdb',
        'public',
        'users',
        ["username", "password", "privileges"],
        {
            "where": `\`username\` == '${username}'`,
            "orderby": [{"column": 'username', "mode": 'ASC'}]
        }
    );

    if (users.length === 0) {
        throw new Error(`AUTHERR: Invalid username: ${username}`);
    }

    if (users[0]['password'] === md5(password)) {
        return users[0]['privileges'];
    } else {
        throw new Error("AUTHERR: Wrong password");
    }
}

exports.auth = authUser;
