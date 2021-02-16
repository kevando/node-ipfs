const _ = require("lodash");
const functions = require("firebase-functions");
const admin = require('firebase-admin');
const request = require("request");

request.debug = true;

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

	log("version 0");

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

		log("mp4 check " + fileExtension);
		if (fileExtension == "mp4") {

			const range = req.get("Range");

			log("range = " + range);

			if (range) {

				const options = {
					url: assetUrl,
					headers: {
						'Range': range
					}
				};

				return request.get(options).on('response', function(response) {

					log(response.statusCode) // 200
    			log(response.headers['content-type']) // 'image/png'

					/** Extracting Start and End value from Range Header */
				 let [start, end] = range.replace(/bytes=/, "").split("-");
				 start = parseInt(start, 10);
				 end = end ? parseInt(end, 10) : size - 1;

				 if (!isNaN(start) && isNaN(end)) {
					 start = start;
					 end = size - 1;
				 }
				 if (isNaN(start) && !isNaN(end)) {
					 start = size - end;
					 end = size - 1;
				 }

				 // Handle unavailable range request
				 if (start >= size || end >= size) {
					 // Return the 416 Range Not Satisfiable.
					 res.writeHead(416, {
						 "Content-Range": `bytes */${size}`
					 });
					 return res.end();
				 }

				 /** Sending Partial Content With HTTP Code 206 */
				 res.writeHead(206, {
					 "Content-Range": `bytes ${start}-${end}/${size}`,
					 "Accept-Ranges": "bytes",
					 "Content-Length": end - start + 1,
					 "Content-Type": "video/mp4"
				 });

			 }).pipe(res);

			} else {
				return request.get(assetUrl).pipe(res => res.status(206).send());
			}



			//
			// const videoSize = response.headers['content-length'];
			// // Parse range
			// const start = 0
			// const end = videoSize - 1
			//
			// request.get(assetUrl).on('response', function(response) {
    	// 		log(response.statusCode) // 200
			// 		log(response.headers);
			//
			// 				res.set('Content-Type', response.headers['content-type']);
			// 				res.set('Content-Range', `bytes ${start}-${end}/${videoSize}`);
			// 				res.set('Content-Length', response.headers['content-length']);
			// 				res.set('Accept-Ranges', 'bytes');
			//
  		// 	}).pipe(res);



		}
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
