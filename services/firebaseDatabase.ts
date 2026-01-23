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
    increment,
    collectionGroup,
    writeBatch
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { User, Family, Memory, Question, Notification, FamilyDocument, Comment, FamilyInvitation, ActivityLog } from "../types";

// Collection names
export const COLLECTIONS = {
    USERS: "users",
    FAMILIES: "families",
    MEMORIES: "memories", // Sub-collection under user
    QUESTIONS: "questions", // Sub-collection under user
    DOCUMENTS: "documents", // Sub-collection under user
    NOTIFICATIONS: "notifications",
    INVITES: "invites",
    SECURE_INVITES: "secure_invites",
    JOIN_REQUESTS: "join_requests",
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

        const currentDoc = await getDoc(userRef);
        const currentData = currentDoc.exists() ? currentDoc.data() : {};

        await setDoc(userRef, {
            ...currentData,
            ...clean(userData),
            uid: userId,
            familyIds: userData.familyIds || currentData.familyIds || [],
            draftCount: userData.draftCount ?? currentData.draftCount ?? 0,
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

export const getUsers = async (userIds: string[]): Promise<User[]> => {
    try {
        if (!userIds || userIds.length === 0) return [];

        // Firestore 'in' query supports up to 30 items
        const chunks: string[][] = [];
        for (let i = 0; i < userIds.length; i += 30) {
            chunks.push(userIds.slice(i, i + 30));
        }

        const users: User[] = [];
        for (const chunk of chunks) {
            const q = query(collection(db, COLLECTIONS.USERS), where("uid", "in", chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                users.push({ ...doc.data() } as User);
            });
        }
        return users;
    } catch (error) {
        console.error("Error getting users:", error);
        return [];
    }
};

// ============================================
// FAMILY OPERATIONS
// ============================================

export const createFamily = async (familyData: Omit<Family, 'id' | 'createdAt'>): Promise<string> => {
    try {
        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const familyRef = doc(collection(db, COLLECTIONS.FAMILIES));

        const batch = writeBatch(db);

        batch.set(familyRef, {
            ...clean(familyData),
            admins: familyData.admins || [familyData.createdBy],
            inviteCode: familyData.inviteCode || inviteCode,
            createdAt: new Date().toISOString(),
            updatedAt: Timestamp.now()
        });

        // Also add familyId to the creator's user document
        const creatorRef = doc(db, COLLECTIONS.USERS, familyData.createdBy);
        batch.update(creatorRef, {
            familyIds: arrayUnion(familyRef.id),
            defaultFamilyId: familyRef.id,
            updatedAt: Timestamp.now()
        });

        await batch.commit();
        console.log("✅ Family created with invite code:", inviteCode);
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

export const addFamilyAdmin = async (familyId: string, userId: string): Promise<void> => {
    try {
        const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
        await updateDoc(familyRef, {
            admins: arrayUnion(userId),
            updatedAt: Timestamp.now()
        });
        console.log(`✅ User ${userId} promoted to admin in family ${familyId}`);
    } catch (error) {
        console.error("Error adding family admin:", error);
        throw error;
    }
};

export const joinFamilyByCode = async (inviteCode: string, userId: string, userName: string, userAvatar?: string): Promise<string> => {
    try {
        const q = query(collection(db, COLLECTIONS.FAMILIES), where("inviteCode", "==", inviteCode.toUpperCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error("Invalid invite code");
        }

        const familyDoc = snapshot.docs[0];
        const familyId = familyDoc.id;
        const familyData = familyDoc.data() as Family;

        if (familyData.members.includes(userId)) {
            throw new Error("Already a member");
        }

        // Check if a request already exists
        const reqQ = query(
            collection(db, COLLECTIONS.JOIN_REQUESTS),
            where("familyId", "==", familyId),
            where("userId", "==", userId),
            where("status", "==", "pending")
        );
        const reqSnapshot = await getDocs(reqQ);
        if (!reqSnapshot.empty) {
            throw new Error("Request already pending");
        }

        await addDoc(collection(db, COLLECTIONS.JOIN_REQUESTS), {
            familyId,
            familyName: familyData.familyName,
            userId,
            userName,
            userAvatar: userAvatar || "",
            status: "pending",
            createdAt: Timestamp.now()
        });

        return familyId;
    } catch (error: any) {
        console.error("Error requesting to join family:", error);
        throw error;
    }
};

export const listenToJoinRequests = (familyIds: string[], callback: (requests: any[]) => void) => {
    if (familyIds.length === 0) {
        callback([]);
        return () => { };
    }

    const q = query(
        collection(db, COLLECTIONS.JOIN_REQUESTS),
        where("familyId", "in", familyIds),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(requests);
    }, (error) => {
        console.error("Error in listenToJoinRequests:", error);
    });
};

export const handleJoinRequest = async (requestId: string, action: 'accept' | 'declined'): Promise<void> => {
    try {
        const reqRef = doc(db, COLLECTIONS.JOIN_REQUESTS, requestId);
        const reqSnap = await getDoc(reqRef);

        if (!reqSnap.exists()) return;

        const data = reqSnap.data();
        const batch = writeBatch(db);

        if (action === 'accept') {
            const familyRef = doc(db, COLLECTIONS.FAMILIES, data.familyId);
            const userRef = doc(db, COLLECTIONS.USERS, data.userId);

            batch.update(familyRef, {
                members: arrayUnion(data.userId),
                updatedAt: Timestamp.now()
            });

            batch.update(userRef, {
                familyIds: arrayUnion(data.familyId),
                defaultFamilyId: data.familyId,
                updatedAt: Timestamp.now()
            });
        }

        batch.update(reqRef, {
            status: action,
            updatedAt: Timestamp.now()
        });

        await batch.commit();
        console.log(`✅ Join request ${action}ed atomically`);
    } catch (error) {
        console.error("Error handling join request:", error);
        throw error;
    }
};

/**
 * Syncs the user's familyIds field with the actual families they are a member of.
 * This is crucial for fixing permission issues where an Admin added a user to a family,
 * but couldn't update the user's document due to security rules.
 */
export const syncUserFamilyIds = async (userId: string): Promise<void> => {
    try {
        // 1. Get all families where user is a member (Source of Truth)
        const q = query(collection(db, COLLECTIONS.FAMILIES), where("members", "array-contains", userId));
        const snapshot = await getDocs(q);
        const realFamilyIds = snapshot.docs.map(doc => doc.id);

        // 2. Get current user doc
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const currentFamilyIds: string[] = userData.familyIds || [];

        // 3. Compare and Update if needed
        const isMismatch =
            realFamilyIds.length !== currentFamilyIds.length ||
            !realFamilyIds.every(id => currentFamilyIds.includes(id));

        if (isMismatch) {
            console.log("🔄 Syncing user familyIds...", { current: currentFamilyIds, real: realFamilyIds });
            await updateDoc(userRef, {
                familyIds: realFamilyIds,
                updatedAt: Timestamp.now()
            });
            console.log("✅ User familyIds synced successfully.");
        }
    } catch (error) {
        console.error("Error syncing user familyIds:", error);
        // Don't throw, just log. This is a background maintenance task.
    }
};

export const getUserFamilies = async (userId: string): Promise<Family[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.FAMILIES),
            where("members", "array-contains", userId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data() as Family;
            if (!data.inviteCode) {
                return {
                    id: docSnap.id,
                    ...data,
                    inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase()
                };
            }
            return { id: docSnap.id, ...data };
        });
    } catch (error) {
        console.error("Error getting user families:", error);
        throw error;
    }
};

export const addFamilyMember = async (familyId: string, userId: string): Promise<void> => {
    try {
        const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
        const userRef = doc(db, COLLECTIONS.USERS, userId);

        const batch = writeBatch(db);

        batch.update(familyRef, {
            members: arrayUnion(userId),
            updatedAt: Timestamp.now()
        });

        batch.update(userRef, {
            familyIds: arrayUnion(familyId),
            defaultFamilyId: familyId,
            updatedAt: Timestamp.now()
        });

        await batch.commit();
        console.log("✅ Member added to family atomically");
    } catch (error) {
        console.error("Error adding family member:", error);
        throw error;
    }
};

export const leaveFamily = async (familyId: string, userId: string): Promise<void> => {
    try {
        const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
        const userRef = doc(db, COLLECTIONS.USERS, userId);

        const batch = writeBatch(db);

        batch.update(familyRef, {
            members: arrayRemove(userId),
            admins: arrayRemove(userId),
            updatedAt: Timestamp.now()
        });

        batch.update(userRef, {
            familyIds: arrayRemove(familyId),
            updatedAt: Timestamp.now()
        });

        await batch.commit();
        console.log("✅ User left family atomically");
    } catch (error) {
        console.error("Error leaving family:", error);
        throw error;
    }
};

export const generateSecureInvite = async (familyId: string, createdBy: string): Promise<string> => {
    try {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const inviteRef = await addDoc(collection(db, COLLECTIONS.SECURE_INVITES), {
            familyId,
            token,
            createdBy,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
            usedBy: [],
            maxUses: 10 // Optional limit
        });

        console.log("✅ Secure invite generated:", inviteRef.id);
        return token;
    } catch (error) {
        console.error("Error generating secure invite:", error);
        throw error;
    }
};

export const validateAndJoinFamily = async (familyId: string, token: string, userId: string): Promise<void> => {
    try {
        // 1. Check if token exists and belongs to family
        const q = query(
            collection(db, COLLECTIONS.SECURE_INVITES),
            where("familyId", "==", familyId),
            where("token", "==", token)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error("Invalid invite");
        }

        const inviteDoc = snapshot.docs[0];
        const inviteData = inviteDoc.data();

        // 2. Check expiry
        if (new Date(inviteData.expiresAt) < new Date()) {
            throw new Error("Invite expired");
        }

        // 3. Check if already a member
        const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
        const familySnap = await getDoc(familyRef);
        if (!familySnap.exists()) throw new Error("Family not found");

        const familyData = familySnap.data() as Family;
        if (familyData.members.includes(userId)) {
            throw new Error("Already a member");
        }

        // 4. Perform Join
        await addFamilyMember(familyId, userId);

        // 5. Mark token as used by this user (optional tracking)
        await updateDoc(inviteDoc.ref, {
            usedBy: arrayUnion(userId)
        });

        console.log("✅ User joined family via secure token");
    } catch (error: any) {
        console.error("Error validating secure invite:", error);
        throw error;
    }
};

// ============================================
// MEMORY OPERATIONS (Stored under /users/{uid}/memories)
// ============================================

export const createMemory = async (memoryData: Omit<Memory, 'id'>): Promise<string> => {
    try {
        const now = new Date().toISOString();
        const userMemoriesRef = collection(db, COLLECTIONS.USERS, memoryData.authorId, COLLECTIONS.MEMORIES);

        const memoryRef = await addDoc(userMemoriesRef, {
            ...clean(memoryData),
            familyId: (memoryData as any).familyId || (memoryData.familyIds && memoryData.familyIds.length > 0 ? memoryData.familyIds[0] : ""),
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

        console.log("✅ Memory created in user sub-collection:", memoryRef.id);
        return memoryRef.id;
    } catch (error) {
        console.error("Error creating memory:", error);
        throw error;
    }
};

export const publishMemory = async (memoryId: string, authorId: string, familyIds: string[]): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.USERS, authorId, COLLECTIONS.MEMORIES, memoryId);
        const memorySnap = await getDoc(memoryRef);

        if (!memorySnap.exists()) throw new Error("Memory not found");
        const data = memorySnap.data();

        await updateDoc(memoryRef, {
            status: 'published',
            familyIds: familyIds,
            familyId: (familyIds && familyIds.length > 0) ? familyIds[0] : "",
            publishedAt: new Date().toISOString(),
            updatedAt: Timestamp.now()
        });

        if (data.status === 'draft') {
            const userRef = doc(db, COLLECTIONS.USERS, authorId);
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

export const deleteMemory = async (memoryId: string, authorId: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.USERS, authorId, COLLECTIONS.MEMORIES, memoryId);
        const memorySnap = await getDoc(memoryRef);

        if (memorySnap.exists()) {
            const data = memorySnap.data();
            if (data.status === 'draft') {
                const userRef = doc(db, COLLECTIONS.USERS, authorId);
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

export const likeMemory = async (memoryId: string, authorId: string, userId: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.USERS, authorId, COLLECTIONS.MEMORIES, memoryId);
        await updateDoc(memoryRef, {
            likes: arrayUnion(userId)
        });
    } catch (error) {
        console.error("Error liking memory:", error);
        throw error;
    }
};

export const unlikeMemory = async (memoryId: string, authorId: string, userId: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.USERS, authorId, COLLECTIONS.MEMORIES, memoryId);
        await updateDoc(memoryRef, {
            likes: arrayRemove(userId)
        });
    } catch (error) {
        console.error("Error unliking memory:", error);
        throw error;
    }
};

export const addCommentToMemory = async (memoryId: string, authorId: string, userId: string, userName: string, text: string): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.USERS, authorId, COLLECTIONS.MEMORIES, memoryId);
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
// QUESTION OPERATIONS (Stored under /users/{uid}/questions)
// ============================================

export const createQuestion = async (questionData: Omit<Question, 'id'>): Promise<string> => {
    console.log("🛠️ Attempting to create question for user:", questionData.askedBy, "in family:", questionData.familyId);
    try {
        const userQuestionsRef = collection(db, COLLECTIONS.USERS, questionData.askedBy, COLLECTIONS.QUESTIONS);
        const questionRef = await addDoc(userQuestionsRef, {
            ...clean(questionData),
            upvotes: [],
            createdAt: new Date().toISOString(),
            serverCreatedAt: Timestamp.now()
        });
        console.log("✅ Question created successfully. ID:", questionRef.id);
        return questionRef.id;
    } catch (error) {
        console.error("❌ Error creating question in Firestore:", error);
        throw error;
    }
};

export const upvoteQuestion = async (questionId: string, askedBy: string, userId: string): Promise<void> => {
    try {
        const questionRef = doc(db, COLLECTIONS.USERS, askedBy, COLLECTIONS.QUESTIONS, questionId);
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

export const archiveQuestion = async (userId: string, questionId: string): Promise<void> => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            archivedQuestionIds: arrayUnion(questionId),
            updatedAt: Timestamp.now()
        });
        console.log(`✅ Question ${questionId} archived for user ${userId}`);
    } catch (error) {
        console.error("Error archiving question:", error);
        throw error;
    }
};

