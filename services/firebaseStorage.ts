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
import { storage, auth } from "./firebaseConfig";

/**
 * Upload progress callback type
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Helper to get current user ID or throw
 */
const getUserId = (): string => {
    const user = auth.currentUser;
    if (!user) throw new Error("User must be authenticated to upload files");
    return user.uid;
};

/**
 * Upload a video memory
 */
export const uploadMemoryVideo = async (
    file: File | Blob,
    memoryId: string, // this is the videoId
    onProgress?: UploadProgressCallback
): Promise<string> => {
    try {
        const userId = getUserId();
        // Path Requirement: /users/{uid}/videos/{videoId}.mp4
        const storageRef = ref(storage, `users/${userId}/videos/${memoryId}.mp4`);

        return await uploadFile(storageRef, file, onProgress);
    } catch (error) {
        console.error("Error uploading memory video:", error);
        throw error;
    }
};

/**
 * Upload a memory thumbnail
 */
export const uploadMemoryThumbnail = async (
    file: File | Blob,
    memoryId: string
): Promise<string> => {
    try {
        const userId = getUserId();
        // Path logic follows the video but in thumbnails folder
        const storageRef = ref(storage, `users/${userId}/thumbnails/${memoryId}.jpg`);

        return await uploadFile(storageRef, file);
    } catch (error) {
        console.error("Error uploading memory thumbnail:", error);
        throw error;
    }
};

/**
 * Upload a question video
 */
export const uploadQuestionVideo = async (
    file: File | Blob,
    questionId: string,
    onProgress?: UploadProgressCallback
): Promise<string> => {
    try {
        const userId = getUserId();
        // Stored under user's videos folder
        const storageRef = ref(storage, `users/${userId}/videos/question_${questionId}.mp4`);

        return await uploadFile(storageRef, file, onProgress);
    } catch (error) {
        console.error("Error uploading question video:", error);
        throw error;
    }
};

/**
 * Upload document
 */
export const uploadDocument = async (
    file: File,
    docId: string,
    onProgress?: (progress: number) => void
): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const extension = file.name.split('.').pop() || 'pdf';
    // Stored under user's documents folder
    const filePath = `users/${user.uid}/documents/${docId}.${extension}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            },
            (error) => reject(error),
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (
    file: File | Blob,
    userId: string
): Promise<string> => {
    try {
        // Path Requirement: /users/{uid}/profile/profile.jpg
        const storageRef = ref(storage, `users/${userId}/profile/profile.jpg`);

        return await uploadFile(storageRef, file);
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        throw error;
    }
};

/**
 * Generic upload helper
 */
const uploadFile = async (ref: StorageReference, file: File | Blob, onProgress?: UploadProgressCallback): Promise<string> => {
    if (onProgress) {
        const uploadTask = uploadBytesResumable(ref, file);
        return new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(progress);
                },
                (error) => reject(error),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log("✅ File uploaded successfully:", downloadURL);
                    resolve(downloadURL);
                }
            );
        });
    } else {
        const snapshot = await uploadBytes(ref, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("✅ File uploaded successfully:", downloadURL);
        return downloadURL;
    }
};

/**
 * Delete a file from storage
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
 * List files in folder
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
 */
export const blobUrlToFile = async (blobUrl: string, fileName: string): Promise<File> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
};

/**
 * Get storage reference
 */
export const getStorageRef = (path: string): StorageReference => {
    return ref(storage, path);
};
