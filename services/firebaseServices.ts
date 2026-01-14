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
    // Family operations
    createFamily,
    getFamily,
    addFamilyMember,
    // Memory operations
    createMemory,
    publishMemory,
    deleteMemory,
    likeMemory,
    unlikeMemory,
    addCommentToMemory,
    // Question operations
    createQuestion,
    upvoteQuestion,
    // Notification operations
    createNotification,
    markNotificationRead,
    // Real-time listeners
    listenToFamilyMemories,
    listenToUserDrafts,
    listenToFamilyQuestions,
    listenToUserNotifications,
    listenToUser,
    listenToUserFamilies
} from './firebaseDatabase';

// Storage Services
export {
    STORAGE_PATHS,
    uploadMemoryVideo,
    uploadMemoryThumbnail,
    uploadQuestionVideo,
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
    notifyFamilyMembers,
    initializeFCM
} from './firebaseMessaging';

// Re-export types for convenience
export type { UploadProgressCallback } from './firebaseStorage';
