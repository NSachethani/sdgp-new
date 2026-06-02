const { app, initDb } = require("./lib/app");
initDb().catch((err) => console.error("Database init error:", err));
module.exports = app;
