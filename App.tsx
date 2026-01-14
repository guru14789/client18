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
  Users,
  Database
} from 'lucide-react';
import DeveloperTools from './components/DeveloperTools';
import {
  auth,
  onAuthStateChange,
  getUser,
  listenToUser,
  listenToUserFamilies,
  listenToFamilyMemories,
  listenToFamilyQuestions,
  upvoteQuestion,
  createQuestion,
  createOrUpdateUser,
  createMemory,
  deleteMemory,
  likeMemory,
  unlikeMemory,
  addCommentToMemory,
  createFamily,
  addFamilyMember,
  listenToUserDrafts
} from './services/firebaseServices';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";
import { db } from './services/firebaseConfig';
import { useAuth } from './contexts/AuthContext';

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
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [recordMode, setRecordMode] = useState<'answer' | 'question'>('answer');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [qPrompts, setQPrompts] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Theme and Language State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('inai_theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('inai_language');
    return (saved as Language) || Language.TAMIL;
  });

  // 1. Auth Context consumption
  const { currentUser: user, loading, logout, refreshProfile } = useAuth();

  // 2. Family & Profile Sync
  useEffect(() => {
    if (!user?.uid) {
      setFamilies([]);
      setActiveFamilyId(null);
      return;
    }

    console.log("App: Syncing for user UID:", user.uid);

    // Initial sync of metadata from user profile
    if (user.defaultFamilyId && user.defaultFamilyId !== activeFamilyId) {
      console.log("App: Syncing activeFamilyId from profile:", user.defaultFamilyId);
      setActiveFamilyId(user.defaultFamilyId);
    }

    if (user.preferredLanguage && user.preferredLanguage !== language) {
      setLanguage(user.preferredLanguage);
    }

    if (user.settings?.theme && user.settings.theme !== theme) {
      setTheme(user.settings.theme);
    }

    // Listens to families where user is a member
    const unsubFamilies = listenToUserFamilies(user.uid, (userFamilies) => {
      console.log("App: Loaded user families:", userFamilies.length);
      setFamilies(userFamilies);

      // If we don't have an active family set yet, try to pick one
      if (userFamilies.length > 0 && !activeFamilyId) {
        const preferredId = user.defaultFamilyId;
        if (preferredId && userFamilies.some(f => f.id === preferredId)) {
          setActiveFamilyId(preferredId);
        } else {
          setActiveFamilyId(userFamilies[0].id);
        }
      } else if (userFamilies.length === 0) {
        setActiveFamilyId(null);
      }
    });

    return () => unsubFamilies();
  }, [user?.uid, user?.defaultFamilyId, user?.preferredLanguage, user?.settings?.theme]);

  // 3. Family Content Sync
  useEffect(() => {
    setMemories([]);
    setQPrompts([]);
    setDocuments([]);

    if (!activeFamilyId) return;

    const unsubMemories = listenToFamilyMemories(activeFamilyId, (familyMemories) => {
      setMemories(familyMemories);
    });

    const unsubQuestions = listenToFamilyQuestions(activeFamilyId, (familyQuestions) => {
      setQPrompts(familyQuestions);
    });

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

  // 4. Drafts Sync
  useEffect(() => {
    if (!user?.uid) {
      setDrafts([]);
      return;
    }
    const unsubDrafts = listenToUserDrafts(user.uid, (userDrafts) => {
      setDrafts(userDrafts);
    });
    return () => unsubDrafts();
  }, [user?.uid]);

  const switchFamily = async (familyId: string) => {
    setActiveFamilyId(familyId);
    if (user) {
      await createOrUpdateUser(user.uid, { defaultFamilyId: familyId });
    }
  };

  const handleAddQuestion = async (q: Question) => {
    const { id, ...data } = q;
    await createQuestion(data);
  };

  const handleAddFamily = async (familyName: string, defaultLanguage: Language) => {
    if (!user) return;
    try {
      const familyId = await createFamily({
        familyName,
        defaultLanguage,
        createdBy: user.uid,
        members: [user.uid],
        admins: [user.uid]
      });

      const updatedFamilyIds = [...(user.familyIds || []), familyId];
      await createOrUpdateUser(user.uid, {
        familyIds: updatedFamilyIds,
        defaultFamilyId: familyId
      });

      setActiveFamilyId(familyId);
    } catch (err) {
      console.error("Error creating family:", err);
    }
  };

  const toggleUpvote = async (questionId: string) => {
    if (!user) return;
    await upvoteQuestion(questionId, user.uid);
  };

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('inai_language', lang);
    if (user) {
      await createOrUpdateUser(user.uid, { preferredLanguage: lang });
    }
  };

  const handleRecordingComplete = async (newMemory: Memory) => {
    try {
      if (recordMode === 'question') {
        const questionData: Omit<Question, 'id'> = {
          askedBy: user?.uid || '',
          askedByName: user?.displayName || '',
          familyId: activeFamilyId || '',
          type: 'video',
          text: {
            english: 'Recorded Video Question', // Default placeholder
            translated: 'பதியப்பட்ட வீடியோ கேள்வி'
          },
          videoUrl: newMemory.videoUrl,
          upvotes: [],
          createdAt: new Date().toISOString()
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
      await createOrUpdateUser(user.uid, {
        settings: {
          ...user.settings,
          theme: newTheme
        }
      });
    }
  };

  const handleLogin = useCallback(async (phoneNumber: string, name: string, firebaseUid: string) => {
    if (name) {
      await createOrUpdateUser(firebaseUid, { displayName: name });
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    setView('login');
  };

  // View Logic
  useEffect(() => {
    if (loading) return;

    if (user) {
      if (['splash', 'login', 'onboarding'].includes(view)) {
        setView('home');
      }
    } else {
      if (!['splash', 'onboarding', 'login'].includes(view)) {
        setView('login');
      } else if (view === 'splash') {
        setView('login');
      }
    }
  }, [loading, user, view]);

  // Theme Application Effect
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
          {view === 'home' && user && (
            <>
              <Dashboard user={user} families={families} prompts={qPrompts} onNavigate={setView} onRecord={(q) => { if (q) setActiveQuestion(q); setRecordMode('answer'); setView('record'); }} onAddFamily={handleAddFamily} currentLanguage={language} activeFamilyId={activeFamilyId} onSwitchFamily={switchFamily} onToggleUpvote={toggleUpvote} />
              {showDebug && <DeveloperTools user={user} onComplete={() => setShowDebug(false)} />}
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="mx-auto mt-4 mb-32 p-3 bg-secondary/10 dark:bg-white/5 rounded-full text-slate dark:text-support/20 hover:text-primary transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <Database size={14} />
                {showDebug ? "Hide Debug" : "Show Seed Tool"}
              </button>
            </>
          )}
          {view === 'feed' && user && <Feed memories={memories} user={user} families={families} currentLanguage={language} />}
          {view === 'questions' && user && <Questions user={user} families={families} questions={qPrompts} onAnswer={(q) => { setActiveQuestion(q); setRecordMode('answer'); setView('record'); }} onRecordQuestion={() => { setActiveQuestion(null); setRecordMode('question'); setView('record'); }} onToggleUpvote={toggleUpvote} onAddQuestion={handleAddQuestion} activeFamilyId={activeFamilyId} currentLanguage={language} />}
          {view === 'documents' && user && <Documents user={user} families={families} documents={documents} setDocuments={setDocuments} currentLanguage={language} />}
          {view === 'record' && user && <RecordMemory user={user} question={activeQuestion} mode={recordMode} onCancel={() => { setView('home'); setActiveQuestion(null); }} onComplete={handleRecordingComplete} families={families} activeFamilyId={activeFamilyId} currentLanguage={language} />}
          {view === 'drafts' && <Drafts drafts={drafts} onPublish={(m) => handleRecordingComplete({ ...m, status: 'published' })} onDelete={(id) => deleteMemory(id)} currentLanguage={language} onBack={() => setView('home')} />}
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
