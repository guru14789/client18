
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { getUser, createOrUpdateUser, getUserFamilies } from '../services/firebaseDatabase';
import { User, Family } from '../types';

interface AuthContextType {
    currentUser: User | null; // Our app's user model
    firebaseUser: FirebaseUser | null; // Raw Firebase user
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

    const fetchUserProfile = async (uid: string) => {
        try {
            // 1. Try to get existing profile
            const profile = await getUser(uid);

            if (profile) {
                console.log("AuthContext: Profile loaded for", uid);
                setCurrentUser(profile);
            } else {
                console.log("AuthContext: No profile found, initializing new user...");
                // 2. Recover families if orphan
                let existingFamilies: Family[] = [];
                try {
                    existingFamilies = await getUserFamilies(uid);
                } catch (e) {
                    console.warn("AuthContext: Failed to check existing families", e);
                }

                // 3. Create fresh user
                const freshUser: User = {
                    id: uid,
                    name: auth.currentUser?.displayName || 'Family Member',
                    phoneNumber: auth.currentUser?.phoneNumber || '',
                    avatarUrl: auth.currentUser?.photoURL || `https://i.pravatar.cc/150?u=${uid}`,
                    role: 'user',
                    families: existingFamilies.map(f => f.id),
                    activeFamilyId: existingFamilies.length > 0 ? existingFamilies[0].id : undefined
                } as User;

                await createOrUpdateUser(uid, freshUser);
                setCurrentUser(freshUser);
            }
        } catch (err) {
            console.error("AuthContext: Error fetching profile", err);
            // Don't kill the app, but user state might be partial
        }
    };

    useEffect(() => {
        console.log("AuthContext: Setting up onAuthStateChanged listener");
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);
            if (user) {
                console.log("AuthContext: User authenticated", user.uid);
                await fetchUserProfile(user.uid);
            } else {
                console.log("AuthContext: User signed out");
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setFirebaseUser(null);
    };

    const refreshProfile = async () => {
        if (firebaseUser) {
            await fetchUserProfile(firebaseUser.uid);
        }
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
