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

	let contentType = "image/gif"; // fallback
	let fileExtension = "gif"

	_.forEach(clients, (o) => {
		if (referringDomain.includes(o.domain)) {
			contentType = o.contentType;
			fileExtension = o.fileType;
		}
	});

	return [contentType, fileExtension];

}

function hailMary(clients, browser) {

	let referrer = '';

	_.forEach(clients, (o) => {
		if (browser.includes(o.API)) {
			log("hailMary success");
			referrer = o.domain;
		}
	});

	return referrer;

}

function getCustomMetadata(clients, referringDomain) {

	let metadata = {};

	_.forEach(clients, (o) => {
		if (referringDomain.includes(o.domain) && o.metadata) {
			metadata = o.metadata;
		}
	});

	return metadata;

}

module.exports.renderIndex = (req, res) => {
	res.end("the decline of centralized power is accelerating.")
}

module.exports.handlePaulieMagically = (req, res) => {

	db.ref().once("value").then(snap => {
		const data = snap.val();
		const referringDomain = req.get('Referrer') || hailMary(data.clients, req.useragent.browser);

		log("browser = " + req.useragent.browser)
		log("referrer = " +  referringDomain);
		log("origin = " + req.get('origin'));

		if(!referringDomain) {
				return res.render('gallery', { title: "ipfs.kevaid.com" });
		}

		const fileInfo = getContentType(data.clients, referringDomain);
		const contentType = fileInfo[0];
		const fileExtension = fileInfo[1];

		const assetHash = data.assets.paulie[fileExtension];
		//const assetUrl = `https://ipfs.fleek.co/ipfs/${assetHash}?filename=file.${fileExtension}`;
		const assetUrl = `https://aidanwolf-team-bucket.storage.fleek.co/PAULIE_NFT.${fileExtension}`;

		log(req.useragent.browser + " on " + referringDomain + " requesting file  " + contentType);
		log("returning data at " + assetUrl);

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
	const referringDomain = req.get('Referrer') || hailMary(data.clients, req.useragent.browser);
	const fileInfo = getContentType(data.clients, referringDomain);
	const contentType = fileInfo[0];

	log("browser = " + req.useragent.browser)
	log("referrer = " +  referringDomain);
	log("origin = " + req.get('origin'));

	const metadata = {
		...data.metadata[req.params.hash],
		...getCustomMetadata(data.clients, referringDomain),
		mimeType: contentType
	}

	log("metadata request: " + referringDomain +  " from MimeType: " + contentType);
	log("returning: " + JSON.stringify(metadata));

	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(metadata));
}
