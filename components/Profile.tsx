
import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Users,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  Camera,
  PlusCircle,
  Mail,
  ChevronLeft,
  X,
  Monitor,
  Mic,
  MapPin,
  LockKeyhole,
  AlertCircle,
  Sun,
  Moon,
  CheckCircle2,
  Trash2,
  Check,
  Globe,
  Languages
} from 'lucide-react';
import { User, Family, Language } from '../types';
import { t } from '../services/i18n';

type SubView = 'none' | 'branches' | 'requests' | 'privacy' | 'theme' | 'permissions' | 'language';

interface ProfileProps {
  user: User;
  families: Family[];
  onLogout: () => void;
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

interface JoinRequest {
  id: string;
  userName: string;
  avatar: string;
  familyName: string;
  timestamp: string;
}

const Profile: React.FC<ProfileProps> = ({ user, families, onLogout, currentTheme, onThemeChange, currentLanguage, onLanguageChange }) => {
  const [activeSubView, setActiveSubView] = useState<SubView>('none');
  const [permissions, setPermissions] = useState<Record<string, PermissionState>>({
    camera: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt'
  });

  const [mockJoinRequests, setMockJoinRequests] = useState<JoinRequest[]>([
    { id: 'jr1', userName: 'Carlos Gomez', avatar: 'https://i.pravatar.cc/150?u=carlos', familyName: 'Gomez Family', timestamp: '2h ago' },
    { id: 'jr2', userName: 'Anjali Sharma', avatar: 'https://i.pravatar.cc/150?u=anjali', familyName: 'Sharma Clan', timestamp: '1d ago' }
  ]);

  const userFamilies = families.filter(f => user.families.includes(f.id));

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const geo = await navigator.permissions.query({ name: 'geolocation' as any });
        let camStatus: PermissionState = 'prompt';
        let micStatus: PermissionState = 'prompt';

        try {
          const cam = await navigator.permissions.query({ name: 'camera' as any });
          camStatus = cam.state;
        } catch (e) { /* fallback */ }

        try {
          const mic = await navigator.permissions.query({ name: 'microphone' as any });
          micStatus = mic.state;
        } catch (e) { /* fallback */ }

        setPermissions({
          camera: camStatus,
          microphone: micStatus,
          geolocation: geo.state
        });
      }
    } catch (e) {
      console.warn("Permission API partial support", e);
    }
  };

  useEffect(() => {
    if (activeSubView === 'permissions') {
      checkPermissions();
    }
  }, [activeSubView]);

  const SubViewHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="flex items-center gap-4 mb-8">
      <button onClick={onBack} className="p-3 bg-white dark:bg-charcoal/50 rounded-2xl shadow-sm border border-secondary/20 dark:border-white/10 active:scale-90 transition-transform">
        <ChevronLeft size={20} className="text-charcoal dark:text-warmwhite" />
      </button>
      <h3 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tighter">{title}</h3>
    </div>
  );

  const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center gap-2 px-6 mb-4 mt-8 first:mt-2">
      <div className="p-1.5 bg-support/20 dark:bg-white/10 rounded-lg text-primary dark:text-warmwhite">
        <Icon size={14} className="text-primary dark:text-warmwhite" />
      </div>
      <h3 className="text-[10px] font-black text-slate dark:text-support/60 uppercase tracking-[0.2em]">{title}</h3>
    </div>
  );

  const ActionItem = ({ label, sublabel, icon: Icon, onClick, color = "text-charcoal dark:text-warmwhite", danger = false }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between py-5 border-b border-secondary/10 dark:border-white/5 last:border-0 active:bg-secondary/10 dark:active:bg-white/5 transition-colors ${danger ? 'text-red-500' : ''}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        {Icon && <Icon size={18} className={danger ? 'text-red-400' : 'text-slate dark:text-support/60'} />}
        <div className="text-left truncate">
          <p className={`font-bold text-[15px] ${danger ? 'text-red-500' : color}`}>{label}</p>
          {sublabel && <p className="text-[11px] text-slate dark:text-support/60 mt-0.5 truncate">{sublabel}</p>}
        </div>
      </div>
      <ChevronRight size={16} className="text-secondary dark:text-white/20 shrink-0" />
    </button>
  );

  const ManageBranches = () => (
    <div className="animate-in slide-in-from-right duration-300">
      <SubViewHeader title={t('profile.sub.branches', currentLanguage)} onBack={() => setActiveSubView('none')} />
      <div className="space-y-4">
        {userFamilies.map((family) => (
          <div key={family.id} className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-secondary/20 dark:border-white/10 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 dark:bg-white/10 rounded-2xl flex items-center justify-center text-primary dark:text-white">
                <Users size={24} />
              </div>
              <div>
                <p className="font-black text-charcoal dark:text-warmwhite leading-none text-lg">{family.name}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Globe size={10} className="text-slate dark:text-support/40" />
                  <p className="text-[10px] font-black text-slate dark:text-support/40 uppercase tracking-widest">{family.motherTongue}</p>
                </div>
              </div>
            </div>
            <button className="p-3 text-slate hover:text-red-500 dark:text-support/40 dark:hover:text-red-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        ))}
        <button className="w-full py-6 border-2 border-dashed border-secondary/40 dark:border-white/10 rounded-[32px] flex items-center justify-center gap-3 text-slate dark:text-support/40 font-black uppercase tracking-widest text-[11px] hover:bg-secondary/5 dark:hover:bg-white/5 transition-all active:scale-[0.98]">
          <PlusCircle size={18} />
          {t('profile.sub.create_branch', currentLanguage)}
        </button>
      </div>
    </div>
  );

  const JoinRequests = () => {
    const handleRequest = (id: string, action: 'accept' | 'decline') => {
      setMockJoinRequests(prev => prev.filter(r => r.id !== id));
    };

    return (
      <div className="animate-in slide-in-from-right duration-300">
        <SubViewHeader title={t('profile.sub.requests', currentLanguage)} onBack={() => setActiveSubView('none')} />

        {mockJoinRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Mail size={48} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('profile.sub.no_requests', currentLanguage)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mockJoinRequests.map((req) => (
              <div key={req.id} className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-secondary/20 dark:border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-secondary/20">
                      <img src={req.avatar} alt={req.userName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-black text-charcoal dark:text-warmwhite leading-none mb-1">{req.userName}</h4>
                      <p className="text-[10px] font-bold text-slate dark:text-support/60">{t('profile.sub.request_join', currentLanguage)} <span className="text-primary dark:text-white">{req.familyName}</span></p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate/30 uppercase tracking-widest">{req.timestamp}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRequest(req.id, 'accept')}
                    className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    <Check size={16} strokeWidth={3} /> {t('profile.sub.accept', currentLanguage)}
                  </button>
                  <button
                    onClick={() => handleRequest(req.id, 'decline')}
                    className="flex-1 bg-secondary/10 dark:bg-white/5 text-slate dark:text-support/60 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <X size={16} strokeWidth={3} /> {t('profile.sub.decline', currentLanguage)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ThemeSelector = () => {
    const themeOptions = [
      { id: 'system', label: t('profile.theme.system', currentLanguage), icon: Monitor, desc: t('profile.theme.system_desc', currentLanguage) },
      { id: 'light', label: t('profile.theme.light', currentLanguage), icon: Sun, desc: t('profile.theme.light_desc', currentLanguage) },
      { id: 'dark', label: t('profile.theme.dark', currentLanguage), icon: Moon, desc: t('profile.theme.dark_desc', currentLanguage) }
    ];

    return (
      <div className="animate-in slide-in-from-right duration-300">
        <SubViewHeader title={t('profile.sub.theme', currentLanguage)} onBack={() => setActiveSubView('none')} />

        <div className="space-y-4">
          {themeOptions.map((option) => {
            const isSelected = currentTheme === option.id;
            return (
              <button
                key={option.id}
                onClick={() => {
                  onThemeChange(option.id as any);
                  setActiveSubView('none');
                }}
                className={`w-full text-left p-6 rounded-[32px] border transition-all duration-300 flex items-center justify-between group ${isSelected
                  ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]'
                  : 'bg-white dark:bg-white/5 border-secondary/20 dark:border-white/10 text-charcoal dark:text-warmwhite'
                  }`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-secondary/10 dark:bg-white/10 text-primary dark:text-white'
                    }`}>
                    <option.icon size={22} className={isSelected ? 'text-white' : 'text-primary dark:text-white'} />
                  </div>
                  <div>
                    <p className="font-black text-lg leading-none tracking-tight">{option.label}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 ${isSelected ? 'text-white/60' : 'text-slate dark:text-support/60'
                      }`}>
                      {option.desc}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="animate-in zoom-in-50 duration-300">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-12 p-8 text-center bg-secondary/10 dark:bg-white/5 rounded-[40px] border border-dashed border-secondary/40">
          <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em] leading-relaxed">
            {t('profile.theme.advisory', currentLanguage)}
          </p>
        </div>
      </div>
    );
  };

  const LanguageSelector = () => {
    const languages = Object.values(Language);

    return (
      <div className="animate-in slide-in-from-right duration-300">
        <SubViewHeader title={t('profile.language', currentLanguage)} onBack={() => setActiveSubView('none')} />

        <div className="space-y-3">
          {languages.map((lang) => {
            const isSelected = currentLanguage === lang;
            return (
              <button
                key={lang}
                onClick={() => {
                  onLanguageChange(lang);
                  setActiveSubView('none');
                }}
                className={`w-full text-left p-5 rounded-[28px] border transition-all duration-300 flex items-center justify-between group ${isSelected
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.01]'
                  : 'bg-white dark:bg-white/5 border-secondary/20 dark:border-white/10 text-charcoal dark:text-warmwhite'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-secondary/10 dark:bg-white/10 text-primary dark:text-white'
                    }`}>
                    <Languages size={18} className={isSelected ? 'text-white' : 'text-primary dark:text-white'} />
                  </div>
                  <p className="font-black text-[15px] leading-none tracking-tight">{lang}</p>
                </div>
                {isSelected && (
                  <div className="animate-in zoom-in-50 duration-300">
                    <Check size={18} strokeWidth={4} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-12 p-8 text-center bg-secondary/10 dark:bg-white/5 rounded-[40px] border border-dashed border-secondary/40">
          <Globe className="text-primary/40 dark:text-white/20 mx-auto mb-4" size={32} />
          <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em] leading-relaxed">
            {t('profile.lang.advisory', currentLanguage)}
          </p>
        </div>
      </div>
    );
  };

  const PermissionGroup = () => {
    const triggerRequest = async (type: 'camera' | 'microphone' | 'geolocation') => {
      if (permissions[type] === 'denied') {
        alert("Permission has been blocked by your browser. Please enable it in your browser settings.");
        return;
      }

      try {
        if (type === 'geolocation') {
          navigator.geolocation.getCurrentPosition(() => checkPermissions(), () => checkPermissions());
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: type === 'camera',
            audio: type === 'microphone'
          });
          stream.getTracks().forEach(t => t.stop());
          checkPermissions();
        }
      } catch (e) {
        checkPermissions();
      }
    };

    const Toggle = ({ active, onToggle, disabled }: { active: boolean, onToggle: () => void, disabled?: boolean }) => (
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative w-[52px] h-[28px] rounded-full transition-all duration-300 flex items-center p-1 ${active ? 'bg-primary shadow-[0_0_15px_rgba(47,93,138,0.3)]' : 'bg-slate/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 transform ${active ? 'translate-x-[24px]' : 'translate-x-0'
          }`} />
      </button>
    );

    return (
      <div className="animate-in slide-in-from-right duration-300">
        <SubViewHeader title={t('profile.sub.permissions', currentLanguage)} onBack={() => setActiveSubView('none')} />

        <div className="bg-support/10 dark:bg-white/5 rounded-3xl p-5 mb-8 flex gap-4 border border-support/20 dark:border-white/10">
          <AlertCircle className="text-primary dark:text-white shrink-0" size={20} />
          <p className="text-xs font-medium text-slate dark:text-support/60 leading-relaxed">
            {t('profile.perm.advisory', currentLanguage)}
          </p>
        </div>

        <div className="space-y-4">
          {[
            { id: 'camera', label: t('profile.perm.camera', currentLanguage), icon: Camera, desc: t('profile.perm.camera_desc', currentLanguage) },
            { id: 'mic', label: t('profile.perm.mic', currentLanguage), icon: Mic, desc: t('profile.perm.mic_desc', currentLanguage) },
            { id: 'location', label: t('profile.perm.location', currentLanguage), icon: MapPin, desc: t('profile.perm.location_desc', currentLanguage) },
          ].map((item) => {
            const status = permissions[item.id as keyof typeof permissions];
            const isGranted = status === 'granted';
            return (
              <div key={item.id} className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-secondary/20 dark:border-white/10 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isGranted ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-white' : 'bg-secondary/10 dark:bg-white/5 text-slate'
                    }`}>
                    <item.icon size={22} className={isGranted ? 'text-primary dark:text-white' : 'text-slate'} />
                  </div>
                  <div>
                    <p className="font-black text-charcoal dark:text-warmwhite leading-none">{item.label}</p>
                    <p className="text-[10px] font-bold text-slate dark:text-support/60 uppercase tracking-widest mt-1.5 opacity-60">
                      {isGranted ? t('profile.perm.granted', currentLanguage) : status === 'denied' ? t('profile.perm.blocked', currentLanguage) : t('profile.perm.none', currentLanguage)}
                    </p>
                  </div>
                </div>

                <Toggle
                  active={isGranted}
                  onToggle={() => triggerRequest(item.id as any)}
                  disabled={isGranted}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-8 text-center bg-secondary/10 dark:bg-white/5 rounded-[40px] border border-dashed border-secondary/40">
          <Shield className="text-primary/40 dark:text-white/20 mx-auto mb-4" size={32} />
          <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em] leading-relaxed">
            {t('profile.perm.secure_advisory', currentLanguage)}
          </p>
        </div>
      </div >
    );
  };

  return (
    <div className="flex flex-col bg-warmwhite dark:bg-charcoal min-h-full pb-32 transition-colors duration-300">
      <div className="px-6 py-6">
        {activeSubView === 'none' && (
          <>
            <div className="bg-white dark:bg-white/5 rounded-[40px] p-8 shadow-sm border border-secondary/20 dark:border-white/10 flex flex-col items-center text-center animate-in fade-in duration-500 transition-colors">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-warmwhite dark:border-charcoal shadow-xl">
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <button className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-white rounded-2xl shadow-lg border-2 border-white dark:border-charcoal active:scale-90 transition-transform">
                  <Camera size={16} />
                </button>
              </div>
              <h2 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tight leading-none">{user.name}</h2>
              <p className="text-slate dark:text-support/60 font-bold text-sm mt-2 opacity-60 tracking-tight">{user.phoneNumber}</p>
            </div>

            <SectionHeader title={t('profile.system', currentLanguage)} icon={LockKeyhole} />
            <div className="bg-white dark:bg-white/5 rounded-[32px] px-6 py-1 shadow-sm border border-secondary/20 dark:border-white/10 mb-4 transition-colors">
              <ActionItem label={t('profile.access', currentLanguage)} icon={Shield} sublabel="Camera, Mic & Location" onClick={() => setActiveSubView('permissions')} />
              <ActionItem label={t('profile.theme', currentLanguage)} icon={Monitor} sublabel={`${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} Mode`} onClick={() => setActiveSubView('theme')} />
            </div>

            <SectionHeader title={t('profile.family', currentLanguage)} icon={Users} />
            <div className="bg-white dark:bg-white/5 rounded-[32px] px-6 py-1 shadow-sm border border-secondary/20 dark:border-white/10 mb-4 transition-colors">
              <ActionItem label={t('profile.branches', currentLanguage)} icon={PlusCircle} onClick={() => setActiveSubView('branches')} />
              <ActionItem label={t('profile.requests', currentLanguage)} icon={Mail} onClick={() => setActiveSubView('requests')} />
            </div>

            <SectionHeader title={t('profile.account', currentLanguage)} icon={Shield} />
            <div className="bg-white dark:bg-white/5 rounded-[32px] px-6 py-1 shadow-sm border border-secondary/20 dark:border-white/10 mb-8 transition-colors">
              <ActionItem label={t('profile.language', currentLanguage)} icon={Globe} sublabel={currentLanguage} onClick={() => setActiveSubView('language')} />
              <ActionItem label={t('profile.logout', currentLanguage)} icon={LogOut} onClick={onLogout} danger />
            </div>
          </>
        )}

        {activeSubView === 'permissions' && <PermissionGroup />}
        {activeSubView === 'theme' && <ThemeSelector />}
        {activeSubView === 'branches' && <ManageBranches />}
        {activeSubView === 'requests' && <JoinRequests />}
        {activeSubView === 'language' && <LanguageSelector />}
      </div>
    </div>
  );
};

export default Profile;
