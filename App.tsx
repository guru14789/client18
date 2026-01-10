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
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, getDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { db, auth } from './services/firebase';
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

const INITIAL_FAMILIES: Family[] = [
  { id: 'f1', name: 'Gomez Family', motherTongue: Language.SPANISH, admins: [], members: [], inviteCode: 'GOMEZ123', isApproved: true },
  { id: 'f2', name: 'Sharma Clan', motherTongue: Language.HINDI, admins: [], members: [], inviteCode: 'SHARMA456', isApproved: true },
];

const App: React.FC = () => {
  const [view, setView] = useState<AppState>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<Family[]>(INITIAL_FAMILIES);
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
    return (saved as Language) || Language.SPANISH;
  });

  // Auth State Listener
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      console.log("App: Auth observer update. Firebase User:", firebaseUser?.uid || "null");

      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            console.log("App: Firestore profile loaded.");
            setUser(userDoc.data() as User);
          } else {
            console.log("App: No Firestore profile. Staying on login for checkUser.");
            setUser(null);
          }
        } else {
          console.log("App: No user logged in.");
          setUser(null);
        }
      } catch (err) {
        console.error("App: Auth observer error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Sync Data with Firestore
  useEffect(() => {
    if (!user || !user.families || user.families.length === 0) return;

    if (!activeFamilyId) {
      setActiveFamilyId(user.activeFamilyId || user.families[0]);
    }

    const currentFamilyId = activeFamilyId || user.activeFamilyId || user.families[0];

    try {
      // Listen for Memories
      const memoriesRef = collection(db, "memories");
      const qMemories = query(
        memoriesRef,
        where("familyId", "==", currentFamilyId),
        orderBy("timestamp", "desc")
      );

      const unsubMemories = onSnapshot(qMemories, (snapshot) => {
        const mems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Memory[];
        setMemories(mems.filter(m => !m.isDraft));
        setDrafts(mems.filter(m => m.isDraft));
      }, (err) => console.error("Memories error:", err));

      // Listen for Documents
      const docsRef = collection(db, "documents");
      const qDocs = query(docsRef, where("familyId", "==", currentFamilyId), orderBy("timestamp", "desc"));
      const unsubDocs = onSnapshot(qDocs, (snapshot) => {
        const dsDetail = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FamilyDocument[];
        setDocuments(dsDetail);
      }, (err) => console.error("Docs error:", err));

      // Listen for Questions
      const questionsRef = collection(db, "questions");
      const qQuestions = query(questionsRef, where("familyId", "==", currentFamilyId));
      const unsubQuestions = onSnapshot(qQuestions, (snapshot) => {
        const qs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Question[];
        setQPrompts(qs);
      }, (err) => console.error("Questions error:", err));

      return () => {
        unsubMemories();
        unsubDocs();
        unsubQuestions();
      };
    } catch (err) {
      console.error("Firestore error:", err);
    }
  }, [user, activeFamilyId]);

  const switchFamily = async (familyId: string) => {
    setActiveFamilyId(familyId);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.id), { ...user, activeFamilyId: familyId }, { merge: true });
        setUser({ ...user, activeFamilyId: familyId });
      } catch (err) {
        console.error("Error updating active family:", err);
      }
    }
  };

  const handleAddQuestion = async (q: Question) => {
    try {
      // Remove the temporary ID generated in the component so Firestore can use its own
      const { id, ...data } = q;
      await addDoc(collection(db, "questions"), data);
    } catch (err) {
      console.error("Error adding question:", err);
    }
  };

  const toggleUpvote = async (questionId: string) => {
    const q = qPrompts.find(p => p.id === questionId);
    if (!q) return;
    try {
      const qRef = doc(db, "questions", questionId);
      const alreadyUpvoted = q.hasUpvoted;
      await updateDoc(qRef, {
        upvotes: alreadyUpvoted ? q.upvotes - 1 : q.upvotes + 1,
        hasUpvoted: !alreadyUpvoted
      });
    } catch (err) {
      console.error("Error toggling upvote:", err);
    }
  };

  // Theme Management
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

  // Initial Boot - Transitions from splash
  useEffect(() => {
    if (view !== 'splash') return;

    // Minimum display time for splash is 1.5s
    const timer = setTimeout(() => {
      if (!loading) {
        if (!localStorage.getItem('inai_onboarding_done')) {
          setView('onboarding');
        } else {
          setView(user ? 'home' : 'login');
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [view, loading, user]);

  // Ensure view changes immediately when loading finishes if we had a long-lived splash
  useEffect(() => {
    if (view === 'splash' && !loading) {
      if (!localStorage.getItem('inai_onboarding_done')) {
        setView('onboarding');
      } else {
        setView(user ? 'home' : 'login');
      }
    }
  }, [loading, view, user]);

  const handleLogin = useCallback(async (phoneNumber: string, name: string, firebaseUid: string) => {
    console.log("App: handleLogin triggered for:", name, firebaseUid);
    const newUser: User = {
      id: firebaseUid,
      name,
      phoneNumber,
      families: ['f1', 'f2'],
      avatarUrl: `https://i.pravatar.cc/150?u=${firebaseUid}`,
      role: 'admin'
    };
    try {
      if (firebaseUid !== 'demo-uid-123') {
        await setDoc(doc(db, "users", firebaseUid), newUser);
      }
      setUser(newUser);
      setView('home');
    } catch (err) {
      console.error("Login error:", err);
    }
  }, []);

  const handleRecordingComplete = async (newMemory: Memory) => {
    try {
      const sanitizedData = JSON.parse(JSON.stringify({
        ...newMemory,
        timestamp: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      }));

      if (recordMode === 'question') {
        const questionData: Question = {
          id: Date.now().toString(),
          askerId: user?.id || '',
          askerName: user?.name || '',
          text: 'Video Question',
          language,
          upvotes: 0,
          isVideoQuestion: true,
          videoUrl: newMemory.videoUrl,
          familyId: newMemory.familyId
        };
        await addDoc(collection(db, "questions"), questionData);
        setView('questions');
      } else {
        await addDoc(collection(db, "memories"), sanitizedData);
        setView('feed');
      }
      setActiveQuestion(null);
    } catch (err) {
      console.error("Record complete error:", err);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setView('login');
  };

  if (view === 'splash') return <SplashScreen />;

  const hideFrame = ['splash', 'onboarding', 'login', 'record', 'nameEntry'].includes(view);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-warmwhite dark:bg-charcoal text-charcoal dark:text-warmwhite shadow-xl relative overflow-hidden transition-colors duration-300">
      {!hideFrame && <div className="safe-area-top bg-warmwhite dark:bg-charcoal shrink-0 z-[100] w-full transition-colors" />}

      {drafts.length > 0 && !hideFrame && (
        <div onClick={() => setView('drafts')} className="bg-accent text-white px-6 py-3 flex items-center justify-between cursor-pointer shrink-0 z-10 animate-in slide-in-from-top duration-300 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white/20 rounded-lg"><Archive size={14} /></div>
            <span className="text-[11px] font-bold tracking-tight">You have {drafts.length} draft memory awaiting review</span>
          </div>
          <span className="text-[9px] uppercase font-black tracking-widest border border-white/40 px-2 py-0.5 rounded-md">View</span>
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
        <div className="flex-1 view-transition">
          {view === 'onboarding' && <Onboarding onComplete={() => { localStorage.setItem('inai_onboarding_done', 'true'); setView('login'); }} />}
          {view === 'login' && <Login onLogin={handleLogin} />}
          {view === 'home' && user && <Dashboard user={user} families={families} prompts={qPrompts} onNavigate={setView} onRecord={(q) => { if (q) setActiveQuestion(q); setRecordMode('answer'); setView('record'); }} onAddFamily={() => { }} currentLanguage={language} activeFamilyId={activeFamilyId} onSwitchFamily={switchFamily} onToggleUpvote={toggleUpvote} />}
          {view === 'feed' && user && <Feed memories={memories} user={user} families={families} />}
          {view === 'questions' && user && <Questions user={user} families={families} questions={qPrompts} onAnswer={(q) => { setActiveQuestion(q); setRecordMode('answer'); setView('record'); }} onRecordQuestion={() => { setActiveQuestion(null); setRecordMode('question'); setView('record'); }} onToggleUpvote={toggleUpvote} onAddQuestion={handleAddQuestion} activeFamilyId={activeFamilyId} currentLanguage={language} />}
          {view === 'documents' && user && <Documents user={user} families={families} documents={documents} setDocuments={setDocuments} />}
          {view === 'record' && user && <RecordMemory user={user} question={activeQuestion} mode={recordMode} onCancel={() => { setView('home'); setActiveQuestion(null); }} onComplete={handleRecordingComplete} families={families} activeFamilyId={activeFamilyId} />}
          {view === 'drafts' && <Drafts drafts={drafts} onPublish={(m) => handleRecordingComplete({ ...m, isDraft: false })} onDelete={() => { }} />}
          {view === 'profile' && user && <Profile user={user} families={families} onLogout={handleLogout} currentTheme={theme} onThemeChange={setTheme} currentLanguage={language} onLanguageChange={setLanguage} />}
        </div>
      </main>

      {!hideFrame && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] safe-area-bottom bg-transparent pointer-events-none">
          <div className="mx-auto max-w-md px-6 pb-6 pt-12 flex justify-center items-end relative">
            <nav className="bg-charcoal dark:bg-charcoal/90 backdrop-blur-md rounded-[36px] h-[68px] w-full flex items-center justify-around px-2 shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/5 relative pointer-events-auto">
              <button onClick={() => setView('home')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'home' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <Home size={20} strokeWidth={view === 'home' ? 3 : 2} />
                {view === 'home' && <div className="absolute bottom-[10px] w-5 h-[3px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
              </button>
              <button onClick={() => setView('feed')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'feed' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <LayoutGrid size={20} strokeWidth={view === 'feed' ? 3 : 2} />
                {view === 'feed' && <div className="absolute bottom-[10px] w-5 h-[3px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
              </button>
              <div className="w-16"></div>
              <button onClick={() => setView('questions')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'questions' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <MessageCircle size={20} strokeWidth={view === 'questions' ? 3 : 2} />
                {view === 'questions' && <div className="absolute bottom-[10px] w-5 h-[3px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
              </button>
              <button onClick={() => setView('profile')} className={`relative flex flex-col items-center justify-center w-12 h-full transition-all active:scale-90 ${view === 'profile' ? 'text-primary' : 'text-white/30 hover:text-white'}`}>
                <UserIcon size={20} strokeWidth={view === 'profile' ? 3 : 2} />
                {view === 'profile' && <div className="absolute bottom-[10px] w-5 h-[3px] bg-primary rounded-full shadow-[0_0_15px_rgba(47,93,138,0.8)]" />}
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
