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
        const description = memoryData.authorName ? `Shared by ${memoryData.authorName} on Inai` : 'A special memory shared on Inai Family Connect.';
        const thumbnailUrl = memoryData.thumbnailUrl || '';
        const shortUrl = `https://${req.headers.host}/v/${id}.mp4`;
        const deepLinkUrl = `https://${req.headers.host}/?memoryId=${id}`;

        // FETCH VIDEO LINK FROM FIREBASE STORAGE DIRECTLY
        const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`);
        const fileName = `users/${memoryData.authorId}/videos/${id}.mp4`;
        const file = bucket.file(fileName);

        // CHECK IF THIS IS A DIRECT STREAM REQUEST (e.g. from a video player or social preview)
        // We detect this by checking if it's NOT a browser navigation (Accept: text/html)
        const isHtmlRequest = req.headers.accept?.includes('text/html');
        // Or if it's a Range request, it's definitely a media player
        const isRangeRequest = !!req.headers.range;

        if (!isHtmlRequest || isRangeRequest) {
            try {
                const [metadata] = await file.getMetadata();
                const size = parseInt(metadata.size);

                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Cache-Control', 'public, max-age=3600');

                if (req.headers.range) {
                    const parts = req.headers.range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
                    const chunksize = (end - start) + 1;

                    res.status(206);
                    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
                    res.setHeader('Content-Length', chunksize);

                    const stream = file.createReadStream({ start, end });
                    stream.pipe(res);
                } else {
                    res.setHeader('Content-Length', size);
                    const stream = file.createReadStream();
                    stream.pipe(res);
                }
                console.log('✅ Streaming video directly from Storage proxy');
                return;
            } catch (streamError) {
                console.error('Streaming error, falling back to HTML/Redirect:', streamError);
                // If streaming fails, we continue to serve the HTML page
            }
        }

        // For browser requests, we serve the premium HTML player page
        let videoUrl = memoryData.videoUrl;
        try {
            // Generate a fresh signed URL for the <video> tag in the HTML page
            const [signedUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            });
            videoUrl = signedUrl;
            console.log('✅ Fresh video URL fetched for HTML player');
        } catch (storageError) {
            console.error('Error fetching signed URL:', storageError);
        }

        // Prepare HTML with enhanced OG tags and premium design
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <title>${title} | Inai Family Memories</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / WhatsApp / Facebook -->
    <meta property="og:type" content="video.other">
    <meta property="og:site_name" content="Inai Family Connect">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${thumbnailUrl}">
    <meta property="og:url" content="${shortUrl}">
    <meta property="og:video" content="${shortUrl}">
    <meta property="og:video:secure_url" content="${shortUrl}">
    <meta property="og:video:type" content="video/mp4">
    <meta property="og:video:width" content="1280">
    <meta property="og:video:height" content="720">

    <!-- Twitter -->
    <meta name="twitter:card" content="player">
    <meta name="twitter:site" content="@inaiconnect">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${thumbnailUrl}">
    <meta name="twitter:player" content="${shortUrl}">
    <meta name="twitter:player:width" content="360">
    <meta name="twitter:player:height" content="640">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap" rel="stylesheet">

    <style>
        :root {
            --primary: #2F5D8A;
            --charcoal: #2B2B2B;
            --warmwhite: #FAF9F7;
        }
        body, html { 
            margin: 0; padding: 0; width: 100%; height: 100%; 
            background: var(--charcoal); 
            font-family: 'Inter', -apple-system, sans-serif; 
            overflow: hidden; 
            color: #fff;
        }
        .player-wrapper { 
            position: relative; width: 100%; height: 100%; 
            display: flex; align-items: center; justify-content: center; 
        }
        video { 
            width: 100%; height: 100%; object-fit: contain; 
            background: #000; 
            box-shadow: 0 0 100px rgba(0,0,0,0.5);
        }
        .branding { 
            position: absolute; top: 40px; left: 40px; 
            font-weight: 900; font-size: 28px; letter-spacing: -1.5px; 
            z-index: 100; opacity: 0.9;
            text-shadow: 0 4px 20px rgba(0,0,0,0.3);
            background: linear-gradient(135deg, #fff, rgba(255,255,255,0.7));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .info-overlay { 
            position: absolute; bottom: 0; left: 0; right: 0; 
            padding: 80px 40px 60px; 
            background: linear-gradient(transparent, rgba(0,0,0,0.95)); 
            pointer-events: none; z-index: 50; 
        }
        .info-content { 
            max-width: 600px; margin: 0 auto; pointer-events: auto; 
            display: flex; flex-col; gap: 20px;
        }
        h1 { 
            font-size: 24px; margin: 0 0 8px 0; font-weight: 800; 
            text-shadow: 0 2px 20px rgba(0,0,0,0.8); 
            line-height: 1.2;
        }
        .author {
            font-size: 14px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.1em; color: var(--primary); margin-bottom: 20px;
            display: block; opacity: 0.9;
        }
        .actions {
            display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap;
        }
        .btn { 
            display: inline-flex; align-items: center; justify-content: center;
            background: var(--primary); color: #fff;
            height: 56px;
            border-radius: 28px; text-decoration: none; font-weight: 800; 
            font-size: 14px; box-shadow: 0 15px 35px rgba(47,93,138,0.4);
            transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
            padding: 0 32px;
            white-space: nowrap;
        }
        .btn:active { transform: scale(0.95); }
        .btn-secondary {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: none;
        }
        .bg-glow {
            position: absolute; top: 50%; left: 50%; 
            width: 150%; height: 150%; 
            background: radial-gradient(circle, rgba(47,93,138,0.15) 0%, transparent 70%);
            transform: translate(-50%, -50%);
            z-index: 1; pointer-events: none;
            animation: pulse 8s infinite alternate;
        }
        @keyframes pulse {
            from { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
        }
        @media (max-width: 480px) {
            .branding { top: 30px; left: 30px; font-size: 22px; }
            .info-overlay { padding: 60px 25px 50px; }
            h1 { font-size: 20px; }
            .btn { flex: 1; padding: 0 20px; font-size: 13px; }
            .actions { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="bg-glow"></div>
    <div class="player-wrapper">
        <div class="branding">INAI</div>
        <video id="videoPlayer" src="${videoUrl}" poster="${thumbnailUrl}" controls autoplay playsinline loop></video>
        <div class="info-overlay">
            <div class="info-content">
                <span class="author">${memoryData.authorName || 'Family Member'} shared a story</span>
                <h1>${title}</h1>
                <div class="actions">
                    <a href="${deepLinkUrl}" class="btn">Open Inai App</a>
                    <button id="shareBtn" class="btn btn-secondary">Share Memory</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.onclick = () => {
                if (navigator.share) {
                    navigator.share({
                        title: '${title}',
                        text: 'Watch this family memory on Inai: ${title}',
                        url: window.location.href
                    });
                } else {
                    const waUrl = 'https://wa.me/?text=' + encodeURIComponent('Watch this family memory on Inai: ${title} ' + window.location.href);
                    window.open(waUrl, '_blank');
                }
            };
        }

        // Try to unmute on first click anywhere if autoplay was blocked
        document.body.onclick = () => {
            const v = document.getElementById('videoPlayer');
            if (v && v.paused) v.play();
        };
    </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Share proxy error:', error);
        return res.status(500).send('Internal error');
    }
}
