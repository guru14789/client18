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
    getUsers,
    // Family operations
    createFamily,
    getFamily,
    addFamilyAdmin,
    addFamilyMember,
    joinFamilyByCode,
    leaveFamily,
    generateSecureInvite,
    validateAndJoinFamily,
    // Memory operations
    createMemory,
    publishMemory,
    deleteMemory,
    likeMemory,
    unlikeMemory,
    getMemoryById,
    markMemoryAsPublic,
    addCommentToMemory,
    // Question operations
    createQuestion,
    upvoteQuestion,
    archiveQuestion,
    // Document operations
    createDocument,
    deleteDocument,
    // Notification operations
    createNotification,
    markNotificationRead,
    // Real-time listeners
    listenToFamilyMemories,
    listenToUserDrafts,
    listenToFamilyQuestions,
    listenToFamilyDocuments,
    listenToUserNotifications,
    listenToUser,
    listenToUserFamilies,
    listenToJoinRequests,
    handleJoinRequest,
    syncUserFamilyIds
} from './firebaseDatabase';

// Storage Services
export {
    uploadMemoryVideo,
    uploadMemoryThumbnail,
    uploadQuestionVideo,
    uploadProfilePicture,
    deleteFile,
    deleteFileByPath,
    listFilesInFolder,
    blobUrlToFile,
    getStorageRef,
    uploadDocument
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
