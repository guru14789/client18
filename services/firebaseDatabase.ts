// Firebase Firestore Database Service
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    arrayUnion,
    arrayRemove,
    increment
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { User, Family, Memory, Question, Notification, FamilyDocument, Comment, FamilyInvitation, ActivityLog } from "../types";

// Collection names
export const COLLECTIONS = {
    USERS: "users",
    FAMILIES: "families",
    MEMORIES: "memories",
    QUESTIONS: "questions",
    DOCUMENTS: "documents",
    NOTIFICATIONS: "notifications",
    INVITES: "invites",
    ACTIVITY: "activity"
};

// Helper to remove undefined fields which Firestore doesn't support
const clean = <T extends object>(data: T): T => {
    return Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as T;
};

// ============================================
// USER OPERATIONS
// ============================================

export const createOrUpdateUser = async (userId: string, userData: Partial<User>): Promise<void> => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const now = new Date().toISOString();

        // Ensure settings object is initialized if providing theme or notificationsEnabled
        const settings: any = userData.settings || {};

        await setDoc(userRef, {
            ...clean(userData),
            uid: userId,
            lastLoginAt: now,
            updatedAt: Timestamp.now()
        }, { merge: true });
        console.log("✅ User created/updated:", userId);
    } catch (error: any) {
        console.error("Error creating/updating user:", error);
        throw error;
    }
};

export const getUser = async (userId: string): Promise<User | null> => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return { ...userSnap.data() } as User;
        }
        return null;
    } catch (error) {
        console.error("Error getting user:", error);
        throw error;
    }
};

// ============================================
// FAMILY OPERATIONS
// ============================================

export const createFamily = async (familyData: Omit<Family, 'id' | 'createdAt'>): Promise<string> => {
    try {
        const familyRef = await addDoc(collection(db, COLLECTIONS.FAMILIES), {
            ...clean(familyData),
            admins: familyData.admins || [familyData.createdBy],
            createdAt: new Date().toISOString(),
            updatedAt: Timestamp.now()
        });
        console.log("✅ Family created:", familyRef.id);
        return familyRef.id;
    } catch (error) {
        console.error("Error creating family:", error);
        throw error;
    }
};

export const getFamily = async (familyId: string): Promise<Family | null> => {
    try {
        const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
        const familySnap = await getDoc(familyRef);

        if (familySnap.exists()) {
            return { id: familySnap.id, ...familySnap.data() } as Family;
        }
        return null;
    } catch (error) {
        console.error("Error getting family:", error);
        throw error;
    }
};

export const getUserFamilies = async (userId: string): Promise<Family[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.FAMILIES),
            where("members", "array-contains", userId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Family));
    } catch (error) {
        console.error("Error getting user families:", error);
        throw error;
    }
};

export const addFamilyMember = async (familyId: string, userId: string): Promise<void> => {
    try {
        const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
        const userRef = doc(db, COLLECTIONS.USERS, userId);

        await updateDoc(familyRef, {
            members: arrayUnion(userId),
            updatedAt: Timestamp.now()
        });

        await updateDoc(userRef, {
            familyIds: arrayUnion(familyId),
            defaultFamilyId: familyId,
            updatedAt: Timestamp.now()
        });

        console.log("✅ Member added to family");
    } catch (error) {
        console.error("Error adding family member:", error);
        throw error;
    }
};

// ============================================
// MEMORY OPERATIONS
// ============================================

export const createMemory = async (memoryData: Omit<Memory, 'id'>): Promise<string> => {
    try {
        const now = new Date().toISOString();
        const memoryRef = await addDoc(collection(db, COLLECTIONS.MEMORIES), {
            ...clean(memoryData),
            createdAt: now,
            publishedAt: memoryData.status === 'published' ? now : null,
            serverCreatedAt: Timestamp.now()
        });

        if (memoryData.status === 'draft') {
            const userRef = doc(db, COLLECTIONS.USERS, memoryData.authorId);
            await updateDoc(userRef, {
                draftCount: increment(1)
            });
        }

        console.log("✅ Memory created:", memoryRef.id);
        return memoryRef.id;
    } catch (error) {
        console.error("Error creating memory:", error);
        throw error;
    }
};

