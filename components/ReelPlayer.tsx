import React, { useState, useRef, useEffect } from 'react';
import { Memory, User, Language } from '../types';
import { t } from '../services/i18n';
import {
    X, Heart, MessageCircle, Share2, Loader2, Clock, Send, Play, User as UserIcon
} from 'lucide-react';
import { LocalizedText } from './LocalizedText';

interface ReelPlayerProps {
    memories: Memory[];
    initialIndex: number;
    user: User | null;
    currentLanguage: Language;
    onClose: () => void;
    onLike: (id: string) => Promise<void>;
    onComment: (id: string, text: string) => Promise<void>;
    onShare: (memory: Memory) => Promise<void>;
    isLiking: boolean;
    isSharing: boolean;
    isCommenting: boolean;
    getDisplayMemory: (memory: Memory) => Memory;
    isPublicView?: boolean;
}

export const ReelPlayer: React.FC<ReelPlayerProps> = ({
    memories,
    initialIndex,
    user,
    currentLanguage,
    onClose,
    onLike,
    onComment,
    onShare,
    isLiking,
    isSharing,
    isCommenting,
    getDisplayMemory,
    isPublicView
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeId, setActiveId] = useState<string>(memories[initialIndex]?.id);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (containerRef.current) {
            const item = containerRef.current.children[initialIndex] as HTMLElement;
            if (item) {
                containerRef.current.scrollTo({
                    top: item.offsetTop,
                    behavior: 'auto'
                });
            }
        }
    }, []);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const scrollPos = containerRef.current.scrollTop;
        const height = containerRef.current.clientHeight;
        const index = Math.round(scrollPos / height);
        if (memories[index] && memories[index].id !== activeId) {
            setActiveId(memories[index].id);
            setShowComments(false); // Hide comments when switching reels
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black animate-in fade-in duration-300 flex flex-col overflow-hidden">
            {/* Scrollable Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar"
            >
                {memories.map((m, idx) => (
                    <ReelItem
                        key={m.id}
                        memory={getDisplayMemory(m)}
                        user={user}
                        currentLanguage={currentLanguage}
                        isActive={activeId === m.id}
                        onLike={() => onLike(m.id)}
                        onShare={() => onShare(m)}
                        onClose={onClose}
                        onToggleComments={() => setShowComments(!showComments)}
                        isLiking={isLiking}
                        isSharing={isSharing}
                        isCommenting={isCommenting}
                        getDisplayMemory={getDisplayMemory}
                        isPublicView={isPublicView}
                    />
                ))}
            </div>

            {/* Side Action Bar CTA for Public User */}
            {isPublicView && (
                <div className="absolute inset-x-0 bottom-6 px-6 z-[220] flex justify-center pointer-events-none">
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="bg-primary text-white font-black text-xs uppercase tracking-[0.2em] px-8 py-4 rounded-full shadow-2xl pointer-events-auto border border-white/20 active:scale-95 transition-all"
                    >
                        Sign in to interact
                    </button>
                </div>
            )}

            {/* Comment Drawer - Minimal for shared view */}
            {showComments && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[250] animate-in fade-in duration-300">
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-charcoal rounded-t-[40px] max-h-[70vh] flex flex-col p-8 pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tighter">
                                {t('feed.comments', currentLanguage)}
                                <span className="ml-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                                    {getDisplayMemory(memories.find(m => m.id === activeId)!).comments?.length || 0}
                                </span>
                            </h2>
                            <button onClick={() => setShowComments(false)} className="p-3 bg-secondary/10 dark:bg-white/5 rounded-2xl">
                                <X size={24} className="text-charcoal dark:text-warmwhite" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-6">
                            {(getDisplayMemory(memories.find(m => m.id === activeId)!).comments || []).map((comment) => (
                                <div key={comment.id} className="flex gap-4 group animate-in slide-in-from-left duration-300">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/5">
                                        <UserIcon size={18} className="text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-xs uppercase tracking-widest text-charcoal dark:text-warmwhite opacity-40">{comment.userName}</span>
                                            <span className="text-[10px] text-slate opacity-40 font-bold tracking-widest uppercase">
                                                {new Date(comment.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-charcoal dark:text-warmwhite font-bold leading-relaxed">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment Input - Hide for public users */}
                        {!isPublicView ? (
                            <div className="pt-6 border-t border-secondary/10 dark:border-white/5 flex gap-3">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder={t('feed.comment_placeholder', currentLanguage)}
                                    className="flex-1 h-16 bg-secondary/5 dark:bg-white/5 rounded-[24px] px-6 font-bold text-charcoal dark:text-warmwhite placeholder:text-slate/40 outline-none focus:ring-4 focus:ring-primary/10 transition-all border border-secondary/10 dark:border-white/5"
                                />
                                <button
                                    onClick={() => {
                                        if (newComment.trim()) {
                                            onComment(activeId, newComment);
                                            setNewComment('');
                                        }
                                    }}
                                    disabled={isCommenting || !newComment.trim()}
                                    className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isCommenting ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                                </button>
                            </div>
                        ) : (
                            <div className="pt-6 border-t border-secondary/10 dark:border-white/5 text-center">
                                <p className="text-slate font-bold text-sm tracking-wide mb-2">Sign in to leave a comment</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface ReelItemProps {
    memory: Memory;
    user: User | null;
    currentLanguage: Language;
    isActive: boolean;
    onLike: () => void;
    onShare: () => void;
    onClose: () => void;
    onToggleComments: () => void;
    isLiking: boolean;
    isSharing: boolean;
    isPublicView?: boolean;
}

const ReelItem: React.FC<ReelItemProps> = ({
    memory, user, currentLanguage, isActive, onLike, onShare, onClose, onToggleComments, isLiking, isSharing, isPublicView
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (videoRef.current) {
            if (isActive) {
                videoRef.current.play().catch(e => console.log('Autoplay blocked', e));
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
                setIsPlaying(false);
            }
        }
    }, [isActive]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    return (
        <div className="h-screen w-screen snap-start relative flex items-center justify-center bg-black overflow-hidden">
            {/* Video with click to play/pause */}
            <video
                ref={videoRef}
                src={memory.videoUrl}
                poster={memory.thumbnailUrl}
                loop
                playsInline
                className="w-full h-full object-contain"
                onClick={togglePlay}
            />

            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-110">
                        <Play size={40} fill="currentColor" />
                    </div>
                </div>
            )}

            {/* Top Header */}
            <div className="absolute top-0 left-0 right-0 z-[210] safe-area-top">
                <div className="p-6 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="p-3 bg-red-500 text-white rounded-2xl border border-red-400 active:scale-90 transition-all shadow-2xl hover:bg-red-600"
                    >
                        <X size={24} strokeWidth={3} />
                    </button>
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                        <Clock size={14} className="text-primary" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">
                            {new Date(memory.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Side Action Bar */}
            <div className="absolute right-6 bottom-32 flex flex-col gap-8 items-center z-[210]">
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={isPublicView ? undefined : onLike}
                        disabled={isLiking || isPublicView}
                        className={`p-4 backdrop-blur-xl rounded-full border border-white/10 transition-all ${!isPublicView && 'active:scale-75'} ${(!isPublicView && memory.likes?.includes(user?.uid || ''))
                            ? 'bg-red-500 text-white border-red-400 font-bold'
                            : 'bg-white/10 text-white'
                            } ${isPublicView ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Heart size={24} fill={(!isPublicView && memory.likes?.includes(user?.uid || '')) ? "currentColor" : "none"} />
                    </button>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{memory.likes?.length || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={onToggleComments}
                        className={`p-4 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-all bg-white/10`}
                    >
                        <MessageCircle size={24} />
                    </button>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{(memory.comments || []).length}</span>
                </div>
                <button
                    onClick={onShare}
                    disabled={isSharing}
                    className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-all disabled:opacity-50"
                >
                    {isSharing ? <Loader2 size={24} className="animate-spin" /> : <Share2 size={24} />}
                </button>
            </div>

            {/* Bottom Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent z-[210] pointer-events-none">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl bg-support/20 px-0">
                        <img
                            src={(user && memory.authorId === user.uid) ? (user.profilePhoto || `https://i.pravatar.cc/150?u=${user.uid}`) : `https://i.pravatar.cc/150?u=${memory.authorId}`}
                            className="w-full h-full object-cover"
                            alt="Responder"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${memory.authorId}`;
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                            {t('feed.captured_by', currentLanguage)} {memory.authorName || ((user && memory.authorId === user.uid) ? t('feed.you', currentLanguage) : t('feed.family_member', currentLanguage))}
                        </p>
                        <h2 className="text-xl font-bold text-white leading-tight tracking-tight">
                            <LocalizedText
                                text={memory.questionText || t('feed.shared_story_default', currentLanguage)}
                                targetLanguage={currentLanguage}
                                originalLanguage={memory.language}
                            />
                        </h2>
                    </div>
                </div>
            </div>
        </div>
    );
};
