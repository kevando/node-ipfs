const functions = require("firebase-functions");
const express = require('express');
const device = require('express-device');
const useragent = require('express-useragent');

const {
	renderIndex,
	handleHashRequest,
	handleMetaData,
	surf,
	snap
} = require("./handlers")

const app = express();

const cors = require('cors')({ origin: true });
app.use(cors);
app.use(useragent.express());
app.use(device.capture());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.header('origin'));
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials","true");
  next();
}); 

// app.set('etag', false);
app.set('view engine', 'ejs');

app.get('/', renderIndex);
app.get('/:hash', handleHashRequest);
app.get('/:hash/metadata', handleMetaData);
app.get('/:hash/3d', surf);

module.exports = functions.https.onRequest(app);
