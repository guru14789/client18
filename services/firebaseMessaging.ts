// Firebase Cloud Messaging (FCM) Service for Push Notifications
import { getToken, onMessage, MessagePayload } from "firebase/messaging";
import { messaging } from "./firebaseConfig";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { createNotification as createFirestoreNotification } from "./firebaseDatabase";

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
    try {
        if (!messaging) return null;

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });
            return token;
        }
        return null;
    } catch (error) {
        console.error("Error getting notification permission:", error);
        return null;
    }
};

/**
 * Save FCM token to user document
 */
export const saveFCMToken = async (userId: string, token: string): Promise<void> => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
        });
    } catch (error) {
        console.error("Error saving FCM token:", error);
        throw error;
    }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (
    callback: (payload: MessagePayload) => void
): void => {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        callback(payload);
        if (payload.notification) {
            const { title, body } = payload.notification;
            if (Notification.permission === "granted") {
                new Notification(title || "New Notification", { body: body || "" });
            }
        }
    });
};

/**
 * Send notification to family members
 */
export const notifyFamilyMembers = async (
    familyId: string,
    notification: {
        message: string;
        type: "new_memory" | "new_question" | "upvote" | "comment";
        relatedId?: string;
    },
    excludeUserId?: string
): Promise<void> => {
    try {
        const familyRef = doc(db, "families", familyId);
        const familySnap = await getDoc(familyRef);

        if (familySnap.exists()) {
            const members = familySnap.data().members || [];
            const notificationPromises = members
                .filter((memberId: string) => memberId !== excludeUserId)
                .map((memberId: string) => createFirestoreNotification({
                    userId: memberId,
                    message: notification.message,
                    type: notification.type,
                    relatedId: notification.relatedId,
                    read: false,
                    createdAt: new Date().toISOString()
                }));

            await Promise.all(notificationPromises);
        }
    } catch (error) {
        console.error("Error notifying family members:", error);
        throw error;
    }
};

/**
 * Initialize FCM for a user
 */
export const initializeFCM = async (userId: string): Promise<void> => {
    try {
        const token = await requestNotificationPermission();
        if (token) {
            await saveFCMToken(userId, token);
            onForegroundMessage((payload) => {
                console.log("Received foreground message:", payload);
            });
        }
    } catch (error) {
        console.error("Error initializing FCM:", error);
    }
};
