
import React, { useState, useEffect } from 'react';
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
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from './services/firebase';
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
  { id: 'f1', name: 'Gomez Family', motherTongue: Language.SPANISH },
  { id: 'f2', name: 'Sharma Clan', motherTongue: Language.HINDI },
];

const App: React.FC = () => {
  const [view, setView] = useState<AppState>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [families, setFamilies] = useState<Family[]>(INITIAL_FAMILIES);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
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

  // Sync Data with Firestore
  useEffect(() => {
    if (!user) return;

    // Listen for Memories
    const memoriesRef = collection(db, "memories");
    const qMemories = query(
      memoriesRef, 
      where("familyId", "in", user.families),
      orderBy("timestamp", "desc")
    );

    const unsubMemories = onSnapshot(qMemories, (snapshot) => {
      const mems: Memory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        mems.push({ id: doc.id, ...data } as Memory);
      });
      setMemories(mems.filter(m => !m.isDraft));
      setDrafts(mems.filter(m => m.isDraft));
    });

    // Listen for Documents
    const docsRef = collection(db, "documents");
    const qDocs = query(
      docsRef, 
      where("familyId", "in", user.families),
      orderBy("timestamp", "desc")
    );

    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      const ds: FamilyDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        ds.push({ id: doc.id, ...data } as FamilyDocument);
      });
      setDocuments(ds);
    });

    return () => {
      unsubMemories();
      unsubDocs();
    };
  }, [user]);

  // Theme Management
  useEffect(() => {
    localStorage.setItem('inai_theme', theme);
    const root = window.document.documentElement;
    const applyTheme = (currentTheme: 'light' | 'dark' | 'system') => {
      if (currentTheme === 'dark') root.classList.add('dark');
      else if (currentTheme === 'light') root.classList.remove('dark');
      else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };
    applyTheme(theme);
  }, [theme]);

  // Initial Boot
  useEffect(() => {
    if (view === 'splash') {
      const timer = setTimeout(() => {
        const onboardingDone = localStorage.getItem('inai_onboarding_done');
        if (!onboardingDone) {
          setView('onboarding');
          return;
        }
        const savedSession = localStorage.getItem('inai_session');
        if (savedSession) {
          const { user: savedUser, expiresAt } = JSON.parse(savedSession);
          if (new Date().getTime() < expiresAt) {
            setUser(savedUser);
            setView('home');
          } else setView('login');
        } else setView('login');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const handleLogin = (phoneNumber: string, name: string) => {
    const userId = `u_${phoneNumber.replace(/\D/g, '')}`;
    const newUser: User = { 
      id: userId,
      name: name,
      phoneNumber: phoneNumber,
      families: ['f1', 'f2'],
      avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
      role: 'admin'
    };
    setUser(newUser);
    localStorage.setItem('inai_session', JSON.stringify({ user: newUser, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
    setView('home');
  };

  const handleRecordingComplete = async (newMemory: Memory) => {
    try {
      await addDoc(collection(db, "memories"), {
        ...newMemory,
        timestamp: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
      setView('feed');
      setActiveQuestion(null);
    } catch (err) {
      console.error("Error saving memory:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('inai_session');
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
          {view === 'onboarding' && <Onboarding onComplete={() => setView('login')} />}
          {view === 'login' && <Login onLogin={handleLogin} />}
          {view === 'home' && user && <Dashboard user={user} families={families} onNavigate={setView} onRecord={(q) => { if(q) setActiveQuestion(q); setView('record'); }} onAddFamily={() => {}} currentLanguage={language} />}
          {view === 'feed' && user && <Feed memories={memories} user={user} families={families} />}
          {view === 'questions' && user && <Questions user={user} onAnswer={(q) => { setActiveQuestion(q); setView('record'); }} families={families} currentLanguage={language} />}
          {view === 'documents' && user && <Documents user={user} families={families} documents={documents} setDocuments={setDocuments} />}
          {view === 'record' && user && <RecordMemory user={user} question={activeQuestion} onCancel={() => { setView('home'); setActiveQuestion(null); }} onComplete={handleRecordingComplete} families={families} />}
          {view === 'drafts' && <Drafts drafts={drafts} onPublish={(m) => handleRecordingComplete({ ...m, isDraft: false })} onDelete={() => {}} />}
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
