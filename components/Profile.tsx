import React, { useState, useEffect, useRef } from 'react';
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
  Languages,
  Archive,
  Pencil,
  Loader2,
  Save
} from 'lucide-react';
import { User, Family, Language } from '../types';
import { t } from '../services/i18n';
import { createOrUpdateUser, listenToJoinRequests, handleJoinRequest as handleReq } from '../services/firebaseDatabase';
import { uploadProfilePicture } from '../services/firebaseStorage';
import { JoinRequest as RealJoinRequest } from '../types';

type SubView = 'none' | 'branches' | 'requests' | 'privacy' | 'theme' | 'permissions' | 'language';

interface ProfileProps {
  user: User;
  families: Family[];
  onLogout: () => void;
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (view: any) => void;
  onAddFamily: (name: string, lang: Language) => Promise<void>;
  onJoinFamily: (code: string, userId: string, userName: string, userAvatar?: string) => Promise<string>;
  onLeaveFamily: (familyId: string, userId: string) => Promise<void>;
  enableTranslation?: boolean;
}

// Local JoinRequest for UI compat if needed or just use the one from types

const Profile: React.FC<ProfileProps> = ({
  user, families, onLogout, currentTheme, onThemeChange, currentLanguage, onLanguageChange, onNavigate,
  onAddFamily, onJoinFamily, onLeaveFamily, enableTranslation = true
}) => {
  const [activeSubView, setActiveSubView] = useState<SubView>('none');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.displayName);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New States for Branches Management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [permissions, setPermissions] = useState<Record<string, PermissionState>>({
    camera: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt'
  });

  const [joinRequests, setJoinRequests] = useState<RealJoinRequest[]>([]);

  useEffect(() => {
    setEditName(user.displayName);
  }, [user.displayName]);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const downloadUrl = await uploadProfilePicture(file, user.uid);
      await createOrUpdateUser(user.uid, { profilePhoto: downloadUrl });
    } catch (err) {
      console.error("Failed to upload avatar", err);
      alert("Failed to upload new profile picture.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    try {
      await createOrUpdateUser(user.uid, { displayName: editName.trim() });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update name", err);
      alert("Failed to update name.");
    }
  };

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

  useEffect(() => {
    if (activeSubView === 'requests' && families.length > 0) {
      const adminFamilyIds = families
        .filter(f => f.admins.includes(user.uid))
        .map(f => f.id);

      const unsub = listenToJoinRequests(adminFamilyIds, (requests) => {
        setJoinRequests(requests);
      });
      return () => unsub();
    }
  }, [activeSubView, families, user.uid]);

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return;
    setIsProcessing(true);
    try {
      await onAddFamily(newFamilyName.trim(), currentLanguage);
      setNewFamilyName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create family.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinFamilyByCode = async () => {
    if (!inviteCode.trim()) return;
    setIsProcessing(true);
    try {
      await onJoinFamily(inviteCode.trim(), user.uid, user.displayName, user.profilePhoto);
      setInviteCode('');
      setShowJoinModal(false);
      alert("Join request sent to family admins!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to join family.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveFamily = async (familyId: string) => {
    if (!confirm(t('profile.sub.leave_confirm', currentLanguage) || "Are you sure you want to leave this family?")) return;
    setIsProcessing(true);
    try {
      await onLeaveFamily(familyId, user.uid);
    } catch (err) {
      console.error(err);
      alert("Failed to leave family.");
    } finally {
      setIsProcessing(false);
    }
  };

  const ManageBranches = () => (
    <div className="animate-in slide-in-from-right duration-300">
      <SubViewHeader title={t('profile.sub.branches', currentLanguage)} onBack={() => setActiveSubView('none')} />

      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white p-6 rounded-[32px] flex flex-col items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all text-center"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <PlusCircle size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">{t('profile.sub.create_branch', currentLanguage)}</span>
        </button>
        <button
          onClick={() => setShowJoinModal(true)}
          className="bg-accent text-white p-6 rounded-[32px] flex flex-col items-center justify-center gap-3 shadow-xl shadow-accent/20 active:scale-95 transition-all text-center"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <Mail size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">{t('dashboard.join_family', currentLanguage)}</span>
        </button>
      </div>

      <div className="space-y-4">
        <SectionHeader title={t('profile.sub.my_branches', currentLanguage) || "My Branches"} icon={Users} />
        {families.map((family) => (
          <div key={family.id} className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-secondary/20 dark:border-white/10 flex items-center justify-between group animate-in fade-in duration-300">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-support/20 dark:bg-white/10 rounded-2xl flex items-center justify-center text-primary dark:text-white font-black text-xl border border-white dark:border-charcoal shadow-sm">
                {family.familyName.charAt(0)}
              </div>
              <div>
                <p className="font-black text-charcoal dark:text-warmwhite leading-none text-lg tracking-tight">{family.familyName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <Globe size={10} className="text-slate/40" />
                    <span className="text-[9px] font-black text-slate/40 uppercase tracking-widest">{family.defaultLanguage}</span>
                  </div>
                  <span className="w-1 h-1 bg-slate/20 rounded-full"></span>
                  <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{family.members.length} {t('dashboard.members', currentLanguage)}</span>
                  {family.inviteCode && (
                    <>
                      <span className="w-1 h-1 bg-slate/20 rounded-full"></span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(family.inviteCode!);
                          alert(`Invite code ${family.inviteCode} copied!`);
                        }}
                        className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 rounded-full text-[9px] font-black text-accent uppercase tracking-widest hover:bg-accent/20 transition-colors"
                        title="Click to copy invite code"
                      >
                        <Mail size={10} />
                        {family.inviteCode}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleLeaveFamily(family.id)}
              disabled={isProcessing}
              className="p-4 bg-secondary/5 dark:bg-white/5 rounded-2xl text-slate hover:text-red-500 dark:text-support/40 dark:hover:text-red-400 transition-all active:scale-90 disabled:opacity-50"
              title="Leave Family"
            >
              <LogOut size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Create Family Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative w-full max-w-sm bg-warmwhite dark:bg-charcoal rounded-[40px] p-8 shadow-2xl border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tight">{t('profile.sub.create_branch', currentLanguage)}</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2.5 bg-secondary/10 dark:bg-white/5 rounded-xl hover:bg-secondary/20 transition-all"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em] px-1">{t('login.family_name', currentLanguage)}</label>
              <input
                type="text"
                placeholder="e.g. Smith Family"
                className="w-full p-4 bg-white dark:bg-white/5 rounded-2xl border border-secondary/20 dark:border-white/10 outline-none font-bold text-charcoal dark:text-warmwhite shadow-sm focus:border-primary/50 transition-all"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
              />
            </div>
            <button
              onClick={handleCreateFamily}
              disabled={!newFamilyName.trim() || isProcessing}
              className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {t('profile.sub.create_confirm', currentLanguage) || "Create Branch"}
            </button>
          </div>
        </div>
      )}

      {/* Join Family Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" onClick={() => setShowJoinModal(false)}></div>
          <div className="relative w-full max-w-sm bg-warmwhite dark:bg-charcoal rounded-[40px] p-8 shadow-2xl border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tight">{t('dashboard.join_family', currentLanguage)}</h3>
              <button onClick={() => setShowJoinModal(false)} className="p-2.5 bg-secondary/10 dark:bg-white/5 rounded-xl hover:bg-secondary/20 transition-all"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em] px-1">{t('login.invite_code', currentLanguage)}</label>
              <input
                type="text"
                placeholder="E.g. ABCD123"
                className="w-full p-4 bg-white dark:bg-white/5 rounded-2xl border border-secondary/20 dark:border-white/10 outline-none font-bold text-charcoal dark:text-warmwhite shadow-sm focus:border-primary/50 transition-all uppercase"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
            <button
              onClick={handleJoinFamilyByCode}
              disabled={!inviteCode.trim() || isProcessing}
              className="w-full py-5 bg-accent text-white font-black rounded-3xl shadow-xl shadow-accent/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
              {t('login.join_btn', currentLanguage)}
            </button>
          </div>
        </div>
      )}
    </div>
  );


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
      </div >
    );
  };

  return (
    <div className="flex flex-col bg-warmwhite dark:bg-charcoal min-h-full pb-32 transition-colors duration-300">
      <div className="px-6 py-6">
        {activeSubView === 'none' && (
          <>
            <div className="bg-white dark:bg-white/5 rounded-[40px] p-8 shadow-sm border border-secondary/20 dark:border-white/10 flex flex-col items-center text-center animate-in fade-in duration-500 transition-colors relative">

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-6 right-6 p-2 text-slate hover:text-primary dark:text-white/40 dark:hover:text-white transition-colors"
                >
                  <Pencil size={20} />
                </button>
              )}

              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-warmwhite dark:border-charcoal shadow-xl relative">
                  <img
                    src={user.profilePhoto || `https://i.pravatar.cc/150?u=${user.uid}`}
                    alt={user.displayName}
                    className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-50' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${user.uid}`;
                    }}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={handleAvatarClick}
                    className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-white rounded-2xl shadow-lg border-2 border-white dark:border-charcoal active:scale-90 transition-transform hover:brightness-110"
                    disabled={isUploading}
                  >
                    <Camera size={16} />
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-3 w-full max-w-[200px]">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-center text-2xl font-black bg-secondary/10 dark:bg-white/10 rounded-xl px-2 py-1 outline-none focus:ring-2 focus:ring-primary text-charcoal dark:text-warmwhite"
                    placeholder="Enter name"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-center mt-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 bg-primary text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Save size={14} /> Save
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setEditName(user.displayName); }}
                      className="flex-1 bg-secondary/20 dark:bg-white/10 text-charcoal dark:text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tight leading-none">{user.displayName}</h2>
                  <p className="text-slate dark:text-support/60 font-bold text-sm mt-2 opacity-60 tracking-tight">{user.phoneNumber}</p>
                </>
              )}

              <p className="text-[10px] text-slate/30 dark:text-white/10 mt-1 font-mono">{user.uid}</p>
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
              <ActionItem label={t('dashboard.vault', currentLanguage)} icon={Archive} onClick={() => onNavigate('documents')} />
            </div>

            <SectionHeader title={t('profile.account', currentLanguage)} icon={Shield} />
            <div className="bg-white dark:bg-white/5 rounded-[32px] px-6 py-1 shadow-sm border border-secondary/20 dark:border-white/10 mb-8 transition-colors">
              {enableTranslation && (
                <ActionItem label={t('profile.language', currentLanguage)} icon={Globe} sublabel={currentLanguage} onClick={() => setActiveSubView('language')} />
              )}
              <ActionItem label={t('profile.logout', currentLanguage)} icon={LogOut} onClick={onLogout} danger />
            </div>
          </>
        )}

        {activeSubView === 'permissions' && <PermissionGroup />}
        {activeSubView === 'theme' && <ThemeSelector />}
        {activeSubView === 'branches' && <ManageBranches />}
        {activeSubView === 'requests' && (
          <div className="animate-in slide-in-from-right duration-300">
            <SubViewHeader title={t('profile.sub.requests', currentLanguage)} onBack={() => setActiveSubView('none')} />

            {joinRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Mail size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('profile.sub.no_requests', currentLanguage)}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {joinRequests.map((req) => (
                  <div key={req.id} className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-secondary/20 dark:border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-secondary/20 bg-support/20">
                          {req.userAvatar ? (
                            <img src={req.userAvatar} alt={req.userName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-primary">{req.userName.charAt(0)}</div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-charcoal dark:text-warmwhite leading-none mb-1">{req.userName}</h4>
                          <p className="text-[10px] font-bold text-slate dark:text-support/60">{t('profile.sub.request_join', currentLanguage)} <span className="text-primary dark:text-white">{req.familyName}</span></p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate/30 uppercase tracking-widest">
                        {new Date(req.createdAt as any).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          setIsProcessing(true);
                          try {
                            await handleReq(req.id, 'accept');
                          } catch (err) {
                            alert("Failed to accept request");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                        className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
                      >
                        <Check size={16} strokeWidth={3} /> {t('profile.sub.accept', currentLanguage)}
                      </button>
                      <button
                        onClick={async () => {
                          setIsProcessing(true);
                          try {
                            await handleReq(req.id, 'declined');
                          } catch (err) {
                            alert("Failed to decline request");
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
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
        )}
        {activeSubView === 'language' && <LanguageSelector />}
      </div>
    </div>
  );
};

export default Profile;
