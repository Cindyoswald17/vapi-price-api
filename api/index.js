// Vercel serverless wrapper — reuses the Express app from server.js
const app = require("../server.js");
module.exports = app;
