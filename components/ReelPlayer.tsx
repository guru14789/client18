import React, { useState, useRef, useEffect } from 'react';
import { Memory, User, Language } from '../types';
import { t } from '../services/i18n';
import {
    X, Heart, MessageCircle, Share2, Loader2, Clock, Send, Play
} from 'lucide-react';
import { LocalizedText } from './LocalizedText';

interface ReelPlayerProps {
    memories: Memory[];
    initialIndex: number;
    user: User;
    currentLanguage: Language;
    onClose: () => void;
    onLike: (id: string) => Promise<void>;
    onComment: (id: string, text: string) => Promise<void>;
    onShare: (memory: Memory) => Promise<void>;
    isLiking: boolean;
    isSharing: boolean;
    isCommenting: boolean;
    getDisplayMemory: (memory: Memory) => Memory;
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
    getDisplayMemory
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
                        isActive={m.id === activeId}
                        onLike={() => onLike(m.id)}
                        onShare={() => onShare(m)}
                        onClose={onClose}
                        onToggleComments={() => setShowComments(!showComments)}
                        isLiking={isLiking}
                        isSharing={isSharing}
                    />
                ))}
            </div>

            {/* Shared Comments Tray (Optional - could also be inside ReelItem) */}
            {showComments && activeId && (
                <div className="absolute inset-x-0 bottom-0 z-[220] bg-white dark:bg-charcoal rounded-t-[40px] shadow-[0_-20px_80px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[60vh]">
                    <div className="w-12 h-1 bg-slate/20 rounded-full mx-auto my-4 shrink-0" />
                    <div className="px-8 pb-4 flex items-center justify-between border-b border-slate/5 dark:border-white/5">
                        <h3 className="text-lg font-black text-charcoal dark:text-warmwhite">{t('feed.replies', currentLanguage)}</h3>
                        <button onClick={() => setShowComments(false)} className="text-slate/40">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 no-scrollbar">
                        {(getDisplayMemory(memories.find(m => m.id === activeId)!).comments || []).map((comment) => (
                            <div key={comment.id} className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-support/20 dark:bg-white/10 shrink-0 flex items-center justify-center font-bold text-primary dark:text-white">
                                    {comment.userName.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-black text-charcoal dark:text-warmwhite">{comment.userName}</span>
                                        <span className="text-[10px] font-bold text-slate/40 uppercase tracking-widest">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm text-slate dark:text-support/80 leading-relaxed font-medium">
                                        {comment.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-slate/5 dark:border-white/5 safe-area-bottom">
                        <div className="flex items-center gap-3 bg-secondary/10 dark:bg-white/5 p-2 rounded-[24px] border border-secondary/20 dark:border-white/10">
                            <input
                                type="text"
                                placeholder={t('feed.reply_placeholder', currentLanguage)}
                                className="flex-1 bg-transparent px-4 py-2 text-sm font-bold text-charcoal dark:text-warmwhite outline-none placeholder:font-medium"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && onComment(activeId, newComment).then(() => setNewComment(''))}
                            />
                            <button
                                onClick={() => onComment(activeId, newComment).then(() => setNewComment(''))}
                                disabled={!newComment.trim() || isCommenting}
                                className="w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all disabled:opacity-50"
                            >
                                {isCommenting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} fill="currentColor" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface ReelItemProps {
    memory: Memory;
    user: User;
    currentLanguage: Language;
    isActive: boolean;
    onLike: () => void;
    onShare: () => void;
    onClose: () => void;
    onToggleComments: () => void;
    isLiking: boolean;
    isSharing: boolean;
}

const ReelItem: React.FC<ReelItemProps> = ({
    memory, user, currentLanguage, isActive, onLike, onShare, onClose, onToggleComments, isLiking, isSharing
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
                        className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 text-white active:scale-90 transition-all shadow-2xl"
                    >
                        <X size={24} />
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
                        onClick={onLike}
                        disabled={isLiking}
                        className={`p-4 backdrop-blur-xl rounded-full border border-white/10 transition-all active:scale-75 ${(memory.likes || []).includes(user.uid)
                            ? 'bg-red-500 text-white border-red-400 font-bold'
                            : 'bg-white/10 text-white'
                            }`}
                    >
                        <Heart size={24} fill={(memory.likes || []).includes(user.uid) ? "currentColor" : "none"} />
                    </button>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{(memory.likes || []).length}</span>
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
                            src={memory.authorId === user.uid ? (user.profilePhoto || `https://i.pravatar.cc/150?u=${user.uid}`) : `https://i.pravatar.cc/150?u=${memory.authorId}`}
                            className="w-full h-full object-cover"
                            alt="Responder"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${memory.authorId}`;
                            }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                            {t('feed.captured_by', currentLanguage)} {memory.authorName || (memory.authorId === user.uid ? t('feed.you', currentLanguage) : t('feed.family_member', currentLanguage))}
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