export const publishMemory = async (memoryId: string, familyIds: string[]): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.MEMORIES, memoryId);
        const memorySnap = await getDoc(memoryRef);

        if (!memorySnap.exists()) throw new Error("Memory not found");
        const data = memorySnap.data();

        await updateDoc(memoryRef, {
            status: 'published',
            familyIds: familyIds,
            publishedAt: new Date().toISOString(),
            updatedAt: Timestamp.now()
        });

        if (data.status === 'draft') {
            const userRef = doc(db, COLLECTIONS.USERS, data.authorId);
            await updateDoc(userRef, {
                draftCount: increment(-1)
            });
        }

        console.log("✅ Memory published:", memoryId);
    } catch (error) {
        console.error("Error publishing memory:", error);
        throw error;
    }
};

export const deleteMemory = async (memoryId: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.MEMORIES, memoryId);
        const memorySnap = await getDoc(memoryRef);

        if (memorySnap.exists()) {
            const data = memorySnap.data();
            if (data.status === 'draft') {
                const userRef = doc(db, COLLECTIONS.USERS, data.authorId);
                await updateDoc(userRef, {
                    draftCount: increment(-1)
                });
            }
        }

        await deleteDoc(memoryRef);
        console.log("✅ Memory deleted:", memoryId);
    } catch (error) {
        console.error("Error deleting memory:", error);
        throw error;
    }
};

export const likeMemory = async (memoryId: string, userId: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.MEMORIES, memoryId);
        await updateDoc(memoryRef, {
            likes: arrayUnion(userId)
        });
    } catch (error) {
        console.error("Error liking memory:", error);
        throw error;
    }
};

export const unlikeMemory = async (memoryId: string, userId: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.MEMORIES, memoryId);
        await updateDoc(memoryRef, {
            likes: arrayRemove(userId)
        });
    } catch (error) {
        console.error("Error unliking memory:", error);
        throw error;
    }
};

export const addCommentToMemory = async (memoryId: string, userId: string, userName: string, text: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.MEMORIES, memoryId);
        const comment: Comment = {
            id: Math.random().toString(36).substring(2, 9),
            userId,
            userName,
            text,
            timestamp: new Date().toISOString()
        };
        await updateDoc(memoryRef, {
            comments: arrayUnion(comment)
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};

// ============================================
// QUESTION OPERATIONS
// ============================================

export const createQuestion = async (questionData: Omit<Question, 'id'>): Promise<string> => {
    try {
        const questionRef = await addDoc(collection(db, COLLECTIONS.QUESTIONS), {
            ...clean(questionData),
            upvotes: [],
            createdAt: new Date().toISOString(),
            serverCreatedAt: Timestamp.now()
        });
        console.log("✅ Question created:", questionRef.id);
        return questionRef.id;
    } catch (error) {
        console.error("Error creating question:", error);
        throw error;
    }
};

export const upvoteQuestion = async (questionId: string, userId: string): Promise<void> => {
    try {
        const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
        const questionSnap = await getDoc(questionRef);

        if (questionSnap.exists()) {
            const upvotes = questionSnap.data().upvotes || [];
            if (upvotes.includes(userId)) {
                await updateDoc(questionRef, {
                    upvotes: arrayRemove(userId)
                });
            } else {
                await updateDoc(questionRef, {
                    upvotes: arrayUnion(userId)
                });
            }
        }
    } catch (error) {
        console.error("Error toggling upvote:", error);
        throw error;
    }
};

export const getFamilyQuestions = async (familyId: string): Promise<Question[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.QUESTIONS),
            where("familyId", "==", familyId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
    } catch (error) {
        console.error("Error getting family questions:", error);
        throw error;
    }
};

