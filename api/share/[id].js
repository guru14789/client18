import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) return res.status(400).send('ID required');

    try {
        // Query memory by ID across collection group
        const memoriesRef = db.collectionGroup('memories');
        const snapshot = await memoriesRef.where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();

        let memoryData;
        if (snapshot.empty) {
            const fallback = await memoriesRef.where('id', '==', id).limit(1).get();
            if (fallback.empty) return res.status(404).send('Not found');
            memoryData = fallback.docs[0].data();
        } else {
            memoryData = snapshot.docs[0].data();
        }

        const title = memoryData.questionText || 'Family Story';
        const description = memoryData.authorName ? `Shared by ${memoryData.authorName}` : 'A special memory on Inai.';
        const videoUrl = memoryData.videoUrl;
        const thumbnailUrl = memoryData.thumbnailUrl || '';
        const shortUrl = `https://${req.headers.host}/v/${id}.mp4`;

        // Check user agent to see if it's a bot or a real user
        const ua = req.headers['user-agent'] || '';
        const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|bot|crawler|spider/i.test(ua);

        // If it's a bot, we MUST return the OG tags for the preview
        // If it's a human, we show the beautiful player page

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    
    <title>Question: ${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / WhatsApp Preview -->
    <meta property="og:type" content="video.other">
    <meta property="og:title" content="Question: ${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${thumbnailUrl}">
    <meta property="og:url" content="${shortUrl}">
    <meta property="og:video" content="${videoUrl}">
    <meta property="og:video:type" content="video/mp4">

    <!-- Twitter -->
    <meta name="twitter:card" content="player">
    <meta name="twitter:title" content="Question: ${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${thumbnailUrl}">
    <meta name="twitter:player" content="${shortUrl}">
    <meta name="twitter:player:width" content="360">
    <meta name="twitter:player:height" content="640">

    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow: hidden; }
        .player-wrapper { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; height: 100%; max-width: 500px; object-fit: contain; background: #000; }
        .branding { position: absolute; top: 30px; left: 30px; font-weight: 900; color: #fff; font-size: 24px; letter-spacing: -1px; z-index: 10; opacity: 0.8; }
        .info-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 60px 30px; background: linear-gradient(transparent, rgba(0,0,0,0.9)); color: #fff; pointer-events: none; z-index: 5; }
        .info-content { max-width: 500px; margin: 0 auto; pointer-events: auto; }
        h1 { font-size: 20px; margin: 0 0 10px 0; font-weight: 800; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .btn { display: inline-block; background: #2f5d8a; color: #fff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 15px; box-shadow: 0 10px 30px rgba(47,93,138,0.4); }
    </style>
</head>
<body>
    <div class="player-wrapper">
        <div class="branding">INAI</div>
        <video src="${videoUrl}" poster="${thumbnailUrl}" controls autoplay playsinline loop></video>
        <div class="info-overlay">
            <div class="info-content">
                <h1>Question: ${title}</h1>
                <a href="/?memoryId=${id}" class="btn">Open in Inai App</a>
            </div>
        </div>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Share proxy error:', error);
        return res.status(500).send('Internal error');
    }
}
