// Firebase Cloud Messaging (FCM) Service for Push Notifications
import { getToken, onMessage, MessagePayload } from "firebase/messaging";
import { messaging } from "./firebaseConfig";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Request notification permission and get FCM token
 * @returns FCM token or null if permission denied
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
    try {
        // Check if messaging is supported
        if (!messaging) {
            console.warn("Firebase Messaging is not supported in this browser");
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            console.log("✅ Notification permission granted");

            // Get FCM token
            // Note: You need to add your VAPID key from Firebase Console
            // Go to: Project Settings > Cloud Messaging > Web Push certificates
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });

            if (token) {
                console.log("✅ FCM Token:", token);
                return token;
            } else {
                console.log("No registration token available");
                return null;
            }
        } else {
            console.log("Notification permission denied");
            return null;
        }
    } catch (error) {
        console.error("Error getting notification permission:", error);
        return null;
    }
};

/**
 * Save FCM token to user document
 * @param userId - User ID
 * @param token - FCM token
 */
export const saveFCMToken = async (userId: string, token: string): Promise<void> => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
        });
        console.log("✅ FCM token saved to user document");
    } catch (error) {
        console.error("Error saving FCM token:", error);
        throw error;
    }
};

/**
 * Listen for foreground messages
 * @param callback - Callback to handle incoming messages
 */
export const onForegroundMessage = (
    callback: (payload: MessagePayload) => void
): void => {
    if (!messaging) {
        console.warn("Firebase Messaging is not supported");
        return;
    }

    onMessage(messaging, (payload) => {
        console.log("📬 Foreground message received:", payload);
        callback(payload);

        // Show browser notification
        if (payload.notification) {
            const { title, body, icon } = payload.notification;

            if (Notification.permission === "granted") {
                new Notification(title || "New Notification", {
                    body: body || "",
                    icon: icon || "/icon.png",
                    badge: "/badge.png"
                });
            }
        }
    });
};

/**
 * Create a notification document in Firestore
 * @param userId - User ID to send notification to
 * @param notification - Notification data
 */
export const createNotification = async (
    userId: string,
    notification: {
        title: string;
        body: string;
        type: "memory" | "question" | "family" | "document" | "general";
        data?: Record<string, any>;
    }
): Promise<void> => {
    try {
        const { addDoc, collection, Timestamp } = await import("firebase/firestore");

        await addDoc(collection(db, "notifications"), {
            userId,
            ...notification,
            read: false,
            createdAt: Timestamp.now()
        });

        console.log("✅ Notification created");
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};

/**
 * Send notification to family members
 * This is a helper function that creates notification documents
 * Actual push notifications should be sent from backend using Firebase Admin SDK
 * 
 * @param familyId - Family ID
 * @param notification - Notification data
 * @param excludeUserId - User ID to exclude (e.g., the sender)
 */
export const notifyFamilyMembers = async (
    familyId: string,
    notification: {
        title: string;
        body: string;
        type: "memory" | "question" | "family" | "document" | "general";
        data?: Record<string, any>;
    },
    excludeUserId?: string
): Promise<void> => {
    try {
        const { getDoc, doc } = await import("firebase/firestore");

        // Get family members
        const familyRef = doc(db, "families", familyId);
        const familySnap = await getDoc(familyRef);

        if (familySnap.exists()) {
            const members = familySnap.data().members || [];

            // Create notification for each member (except excluded user)
            const notificationPromises = members
                .filter((memberId: string) => memberId !== excludeUserId)
                .map((memberId: string) => createNotification(memberId, notification));

            await Promise.all(notificationPromises);
            console.log("✅ Family notifications created");
        }
    } catch (error) {
        console.error("Error notifying family members:", error);
        throw error;
    }
};

/**
 * Mark notification as read
 * @param notificationId - Notification ID
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    try {
        const { updateDoc, doc } = await import("firebase/firestore");

        const notificationRef = doc(db, "notifications", notificationId);
        await updateDoc(notificationRef, {
            read: true
        });

        console.log("✅ Notification marked as read");
    } catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
    }
};

/**
 * Get user notifications
 * @param userId - User ID
 * @param unreadOnly - Get only unread notifications
 * @returns Array of notifications
 */
export const getUserNotifications = async (
    userId: string,
    unreadOnly: boolean = false
): Promise<any[]> => {
    try {
        const { query, collection, where, orderBy, getDocs } = await import("firebase/firestore");

        let q;
        if (unreadOnly) {
            q = query(
                collection(db, "notifications"),
                where("userId", "==", userId),
                where("read", "==", false),
                orderBy("createdAt", "desc")
            );
        } else {
            q = query(
                collection(db, "notifications"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc")
            );
        }

        const querySnapshot = await getDocs(q);
        const notifications: any[] = [];

        querySnapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...(doc.data() as any) });
        });

        return notifications;
    } catch (error) {
        console.error("Error getting user notifications:", error);
        throw error;
    }
};

/**
 * Initialize FCM for a user
 * This should be called after user login
 * @param userId - User ID
 */
export const initializeFCM = async (userId: string): Promise<void> => {
    try {
        // Request permission and get token
        const token = await requestNotificationPermission();

        if (token) {
            // Save token to user document
            await saveFCMToken(userId, token);

            // Listen for foreground messages
            onForegroundMessage((payload) => {
                console.log("Received foreground message:", payload);
                // You can add custom handling here
            });
        }
    } catch (error) {
        console.error("Error initializing FCM:", error);
    }
};
