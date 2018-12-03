const fs = require('fs');

let ignAuth = false;
exports.ignAuth = ignAuth;

let startDir = "";
exports.startDir = startDir;

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
        fs.readdirSync(path).forEach((file, index) => {
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