// ================= ==========================
// DOCUMENT OPERATIONS (Stored under /users/{uid}/documents)
// ============================================

export const createDocument = async (docData: Omit<FamilyDocument, 'id'>): Promise<string> => {
    try {
        const userDocsRef = collection(db, COLLECTIONS.USERS, docData.uploaderId, COLLECTIONS.DOCUMENTS);
        const docRef = await addDoc(userDocsRef, {
            ...clean(docData),
            timestamp: new Date().toISOString(),
            serverCreatedAt: Timestamp.now()
        });
        console.log("✅ Document created in user sub-collection:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating document:", error);
        throw error;
    }
};

export const deleteDocument = async (docId: string, uploaderId: string): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTIONS.USERS, uploaderId, COLLECTIONS.DOCUMENTS, docId);
        await deleteDoc(docRef);
        console.log("✅ Document deleted:", docId);
    } catch (error) {
        console.error("Error deleting document:", error);
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
// REAL-TIME LISTENERS (Using collectionGroup for global family feed)
// ============================================

export const listenToFamilyMemories = (
    familyId: string,
    callback: (memories: Memory[]) => void
): (() => void) => {
    const q = query(
        collectionGroup(db, COLLECTIONS.MEMORIES),
        where("familyIds", "array-contains", familyId),
        where("status", "==", "published"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const memories: Memory[] = [];
        snapshot.forEach((doc) => {
            memories.push({ id: doc.id, ...doc.data() } as Memory);
        });
        console.log(`✅ [listenToFamilyMemories] Loaded ${memories.length} memories for family ${familyId}`);
        callback(memories);
    }, (error) => {
        console.error("❌ Error in listenToFamilyMemories:", error);
        if (error.code === 'failed-precondition') {
            console.error("🔥 MISSING INDEX ERROR: You need to create a Firestore Index for the 'memories' collection group query to work.");
        }
        if (error.code === 'permission-denied') {
            console.error("🚫 PERMISSION DENIED: Make sure your Firestore rules allow reading from the 'memories' collection group.");
        }
    });
};

export const listenToUserDrafts = (
    userId: string,
    callback: (drafts: Memory[]) => void
): (() => void) => {
    const userMemoriesRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEMORIES);
    const q = query(
        userMemoriesRef,
        where("status", "==", "draft"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const drafts: Memory[] = [];
        snapshot.forEach((doc) => {
            drafts.push({ id: doc.id, ...doc.data() } as Memory);
        });
        callback(drafts);
    }, (error) => {
        console.error("Error in listenToUserDrafts:", error);
    });
};

