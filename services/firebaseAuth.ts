// Firebase Authentication Service
import {
    signInWithPhoneNumber,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    RecaptchaVerifier,
    ConfirmationResult,
    User as FirebaseUser,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";
import { auth } from "./firebaseConfig";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

/**
 * Setup reCAPTCHA verifier for phone authentication
 * @param containerId - ID of the container element for reCAPTCHA
 * @returns RecaptchaVerifier instance
 */
export const setupRecaptcha = (containerId: string = 'recaptcha-container'): RecaptchaVerifier => {
    // Clear any existing reCAPTCHA
    const existingRecaptcha = (window as any).recaptchaVerifier;
    if (existingRecaptcha) {
        existingRecaptcha.clear();
    }

    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
            console.log("reCAPTCHA solved");
        },
        'expired-callback': () => {
            console.log("reCAPTCHA expired");
        }
    });

    (window as any).recaptchaVerifier = recaptchaVerifier;
    return recaptchaVerifier;
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Full phone number with country code (e.g., +919876543210)
 * @param recaptchaVerifier - RecaptchaVerifier instance
 * @returns ConfirmationResult for OTP verification
 */
export const sendPhoneOTP = async (
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        console.log("✅ OTP sent successfully to", phoneNumber);
        return confirmationResult;
    } catch (error: any) {
        console.error("Error sending OTP:", error);
        throw new Error(error.message || "Failed to send OTP");
    }
};

/**
 * Verify OTP and complete phone authentication
 * @param confirmationResult - ConfirmationResult from sendPhoneOTP
 * @param otp - 6-digit OTP code
 * @returns Firebase User
 */
export const verifyPhoneOTP = async (
    confirmationResult: ConfirmationResult,
    otp: string
): Promise<FirebaseUser> => {
    try {
        const result = await confirmationResult.confirm(otp);
        console.log("✅ Phone authentication successful");
        return result.user;
    } catch (error: any) {
        console.error("Error verifying OTP:", error);
        throw new Error("Invalid OTP. Please try again.");
    }
};

/**
 * Sign in with Google (Popup method)
 * @returns Firebase User
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log("✅ Google sign-in successful");
        return result.user;
    } catch (error: any) {
        console.error("Error with Google sign-in:", error);

        // Handle specific errors
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error("Sign-in cancelled");
        } else if (error.code === 'auth/popup-blocked') {
            throw new Error("Popup blocked. Please allow popups for this site.");
        }

        throw new Error(error.message || "Google sign-in failed");
    }
};

/**
 * Sign in with Google (Redirect method - for mobile)
 */
export const signInWithGoogleRedirect = async (): Promise<void> => {
    try {
        await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
        console.error("Error with Google redirect:", error);
        throw new Error(error.message || "Google sign-in failed");
    }
};

/**
 * Get redirect result after Google sign-in redirect
 * @returns Firebase User or null
 */
export const getGoogleRedirectResult = async (): Promise<FirebaseUser | null> => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            console.log("✅ Google sign-in redirect successful");
            return result.user;
        }
        return null;
    } catch (error: any) {
        console.error("Error getting redirect result:", error);
        throw new Error(error.message || "Failed to complete sign-in");
    }
};

/**
 * Update user profile
 * @param displayName - User's display name
 * @param photoURL - User's photo URL (optional)
 */
export const updateUserProfile = async (
    displayName: string,
    photoURL?: string
): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("No user is currently signed in");
    }

    try {
        await updateProfile(user, {
            displayName,
            ...(photoURL && { photoURL })
        });
        console.log("✅ User profile updated");
    } catch (error: any) {
        console.error("Error updating profile:", error);
        throw new Error(error.message || "Failed to update profile");
    }
};

/**
 * Sign out current user
 */
export const signOutUser = async (): Promise<void> => {
    try {
        await signOut(auth);
        console.log("✅ User signed out successfully");
    } catch (error: any) {
        console.error("Error signing out:", error);
        throw new Error(error.message || "Failed to sign out");
    }
};

/**
 * Listen to authentication state changes
 * @param callback - Callback function to handle auth state changes
 * @returns Unsubscribe function
 */
export const onAuthStateChange = (
    callback: (user: FirebaseUser | null) => void
): (() => void) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Get current authenticated user
 * @returns Current Firebase User or null
 */
export const getCurrentUser = (): FirebaseUser | null => {
    return auth.currentUser;
};
