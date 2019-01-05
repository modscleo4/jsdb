/**
 * @file This script carries config variables for all JSDB modules
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

const fs = require('fs');

let server = {
    ignAuth: false,
    startDir: "./",
    port: 6637
};

let db = {
    createZip: false
};

let registry = {
    instantApplyChanges: false
};

exports.server = server;
exports.db = db;
exports.registry = registry;

let sockets = [];
exports.sockets = sockets;

exports.addSocket = function addSocket(socket) {
    sockets.push(socket);
};

exports.removeSocket = function removeSocket(socket) {
    sockets.splice(sockets.indexOf(socket), 1);
};

exports.rmdirRSync = function rmdirRSync(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach((file) => {
            let curPath = `${path}/${file}`;
            if (fs.lstatSync(curPath).isDirectory()) {
                rmdirRSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

let date = new Date();
exports.date = date;
