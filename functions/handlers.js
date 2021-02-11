const _ = require("lodash");
const functions = require("firebase-functions");
const admin = require('firebase-admin');
const request = require("request");

admin.initializeApp();

var db = admin.database();

const FALLBACK_PROPS = {
	contentType: "image/jpeg",
	fileType: "jpg",
	fallback: true,
}

function log(msg) {
	functions.logger.info(msg)
}

module.exports.renderIndex = (req, res) => {
	res.end("the decline of centralized power is accelerating.")
}

module.exports.renderHello = (req, res) => {
	res.render('pages/hello', { title: "ipfs.kevaid.com" });
}

module.exports.handlePaulieMagically = (req, res) => {
	log("Referrer: " + req.get('Referrer'));

	db.ref().once("value").then(snap => {

		const data = snap.val()
		const referringDomain = req.get('Referrer') || '';

		const clientSettings = _.find(data.clients, (o) => {
			return referringDomain.includes(o.domain)
		}) || FALLBACK_PROPS

		const assetHash = data.assets.paulie[clientSettings.fileType];
		const assetUrl = `https://gateway.ipfs.io/ipfs/${assetHash}`;

		res.set('Cache-Control', 'no-store');
		res.set('Content-Type', clientSettings.mimeType);

		return request.get(assetUrl).pipe(res);
	});
}

module.exports.handlAssetByKind = async (req, res) => {

	const kind = req.params.kind;

	const assetHashes = await db.ref("assets").child("paulie").once("value").then(snap => snap.val());

	if (assetHashes) {
		const assetUrl = `https://gateway.ipfs.io/ipfs/${assetHashes[kind]}`;
		return request.get(assetUrl).pipe(res);
	}

	return res.send(`hmmm, I've never heard of ${kind} before. You got a new kind of file?`)
}

module.exports.handleMetaData = async (req, res) => {

	const data = await db.ref().once("value").then(snap => snap.val());

	const metadata = data.metadata[req.params.hash];
	const assetProps = _.find(data.clients, (o) => (req.get('Referrer') || '').includes(o.domain)) || FALLBACK_PROPS

	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(metadata ? { ...metadata, ...assetProps } : {}));
}
