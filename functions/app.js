const functions = require("firebase-functions");
const express = require('express');
const useragent = require('express-useragent');

const {
	renderIndex,
	handleHashRequest,
	handleMetaData,
	surf,
	testIPFS
} = require("./handlers")

const app = express();

const cors = require('cors')({ origin: true });
app.use(cors);
app.use(useragent.express());

// app.set('etag', false);
app.set('view engine', 'ejs');

app.get('/', renderIndex);
app.get('/test/this', testIPFS);
app.get('/:hash_ext', handleHashRequest);
app.get('/:hash/metadata', handleMetaData);
app.get('/:hash/3d', surf);

module.exports = functions.https.onRequest(app);
