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
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
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
        // Fetch memory metadata from Firestore
        const memoriesRef = db.collectionGroup('memories');
        const snapshot = await memoriesRef.where(admin.firestore.FieldPath.documentId(), '==', id.replace('.mp4', '')).limit(1).get();

        let memoryData;
        if (snapshot.empty) {
            const fallback = await memoriesRef.where('id', '==', id.replace('.mp4', '')).limit(1).get();
            if (fallback.empty) return res.status(404).send('Not found');
            memoryData = fallback.docs[0].data();
        } else {
            memoryData = snapshot.docs[0].data();
        }

        const title = memoryData.questionText || 'Family Memory';
        const description = memoryData.authorName ? `Shared by ${memoryData.authorName}` : 'A special story on Inai.';
        const thumbnailUrl = memoryData.thumbnailUrl || '';
        const authorId = memoryData.authorId;
        const memoryId = memoryData.id || id.replace('.mp4', '');

        // Generate signed URL for the video (valid for 1 hour)
        const bucket = admin.storage().bucket();
        const file = bucket.file(`users/${authorId}/videos/${memoryId}.mp4`);

        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
        });

        const shortUrl = `https://${req.headers.host}/v/${memoryId}.mp4`;

        // Serve HTML with Meta Tags and a Player
        // We DO NOT auto-redirect to the Storage URL to keep the domain masked
        // We DO NOT auto-redirect to the App unless the user clicks the button

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    
    <title>Question: ${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / WhatsApp -->
    <meta property="og:type" content="video.other">
    <meta property="og:site_name" content="Inai Family">
    <meta property="og:title" content="Question: ${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${thumbnailUrl}">
    <meta property="og:url" content="${shortUrl}">
    <meta property="og:video" content="${signedUrl}">
    <meta property="og:video:secure_url" content="${signedUrl}">
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
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; font-family: sans-serif; overflow: hidden; color: #fff; }
        .container { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        video { width: 100%; height: 100%; object-fit: contain; }
        .branding { position: absolute; top: 20px; left: 20px; font-weight: bold; font-size: 20px; opacity: 0.7; z-index: 10; }
        .overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px 20px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); text-align: center; }
        h1 { font-size: 18px; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .btn { display: inline-block; background: #2f5d8a; color: #fff; padding: 12px 24px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="branding">INAI</div>
        <video src="${signedUrl}" poster="${thumbnailUrl}" controls autoplay playsinline loop></video>
        <div class="overlay">
            <h1>Question: ${title}</h1>
            <a href="/?memoryId=${memoryId}" class="btn">Open App to Share/Reply</a>
        </div>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Share link generation error:', error);
        return res.status(500).send('Internal Server Error. Please ensure service account keys are correct.');
    }
}
