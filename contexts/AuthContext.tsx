
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { getUser, createOrUpdateUser, getUserFamilies, listenToUser } from '../services/firebaseDatabase';
import { User, Family } from '../types';

interface AuthContextType {
    currentUser: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let userUnsubscribe: (() => void) | null = null;

        const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);

            // Clean up previous user listener if exists
            if (userUnsubscribe) {
                userUnsubscribe();
                userUnsubscribe = null;
            }

            if (user) {
                console.log("AuthContext: User authenticated", user.uid);

                // Set up real-time listener for user profile
                userUnsubscribe = listenToUser(user.uid, async (profile) => {
                    if (profile) {
                        setCurrentUser(profile);
                        setLoading(false);
                    } else {
                        // Profile doesn't exist yet, create it
                        console.log("AuthContext: No profile found, initializing new user...");

                        try {
                            // Recover families if orphan
                            let existingFamilies: Family[] = [];
                            try {
                                existingFamilies = await getUserFamilies(user.uid);
                            } catch (e) {
                                console.warn("Failed to check existing families", e);
                            }

                            const freshUser: User = {
                                id: user.uid,
                                name: user.displayName || 'Family Member',
                                phoneNumber: user.phoneNumber || '',
                                avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                                role: 'user',
                                families: existingFamilies.map(f => f.id),
                                activeFamilyId: existingFamilies.length > 0 ? existingFamilies[0].id : undefined
                            } as User;

                            await createOrUpdateUser(user.uid, freshUser);
                            // The listener will catch the update and set state
                        } catch (err) {
                            console.error("Error creating profile:", err);
                        }
                    }
                });
            } else {
                console.log("AuthContext: User signed out");
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (userUnsubscribe) userUnsubscribe();
        };
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setFirebaseUser(null);
    };

    const refreshProfile = async () => {
        // No-op manually, as listener handles it, but kept for interface compatibility
        console.log("Profile refresh requested (handled by listener)");
    };

    const value = {
        currentUser,
        firebaseUser,
        loading,
        logout,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
