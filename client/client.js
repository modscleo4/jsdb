const net = require('net');

let client = new net.Socket();

let address = "";
let port = 0;
let db = "";

for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "-d") {
        db = process.argv[i + 1];
    } else if (process.argv[i] === "-a") {
        address = process.argv[i + 1];
    } else if (process.argv[i] === "-p") {
        port = parseInt(process.argv[i + 1]);
    }
}

if (db === "") {
    db = "jsdb";
}

if (address === "") {
    address = "localhost";
}

if (port === 0) {
    port = 6637;
}

let stdin = process.openStdin();

stdin.addListener("data", function (d) {
    client.write(d.toLocaleString().trim());
});

client.connect(port, address, function () {
    client.write('db ' + db); // Send DB to server
    console.log('Connected to ' + address + ':' + port + ", DB " + db);
});

client.on('data', function (data) {
    try {
        console.log(JSON.parse(data.toLocaleString()))
    } catch (e) {
        console.log(data.toLocaleString());
    }

});

client.on('close', function () {
    console.log('Connection closed');
    process.abort();
});

client.on('error', function (err) {
    console.log(err.message);
});