export const listenToFamilyQuestions = (
    familyId: string,
    callback: (questions: Question[]) => void
): (() => void) => {
    const q = query(
        collectionGroup(db, COLLECTIONS.QUESTIONS),
        where("familyId", "==", familyId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const questions: Question[] = [];
        snapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() } as Question);
        });
        callback(questions);
    }, (error) => {
        console.error("Error in listenToFamilyQuestions:", error);
    });
};

export const listenToFamilyDocuments = (
    familyId: string,
    callback: (docs: FamilyDocument[]) => void
): (() => void) => {
    const q = query(
        collectionGroup(db, COLLECTIONS.DOCUMENTS),
        where("familyId", "==", familyId),
        orderBy("timestamp", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const docs: FamilyDocument[] = [];
        snapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() } as FamilyDocument);
        });
        callback(docs);
    }, (error) => {
        console.error("Error in listenToFamilyDocuments:", error);
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
    }, (error) => {
        console.error("Error in listenToUserNotifications:", error);
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
    }, (error) => {
        console.error("Error in listenToUser:", error);
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
        snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Family;
            let family = { id: docSnap.id, ...data };

            // Self-healing: Ensure invite code exists
            if (!family.inviteCode) {
                const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                family.inviteCode = newCode;

                // If the user listening is an admin, update the doc in background
                if (data.admins.includes(userId)) {
                    updateDoc(docSnap.ref, {
                        inviteCode: newCode,
                        updatedAt: Timestamp.now()
                    }).catch(err => console.error("Error updating legacy family code:", err));
                }
            }

            families.push(family);
        });
        callback(families);
    }, (error) => {
        console.error("Error in listenToUserFamilies:", error);
    });
};
