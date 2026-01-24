import React, { useState } from 'react';
import { PullToRefresh } from './PullToRefresh';
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
import { likeMemory, unlikeMemory, addCommentToMemory, blobUrlToFile } from '../services/firebaseServices';
import { ReelPlayer } from './ReelPlayer';

interface FeedProps {
  memories: Memory[];
  user: User;
  families: Family[];
  currentLanguage: Language;
  onRefresh: () => Promise<void>;
  initialMemoryId?: string | null;
  onClearInitialMemory?: () => void;
  sharedMemory?: Memory | null;
}

const Feed: React.FC<FeedProps> = ({ memories, user, families, currentLanguage, onRefresh, initialMemoryId, onClearInitialMemory, sharedMemory }) => {
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [playingMemoryId, setPlayingMemoryId] = useState<string | null>(initialMemoryId || null);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [newComment, setNewComment] = useState('');
  const [showShareToast, setShowShareToast] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const [optimisticCache, setOptimisticCache] = useState<Record<string, Partial<Memory>>>({});

  // Handle incoming memoryId from URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mid = params.get('memoryId');
    if (mid) {
      setPlayingMemoryId(mid);
      // Clean up URL for cleaner look
      const newUrl = window.location.pathname + window.location.search.replace(/memoryId=[^&]*(&|$)/, '').replace(/[?&]$/, '');
      window.history.replaceState({}, document.title, newUrl || "/");
    }
  }, []);

  // Helper to merge server data with local optimistic updates
  const getDisplayMemory = (memory: Memory) => {
    if (!optimisticCache[memory.id]) return memory;
    return { ...memory, ...optimisticCache[memory.id] };
  };

  const handleLike = async (memoryId: string) => {
    if (isLiking) return;
    setIsLiking(true);

    const originalMemory = memories.find(m => m.id === memoryId);
    if (!originalMemory) return;

    // 1. Optimistic Update
    const currentMemory = getDisplayMemory(originalMemory);
    const isLiked = (currentMemory.likes || []).includes(user.uid);

    const newLikes = isLiked
      ? (currentMemory.likes || []).filter(id => id !== user.uid)
      : [...(currentMemory.likes || []), user.uid];

    setOptimisticCache(prev => ({
      ...prev,
      [memoryId]: { ...prev[memoryId], likes: newLikes }
    }));

    try {
      // 2. Server Update
      if (isLiked) {
        await unlikeMemory(memoryId, originalMemory.authorId, user.uid);
      } else {
        await likeMemory(memoryId, originalMemory.authorId, user.uid);
      }
    } catch (err: any) {
      console.error("Error toggling like:", err);
      // Revert on error (optional, or just alert)
      alert(t('common.error', currentLanguage) || "Error updating like.");
      setOptimisticCache(prev => {
        const newState = { ...prev };
        delete newState[memoryId];
        return newState;
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async (memoryId: string, textOverride?: string) => {
    const commentText = textOverride || newComment;
    if (!commentText.trim() || isCommenting) return;
    setIsCommenting(true);

    const originalMemory = memories.find(m => m.id === memoryId);
    if (!originalMemory) return;

    const tempCommentId = Date.now().toString();

    // 1. Optimistic Update
    const currentMemory = getDisplayMemory(originalMemory);
    const tempComment = {
      id: tempCommentId,
      userId: user.uid,
      userName: user.displayName,
      text: commentText,
      timestamp: new Date().toISOString()
    };

    setOptimisticCache(prev => ({
      ...prev,
      [memoryId]: {
        ...prev[memoryId],
        comments: [...(currentMemory.comments || []), tempComment]
      }
    }));

    if (!textOverride) setNewComment(''); // Clear input if using local state

    try {
      // 2. Server Update
      await addCommentToMemory(memoryId, originalMemory.authorId, user.uid, user.displayName, commentText);
    } catch (err: any) {
      console.error("Error adding comment:", err);
      alert(t('common.error', currentLanguage) || "Error adding comment.");
      // Revert cache if needed
      setOptimisticCache(prev => {
        const newState = { ...prev };
        if (newState[memoryId] && newState[memoryId].comments) {
          newState[memoryId].comments = newState[memoryId].comments?.filter(c => c.id !== tempCommentId);
        }
        return newState;
      });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async (memory: Memory) => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const questionLabel = t('record.question_label', currentLanguage) || 'Question';
      const questionText = memory.questionText || t('feed.shared_story_default', currentLanguage);
      const watchUrl = `${window.location.origin}/v/${memory.id}`;
      const shareTitle = t('feed.share_title_tag', currentLanguage) || 'Inai Family Memory';

      const fullShareText = `${questionLabel}: ${questionText}\n\nVideo: ${watchUrl}`;

      const shareData: any = {
        title: shareTitle,
        text: fullShareText,
      };

      // Try to include thumbnail as a file for better WhatsApp/social sharing
      if (memory.thumbnailUrl) {
        try {
          const file = await blobUrlToFile(memory.thumbnailUrl, 'thumbnail.jpg');

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          } else {
            shareData.url = watchUrl;
          }
        } catch (fileErr) {
          console.warn('Could not prepare thumbnail for sharing:', fileErr);
          shareData.url = watchUrl;
        }
      } else {
        shareData.url = watchUrl;
      }

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            const fallbackText = `${fullShareText}`;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fallbackText)}`;
            window.open(whatsappUrl, '_blank');
          }
        }
      } else {
        const fallbackText = `${fullShareText}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fallbackText)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.warn('Share operation failed', err);
    } finally {
      setIsSharing(false);
    }
  };

  const filteredMemories = filter === 'all'
    ? memories
    : memories.filter(m => m.authorId === user.uid);

  if (memories.length === 0) {
    // ... (Empty state logic, unchanged mostly but ensuring consistent returns)
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
      <PullToRefresh onRefresh={onRefresh}>
        <div className="flex-1 px-4 pb-32">
          <div className="grid grid-cols-2 gap-3 pt-2">
            {filteredMemories.map((memory) => {
              const displayName = memory.authorName || (memory.authorId === user.uid ? user.displayName : (t('feed.family_member', currentLanguage) || "Family Member"));
              return (
                <div
                  key={memory.id}
                  onClick={() => setPlayingMemoryId(memory.id)}
                  className="relative aspect-[3/4.2] rounded-[24px] overflow-hidden bg-support/20 dark:bg-white/5 group cursor-pointer active:scale-[0.98] transition-all shadow-sm border border-secondary/10 dark:border-white/5"
                >
                  <div className="absolute inset-0 bg-charcoal flex items-center justify-center">
                    {memory.thumbnailUrl ? (
                      <img src={memory.thumbnailUrl} className="w-full h-full object-cover" alt="Memory" />
                    ) : (
                      <Play size={24} className="text-white/20" />
                    )}
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
      </PullToRefresh>

      {/* Video Player Modal */}
      {playingMemoryId && (() => {
        // Find in regular list first
        let initialIndex = filteredMemories.findIndex(m => m.id === playingMemoryId);
        let playbackList = filteredMemories;

        // If not in the list but we have the shared memory object, use that
        if (initialIndex === -1 && sharedMemory && sharedMemory.id === playingMemoryId) {
          playbackList = [sharedMemory, ...filteredMemories];
          initialIndex = 0;
        }

        if (initialIndex === -1) return null;

        return (
          <ReelPlayer
            memories={playbackList}
            initialIndex={initialIndex}
            user={user}
            currentLanguage={currentLanguage}
            onClose={() => {
              setPlayingMemoryId(null);
              setShowComments(false);
              if (onClearInitialMemory) onClearInitialMemory();
            }}
            onLike={handleLike}
            onComment={handleAddComment}
            onShare={handleShare}
            isLiking={isLiking}
            isSharing={isSharing}
            isCommenting={isCommenting}
            getDisplayMemory={getDisplayMemory}
          />
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
