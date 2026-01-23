import React, { useState } from 'react';
import { Users, Plus, X, Info, Share2, CheckCircle, Mail, ChevronLeft } from 'lucide-react';
import { User, Family, Language } from '../types';
import { t } from '../services/i18n';
import { LocalizedText } from './LocalizedText';
import { getUsers, addFamilyAdmin, generateSecureInvite } from '../services/firebaseServices';

interface FamiliesProps {
    user: User;
    families: Family[];
    currentLanguage: Language;
    activeFamilyId: string | null;
    onSwitchFamily: (id: string) => void;
    onNavigate: (view: any) => void;
}

const Families: React.FC<FamiliesProps> = ({
    user,
    families,
    currentLanguage,
    activeFamilyId,
    onSwitchFamily,
    onNavigate
}) => {
    const [viewingMembersFamily, setViewingMembersFamily] = useState<Family | null>(null);
    const [groupMembers, setGroupMembers] = useState<User[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isPromoting, setIsPromoting] = useState<string | null>(null);
    const [showInviteFeedback, setShowInviteFeedback] = useState(false);

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
        <div className="flex flex-col min-h-screen bg-warmwhite dark:bg-charcoal animate-in fade-in duration-500">
            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-center gap-4">
                <button
                    onClick={() => onNavigate('home')}
                    className="p-3 bg-white dark:bg-charcoal/50 rounded-2xl shadow-sm border border-secondary/20 dark:border-white/10 active:scale-90 transition-transform"
                >
                    <ChevronLeft size={20} className="text-charcoal dark:text-warmwhite" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-charcoal dark:text-warmwhite tracking-tighter leading-tight">
                        {t('dashboard.families_title', currentLanguage)}
                    </h1>
                    <p className="text-[10px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em]">
                        {t('dashboard.families_subtitle', currentLanguage)}
                    </p>
                </div>
            </div>

            <div className="flex-1 px-6 pt-4 pb-32">
                <div className="grid gap-4">
                    {families.map((family) => {
                        const isActive = family.id === activeFamilyId;
                        const isAdmin = family.admins?.includes(user.uid);

                        return (
                            <div
                                key={family.id}
                                className={`group relative w-full flex flex-col p-6 rounded-[32px] transition-all border text-left overflow-hidden ${isActive
                                    ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]'
                                    : 'bg-white dark:bg-white/5 border-secondary/20 dark:border-white/10 text-charcoal dark:text-warmwhite hover:border-primary/30'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                                )}

                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                                        <Users size={22} className={isActive ? 'text-white' : 'text-primary'} />
                                    </div>

                                    <div className="flex gap-2">
                                        <div
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${isActive ? 'bg-white/20 border-white/20 text-white' : 'bg-secondary/10 dark:bg-white/5 border-transparent text-slate dark:text-support/40'
                                                }`}
                                            onClick={() => handleViewMembers(family)}
                                        >
                                            <Info size={16} />
                                        </div>
                                        {isAdmin && (
                                            <div
                                                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${isActive ? 'bg-white/20 border-white/20 text-white' : 'bg-secondary/10 dark:bg-white/5 border-transparent text-slate dark:text-support/40'
                                                    }`}
                                                onClick={() => handleShareInvite(family)}
                                            >
                                                {showInviteFeedback && isActive ? <CheckCircle size={16} /> : <Share2 size={16} />}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <h4 className="font-black text-xl leading-none">
                                        <LocalizedText
                                            text={family.familyName}
                                            targetLanguage={currentLanguage}
                                            originalLanguage={family.defaultLanguage as any}
                                        />
                                    </h4>

                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center -space-x-1.5 auto-cols-max">
                                            {family.members.slice(0, 3).map((mid) => (
                                                <div key={mid} className={`w-6 h-6 rounded-full border-2 overflow-hidden bg-support ${isActive ? 'border-primary' : 'border-white dark:border-charcoal'}`}>
                                                    <img
                                                        src={`https://i.pravatar.cc/150?u=${mid}`}
                                                        className="w-full h-full object-cover"
                                                        alt="Member"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${mid}`;
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                            {family.members.length > 3 && (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-black border-2 backdrop-blur-sm ${isActive ? 'bg-white/20 border-primary text-white' : 'bg-black/10 dark:bg-white/10 border-white dark:border-charcoal text-charcoal dark:text-warmwhite'
                                                    }`}>
                                                    +{family.members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-slate/40'}`}>
                                            {family.members.length} {family.members.length === 1 ? t('dashboard.member', currentLanguage) : t('dashboard.members', currentLanguage)}
                                        </span>
                                    </div>
                                </div>

                                {!isActive && (
                                    <button
                                        onClick={() => {
                                            onSwitchFamily(family.id);
                                            onNavigate('home');
                                        }}
                                        className="mt-6 w-full py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                                    >
                                        {t('dashboard.switch', currentLanguage)}
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    <button
                        onClick={() => onNavigate('branches')}
                        className="group w-full py-5 rounded-[28px] border-2 border-dashed border-secondary/40 hover:border-primary/50 text-slate/60 hover:text-primary font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] mt-4"
                    >
                        <div className="w-8 h-8 rounded-full bg-secondary/10 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <Plus size={16} />
                        </div>
                        {t('dashboard.create_new', currentLanguage)}
                    </button>
                </div>
            </div>

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
                                    </div>
                                </div>
                                <button onClick={() => setViewingMembersFamily(null)} className="p-3.5 bg-red-50 dark:bg-red-950/20 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/10 text-red-500 active:scale-90 transition-transform">
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-4">
                            {isLoadingMembers ? (
                                <div className="py-20 flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-inner"></div>
                                    <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">Loading...</p>
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
                                        {member.uid === user.uid && (
                                            <div className="px-3 py-1 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                                                {t('feed.you', currentLanguage)}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
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
    );
};

export default Families;
