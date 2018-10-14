const net = require('net');

let client = new net.Socket();

if (process.argv.length === 5) {
    client.connect(process.argv[3], process.argv[2], function () {
        console.log('Connected to ' + process.argv[2] + ':' + process.argv[3]);
        client.write('db ' + process.argv[4]); // Send DB to server
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
    });


    let stdin = process.openStdin();

    stdin.addListener("data", function (d) {
        client.write(d.toLocaleString().trim());
    });
}