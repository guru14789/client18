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

    if (!id) {
        return res.status(400).send('Memory ID is required');
    }

    try {
        const memoriesRef = db.collectionGroup('memories');
        const snapshot = await memoriesRef.where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();

        if (snapshot.empty) {
            // Check if it's saved as an ID field
            const fallbackSnapshot = await memoriesRef.where('id', '==', id).limit(1).get();
            if (fallbackSnapshot.empty) {
                return res.status(404).send('Memory not found');
            }
            renderVideoPage(res, fallbackSnapshot.docs[0].data(), id);
        } else {
            renderVideoPage(res, snapshot.docs[0].data(), id);
        }
    } catch (error) {
        console.error('Error fetching memory:', error);
        return res.status(500).send('Internal Server Error');
    }
}

function renderVideoPage(res, memory, memoryId) {
    const title = memory.questionText || 'Inai Family Memory';
    const description = memory.authorName ? `Shared by ${memory.authorName}` : 'A special memory shared on Inai.';
    const imageUrl = memory.thumbnailUrl || '';
    const videoUrl = memory.videoUrl;
    const appUrl = `https://${process.env.VERCEL_URL || 'inai.app'}/?memoryId=${memoryId}`;

    const cleanTitle = title.replace(/"/g, '&quot;');
    const cleanDesc = description.replace(/"/g, '&quot;');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    
    <title>${cleanTitle}</title>
    <meta name="description" content="${cleanDesc}">

    <!-- Open Graph -->
    <meta property="og:type" content="video.other">
    <meta property="og:title" content="${cleanTitle}">
    <meta property="og:description" content="${cleanDesc}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:video" content="${videoUrl}">
    <meta property="og:url" content="${appUrl}">

    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #000;
            font-family: 'Inter', sans-serif;
            color: #fff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .video-container {
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        }
        video {
            width: 100%;
            height: 100%;
            max-width: 500px;
            object-fit: contain;
        }
        .overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 40px 20px;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            pointer-events: none;
        }
        .overlay-content {
            max-width: 500px;
            margin: 0 auto;
            pointer-events: auto;
        }
        h1 {
            font-size: 20px;
            font-weight: 900;
            margin: 0 0 8px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        p {
            font-size: 14px;
            opacity: 0.8;
            margin: 0 0 24px 0;
        }
        .cta-button {
            display: inline-flex;
            align-items: center;
            background: #2f5d8a;
            color: #fff;
            padding: 12px 24px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 10px 20px rgba(47,93,138,0.3);
            transition: transform 0.2s;
        }
        .cta-button:active {
            transform: scale(0.95);
        }
        .logo {
            position: absolute;
            top: 20px;
            left: 20px;
            font-weight: 900;
            letter-spacing: -1px;
            font-size: 24px;
            background: linear-gradient(to right, #2f5d8a, #8da9c4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            z-index: 10;
        }
    </style>
</head>
<body>
    <div class="logo">INAI</div>
    
    <div class="video-container">
        <video 
            src="${videoUrl}" 
            poster="${imageUrl}"
            controls 
            autoplay 
            playsinline
            loop
        ></video>
        
        <div class="overlay">
            <div class="overlay-content">
                <h1>${cleanTitle}</h1>
                <p>${cleanDesc}</p>
                <a href="/?memoryId=${memoryId}" class="cta-button">
                    Open in Inai App
                </a>
            </div>
        </div>
    </div>

    <!-- Bots/Crawlers get the meta tags above. Humans get the player. -->
    <!-- Optional: Auto-redirect only if user has been here for a while or clicks button -->
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
