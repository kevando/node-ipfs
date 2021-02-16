const functions = require("firebase-functions");
const express = require('express');
const useragent = require('express-useragent');

const {
	renderIndex,
	handlAssetByKind,
	handlePaulieMagically,
	handleMetaData,
} = require("./handlers")

const app = express();

const cors = require('cors')({ origin: true });
app.use(cors);
app.use(useragent.express());

// app.set('etag', false);
app.set('view engine', 'ejs');

app.get('/', renderIndex);

app.get('/paulie.:kind', handlAssetByKind);
app.get('/paulie', handlePaulieMagically);
// app.get('/video', handlePaulieHard);
app.get('/bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4', handlePaulieMagically);
app.get('/:hash/metadata', handleMetaData);

module.exports = functions.https.onRequest(app);
