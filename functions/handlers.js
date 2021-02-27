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

function getCustomMetadata(clients, referringDomain) {

	let metadata = {};

	_.forEach(clients, (o) => {
		if (referringDomain.includes(o.domain) && o.metadata) {
			metadata = o.metadata;
		}
	});

	return metadata;

}

function reqJunk(req, isMetadata) {
	//paulie patch
	if (req.params.hash.includes("bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4")) {
			req.params.hash = req.params.hash.replace("bafybeie3mf7isc47rtujjzpt2n5jra7abqjx5m4f4exsmdzc6zqbaytzl4", "paulie")
	}

	const tag = (isMetadata?"m":"c");

	log(`${tag}: ` + JSON.stringify(req.headers));
	log(`${tag}: browser = ` + req.useragent.browser);
	log(`${tag}: device = ` + req.device.type);

	return req;
}

async function logRequest(req) {

	var ref = db.ref("analytics/requests");
	const requester = (req.get('Referrer') || req.headers['origin'] || req.headers['x-forwarded-for'] || req.useragent.browser).split(',')[0].replace("https://","").replace("http://","").split(/[/?#]/)[0];

	const key = requester.replace(/\./g,"")

	if (key == "ipfskevaidcom") {
		return;
	}

	var domainRef = ref.child(key);

	var count = await domainRef.child("hits").once("value").then(snap => snap.val());

	if (count == null) {
		domainRef.set({
			"requester": requester,
	  	"hits": 1,
		});
	} else {
		count = count + 1;
		domainRef.update({
	  	"hits": count
		});
	}
	domainRef.child("raw").push(JSON.stringify(req.headers));
}

function findClient(clients, req) {

	var data = [(req.get('Referrer') || req.headers['origin']), 'image/gif', 'gif'];

	_.forEach(clients, (o) => {
		if (o.fingerprint) {
			Object.keys(o.fingerprint).forEach(function(key) {
				var header = req.get(key);

				//log(`checking ${key} = ${header}`);

				var _fingerprint = o.fingerprint[key].split(",");

				_.forEach(_fingerprint, (f) => {
					if (header && header.includes(f)) {
						log("findClient success!");
						data = [o.domain, o.contentType, o.fileType];
					}
				});
			});
		}
	});

	return data;
}

module.exports.renderIndex = (req, res) => {
	return res.render('home');
}

module.exports.handleHashRequest = async (req, res) => {

		req = reqJunk(req, false);
		req.params.hash_ext = req.params.hash;
		req.params.hash = req.params.hash_ext.split(".")[0];

		logRequest(req);

		if (req.params.hash_ext.includes(".")) {
				req.params.ext = req.params.hash_ext.split(".")[1];
				return handlAssetByKind(req,res);
		} else if (req.query.supports) {
				//ipfs.kevaid.com/paulie?supports=glb+gltf
				var supports = req.query.supports.replace("3d", "glb gltf fbx").replace("image", "svg gif png jpg");
				req.params.supports = supports.split(" ");
				return handlAssetByKinds(req,res);

		} else {
				return handlePaulieMagically(req,res);
		}
}


async function handlePaulieMagically(req, res) {

	const data = await db.ref().once("value").then(snap => snap.val());
	const clientData = findClient(data.clients, req);
	const referringDomain = clientData[0];

	const fileName = data.IPFS[req.params.hash].fileName;
	const fileExtensions_available = data.IPFS[req.params.hash].fileType.split(",");

	if (clientData[1]=="text/html") {
		return res.render('gallery', { hash:req.params.hash, filename:fileName, files:fileExtensions_available, metadata:data.metadata[req.params.hash] });
	}

	const contentType = clientData[1];
	const fileExtensions_supported = clientData[2].split(",");
	const intersection = fileExtensions_supported.filter(element => fileExtensions_available.includes(element));

	if (intersection.length == 0) {
		log("no files support this website");
		return res.status(404).end("no files available for this query.");
	}

	const ipfsHash = data.IPFS[req.params.hash].ipfs;
	const assetUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}/${fileName}.${intersection[0]}`;

	log(req.useragent.browser + " on " + referringDomain + " requesting file  " + contentType);
	log("returning data at " + assetUrl);

	res.set('Cache-Control', 'no-store');
	res.set('X-DNS-Prefetch-Control', 'off');
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Content-Type', contentType);

	return res.redirect(assetUrl);
}

async function handlAssetByKinds(req, res) {

	const data = await db.ref("IPFS").child(req.params.hash).once("value").then(snap => snap.val());

	const fileExtensions_supported = req.params.supports;
	const fileExtensions_available = data.fileType.split(",");
	const intersection = fileExtensions_supported.filter(element => fileExtensions_available.includes(element));

	if (intersection.length == 0) {
		return res.status(404).end("no files available for this query.");
	}

	const fileName = data.fileName;
	const fileExtension = intersection[0];

	if (fileName) {
		const ipfsHash = data.ipfs;
		const assetUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}/${fileName}.${fileExtension}`;
		return res.redirect(assetUrl);
	}

	return res.send(`hmmm, I've never heard of ${fileExtension} before. You got a new kind of file?`)
}

async function handlAssetByKind(req, res) {
	const data = await db.ref("IPFS").child(req.params.hash).once("value").then(snap => snap.val());
	const fileName = data.fileName;
	const fileExtension = req.params.ext;

	if (fileExtension == "snap") {
		const snapOrigin = (req.device.type=="desktop"?`https://snapchat.com/`:'snapchat://');
		const snapUrl = snapOrigin+`unlock/?type=SNAPCODE&uuid=464293d753af4e3ea2ea8692f3fb184f&metadata=01`;
		return res.redirect(snapUrl);
	} else if (fileName) {
		const ipfsHash = data.ipfs;
		const assetUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}/${fileName}.${fileExtension}`;
		return res.redirect(assetUrl);
	}

	return res.send(`hmmm, I've never heard of ${fileExtension} before. You got a new kind of file?`)
}

module.exports.handleMetaData = async (req, res) => {

	req = reqJunk(req, true);

	logRequest(req);

	const data = await db.ref().once("value").then(snap => snap.val());
	const clientData = findClient(data.clients, req);
	const referringDomain = clientData[0];
	const contentType = clientData[1];

	const metadata = {
		...data.metadata[req.params.hash],
		mimeType: contentType
	}

	log("returning metadata with contentType: " + contentType);

	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(metadata));
}

module.exports.surf = async (req, res) => {
	res.render('3dsurf', { fileToLoad:"/" + req.params.hash + ".glb" });
}
