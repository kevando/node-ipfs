const _ = require("lodash");
const functions = require("firebase-functions");
const admin = require('firebase-admin');
const request = require("request");

admin.initializeApp();

var db = admin.database();


function log(msg) {
	if (typeof msg === "object") {
		_.map(msg, (v, k) => {
			log(k + ": " + v)
		})
	} else {
		functions.logger.info(msg)
	}

}

function getContentType(clients, referringDomain, browser) {

	let contentType = "video/mp4"; // fallback

	_.forEach(clients, (o) => {
		if (referringDomain.includes(o.domain)) {
			contentType = o.contentType;
		}
	});

	return contentType;

}

module.exports.renderIndex = (req, res) => {
	res.end("the decline of centralized power is accelerating.")
}

module.exports.handlePaulieMagically = (req, res) => {

	const referringDomain = req.get('Referrer') || '';

	if(!referringDomain) {
		return res.render('gallery', { title: "ipfs.kevaid.com" });
	}

	db.ref().once("value").then(snap => {

		const data = snap.val()
		const contentType = getContentType(data.clients, referringDomain)
		const fileExtension = contentType.split("/")[1];
		const assetHash = data.assets.paulie[fileExtension];
		const assetUrl = `https://ipfs.fleek.co/ipfs/${assetHash}`;

		log(req.useragent.browser + " on " + referringDomain + " requesting file  " + contentType)

		res.set('Cache-Control', 'no-store');
		res.set('X-DNS-Prefetch-Control', 'off');
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Content-Type', contentType);

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
	const referringDomain = req.get('Referrer') || '';
	const contentType = getContentType(data.clients, referringDomain)

	const metadata = {
		...data.metadata[req.params.hash],
		mimeType: contentType
	}

	log(referringDomain +  " from MimeType: " + contentType);

	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(metadata));
}
