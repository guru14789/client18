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
    DocumentData,
    QueryConstraint,
    CollectionReference,
    DocumentReference
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { User, Family, Memory, Question, FamilyDocument } from "../types";

// Collection names
export const COLLECTIONS = {
    USERS: "users",
    FAMILIES: "families",
    MEMORIES: "memories",
    QUESTIONS: "questions",
    DOCUMENTS: "documents",
    NOTIFICATIONS: "notifications"
};

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Create or update user document
 */
export const createOrUpdateUser = async (userId: string, userData: Partial<User>): Promise<void> => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await setDoc(userRef, {
            ...userData,
            updatedAt: Timestamp.now()
        }, { merge: true });
        console.log("✅ User created/updated:", userId);
    } catch (error) {
        console.error("Error creating/updating user:", error);
        throw error;
    }
};

/**
 * Get user by ID
 */
export const getUser = async (userId: string): Promise<User | null> => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() } as User;
        }
        return null;
    } catch (error) {
        console.error("Error getting user:", error);
        throw error;
    }
};

/**
 * Update user's active family
 */
export const updateUserActiveFamily = async (userId: string, familyId: string): Promise<void> => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            activeFamilyId: familyId,
            updatedAt: Timestamp.now()
        });
        console.log("✅ User active family updated");
    } catch (error) {
        console.error("Error updating active family:", error);
        throw error;
    }
};

// ============================================
// FAMILY OPERATIONS
// ============================================

/**
 * Create a new family
 */
export const createFamily = async (familyData: Omit<Family, 'id'>): Promise<string> => {
    try {
        const familyRef = await addDoc(collection(db, COLLECTIONS.FAMILIES), {
            ...familyData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        console.log("✅ Family created:", familyRef.id);
        return familyRef.id;
    } catch (error) {
        console.error("Error creating family:", error);
        throw error;
    }
};

/**
 * Get family by ID
 */
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

/**
 * Get all families for a user
 */
export const getUserFamilies = async (userId: string): Promise<Family[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.FAMILIES),
            where("members", "array-contains", userId)
        );

        const querySnapshot = await getDocs(q);
        const families: Family[] = [];

        querySnapshot.forEach((doc) => {
            families.push({ id: doc.id, ...doc.data() } as Family);
        });

        return families;
    } catch (error) {
        console.error("Error getting user families:", error);
        throw error;
    }
};

/**
 * Add member to family
 */
export const addFamilyMember = async (familyId: string, userId: string): Promise<void> => {
    try {
        const familyRef = doc(db, COLLECTIONS.FAMILIES, familyId);
        const familySnap = await getDoc(familyRef);

        if (familySnap.exists()) {
            const currentMembers = familySnap.data().members || [];
            if (!currentMembers.includes(userId)) {
                await updateDoc(familyRef, {
                    members: [...currentMembers, userId],
                    updatedAt: Timestamp.now()
                });
                console.log("✅ Member added to family");
            }
        }
    } catch (error) {
        console.error("Error adding family member:", error);
        throw error;
    }
};

// ============================================
// MEMORY OPERATIONS
// ============================================

/**
 * Create a new memory
 */
export const createMemory = async (memoryData: Omit<Memory, 'id'>): Promise<string> => {
    try {
        const memoryRef = await addDoc(collection(db, COLLECTIONS.MEMORIES), {
            ...memoryData,
            timestamp: memoryData.timestamp || Timestamp.now().toDate().toISOString(),
            createdAt: Timestamp.now()
        });
        console.log("✅ Memory created:", memoryRef.id);
        return memoryRef.id;
    } catch (error) {
        console.error("Error creating memory:", error);
        throw error;
    }
};

/**
 * Update memory (e.g., publish draft)
 */
export const updateMemory = async (memoryId: string, updates: Partial<Memory>): Promise<void> => {
    try {
        const memoryRef = doc(db, COLLECTIONS.MEMORIES, memoryId);
        await updateDoc(memoryRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
        console.log("✅ Memory updated:", memoryId);
    } catch (error) {
        console.error("Error updating memory:", error);
        throw error;
    }
};

/**
 * Get memories for a family
 */
export const getFamilyMemories = async (
    familyId: string,
    includeDrafts: boolean = false
): Promise<Memory[]> => {
    try {
        const constraints: QueryConstraint[] = [
            where("familyId", "==", familyId),
            orderBy("timestamp", "desc")
        ];

        if (!includeDrafts) {
            constraints.push(where("isDraft", "==", false));
        }

        const q = query(collection(db, COLLECTIONS.MEMORIES), ...constraints);
        const querySnapshot = await getDocs(q);

        const memories: Memory[] = [];
        querySnapshot.forEach((doc) => {
            memories.push({ id: doc.id, ...doc.data() } as Memory);
        });

        return memories;
    } catch (error) {
        console.error("Error getting family memories:", error);
        throw error;
    }
};

/**
 * Get user's draft memories
 */
export const getUserDrafts = async (userId: string): Promise<Memory[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.MEMORIES),
            where("responderId", "==", userId),
            where("isDraft", "==", true),
            orderBy("timestamp", "desc")
        );

        const querySnapshot = await getDocs(q);
        const drafts: Memory[] = [];

        querySnapshot.forEach((doc) => {
            drafts.push({ id: doc.id, ...doc.data() } as Memory);
        });

        return drafts;
    } catch (error) {
        console.error("Error getting user drafts:", error);
        throw error;
    }
};

