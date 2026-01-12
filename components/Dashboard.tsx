
import React, { useState, useEffect } from 'react';
import { Users, Archive, Plus, Video, X, Globe, MapPin, Info, ThumbsUp } from 'lucide-react';
import { User, Family, Question, Language } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { translateQuestion } from '../services/geminiService';
import { t } from '../services/i18n';
import { LocalizedText } from './LocalizedText';

interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
  isOnline: boolean;
}

interface DashboardProps {
  user: User;
  families: Family[];
  onNavigate: (view: any) => void;
  onRecord: (question?: Question) => void;
  onAddFamily: (name: string, language: Language) => void;
  currentLanguage: Language;
  activeFamilyId: string | null;
  onSwitchFamily: (id: string) => void;
  prompts: Question[];
  onToggleUpvote: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, families, onNavigate, onRecord, onAddFamily, currentLanguage, activeFamilyId, onSwitchFamily, prompts, onToggleUpvote }) => {
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<{ name: string, members: Member[] } | null>(null);
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isSwitchingFamily, setIsSwitchingFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyLang, setNewFamilyLang] = useState<Language>(Language.TAMIL);
  const [greeting, setGreeting] = useState('Hello');
  const [locationName, setLocationName] = useState<string | null>(null);

  const activePrompts = prompts;

  const connectedFamilies = families.filter(f => user.families?.includes(f.id));
  const activeFamily = connectedFamilies.find(f => f.id === activeFamilyId) || connectedFamilies[0];

  useEffect(() => {
    const hour = new Date().getHours();
    let baseGreeting = 'Hello';
    if (hour < 5) baseGreeting = 'Good Night';
    else if (hour < 12) baseGreeting = 'Good Morning';
    else if (hour < 18) baseGreeting = 'Good Afternoon';
    else baseGreeting = 'Good Evening';

    const greetingKey = `dashboard.${baseGreeting.toLowerCase().replace(' ', '_')}`;
    const langGreeting = t(greetingKey, currentLanguage);
    setGreeting(langGreeting);
  }, [currentLanguage]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        // Location fetching disabled as Gemini key was removed
      }, (error) => {
        console.warn("Geolocation permission denied or error:", error.message);
      });
    }
  }, []);

  const getMockMembers = (familyId: string): Member[] => {
    if (familyId === 'f1') {
      return [
        { id: 'm1', name: 'சந்தோஷ்', role: 'குடும்பத்தலைவர்', avatar: 'https://i.pravatar.cc/150?u=joe', isOnline: true },
        { id: 'm2', name: 'அகிலா', role: 'மகள்', avatar: 'https://i.pravatar.cc/150?u=emma', isOnline: false },
        { id: 'm3', name: 'மரியா', role: 'சகோதரி', avatar: 'https://i.pravatar.cc/150?u=maria', isOnline: true },
        { id: 'm4', name: 'ரிச்சர்ட்', role: 'சித்தப்பா', avatar: 'https://i.pravatar.cc/150?u=ric', isOnline: false },
      ];
    }
    return [
      { id: 's1', name: 'Arjun Sharma', role: 'Cousin', avatar: 'https://i.pravatar.cc/150?u=arjun', isOnline: true },
      { id: 's2', name: 'Priya Sharma', role: 'Mother', avatar: 'https://i.pravatar.cc/150?u=priya', isOnline: true },
      { id: 's3', name: 'Rahul', role: 'Brother', avatar: 'https://i.pravatar.cc/150?u=rahul', isOnline: false },
    ];
  };

  const handleFamilyClick = (family: Family) => {
    setSelectedFamilyMembers({
      name: family.name,
      members: getMockMembers(family.id)
    });
  };

  const handleCreateFamily = () => {
    if (newFamilyName.trim()) {
      onAddFamily(newFamilyName, newFamilyLang);
      setNewFamilyName('');
      setIsCreatingFamily(false);
    }
  };

  const handleToggleUpvote = (id: string) => {
    onToggleUpvote(id);
  };

  const handleFamilySelection = (family: Family) => {
    onSwitchFamily(family.id);
    handleFamilyClick(family);
  };

  return (
    <div className="bg-warmwhite dark:bg-charcoal flex-1 pb-32 transition-colors duration-300">
      {/* Page Header */}
      <div className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-charcoal dark:text-warmwhite tracking-tighter leading-none">{t('dashboard.greeting', currentLanguage)} {user.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-slate/60 dark:text-support/40 text-xl font-medium">{greeting}!</p>
            {locationName && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 dark:bg-white/10 rounded-full border border-primary/10 dark:border-white/10 transition-colors">
                <MapPin size={12} className="text-primary dark:text-white" />
                <span className="text-[10px] font-bold text-primary dark:text-white uppercase tracking-wider">{locationName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Group Switcher - De-emphasized but accessible */}
        <button
          onClick={() => setIsSwitchingFamily(true)}
          className="flex flex-col items-end gap-1 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2 bg-white/40 dark:bg-white/5 border border-secondary/20 dark:border-white/10 px-4 py-2 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[80px]">
              {activeFamily ? (
                <LocalizedText
                  text={activeFamily.name}
                  targetLanguage={currentLanguage}
                  originalLanguage={activeFamily.motherTongue}
                />
              ) : t('dashboard.switch', currentLanguage)}
            </span>
            <Users size={14} className="text-primary" />
          </div>
          <span className="text-[9px] font-bold text-slate/40 uppercase tracking-tighter">{t('dashboard.current_family', currentLanguage)}</span>
        </button>
      </div>

      {/* HERO CARD */}
      <div className="px-6 mb-10">
        <div className="relative bg-primary rounded-[40px] h-[220px] w-full flex overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute top-[20%] left-[35%] w-[50%] h-[50%] bg-white/5 rounded-[32px] pointer-events-none z-0"></div>
          <div className="relative z-20 w-[60%] flex flex-col justify-between p-8 pr-0">
            <h2 className="text-white text-[26px] font-bold leading-tight tracking-tight">
              {t('dashboard.hero.title', currentLanguage)}
            </h2>
            <div className="pb-1">
              <button
                onClick={() => onRecord()}
                className="bg-white text-primary px-8 py-3 rounded-full font-black text-[14px] shadow-lg shadow-black/10 active:scale-95 transition-all hover:bg-white/95"
              >
                {t('dashboard.hero.button', currentLanguage)}
              </button>
            </div>
          </div>
          <div className="relative z-10 w-[40%] flex items-center justify-center p-3">
            <div className="relative w-full aspect-square flex items-center justify-center">
              <div className="absolute inset-1 bg-support rounded-full opacity-90 blur-sm"></div>
              <img
                src="https://img.icons8.com/clouds/200/000000/family.png"
                className="relative z-20 w-full h-full object-contain scale-110 drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
                alt="Family Illustration"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Family Branches Section */}
      <div className="mb-10 transition-opacity">
        <div className="px-6 flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-charcoal/40 dark:text-warmwhite/40 tracking-[0.2em] uppercase">{t('dashboard.circles', currentLanguage)}</h3>
          <button
            onClick={() => setIsCreatingFamily(true)}
            className="text-primary dark:text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1 bg-primary/5 dark:bg-white/5 px-3 py-1.5 rounded-full"
          >
            <Plus size={12} /> {t('dashboard.new', currentLanguage)}
          </button>
        </div>

        <div className="flex overflow-x-auto px-6 gap-4 pb-2 no-scrollbar">
          {connectedFamilies.map((family) => (
            <div
              key={family.id}
              className={`flex items-center gap-3 border px-4 py-2 rounded-2xl shrink-0 cursor-pointer active:scale-95 transition-all ${family.id === activeFamilyId
                ? 'bg-primary/10 border-primary shadow-sm'
                : 'bg-white/40 dark:bg-white/5 border-secondary/20 dark:border-white/10'
                }`}
              onClick={() => handleFamilySelection(family)}
            >
              <Users size={14} className={family.id === activeFamilyId ? "text-primary" : "text-slate/60"} />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${family.id === activeFamilyId ? "text-primary" : "text-slate/60"}`}>
                <LocalizedText
                  text={family.name}
                  targetLanguage={currentLanguage}
                  originalLanguage={family.motherTongue}
                />
              </span>
            </div>
          ))}

          <div
            className="flex items-center gap-3 bg-secondary/10 dark:bg-white/5 border border-secondary/20 dark:border-white/10 px-4 py-2 rounded-2xl shrink-0 cursor-pointer active:scale-95 transition-all"
            onClick={() => onNavigate('documents')}
          >
            <Archive size={14} className="text-accent/60" />
            <span className="text-[11px] font-bold text-accent/60 uppercase tracking-wider">{t('dashboard.vault', currentLanguage)}</span>
          </div>
        </div>
      </div>

      {/* Active Prompts Section */}
      <div className="px-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black text-charcoal/40 dark:text-warmwhite/40 tracking-[0.2em] uppercase">{t('dashboard.prompts', currentLanguage)}</h3>
        </div>

        {activePrompts.map((q) => (
          <div key={q.id} className="bg-white dark:bg-white/5 rounded-[44px] p-8 flex flex-col gap-8 border border-secondary/20 dark:border-white/10 relative transition-all shadow-sm">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-[24px] overflow-hidden shrink-0 border-4 border-warmwhite dark:border-charcoal/50 shadow-xl bg-support/20 dark:bg-white/10 flex items-center justify-center text-primary dark:text-white font-black text-2xl">
                {q.askerName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black text-accent/80 dark:text-accent uppercase tracking-[0.15em] mb-1.5">{q.askerName} {t('questions.asked', currentLanguage)}</p>
                <h4 className="text-[22px] font-bold text-charcoal dark:text-warmwhite leading-[1.2] tracking-tight">
                  <LocalizedText
                    text={q.text}
                    targetLanguage={currentLanguage}
                    originalLanguage={q.language}
                    storedTranslation={q.translation}
                  />
                </h4>
                {q.translation && q.translation !== q.text && q.language !== currentLanguage && (
                  <p className="text-primary dark:text-support/60 italic text-sm font-semibold mt-2">{q.translation}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2 w-full h-[84px]">
              <button
                onClick={() => onRecord(q)}
                className="flex-[1.4] h-full bg-primary text-white rounded-[32px] flex items-center justify-center gap-4 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all px-4"
              >
                <Video size={24} className="text-white shrink-0" />
                <div className="flex flex-col items-start leading-none gap-1">
                  <span className="text-[14px] font-black uppercase tracking-tight">{t('dashboard.record', currentLanguage)}</span>
                  <span className="text-[14px] font-black uppercase tracking-tight">{t('dashboard.story', currentLanguage)}</span>
                </div>
              </button>

              <button
                onClick={() => onToggleUpvote(q.id)}
                className={`flex-1 h-full rounded-[32px] flex flex-col items-center justify-center border transition-all active:scale-95 ${q.hasUpvoted
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-charcoal/5 dark:bg-white/5 border-secondary/20 dark:border-white/10'
                  }`}
              >
                <span className={`text-[24px] font-black leading-none tracking-tight ${q.hasUpvoted ? 'text-white' : 'text-charcoal dark:text-warmwhite'}`}>
                  {q.upvotes}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  {q.hasUpvoted && <ThumbsUp size={8} className="text-white fill-white" />}
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${q.hasUpvoted ? 'text-white/80' : 'text-slate dark:text-support/40'}`}>
                    {q.hasUpvoted ? t('dashboard.upvoted', currentLanguage) : t('dashboard.upvotes', currentLanguage)}
                  </span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Family Modal */}
      {selectedFamilyMembers && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedFamilyMembers(null)}
          ></div>
          <div className="relative w-full max-w-md bg-warmwhite dark:bg-charcoal rounded-t-[56px] shadow-[0_-20px_80px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom duration-500 p-10 border-t border-white/20 dark:border-white/10 safe-area-bottom">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-3xl font-black text-charcoal dark:text-warmwhite tracking-tighter">
                  <LocalizedText
                    text={selectedFamilyMembers.name}
                    targetLanguage={currentLanguage}
                    originalLanguage={selectedFamilyMembers.motherTongue}
                  />
                </h3>
                <p className="text-slate font-bold text-sm uppercase tracking-widest mt-1 opacity-60">{selectedFamilyMembers.members.length} {t('dashboard.members', currentLanguage)}</p>
              </div>
              <button
                onClick={() => setSelectedFamilyMembers(null)}
                className="p-4 bg-secondary/30 dark:bg-white/10 rounded-full text-slate dark:text-support/60 hover:bg-secondary/50 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
              {selectedFamilyMembers.members.map((member) => (
                <div key={member.id} className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[24px] overflow-hidden border-2 border-white dark:border-charcoal shadow-xl bg-support/10">
                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-black text-charcoal dark:text-warmwhite text-lg tracking-tight">{member.name}</h4>
                    <p className="text-slate dark:text-support/60 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                      <LocalizedText text={member.role} targetLanguage={currentLanguage} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Family Switcher Modal */}
      {isSwitchingFamily && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsSwitchingFamily(false)}
          ></div>
          <div className="relative w-full max-w-md bg-warmwhite dark:bg-charcoal rounded-t-[56px] shadow-[0_-20px_80px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom duration-500 p-10 border-t border-white/20 dark:border-white/10 safe-area-bottom">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-black text-charcoal dark:text-warmwhite tracking-tighter">{t('dashboard.families_title', currentLanguage)}</h3>
                <p className="text-slate font-bold text-sm uppercase tracking-widest mt-1 opacity-60">{t('dashboard.families_subtitle', currentLanguage)}</p>
              </div>
              <button
                onClick={() => setIsSwitchingFamily(false)}
                className="p-4 bg-secondary/30 dark:bg-white/10 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-6">
              {connectedFamilies.map((family) => (
                <button
                  key={family.id}
                  onClick={() => {
                    onSwitchFamily(family.id);
                    setIsSwitchingFamily(false);
                  }}
                  className={`w-full flex items-center justify-between p-6 rounded-[32px] transition-all ${family.id === activeFamilyId
                    ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105'
                    : 'bg-white dark:bg-white/5 border border-secondary/20 dark:border-white/10 text-charcoal dark:text-warmwhite'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${family.id === activeFamilyId ? 'bg-white/20' : 'bg-primary/10'}`}>
                      <Users size={20} className={family.id === activeFamilyId ? 'text-white' : 'text-primary'} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-lg leading-none">
                        <LocalizedText
                          text={family.name}
                          targetLanguage={currentLanguage}
                          originalLanguage={family.motherTongue}
                        />
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${family.id === activeFamilyId ? 'text-white/60' : 'text-slate/40'}`}>
                        {family.id === activeFamilyId ? t('dashboard.active_context', currentLanguage) : t('dashboard.switch_context', currentLanguage)}
                      </p>
                    </div>
                  </div>
                  {family.id === activeFamilyId && (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-primary">
                      <Info size={14} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setIsSwitchingFamily(false);
                setIsCreatingFamily(true);
              }}
              className="w-full py-5 rounded-[28px] border-2 border-dashed border-secondary/40 text-slate/60 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary/5 transition-all mt-4"
            >
              <Plus size={16} /> {t('dashboard.create_new', currentLanguage)}
            </button>
          </div>
        </div>
      )}

      {/* Branch Creation Modal */}
      {isCreatingFamily && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={() => setIsCreatingFamily(false)}></div>
          <div className="relative w-full max-sm bg-warmwhite dark:bg-charcoal rounded-[44px] p-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-charcoal dark:text-warmwhite mb-8 tracking-tight">{t('dashboard.new_branch', currentLanguage)}</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate dark:text-support/60 uppercase tracking-widest block mb-2 px-1">{t('dashboard.name_label', currentLanguage)}</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-white/5 border border-secondary/30 dark:border-white/10 rounded-2xl p-4 text-charcoal dark:text-warmwhite outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                  placeholder={t('dashboard.name_placeholder', currentLanguage)}
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate dark:text-support/60 uppercase tracking-widest block mb-2 px-1">{t('dashboard.lang_label', currentLanguage)}</label>
                <select
                  className="w-full bg-white dark:bg-white/5 border border-secondary/30 dark:border-white/10 rounded-2xl p-4 text-charcoal dark:text-warmwhite outline-none font-bold appearance-none"
                  value={newFamilyLang}
                  onChange={(e) => setNewFamilyLang(e.target.value as Language)}
                >
                  {Object.values(Language).map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsCreatingFamily(false)} className="flex-1 py-4 text-slate dark:text-support/60 font-black uppercase tracking-widest text-xs">{t('questions.cancel', currentLanguage)}</button>
                <button onClick={handleCreateFamily} className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">{t('dashboard.new', currentLanguage)}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
