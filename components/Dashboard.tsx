import React, { useState, useEffect } from 'react';
import { PullToRefresh } from './PullToRefresh';
import { Users, Archive, Plus, Video, X, Globe, MapPin, Info, ThumbsUp, Play, Loader2, Share2, CheckCircle, Mail } from 'lucide-react';
import { User, Family, Question, Language, Memory } from '../types';
import { t } from '../services/i18n';
import { LocalizedText } from './LocalizedText';
import { getUsers, addFamilyAdmin, generateSecureInvite } from '../services/firebaseServices';

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
  onToggleUpvote: (id: string, askedBy: string) => void;
  onArchiveQuestion: (questionId: string) => void;
  memories: Memory[];
  onRefresh: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ user, families, onNavigate, onRecord, onAddFamily, currentLanguage, activeFamilyId, onSwitchFamily, prompts, onToggleUpvote, onArchiveQuestion, memories, onRefresh }) => {
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isSwitchingFamily, setIsSwitchingFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyLang, setNewFamilyLang] = useState<Language>(Language.TAMIL);
  const [greeting, setGreeting] = useState('Hello');
  const [viewingMembersFamily, setViewingMembersFamily] = useState<Family | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);
  const [showInviteFeedback, setShowInviteFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const activeFamily = families.find(f => f.id === activeFamilyId) || families[0];

  const answeredQuestionIds = memories
    .filter(m => m.authorId === user.uid && m.questionId)
    .map(m => m.questionId!);

  const activePrompts = prompts.filter(q =>
    !user.archivedQuestionIds?.includes(q.id) &&
    !answeredQuestionIds.includes(q.id)
  );

  const archivedPrompts = prompts.filter(q =>
    user.archivedQuestionIds?.includes(q.id) ||
    answeredQuestionIds.includes(q.id)
  );

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

  const handleCreateFamily = () => {
    if (newFamilyName.trim()) {
      onAddFamily(newFamilyName, newFamilyLang);
      setNewFamilyName('');
      setIsCreatingFamily(false);
    }
  };

  const handleViewMembers = async (family: Family) => {
    setViewingMembersFamily(family);
    setIsLoadingMembers(true);
    try {
      const members = await getUsers(family.members);
      setGroupMembers(members);
    } catch (err) {
      console.error("Error fetching group members:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    if (!viewingMembersFamily) return;
    setIsPromoting(memberId);
    try {
      await addFamilyAdmin(viewingMembersFamily.id, memberId);
      // Update local state to reflect change immediately
      setViewingMembersFamily({
        ...viewingMembersFamily,
        admins: [...(viewingMembersFamily.admins || []), memberId]
      });
    } catch (err) {
      console.error("Error promoting member:", err);
    } finally {
      setIsPromoting(null);
    }
  };

  const handleShareInvite = async (family: Family) => {
    try {
      setShowInviteFeedback(true);
      const token = await generateSecureInvite(family.id, user.uid);
      const inviteLink = `${window.location.origin}/invite?familyId=${family.id}&token=${token}`;

      navigator.clipboard.writeText(inviteLink);

      // Also try to use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Join our family on Inai!`,
          text: `Join the ${family.familyName} group on Inai to share memories securely!`,
          url: inviteLink
        });
      }

      setTimeout(() => setShowInviteFeedback(false), 2000);
    } catch (err) {
      console.error("Error sharing invite:", err);
      setShowInviteFeedback(false);
      alert("Failed to generate secure invite link.");
    }
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div className="bg-warmwhite dark:bg-charcoal flex-1 pb-32 transition-colors duration-300">
        <div className="px-6 pt-8 pb-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl font-black text-charcoal dark:text-warmwhite tracking-tighter leading-none truncate">{t('dashboard.greeting', currentLanguage)} {user.displayName}</h1>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-slate/60 dark:text-support/40 text-xl font-medium">{greeting}!</p>
            </div>
            {/* Debug UID - helps identify if multiple accounts are being used unintentionally */}
            <p className="text-[8px] font-mono text-slate/20 dark:text-white/5 mt-1 uppercase tracking-widest truncate max-w-[150px]">ID: {user.uid}</p>
          </div>

          <button
            onClick={() => onNavigate('families')}
            className="flex flex-col items-end gap-1 active:scale-95 transition-all outline-none shrink-0"
          >
            <div className="flex items-center gap-2 bg-white/40 dark:bg-white/5 border border-secondary/20 dark:border-white/10 px-4 py-2 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[80px]">
                {activeFamily ? (
                  <LocalizedText
                    text={activeFamily.familyName}
                    targetLanguage={currentLanguage}
                    originalLanguage={activeFamily.defaultLanguage as any}
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
                  onClick={() => onNavigate('questions')}
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

        {/* Prompts Section with Slider */}
        <div className="px-6 space-y-8">
          <div className="flex justify-center">
            <div className="bg-secondary/10 dark:bg-white/5 p-1.5 rounded-[32px] flex items-center w-full max-w-[340px] shadow-inner border border-secondary/5 dark:border-white/5">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 relative ${activeTab === 'active'
                  ? 'bg-white dark:bg-white/10 text-charcoal dark:text-warmwhite shadow-lg shadow-black/5 scale-[1.02]'
                  : 'text-slate/40 dark:text-support/40 hover:text-slate/60'
                  }`}
              >
                Active Questions
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`flex-1 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 relative ${activeTab === 'archived'
                  ? 'bg-white dark:bg-white/10 text-charcoal dark:text-warmwhite shadow-lg shadow-black/5 scale-[1.02]'
                  : 'text-slate/40 dark:text-support/40 hover:text-slate/60'
                  }`}
              >
                Archived Questions
              </button>
            </div>
          </div>

          {activeTab === 'active' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activePrompts.length > 0 ? (
                activePrompts.map((q) => {
                  const hasUpvoted = q.upvotes?.includes(user.uid);
                  return (
                    <div key={q.id} className="bg-white dark:bg-white/5 rounded-[44px] p-8 flex flex-col gap-8 border border-secondary/20 dark:border-white/10 relative transition-all shadow-sm">
                      <button
                        onClick={() => onArchiveQuestion(q.id)}
                        className="absolute top-6 right-8 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-all"
                        title="Ignore question"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>

                      <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-[24px] overflow-hidden shrink-0 border-4 border-warmwhite dark:border-charcoal/50 shadow-xl bg-support/20 dark:bg-white/10 flex items-center justify-center text-primary dark:text-white font-black text-2xl">
                          {q.askedByName.charAt(0)}
                        </div>
                        <div className="flex-1 pr-6">
                          <p className="text-[11px] font-black text-accent/80 dark:text-accent uppercase tracking-[0.15em] mb-1.5">{q.askedByName} {t('questions.asked', currentLanguage)}</p>
                          <h4 className="text-[22px] font-bold text-charcoal dark:text-warmwhite leading-[1.2] tracking-tight">
                            <LocalizedText
                              text={q.text.english || ''}
                              targetLanguage={currentLanguage}
                              originalLanguage={Language.ENGLISH}
                              storedTranslation={q.text.translated}
                            />
                          </h4>
                        </div>
                      </div>

                      {q.type === 'video' && q.videoUrl && (
                        <div
                          className="relative w-full aspect-video rounded-[32px] overflow-hidden bg-charcoal group cursor-pointer border border-secondary/10 dark:border-white/5 active:scale-[0.98] transition-all shadow-inner"
                          onClick={() => onRecord(q)}
                        >
                          <video src={q.videoUrl} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl scale-110 group-hover:scale-125 transition-transform">
                              <Play size={28} className="text-white fill-white ml-1" />
                            </div>
                          </div>
                          <div className="absolute top-4 right-4 px-3 py-1.5 bg-accent/90 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest">
                            Video {t('record.mode.question', currentLanguage)}
                          </div>
                        </div>
                      )}

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
                          onClick={() => onToggleUpvote(q.id, q.askedBy)}
                          className={`flex-1 h-full rounded-[32px] flex flex-col items-center justify-center border transition-all active:scale-95 ${hasUpvoted
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-charcoal/5 dark:bg-white/5 border-secondary/20 dark:border-white/10'
                            }`}
                        >
                          <span className={`text-[24px] font-black leading-none tracking-tight ${hasUpvoted ? 'text-white' : 'text-charcoal dark:text-warmwhite'}`}>
                            {q.upvotes?.length || 0}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            {hasUpvoted && <ThumbsUp size={8} className="text-white fill-white" />}
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${hasUpvoted ? 'text-white/80' : 'text-slate dark:text-support/40'}`}>
                              {hasUpvoted ? t('dashboard.upvoted', currentLanguage) : t('dashboard.upvotes', currentLanguage)}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                  <CheckCircle size={48} className="text-primary" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">{t('dashboard.no_active_prompts', currentLanguage) || "All caught up!"}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {archivedPrompts.length > 0 ? (
                archivedPrompts.map((q) => {
                  const isAnswered = answeredQuestionIds.includes(q.id);
                  return (
                    <div key={q.id} className="bg-white/40 dark:bg-white/5 rounded-[28px] p-5 flex items-center justify-between border border-secondary/10 dark:border-white/5 opacity-80 group hover:opacity-100 transition-all">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-black text-slate/40 uppercase tracking-widest">{q.askedByName}</span>
                          {isAnswered && (
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">Answered</span>
                          )}
                        </div>
                        <h4 className="text-[15px] font-bold text-charcoal/60 dark:text-warmwhite/60 leading-tight truncate">
                          <LocalizedText
                            text={q.text.english || ''}
                            targetLanguage={currentLanguage}
                            originalLanguage={Language.ENGLISH}
                            storedTranslation={q.text.translated}
                          />
                        </h4>
                      </div>
                      <button
                        onClick={() => onRecord(q)}
                        className="w-10 h-10 rounded-2xl bg-secondary/10 dark:bg-white/5 flex items-center justify-center text-secondary dark:text-support/40 hover:bg-primary/20 hover:text-primary transition-all active:scale-90"
                      >
                        <Video size={16} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                  <Archive size={48} className="text-slate/40" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">{t('dashboard.no_archived_prompts', currentLanguage) || "No archived questions"}</p>
                </div>
              )}
            </div>
          )}
        </div>



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

        {/* Group Members Modal */}
        {viewingMembersFamily && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 sm:p-10">
            <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" onClick={() => setViewingMembersFamily(null)}></div>
            <div className="relative w-full max-w-[440px] bg-warmwhite dark:bg-charcoal rounded-[48px] overflow-hidden shadow-2xl border border-white/20 dark:border-white/10 animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
              <div className="p-8 bg-primary/10 border-b border-primary/10 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tight leading-tight">
                      <LocalizedText
                        text={viewingMembersFamily.familyName}
                        targetLanguage={currentLanguage}
                        originalLanguage={viewingMembersFamily.defaultLanguage as any}
                      />
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{viewingMembersFamily.members.length} {t('dashboard.members', currentLanguage)}</p>
                      </div>
                      {viewingMembersFamily.inviteCode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(viewingMembersFamily.inviteCode!);
                            alert(`Invite code ${viewingMembersFamily.inviteCode} copied!`);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-white/10 rounded-xl text-[10px] font-black text-primary dark:text-warmwhite uppercase tracking-widest hover:bg-white/50 transition-all flex items-center gap-1.5 shadow-sm border border-primary/10"
                          title="Click to copy invite code"
                        >
                          <Mail size={12} />
                          {viewingMembersFamily.inviteCode}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewingMembersFamily.admins?.includes(user.uid) && (
                      <button
                        onClick={() => handleShareInvite(viewingMembersFamily)}
                        className={`p-3.5 bg-white dark:bg-white/10 rounded-2xl shadow-sm border border-secondary/10 dark:border-white/5 transition-all active:scale-95 ${showInviteFeedback ? 'text-green-500 scale-105' : 'text-primary'}`}
                      >
                        {showInviteFeedback ? <CheckCircle size={20} /> : <Share2 size={20} />}
                      </button>
                    )}
                    <button onClick={() => setViewingMembersFamily(null)} className="p-3.5 bg-red-50 dark:bg-red-950/20 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/10 text-red-500 active:scale-90 transition-transform">
                      <X size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-4">
                {isLoadingMembers ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-inner"></div>
                    <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">{t('common.loading', currentLanguage)}</p>
                  </div>
                ) : (
                  groupMembers.map((member) => (
                    <div key={member.uid} className="group flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-3xl border border-secondary/10 dark:border-white/5 hover:border-primary/20 transition-all hover:bg-primary/[0.02]">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-support/20 border-2 border-white dark:border-charcoal shadow-sm transition-transform group-hover:scale-105">
                        <img
                          src={member.profilePhoto || `https://i.pravatar.cc/150?u=${member.uid}`}
                          className="w-full h-full object-cover"
                          alt={member.displayName}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${member.uid}`;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-charcoal dark:text-warmwhite truncate text-lg leading-tight">{member.displayName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${viewingMembersFamily.admins?.includes(member.uid)
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-slate/10 text-slate/60 border-slate/10'
                            }`}>
                            {viewingMembersFamily.admins?.includes(member.uid) ? t('common.admin', currentLanguage) : t('dashboard.member', currentLanguage)}
                          </span>
                        </div>
                      </div>
                      {member.uid === user.uid ? (
                        <div className="px-3 py-1 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                          {t('feed.you', currentLanguage)}
                        </div>
                      ) : (
                        viewingMembersFamily.admins?.includes(user.uid) && !viewingMembersFamily.admins?.includes(member.uid) && (
                          <button
                            onClick={() => handlePromoteMember(member.uid)}
                            disabled={isPromoting === member.uid}
                            className="px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent text-[9px] font-black uppercase tracking-widest rounded-xl border border-accent/20 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isPromoting === member.uid ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              t('common.promote', currentLanguage)
                            )}
                          </button>
                        )
                      )}
                    </div>
                  )
                  ))}
              </div>

              <div className="p-8 pt-0 shrink-0">
                <button
                  onClick={() => setViewingMembersFamily(null)}
                  className="w-full py-5 bg-charcoal dark:bg-white text-warmwhite dark:text-charcoal rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-charcoal/20 dark:shadow-white/5 active:scale-[0.98] transition-all hover:brightness-110"
                >
                  {t('common.close', currentLanguage)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};

export default Dashboard;
