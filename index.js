const webserver = require("./libs/webserver.js");
const db = require("./libs/db.js");

db.open();
webserver.start();

function exitHandler() {
    db.close();
    process.exit();
}
process.on("exit", exitHandler);
process.on("SIGINT", exitHandler);
process.on("SIGUSR1", exitHandler);
process.on("SIGUSR2", exitHandler);
process.on("uncaughtException", exitHandler);
