const functions = require("firebase-functions");
const app = require("./app");

exports.app = functions
	.runWith({ memory: "2GB", timeoutSeconds: 30 })
	.https.onRequest(app);