// ============================================
// NOTIFICATION OPERATIONS
// ============================================

export const createNotification = async (notifData: Omit<Notification, 'id'>): Promise<string> => {
    try {
        const notifRef = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
            ...clean(notifData),
            read: false,
            createdAt: new Date().toISOString(),
            serverCreatedAt: Timestamp.now()
        });
        return notifRef.id;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};

export const markNotificationRead = async (notifId: string): Promise<void> => {
    try {
        await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId), {
            read: true
        });
    } catch (error) {
        console.error("Error marking notification read:", error);
        throw error;
    }
};

// ============================================
// ACTIVITY & INVITE OPERATIONS
// ============================================

export const createActivityLog = async (activityData: Omit<ActivityLog, 'id'>): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, COLLECTIONS.ACTIVITY), {
            ...clean(activityData),
            createdAt: new Date().toISOString(),
            serverCreatedAt: Timestamp.now()
        });
        return ref.id;
    } catch (error) {
        console.error("Error creating activity log:", error);
        throw error;
    }
};

export const createInvitation = async (inviteData: Omit<FamilyInvitation, 'id' | 'status' | 'createdAt'>): Promise<string> => {
    try {
        const ref = await addDoc(collection(db, COLLECTIONS.INVITES), {
            ...clean(inviteData),
            status: 'pending',
            createdAt: new Date().toISOString(),
            serverCreatedAt: Timestamp.now()
        });
        return ref.id;
    } catch (error) {
        console.error("Error creating invitation:", error);
        throw error;
    }
};

// ============================================
// REAL-TIME LISTENERS
// ============================================

export const listenToFamilyMemories = (
    familyId: string,
    callback: (memories: Memory[]) => void
): (() => void) => {
    const q = query(
        collection(db, COLLECTIONS.MEMORIES),
        where("familyIds", "array-contains", familyId),
        where("status", "==", "published"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const memories: Memory[] = [];
        snapshot.forEach((doc) => {
            memories.push({ id: doc.id, ...doc.data() } as Memory);
        });
        callback(memories);
    });
};

export const listenToUserDrafts = (
    userId: string,
    callback: (drafts: Memory[]) => void
): (() => void) => {
    const q = query(
        collection(db, COLLECTIONS.MEMORIES),
        where("authorId", "==", userId),
        where("status", "==", "draft"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const drafts: Memory[] = [];
        snapshot.forEach((doc) => {
            drafts.push({ id: doc.id, ...doc.data() } as Memory);
        });
        callback(drafts);
    });
};

export const listenToFamilyQuestions = (
    familyId: string,
    callback: (questions: Question[]) => void
): (() => void) => {
    const q = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where("familyId", "==", familyId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const questions: Question[] = [];
        snapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() } as Question);
        });
        callback(questions);
    });
};

export const listenToUserNotifications = (
    userId: string,
    callback: (notifications: Notification[]) => void
): (() => void) => {
    const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications: Notification[] = [];
        snapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() } as Notification);
        });
        callback(notifications);
    });
};

export const listenToUser = (
    userId: string,
    callback: (user: User | null) => void
): (() => void) => {
    const userRef = doc(db, COLLECTIONS.USERS, userId);

    return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ ...snapshot.data() } as User);
        } else {
            callback(null);
        }
    });
};

export const listenToUserFamilies = (
    userId: string,
    callback: (families: Family[]) => void
): (() => void) => {
    const q = query(
        collection(db, COLLECTIONS.FAMILIES),
        where("members", "array-contains", userId)
    );

    return onSnapshot(q, (snapshot) => {
        const families: Family[] = [];
        snapshot.forEach((doc) => {
            families.push({ id: doc.id, ...doc.data() } as Family);
        });
        callback(families);
    });
};
