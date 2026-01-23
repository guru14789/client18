import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle private key with escaped newlines
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

    if (!id) {
        return res.status(400).send('Memory ID is required');
    }

    try {
        // Query across all users' memories for the specific memory ID
        // Note: Using collectionGroup requires an index if you filter, but
        // since we are fetching by ID across a group, we might need to find the correct path.
        // Actually, document IDs are not naturally searchable via collectionGroup without an index on a field.
        // However, we can query by the 'id' field if we store it inside the document.
        // Let's check if 'id' is stored inside the document.
        // In firebaseDatabase.ts: createMemory stores ...clean(memoryData). memoryData has 'id' only if it's passed.
        // But usually addDoc generates an ID and we don't store it inside unless explicit.

        // A better way: Query collectionGroup('memories') where a field 'id' matches if we have it,
        // OR we can use the fact that memoryId is unique and use a workaround.
        // Since we don't know the parent user ID, we have to search.

        const memoriesRef = db.collectionGroup('memories');
        // We assume the document has a field 'id' or we'll search by document ID using __name__
        // Finding by __name__ in a collection group is possible:
        const snapshot = await memoriesRef.where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();

        if (snapshot.empty) {
            // Fallback: maybe it's saved as a field?
            // (If the documentId() doesn't work as expected in some environments)
            const fallbackSnapshot = await memoriesRef.where('id', '==', id).limit(1).get();
            if (fallbackSnapshot.empty) {
                return res.status(404).send('Memory not found');
            }
            renderMeta(res, fallbackSnapshot.docs[0].data(), id);
        } else {
            renderMeta(res, snapshot.docs[0].data(), id);
        }
    } catch (error) {
        console.error('Error fetching memory:', error);
        return res.status(500).send('Internal Server Error');
    }
}

function renderMeta(res, memory, memoryId) {
    const title = memory.questionText || 'Inai Family Memory';
    const description = memory.authorName ? `Shared by ${memory.authorName}` : 'A special memory shared on Inai.';
    const imageUrl = memory.thumbnailUrl || 'https://inai.io/default-share-image.jpg'; // Replace with your default
    const appUrl = `https://${process.env.VERCEL_URL || 'inai-family-connect-1zip.vercel.app'}/?memoryId=${memoryId}`;

    // Clean up title/desc for HTML
    const cleanTitle = title.replace(/"/g, '&quot;');
    const cleanDesc = description.replace(/"/g, '&quot;');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${cleanTitle}</title>
    <meta name="title" content="${cleanTitle}">
    <meta name="description" content="${cleanDesc}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.other">
    <meta property="og:url" content="${appUrl}">
    <meta property="og:title" content="${cleanTitle}">
    <meta property="og:description" content="${cleanDesc}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${appUrl}">
    <meta property="twitter:title" content="${cleanTitle}">
    <meta property="twitter:description" content="${cleanDesc}">
    <meta property="twitter:image" content="${imageUrl}">

    <!-- Redirect to SPA -->
    <script>
        window.location.href = "/?memoryId=${memoryId}";
    </script>
</head>
<body>
    <h1>Redirecting to Inai...</h1>
    <p>If you are not redirected automatically, <a href="/?memoryId=${memoryId}">click here</a>.</p>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
