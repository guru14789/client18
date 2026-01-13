import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  MessageCircle,
  Plus,
  Settings,
  Archive,
  LogOut,
  FileText,
  MapPin,
  User as UserIcon,
  LayoutGrid,
  Users
} from 'lucide-react';
import { serverTimestamp } from "firebase/firestore";
import {
  auth,
  onAuthStateChange,
  getUser,
  listenToUser,
  listenToUserFamilies,
  listenToFamilyMemories,
  listenToFamilyQuestions,
  updateUserActiveFamily,
  createQuestion,
  updateQuestionUpvotes,
  createOrUpdateUser,
  createMemory,
  createFamily,
  addFamilyMember,
  deleteMemory,
  getFamilyDocuments // Fallback for docs if no listener yet
} from './services/firebaseServices';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { db } from './services/firebaseConfig';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Feed from './components/Feed';
import Questions from './components/Questions';
import RecordMemory from './components/RecordMemory';
import Drafts from './components/Drafts';
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';
import Profile from './components/Profile';
import Documents from './components/Documents';
import { AppState, User, Memory, Family, Language, Question, FamilyDocument } from './types';
import { t } from './services/i18n';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [recordMode, setRecordMode] = useState<'answer' | 'question'>('answer');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [qPrompts, setQPrompts] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);

  // Theme and Language State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('inai_theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('inai_language');
    return (saved as Language) || Language.TAMIL;
  });

  // 1. Auth & Profile Sync
  useEffect(() => {
    console.log("App: Auth Sync effect running...");
    const unsubAuth = onAuthStateChange((firebaseUser) => {
      console.log("App: Auth state changed. UID:", firebaseUser?.uid);
      if (!firebaseUser) {
        // Log out happened - clear state
        console.log("App: Clearing state on logout");
        setUser(null);
        setFamilies([]);
        setMemories([]);
        setQPrompts([]);
        setDocuments([]);
        setActiveFamilyId(null);
        setLoading(false);
        return;
      }

      // 2. Immediate transition: Set a basic user state from Auth data
      // but only if we don't have a better one already
      setUser(prev => {
        if (prev?.id === firebaseUser.uid) return prev;
        return {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Family Member',
          phoneNumber: firebaseUser.phoneNumber || firebaseUser.email || '',
          avatarUrl: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
          role: 'user',
          preferredLanguage: language
        } as User;
      });
      setLoading(false);
    });

    return () => unsubAuth();
  }, [language]); // Run on mount or when language changes

  // 1b. Profile Progression (Firestore)
  useEffect(() => {
    if (!user?.id) return;

    console.log("App: Listening to profile for:", user.id);
    const unsubUser = listenToUser(user.id, (userData) => {
      console.log("App: Profile update received:", userData ? "Success" : "Not found");
      if (userData) {
        setUser(prev => {
          if (!prev) return userData;
          // Deep merge profile data
          if (JSON.stringify(prev) === JSON.stringify(userData)) return prev;
          return { ...prev, ...userData };
        });

        if (userData.preferredLanguage && userData.preferredLanguage !== language) {
          setLanguage(userData.preferredLanguage);
          localStorage.setItem('inai_language', userData.preferredLanguage);
        }

        if (userData.theme && userData.theme !== theme) {
          setTheme(userData.theme);
          localStorage.setItem('inai_theme', userData.theme);
        }

        // Priority restoration of active family
        if (userData.activeFamilyId) {
          console.log("App: Restoring activeFamilyId from profile:", userData.activeFamilyId);
          setActiveFamilyId(userData.activeFamilyId);
        }
      }
    });

    return () => unsubUser();
  }, [user?.id]);

  // 2. Family Sync
  useEffect(() => {
    if (!user?.id) return;

    console.log("App: Listening to families for:", user.id);
    const unsubFamilies = listenToUserFamilies(user.id, (userFamilies) => {
      console.log("App: Families received:", userFamilies.length);
      setFamilies(userFamilies);

      // Auto-select family if none or invalid
      if (userFamilies.length > 0) {
        setActiveFamilyId(prev => {
          // If we have a valid selection already, keep it
          if (prev && userFamilies.some(f => f.id === prev)) return prev;

          // Try user's preferred family first (from profile)
          const preferredId = user?.activeFamilyId;
          if (preferredId && userFamilies.some(f => f.id === preferredId)) {
            return preferredId;
          }

          // Default to the first one in the list
          return userFamilies[0].id;
        });
      } else {
        setActiveFamilyId(null);
      }
    });

    return () => unsubFamilies();
  }, [user?.id, user?.activeFamilyId]);

  // 3. Family Content Sync (Memories, Questions, Docs)
  useEffect(() => {
    if (!activeFamilyId) return;

    // Memories Listener
    const unsubMemories = listenToFamilyMemories(activeFamilyId, (familyMemories) => {
      setMemories(familyMemories.filter(m => !m.isDraft));
      // Re-fetch drafts for the user if needed, or filter here
    }, true); // Include drafts for filtering

    // We also need user-specific drafts regardless of family? 
    // Usually drafts are scoped to user.

    // Questions Listener
    const unsubQuestions = listenToFamilyQuestions(activeFamilyId, (familyQuestions) => {
      setQPrompts(familyQuestions);
    });

    // Documents Listener (Add to service later, for now manual)
    const qDocs = query(
      collection(db, "documents"),
      where("familyId", "==", activeFamilyId),
      orderBy("timestamp", "desc")
    );
    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      const ds = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FamilyDocument[];
      setDocuments(ds);
    });

    return () => {
      unsubMemories();
      unsubQuestions();
      unsubDocs();
    };
  }, [activeFamilyId]);

  // 4. Drafts Sync (User specific)
  useEffect(() => {
    if (!user) return;
    const qDrafts = query(
      collection(db, "memories"),
      where("responderId", "==", user.id),
      where("isDraft", "==", true),
      orderBy("timestamp", "desc")
    );
    const unsubDrafts = onSnapshot(qDrafts, (snapshot) => {
      const d = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Memory[];
      setDrafts(d);
    });
    return () => unsubDrafts();
  }, [user]);

  const switchFamily = async (familyId: string) => {
    setActiveFamilyId(familyId);
    if (user) {
      await updateUserActiveFamily(user.id, familyId);
    }
  };

  const handleAddQuestion = async (q: Question) => {
    const { id, ...data } = q;
    await createQuestion(data);
  };

  const handleAddFamily = async (name: string, motherTongue: Language) => {
    if (!user) return;
    try {
      const familyId = await createFamily({
        name,
        motherTongue,
        admins: [user.id],
        members: [user.id],
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        isApproved: true
      });

      // Update user document to include this family
      const updatedFamilies = [...(user.families || []), familyId];
      await createOrUpdateUser(user.id, {
        families: updatedFamilies,
        activeFamilyId: familyId // Automatically switch to the new family
      });

      setActiveFamilyId(familyId);
    } catch (err) {
      console.error("Error creating family:", err);
      alert("Failed to create family circle.");
    }
  };

  const toggleUpvote = async (questionId: string) => {
    const q = qPrompts.find(p => p.id === questionId);
    if (!q) return;
    const newUpvotes = q.hasUpvoted ? q.upvotes - 1 : q.upvotes + 1;
    await updateQuestionUpvotes(questionId, newUpvotes);
  };

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('inai_language', lang);
    if (user) {
      await createOrUpdateUser(user.id, { preferredLanguage: lang });
    }
  };

  // View logic
  useEffect(() => {
    if (loading) return;
    console.log("App: View logic check. view:", view, "user:", !!user);
    if (view === 'splash') {
      setView(user ? 'home' : 'login');
    } else if (user && view === 'login') {
      console.log("App: Logged in user in login view, moving to home");
      setView('home');
    } else if (!user && !['splash', 'onboarding', 'login'].includes(view)) {
      console.log("App: No user in app view, enforcing login");
      setView('login');
    }
  }, [loading, user, view]);

  const handleLogin = useCallback(async (phoneNumber: string, name: string, firebaseUid: string) => {
    console.log("App: handleLogin triggered for:", firebaseUid);
    try {
      // 1. Immediate UI Transition with base data
      // Note: We don't initialize 'families' here to avoid wiping it in case of race conditions
      const partialUser: Partial<User> = {
        id: firebaseUid,
        name: name || 'Family Member',
        phoneNumber: phoneNumber || '',
        avatarUrl: `https://i.pravatar.cc/150?u=${firebaseUid}`,
        role: 'user',
        preferredLanguage: language
      };

      setUser(prev => ({ ...prev, ...partialUser } as User));
      setView('home');

      // 2. Background Sync (Ensures profile exists or restores it)
      (async () => {
        try {
          const profile = await getUser(firebaseUid);
          if (profile) {
            console.log("App: Existing profile restored during handleLogin");
            setUser(profile);
            if (profile.activeFamilyId) setActiveFamilyId(profile.activeFamilyId);
          } else {
            console.log("App: Initializing brand NEW profile during handleLogin");
            // For a brand new profile, we provide empty arrays/defaults
            const freshUser = { ...partialUser, families: [], activeFamilyId: null };
            await createOrUpdateUser(firebaseUid, freshUser as User);
          }
        } catch (err) {
          console.warn("App: Background sync warning in handleLogin:", err);
        }
      })();
    } catch (err) {
      console.error("App: handleLogin fatal error:", err);
      setView('home');
    }
  }, [language]);

  const handleRecordingComplete = async (newMemory: Memory) => {
    try {
      if (recordMode === 'question') {
        const questionData: Omit<Question, 'id'> = {
          askerId: user?.id || '',
          askerName: user?.name || '',
          text: t('questions.video_question_default', language),
          translation: t('record.mode.question', language),
          language,
          upvotes: 0,
          isVideoQuestion: true,
          videoUrl: newMemory.videoUrl,
          familyId: newMemory.familyId
        };
        await createQuestion(questionData);
        setView('questions');
      } else {
        const { id, ...data } = newMemory;
        await createMemory(data);
        setView('feed');
      }
      setActiveQuestion(null);
    } catch (err) {
      console.error("Record complete error:", err);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('inai_theme', newTheme);
    if (user) {
      await createOrUpdateUser(user.id, { theme: newTheme });
    }
  };

  const handleLogout = async () => {
    console.log("App: Logging out...");
    try {
      await auth.signOut();
      // Auth listener handles most state clearing, but we force it here too
      setUser(null);
      setFamilies([]);
      setMemories([]);
      setQPrompts([]);
      setDrafts([]);
      setDocuments([]);
      setActiveFamilyId(null);
      setView('login');
      // Clear local storage for preferences only if you want a complete reset
      // keeping them usually provides a better UX for the next guest
    } catch (err) {
      console.error("Logout error:", err);
      setView('login');
    }
  };

  // Theme
  useEffect(() => {
    localStorage.setItem('inai_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'light') root.classList.remove('dark');
    else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [theme]);

  if (view === 'splash') return <SplashScreen currentLanguage={language} />;

  const hideFrame = ['splash', 'onboarding', 'login', 'record', 'nameEntry'].includes(view);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-warmwhite dark:bg-charcoal text-charcoal dark:text-warmwhite shadow-xl relative overflow-hidden transition-colors duration-300">
      {!hideFrame && <div className="safe-area-top bg-warmwhite dark:bg-charcoal shrink-0 z-[100] w-full transition-colors" />}

      {drafts.length > 0 && !hideFrame && (
        <div onClick={() => setView('drafts')} className="bg-accent text-white px-6 py-3 flex items-center justify-between cursor-pointer shrink-0 z-10 animate-in slide-in-from-top duration-300 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white/20 rounded-lg"><Archive size={14} /></div>
            <span className="text-[11px] font-bold tracking-tight">{t('login.draft_alert', language).replace('{count}', drafts.length.toString())}</span>
          </div>
          <span className="text-[9px] uppercase font-black tracking-widest border border-white/40 px-2 py-0.5 rounded-md">{t('login.view', language)}</span>
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
        <div className="flex-1 view-transition">
          {view === 'onboarding' && <Onboarding onComplete={() => { localStorage.setItem('inai_onboarding_done', 'true'); setView('login'); }} currentLanguage={language} />}
          {view === 'login' && <Login onLogin={handleLogin} currentLanguage={language} />}
          {view === 'home' && user && <Dashboard user={user} families={families} prompts={qPrompts} onNavigate={setView} onRecord={(q) => { if (q) setActiveQuestion(q); setRecordMode('answer'); setView('record'); }} onAddFamily={handleAddFamily} currentLanguage={language} activeFamilyId={activeFamilyId} onSwitchFamily={switchFamily} onToggleUpvote={toggleUpvote} />}
          {view === 'feed' && user && <Feed memories={memories} user={user} families={families} currentLanguage={language} />}
          {view === 'questions' && user && <Questions user={user} families={families} questions={qPrompts} onAnswer={(q) => { setActiveQuestion(q); setRecordMode('answer'); setView('record'); }} onRecordQuestion={() => { setActiveQuestion(null); setRecordMode('question'); setView('record'); }} onToggleUpvote={toggleUpvote} onAddQuestion={handleAddQuestion} activeFamilyId={activeFamilyId} currentLanguage={language} />}
          {view === 'documents' && user && <Documents user={user} families={families} documents={documents} setDocuments={setDocuments} currentLanguage={language} />}
          {view === 'record' && user && <RecordMemory user={user} question={activeQuestion} mode={recordMode} onCancel={() => { setView('home'); setActiveQuestion(null); }} onComplete={handleRecordingComplete} families={families} activeFamilyId={activeFamilyId} currentLanguage={language} />}
          {view === 'drafts' && <Drafts drafts={drafts} onPublish={(m) => handleRecordingComplete({ ...m, isDraft: false })} onDelete={(id) => deleteMemory(id)} currentLanguage={language} onBack={() => setView('home')} />}
          {view === 'profile' && user && <Profile user={user} families={families} onLogout={handleLogout} currentTheme={theme} onThemeChange={handleThemeChange} currentLanguage={language} onLanguageChange={handleLanguageChange} onNavigate={setView} />}
        </div>
      </main>

      {!hideFrame && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] safe-area-bottom bg-transparent pointer-events-none">
          <div className="mx-auto max-w-md px-6 pb-6 pt-12 flex justify-center items-end relative">
            <nav className="bg-charcoal dark:bg-charcoal/90 backdrop-blur-md rounded-[36px] h-[68px] w-full flex items-center justify-around px-2 shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/5 relative pointer-events-auto">
              <button onClick={() => setView('home')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'home' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <Home size={20} strokeWidth={view === 'home' ? 3 : 2} />
                <span className="text-[8px] font-bold mt-1 uppercase tracking-tighter">{t('nav.home', language)}</span>
                {view === 'home' && <div className="absolute bottom-[2px] w-5 h-[2px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
              </button>
              <button onClick={() => setView('feed')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'feed' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <LayoutGrid size={20} strokeWidth={view === 'feed' ? 3 : 2} />
                <span className="text-[8px] font-bold mt-1 uppercase tracking-tighter">{t('nav.feed', language)}</span>
                {view === 'feed' && <div className="absolute bottom-[2px] w-5 h-[2px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
              </button>
              <div className="w-16"></div>
              <button onClick={() => setView('questions')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'questions' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <MessageCircle size={20} strokeWidth={view === 'questions' ? 3 : 2} />
                <span className="text-[8px] font-bold mt-1 uppercase tracking-tighter">{t('nav.ask', language)}</span>
                {view === 'questions' && <div className="absolute bottom-[2px] w-5 h-[2px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
              </button>
              <button onClick={() => setView('profile')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'profile' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <UserIcon size={20} strokeWidth={view === 'profile' ? 3 : 2} />
                <span className="text-[8px] font-bold mt-1 uppercase tracking-tighter">{t('nav.profile', language)}</span>
                {view === 'profile' && <div className="absolute bottom-[2px] w-5 h-[2px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
              </button>
              <button onClick={() => setView('record')} className="absolute left-1/2 -translate-x-1/2 -top-[28px] w-[56px] h-[56px] bg-primary text-white rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(47,93,138,0.5)] hover:brightness-110 active:scale-95 transition-all z-[70] ring-4 ring-white dark:ring-charcoal border border-white/10">
                <Plus size={30} strokeWidth={3} />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
