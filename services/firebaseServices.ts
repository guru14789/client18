// Firebase Services - Main Export File
// This file provides a centralized export for all Firebase services

// Core Firebase Configuration
export { default as app, auth, db, storage, analytics, messaging } from './firebaseConfig';

// Authentication Services
export {
    setupRecaptcha,
    sendPhoneOTP,
    verifyPhoneOTP,
    signInWithGoogle,
    signInWithGoogleRedirect,
    getGoogleRedirectResult,
    updateUserProfile,
    signOutUser,
    onAuthStateChange,
    getCurrentUser
} from './firebaseAuth';

// Database (Firestore) Services
export {
    COLLECTIONS,
    // User operations
    createOrUpdateUser,
    getUser,
    updateUserActiveFamily,
    // Family operations
    createFamily,
    getFamily,
    getUserFamilies,
    addFamilyMember,
    // Memory operations
    createMemory,
    updateMemory,
    getFamilyMemories,
    getUserDrafts,
    deleteMemory,
    likeMemory,
    unlikeMemory,
    addCommentToMemory,
    // Question operations
    createQuestion,
    getFamilyQuestions,
    updateQuestionUpvotes,
    // Document operations
    createDocument,
    getFamilyDocuments,
    deleteDocument,
    // Real-time listeners
    listenToFamilyMemories,
    listenToFamilyQuestions,
    listenToUser,
    listenToUserFamilies,
    listenToFamilyDocuments
} from './firebaseDatabase';

// Storage Services
export {
    STORAGE_PATHS,
    uploadMemoryVideo,
    uploadQuestionVideo,
    uploadDocument,
    uploadProfilePicture,
    deleteFile,
    deleteFileByPath,
    listFilesInFolder,
    blobUrlToFile,
    getStorageRef
} from './firebaseStorage';

// Cloud Messaging (Notifications) Services
export {
    requestNotificationPermission,
    saveFCMToken,
    onForegroundMessage,
    createNotification,
    notifyFamilyMembers,
    markNotificationAsRead,
    getUserNotifications,
    initializeFCM
} from './firebaseMessaging';

// Re-export types for convenience
export type { UploadProgressCallback } from './firebaseStorage';
