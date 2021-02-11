const functions = require("firebase-functions");
const express = require('express');

const {
	renderIndex,
	renderHello,
	handlAssetByKind,
	handlePaulieMagically,
	handleMetaData
} = require("./handlers")

const app = express();

app.set('view engine', 'ejs');

app.get('/', renderIndex);
app.get('/hello', renderHello);

app.get('/paulie.:kind', handlAssetByKind);
app.get('/paulie', handlePaulieMagically);
app.get('/bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4', handlePaulieMagically);
app.get('/:hash/metadata', handleMetaData);

module.exports = functions.https.onRequest(app);
