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
		if (o.API && o.API.includes(browser)) {
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
	return res.render('home');
}


module.exports.handleHashRequest = async (req, res) => {

		//paulie patch
		if (req.params.hash_ext.includes("bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4")) {
				req.params.hash_ext = req.params.hash_ext.replace("bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4", "QmPDqU2DdKHMP3NRnPAAdTzjS2sxDGoX2gjn6bmrZWLRUB")
		}

		req.params.hash = req.params.hash_ext.split(".")[0];
		if (req.params.hash_ext.includes(".")) {
				req.params.ext = req.params.hash_ext.split(".")[1];
				return handlAssetByKind(req,res);
		} else {
				return handlePaulieMagically(req,res);
		}
}

async function handlePaulieMagically(req, res) {

	const data = await db.ref().once("value").then(snap => snap.val());
	const referringDomain = req.get('Referrer') || hailMary(data.clients, req.useragent.browser);

	log("browser = " + req.useragent.browser)
	log("referrer = " +  referringDomain);
	log("origin = " + req.get('origin'));

	const fileName = data.IPFS[req.params.hash].fileName;
	const fileExtensions_available = data.IPFS[req.params.hash].fileType.split(",");

	if (!referringDomain) {
		return res.render('gallery', { hash:req.params.hash, filename:fileName, files:fileExtensions_available, metadata:data.metadata[req.params.hash] });
	}

	const fileInfo = getContentType(data.clients, referringDomain);
	const contentType = fileInfo[0];

	const fileExtensions_supported = fileInfo[1].split(",");
	const intersection = fileExtensions_supported.filter(element => fileExtensions_available.includes(element));

	if (intersection.length == 0) {
		log("no files support this website");
		return res.status(404).end();
	}

	const assetUrl = `https://gateway.pinata.cloud/ipfs/${req.params.hash}/${fileName}.${intersection[0]}`;

	log(req.useragent.browser + " on " + referringDomain + " requesting file  " + contentType);
	log("returning data at " + assetUrl);

	res.set('Cache-Control', 'no-store');
	res.set('X-DNS-Prefetch-Control', 'off');
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Content-Type', contentType);

	return res.redirect(assetUrl);
}

async function handlAssetByKind(req, res) {
	const data = await db.ref("IPFS").child(req.params.hash).once("value").then(snap => snap.val());
	const fileName = data.fileName;
	const fileExtension = req.params.ext;

	if (fileName) {
		const assetUrl = `https://gateway.pinata.cloud/ipfs/${req.params.hash}/${fileName}.${fileExtension}`;
		return res.redirect(assetUrl);
	}

	return res.send(`hmmm, I've never heard of ${fileExtension} before. You got a new kind of file?`)
}

module.exports.handleMetaData = async (req, res) => {

	if (req.params.hash.includes("bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4")) {
			req.params.hash = req.params.hash.replace("bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4", "QmPDqU2DdKHMP3NRnPAAdTzjS2sxDGoX2gjn6bmrZWLRUB")
	}

	const data = await db.ref().once("value").then(snap => snap.val());
	const referringDomain = req.get('Referrer') || hailMary(data.clients, req.useragent.browser);
	const fileInfo = getContentType(data.clients, referringDomain);
	const contentType = fileInfo[0];

	log("browser = " + req.useragent.browser)
	log("referrer = " +  referringDomain);
	log("origin = " + req.get('origin'));

	const metadata = {
		...data.metadata[req.params.hash],
		mimeType: contentType
	}

	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(metadata));
}

module.exports.surf = async (req, res) => {
	res.render('3dsurf', { fileToLoad:"/" + req.params.hash + ".glb" });
}