/**
 * Delete a memory
 */
export const deleteMemory = async (memoryId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTIONS.MEMORIES, memoryId));
        console.log("✅ Memory deleted:", memoryId);
    } catch (error) {
        console.error("Error deleting memory:", error);
        throw error;
    }
};

// ============================================
// QUESTION OPERATIONS
// ============================================

/**
 * Create a new question
 */
export const createQuestion = async (questionData: Omit<Question, 'id'>): Promise<string> => {
    try {
        const questionRef = await addDoc(collection(db, COLLECTIONS.QUESTIONS), {
            ...questionData,
            createdAt: Timestamp.now()
        });
        console.log("✅ Question created:", questionRef.id);
        return questionRef.id;
    } catch (error) {
        console.error("Error creating question:", error);
        throw error;
    }
};

/**
 * Get questions for a family
 */
export const getFamilyQuestions = async (familyId: string): Promise<Question[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.QUESTIONS),
            where("familyId", "==", familyId),
            orderBy("upvotes", "desc")
        );

        const querySnapshot = await getDocs(q);
        const questions: Question[] = [];

        querySnapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() } as Question);
        });

        return questions;
    } catch (error) {
        console.error("Error getting family questions:", error);
        throw error;
    }
};

/**
 * Update question upvotes
 */
export const updateQuestionUpvotes = async (
    questionId: string,
    upvotes: number
): Promise<void> => {
    try {
        const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
        await updateDoc(questionRef, {
            upvotes,
            updatedAt: Timestamp.now()
        });
        console.log("✅ Question upvotes updated");
    } catch (error) {
        console.error("Error updating question upvotes:", error);
        throw error;
    }
};

// ============================================
// DOCUMENT OPERATIONS
// ============================================

/**
 * Create a new document record
 */
export const createDocument = async (
    documentData: Omit<FamilyDocument, 'id'>
): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
            ...documentData,
            timestamp: documentData.timestamp || Timestamp.now().toDate().toISOString(),
            createdAt: Timestamp.now()
        });
        console.log("✅ Document record created:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating document:", error);
        throw error;
    }
};

/**
 * Get documents for a family
 */
export const getFamilyDocuments = async (familyId: string): Promise<FamilyDocument[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DOCUMENTS),
            where("familyId", "==", familyId),
            orderBy("timestamp", "desc")
        );

        const querySnapshot = await getDocs(q);
        const documents: FamilyDocument[] = [];

        querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() } as FamilyDocument);
        });

        return documents;
    } catch (error) {
        console.error("Error getting family documents:", error);
        throw error;
    }
};

/**
 * Delete a document record
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, documentId));
        console.log("✅ Document deleted:", documentId);
    } catch (error) {
        console.error("Error deleting document:", error);
        throw error;
    }
};

// ============================================
// REAL-TIME LISTENERS
// ============================================

/**
 * Listen to family memories in real-time
 */
export const listenToFamilyMemories = (
    familyId: string,
    callback: (memories: Memory[]) => void,
    includeDrafts: boolean = false
): (() => void) => {
    const constraints: QueryConstraint[] = [
        where("familyId", "==", familyId),
        orderBy("timestamp", "desc")
    ];

    if (!includeDrafts) {
        constraints.push(where("isDraft", "==", false));
    }

    const q = query(collection(db, COLLECTIONS.MEMORIES), ...constraints);

    return onSnapshot(q, (snapshot) => {
        const memories: Memory[] = [];
        snapshot.forEach((doc) => {
            memories.push({ id: doc.id, ...doc.data() } as Memory);
        });
        callback(memories);
    });
};

/**
 * Listen to family questions in real-time
 */
export const listenToFamilyQuestions = (
    familyId: string,
    callback: (questions: Question[]) => void
): (() => void) => {
    const q = query(
        collection(db, COLLECTIONS.QUESTIONS),
        where("familyId", "==", familyId),
        orderBy("upvotes", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const questions: Question[] = [];
        snapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() } as Question);
        });
        callback(questions);
    });
};

/**
 * Listen to user data in real-time
 */
export const listenToUser = (
    userId: string,
    callback: (user: User | null) => void
): (() => void) => {
    const userRef = doc(db, COLLECTIONS.USERS, userId);

    return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as User);
        } else {
            callback(null);
        }
    });
};
