import React, { useState } from 'react';
import { User, Memory, Family, Language } from '../types';
import { t } from '../services/i18n';
import {
  ChevronLeft,
  User as UserIcon,
  Play,
  X,
  Heart,
  Share2,
  MessageCircle,
  Clock,
  Calendar,
  Send,
  Check,
  Loader2
} from 'lucide-react';
import { LocalizedText } from './LocalizedText';
import { likeMemory, unlikeMemory, addCommentToMemory } from '../services/firebaseServices';

interface FeedProps {
  memories: Memory[];
  user: User;
  families: Family[];
  currentLanguage: Language;
}

const Feed: React.FC<FeedProps> = ({ memories, user, families, currentLanguage }) => {
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [playingMemory, setPlayingMemory] = useState<Memory | null>(null);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [newComment, setNewComment] = useState('');
  const [showShareToast, setShowShareToast] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const handleLike = async (memoryId: string) => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const memory = memories.find(m => m.id === memoryId);
      if (!memory) return;

      const isLiked = memory.likes?.includes(user.id);
      if (isLiked) {
        await unlikeMemory(memoryId, user.id);
      } else {
        await likeMemory(memoryId, user.id);
      }
    } catch (err: any) {
      console.error("Error toggling like:", err);
      alert(t('common.error', currentLanguage) || "Error updating like. Check your connection or permissions.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async (memoryId: string) => {
    if (!newComment.trim() || isCommenting) return;
    setIsCommenting(true);
    try {
      await addCommentToMemory(memoryId, user.id, user.name, newComment);
      setNewComment('');
    } catch (err: any) {
      console.error("Error adding comment:", err);
      alert(t('common.error', currentLanguage) || "Error adding comment.");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async (memory: Memory) => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const shareData: any = {
        title: t('feed.share_title_tag', currentLanguage),
        text: `${t('feed.share_text', currentLanguage)}: ${memory.questionText || t('feed.shared_story_default', currentLanguage)}`,
        url: memory.videoUrl, // Use the real video URL
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(memory.videoUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (err) {
      console.warn('Native share failed, falling back to clipboard', err);
      try {
        await navigator.clipboard.writeText(memory.videoUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      } catch (clipErr) {
        console.error('Clipboard fallback failed', clipErr);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const filteredMemories = filter === 'all'
    ? memories
    : memories.filter(m => m.responderId === user.id);

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full text-center space-y-8 animate-in fade-in duration-700 bg-warmwhite dark:bg-charcoal">
        <div className="w-56 h-56 bg-secondary/20 dark:bg-white/5 rounded-full flex items-center justify-center relative">
          <div className="w-20 h-20 border-2 border-secondary/40 dark:border-white/10 rounded-full flex items-center justify-center">
            <Play size={32} className="text-accent ml-1" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-charcoal dark:text-warmwhite">{t('feed.no_memories', currentLanguage)}</h2>
          <p className="text-slate dark:text-support/60 text-[15px] leading-relaxed max-w-[280px] mx-auto">
            {t('dashboard.hero.title', currentLanguage)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-warmwhite dark:bg-charcoal">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-warmwhite/90 dark:bg-charcoal/90 backdrop-blur-md z-20 transition-colors">
        <h1 className="text-[32px] font-bold text-charcoal dark:text-warmwhite tracking-tight transition-colors">{t('feed.title', currentLanguage)}</h1>

        <div className="bg-support/20 dark:bg-white/5 rounded-full p-1 flex items-center border border-support/10 dark:border-white/5">
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'all'
              ? 'bg-primary text-white shadow-md'
              : 'text-primary dark:text-support/60'
              }`}
          >
            {t('feed.all', currentLanguage)}
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'mine'
              ? 'bg-primary text-white shadow-md'
              : 'text-primary dark:text-support/60'
              }`}
          >
            {t('feed.mine', currentLanguage)}
          </button>
        </div>
      </header>

      {/* Grid Content */}
      <div className="flex-1 px-4 overflow-y-auto no-scrollbar pb-32">
        <div className="grid grid-cols-2 gap-3 pt-2">
          {filteredMemories.map((memory) => {
            const displayName = memory.responderId === user.id ? user.name : "Family Member";
            return (
              <div
                key={memory.id}
                onClick={() => setPlayingMemory(memory)}
                className="relative aspect-[3/4.2] rounded-[24px] overflow-hidden bg-support/20 dark:bg-white/5 group cursor-pointer active:scale-[0.98] transition-all shadow-sm border border-secondary/10 dark:border-white/5"
              >
                {/* Visual Placeholder for Video Thumbnail */}
                <div className="absolute inset-0 bg-charcoal flex items-center justify-center">
                  <Play size={24} className="text-white/20" />
                </div>

                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-charcoal/80 to-transparent" />

                <div className="absolute inset-0 p-4 flex flex-col justify-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                      <UserIcon size={12} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">{displayName}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">
                    <LocalizedText
                      text={memory.questionText || t('feed.shared_story_default', currentLanguage)}
                      targetLanguage={currentLanguage}
                      originalLanguage={memory.language}
                      storedTranslation={memory.questionTranslation}
                    />
                  </h3>
                </div>

                <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md p-1.5 rounded-full">
                  <Play size={12} className="text-white fill-white" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Player Modal */}
      {playingMemory && (() => {
        const memory = memories.find(m => m.id === playingMemory.id) || playingMemory;
        return (
          <div className="fixed inset-0 z-[200] bg-black animate-in fade-in duration-300 flex flex-col overflow-hidden">
            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 z-[210] safe-area-top">
              <div className="p-6 flex items-center justify-between">
                <button
                  onClick={() => {
                    setPlayingMemory(null);
                    setShowComments(false);
                  }}
                  className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 text-white active:scale-90 transition-all shadow-2xl"
                >
                  <X size={24} />
                </button>
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                  <Clock size={14} className="text-primary" />
                  <span className="text-xs font-bold text-white uppercase tracking-widest">
                    {new Date(memory.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center bg-black">
              <video
                src={memory.videoUrl}
                autoPlay
                loop
                playsInline
                controls
                className="w-full h-full object-contain"
              />

              {/* Side Action Bar */}
              <div className="absolute right-6 bottom-32 flex flex-col gap-8 items-center z-[210]">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => handleLike(memory.id)}
                    disabled={isLiking}
                    className={`p-4 backdrop-blur-xl rounded-full border border-white/10 transition-all active:scale-75 ${memory.likes?.includes(user.id)
                      ? 'bg-red-500 text-white border-red-400'
                      : 'bg-white/10 text-white'
                      }`}
                  >
                    <Heart size={24} fill={memory.likes?.includes(user.id) ? "currentColor" : "none"} />
                  </button>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{memory.likes?.length || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className={`p-4 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-all ${showComments ? 'bg-primary border-primary' : 'bg-white/10'}`}
                  >
                    <MessageCircle size={24} fill={showComments ? "currentColor" : "none"} />
                  </button>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{memory.comments?.length || 0}</span>
                </div>
                <button
                  onClick={() => handleShare(memory)}
                  disabled={isSharing}
                  className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-all disabled:opacity-50"
                >
                  {isSharing ? <Loader2 size={24} className="animate-spin" /> : <Share2 size={24} />}
                </button>
              </div>

              {/* Bottom Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent z-[210] pointer-events-none">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl bg-support/20">
                    <img
                      src={memory.responderId === user.id ? user.avatarUrl : `https://i.pravatar.cc/150?u=${memory.responderId}`}
                      className="w-full h-full object-cover"
                      alt="Responder"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                      {t('feed.captured_by', currentLanguage)} {memory.responderId === user.id ? t('feed.you', currentLanguage) : t('feed.family_member', currentLanguage)}
                    </p>
                    <h2 className="text-xl font-bold text-white leading-tight tracking-tight">
                      <LocalizedText
                        text={memory.questionText || t('feed.shared_story_default', currentLanguage)}
                        targetLanguage={currentLanguage}
                        originalLanguage={memory.language}
                        storedTranslation={memory.questionTranslation}
                      />
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Bottom Sheet */}
            {showComments && (
              <div className="absolute inset-x-0 bottom-0 z-[220] bg-white dark:bg-charcoal rounded-t-[40px] shadow-[0_-20px_80px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[60vh]">
                <div className="w-12 h-1 bg-slate/20 rounded-full mx-auto my-4 shrink-0" />
                <div className="px-8 pb-4 flex items-center justify-between border-b border-slate/5 dark:border-white/5">
                  <h3 className="text-lg font-black text-charcoal dark:text-warmwhite">{t('feed.replies', currentLanguage)}</h3>
                  <button onClick={() => setShowComments(false)} className="text-slate/40">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 no-scrollbar">
                  {(memory.comments || []).map((comment) => (
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
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment(memory.id)}
                    />
                    <button
                      onClick={() => handleAddComment(memory.id)}
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
      })()}

      {showShareToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[300] bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Check size={18} strokeWidth={3} />
          <span className="text-sm font-black uppercase tracking-widest">{t('feed.link_copied', currentLanguage)}</span>
        </div>
      )}
    </div>
  );
};

export default Feed;
