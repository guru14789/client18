// Firebase Configuration utilizing environment variables
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getMessaging, Messaging, isSupported as isMessagingSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};


// Singleton initialization
let app: FirebaseApp;
try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
    app = initializeApp(firebaseConfig);
}

// Service Exports
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Enable persistence for offline support and faster loads
import { enableMultiTabIndexedDbPersistence } from "firebase/firestore";
if (typeof window !== "undefined") {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Firestore persistence: multiple tabs open");
        } else if (err.code === 'unimplemented') {
            console.warn("Firestore persistence: browser not supported");
        }
    });
}

// Analytics setup
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
    isSupported().then((supported) => {
        if (supported && firebaseConfig.measurementId) {
            analytics = getAnalytics(app);
        }
    });
}

// Messaging setup
let messaging: Messaging | null = null;
if (typeof window !== "undefined") {
    isMessagingSupported().then((supported) => {
        if (supported) {
            messaging = getMessaging(app);
        }
    });
}

export { analytics, messaging };
export default app;
