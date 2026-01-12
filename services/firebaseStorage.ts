// Firebase Storage Service
import {
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    UploadTask,
    UploadTaskSnapshot,
    StorageReference
} from "firebase/storage";
import { storage } from "./firebaseConfig";

// Storage paths
export const STORAGE_PATHS = {
    MEMORIES: "memories",
    DOCUMENTS: "documents",
    PROFILES: "profiles",
    QUESTIONS: "questions"
};

/**
 * Upload progress callback type
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Upload a video memory
 * @param file - Video file to upload
 * @param familyId - Family ID
 * @param memoryId - Memory ID
 * @param onProgress - Optional progress callback
 * @returns Download URL of uploaded video
 */
export const uploadMemoryVideo = async (
    file: File | Blob,
    familyId: string,
    memoryId: string,
    onProgress?: UploadProgressCallback
): Promise<string> => {
    try {
        const fileName = `${memoryId}_${Date.now()}.webm`;
        const storageRef = ref(storage, `${STORAGE_PATHS.MEMORIES}/${familyId}/${fileName}`);

        if (onProgress) {
            // Upload with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        onProgress(progress);
                    },
                    (error) => {
                        console.error("Error uploading video:", error);
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log("✅ Video uploaded successfully:", downloadURL);
                        resolve(downloadURL);
                    }
                );
            });
        } else {
            // Simple upload without progress
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log("✅ Video uploaded successfully:", downloadURL);
            return downloadURL;
        }
    } catch (error) {
        console.error("Error uploading memory video:", error);
        throw error;
    }
};

/**
 * Upload a question video
 * @param file - Video file to upload
 * @param familyId - Family ID
 * @param questionId - Question ID
 * @param onProgress - Optional progress callback
 * @returns Download URL of uploaded video
 */
export const uploadQuestionVideo = async (
    file: File | Blob,
    familyId: string,
    questionId: string,
    onProgress?: UploadProgressCallback
): Promise<string> => {
    try {
        const fileName = `${questionId}_${Date.now()}.webm`;
        const storageRef = ref(storage, `${STORAGE_PATHS.QUESTIONS}/${familyId}/${fileName}`);

        if (onProgress) {
            const uploadTask = uploadBytesResumable(storageRef, file);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        onProgress(progress);
                    },
                    (error) => {
                        console.error("Error uploading question video:", error);
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log("✅ Question video uploaded successfully:", downloadURL);
                        resolve(downloadURL);
                    }
                );
            });
        } else {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log("✅ Question video uploaded successfully:", downloadURL);
            return downloadURL;
        }
    } catch (error) {
        console.error("Error uploading question video:", error);
        throw error;
    }
};

/**
 * Upload a document (PDF)
 * @param file - PDF file to upload
 * @param familyId - Family ID
 * @param documentId - Document ID
 * @param onProgress - Optional progress callback
 * @returns Download URL of uploaded document
 */
export const uploadDocument = async (
    file: File,
    familyId: string,
    documentId: string,
    onProgress?: UploadProgressCallback
): Promise<string> => {
    try {
        const fileName = `${documentId}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `${STORAGE_PATHS.DOCUMENTS}/${familyId}/${fileName}`);

        if (onProgress) {
            const uploadTask = uploadBytesResumable(storageRef, file);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        onProgress(progress);
                    },
                    (error) => {
                        console.error("Error uploading document:", error);
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log("✅ Document uploaded successfully:", downloadURL);
                        resolve(downloadURL);
                    }
                );
            });
        } else {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log("✅ Document uploaded successfully:", downloadURL);
            return downloadURL;
        }
    } catch (error) {
        console.error("Error uploading document:", error);
        throw error;
    }
};

/**
 * Upload profile picture
 * @param file - Image file to upload
 * @param userId - User ID
 * @returns Download URL of uploaded image
 */
export const uploadProfilePicture = async (
    file: File | Blob,
    userId: string
): Promise<string> => {
    try {
        const fileName = `${userId}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `${STORAGE_PATHS.PROFILES}/${fileName}`);

        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("✅ Profile picture uploaded successfully:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        throw error;
    }
};

/**
 * Delete a file from storage
 * @param fileUrl - Full download URL of the file
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
    try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
        console.log("✅ File deleted successfully");
    } catch (error) {
        console.error("Error deleting file:", error);
        throw error;
    }
};

/**
 * Delete a file by path
 * @param filePath - Storage path of the file
 */
export const deleteFileByPath = async (filePath: string): Promise<void> => {
    try {
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
        console.log("✅ File deleted successfully");
    } catch (error) {
        console.error("Error deleting file:", error);
        throw error;
    }
};

/**
 * Get all files in a folder
 * @param folderPath - Path to the folder
 * @returns Array of download URLs
 */
export const listFilesInFolder = async (folderPath: string): Promise<string[]> => {
    try {
        const folderRef = ref(storage, folderPath);
        const result = await listAll(folderRef);

        const urls = await Promise.all(
            result.items.map(itemRef => getDownloadURL(itemRef))
        );

        return urls;
    } catch (error) {
        console.error("Error listing files:", error);
        throw error;
    }
};

/**
 * Convert Blob URL to File
 * @param blobUrl - Blob URL from MediaRecorder
 * @param fileName - Name for the file
 * @returns File object
 */
export const blobUrlToFile = async (blobUrl: string, fileName: string): Promise<File> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
};

/**
 * Get storage reference
 * @param path - Storage path
 * @returns Storage reference
 */
export const getStorageRef = (path: string): StorageReference => {
    return ref(storage, path);
};
