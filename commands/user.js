/**
 * @summary Contains functions to interact with users
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 *
 * @type {module:fs}
 */

const table = require("./table");
const md5 = require('md5');

/**
 * @summary Authenticates the user
 *
 * @param username {string} The username
 * @param password {string} The matching password
 *
 * @returns {Object} If the username and the provided password matches, returns all the user privileges
 * @throws {Error} If the username or the password is wrong, throw an error
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
