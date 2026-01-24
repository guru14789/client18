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
        // Fetch memory metadata from Firestore to serve OG tags
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

        // We fetch the signed URL ONLY for the og:video tag so bots can preview it if they support it
        const bucket = admin.storage().bucket();
        const file = bucket.file(`users/${authorId}/videos/${memoryId}.mp4`);

        let signedUrl = '';
        try {
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000,
            });
            signedUrl = url;
        } catch (e) {
            console.error("Error signing URL:", e);
        }

        const shortUrl = `https://${req.headers.host}/v/${memoryId}`;
        const appRedirectUrl = `https://${req.headers.host}/?memoryId=${memoryId}`;

        // Serve HTML with Meta Tags and IMMEDIATE REDIRECT for humans
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>Question: ${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / WhatsApp Preview -->
    <meta property="og:type" content="video.other">
    <meta property="og:site_name" content="Inai Family">
    <meta property="og:title" content="Question: ${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${thumbnailUrl}">
    <meta property="og:url" content="${shortUrl}">
    ${signedUrl ? `
    <meta property="og:video" content="${signedUrl}">
    <meta property="og:video:secure_url" content="${signedUrl}">
    <meta property="og:video:type" content="video/mp4">
    ` : ''}

    <!-- Immediate Redirect for humans -->
    <meta http-equiv="refresh" content="0;url=${appRedirectUrl}">
    <script>
        window.location.href = "${appRedirectUrl}";
    </script>

    <style>
        body { background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    </style>
</head>
<body>
    <p>Redirecting to Inai...</p>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Share link generation error:', error);
        return res.status(500).send('Internal Server Error.');
    }
}
