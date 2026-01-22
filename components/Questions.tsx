import React, { useState, useEffect } from 'react';
import { PullToRefresh } from './PullToRefresh';
import {
  PlusCircle,
  ThumbsUp,
  Video,
  ChevronRight,
  Send,
  Languages,
  Loader2,
  Play,
  X,
  ChevronDown,
  Archive,
  CheckCircle,
  Plus
} from 'lucide-react';
import { Question, User, Family, Language, Memory } from '../types';
import { t } from '../services/i18n';
import { LocalizedText } from './LocalizedText';

interface QuestionsProps {
  user: User;
  families: Family[];
  onAnswer: (q: Question) => void;
  onRecordQuestion: () => void;
  currentLanguage: Language;
  questions: Question[];
  onToggleUpvote: (id: string, askedBy: string) => void;
  onArchiveQuestion: (id: string) => void;
  onAddQuestion: (q: Question) => void;
  activeFamilyId: string | null;
  memories: Memory[];
  onRefresh: () => Promise<void>;
  onNavigate: (view: any) => void;
}

const Questions: React.FC<QuestionsProps> = ({ user, families, onAnswer, onRecordQuestion, currentLanguage, questions, onToggleUpvote, onArchiveQuestion, onAddQuestion, activeFamilyId, memories, onRefresh, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [optimisticUpvotes, setOptimisticUpvotes] = useState<Record<string, string[]>>({});

  const answeredQuestionIds = memories
    .filter(m => m.authorId === user.uid && m.questionId)
    .map(m => m.questionId!);

  const activePrompts = questions.filter(q =>
    !user.archivedQuestionIds?.includes(q.id) &&
    !answeredQuestionIds.includes(q.id)
  );

  const archivedPrompts = questions.filter(q =>
    user.archivedQuestionIds?.includes(q.id) ||
    answeredQuestionIds.includes(q.id)
  );

  const handleToggleUpvote = async (questionId: string, askedBy: string) => {
    // 1. Optimistic Update
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const currentUpvotes = optimisticUpvotes[questionId] || question.upvotes || [];
    const hasUpvoted = currentUpvotes.includes(user.uid);

    const newUpvotes = hasUpvoted
      ? currentUpvotes.filter(id => id !== user.uid)
      : [...currentUpvotes, user.uid];

    setOptimisticUpvotes(prev => ({
      ...prev,
      [questionId]: newUpvotes
    }));

    // 2. Server Update
    try {
      await onToggleUpvote(questionId, askedBy);
    } catch (err) {
      console.error("Error toggling upvote:", err);
      // Revert on error
      setOptimisticUpvotes(prev => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    }
  };


  return (
    <div className="h-full relative overflow-hidden bg-warmwhite dark:bg-charcoal">
      <PullToRefresh onRefresh={onRefresh}>
        <div className="min-h-full pb-32 relative transition-colors duration-300">
          <div className="p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-charcoal dark:text-warmwhite tracking-tighter leading-none">{t('questions.title', currentLanguage)}</h1>
                <p className="text-[10px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em] mt-2">{t('questions.asked', currentLanguage)}</p>
              </div>
              <button
                onClick={() => onNavigate('ask_question')}
                className="group flex items-center gap-3 bg-primary text-white pl-6 pr-5 py-3.5 rounded-2xl font-black shadow-xl shadow-primary/20 active:scale-95 transition-all text-[11px] uppercase tracking-widest hover:brightness-110"
              >
                {t('dashboard.new', currentLanguage)}
                <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform">
                  <PlusCircle size={14} />
                </div>
              </button>
            </div>



            <div className="flex justify-center mb-8">
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

            <div className="space-y-6">
              {activeTab === 'active' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {activePrompts.length > 0 ? (
                    activePrompts.sort((a, b) => {
                      const upvotesA = optimisticUpvotes[a.id] || a.upvotes || [];
                      const upvotesB = optimisticUpvotes[b.id] || b.upvotes || [];
                      return (upvotesB.length) - (upvotesA.length);
                    }).map((q) => {
                      const currentUpvotes = optimisticUpvotes[q.id] || q.upvotes || [];
                      const upvotesCount = currentUpvotes.length;
                      const hasUpvoted = currentUpvotes.includes(user.uid);

                      return (
                        <div key={q.id} className="group bg-white dark:bg-white/5 border border-secondary/20 dark:border-white/10 rounded-[44px] p-8 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveQuestion(q.id);
                            }}
                            className="absolute top-6 right-8 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-all group-hover:scale-110"
                            title="Ignore question"
                          >
                            <X size={18} strokeWidth={3} />
                          </button>
                          <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-support/20 dark:bg-white/10 flex items-center justify-center text-primary dark:text-white font-black text-xl border border-white dark:border-charcoal shadow-sm">
                                {q.askedByName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">{q.askedByName}</p>
                                <p className="text-[8px] font-bold text-slate/40 dark:text-support/40 uppercase tracking-tighter mt-1">{t('questions.asked', currentLanguage)}</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h3 className="text-[22px] font-black text-charcoal dark:text-warmwhite leading-tight tracking-tight">
                                <LocalizedText
                                  text={q.text.english || ''}
                                  targetLanguage={currentLanguage}
                                  originalLanguage={Language.ENGLISH}
                                  storedTranslation={q.text.translated}
                                />
                              </h3>
                            </div>

                            {q.type === 'video' && q.videoUrl && (
                              <div
                                className="relative w-full aspect-video rounded-[32px] overflow-hidden bg-charcoal group cursor-pointer border border-secondary/10 dark:border-white/5 active:scale-[0.98] transition-all shadow-inner"
                                onClick={() => onAnswer(q)}
                              >
                                <video src={q.videoUrl} poster={q.thumbnailUrl || undefined} className="w-full h-full object-cover" muted playsInline />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl scale-110 group-hover:scale-125 transition-transform">
                                    <Play size={28} className="text-white fill-white ml-1" />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-2">
                              <button
                                onClick={() => onAnswer(q)}
                                className="flex-1 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all px-4"
                              >
                                <Video size={20} className="text-white shrink-0" strokeWidth={3} />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">{t('questions.answer', currentLanguage)}</span>
                              </button>

                              <button
                                onClick={() => handleToggleUpvote(q.id, q.askedBy)}
                                className={`h-16 px-6 rounded-[24px] flex flex-col items-center justify-center border transition-all active:scale-[0.95] ${hasUpvoted
                                  ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20'
                                  : 'bg-charcoal/5 dark:bg-white/5 border-secondary/20 dark:border-white/10'
                                  }`}
                              >
                                <span className={`text-[18px] font-black leading-none tracking-tight ${hasUpvoted ? 'text-white' : 'text-charcoal dark:text-warmwhite'}`}>
                                  {upvotesCount}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <ThumbsUp size={8} className={`${hasUpvoted ? 'text-white fill-white' : 'text-slate'}`} />
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${hasUpvoted ? 'text-white/80' : 'text-slate/40'}`}>
                                    {hasUpvoted ? t('dashboard.upvoted', currentLanguage) : t('dashboard.upvotes', currentLanguage)}
                                  </span>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                      <CheckCircle size={48} className="text-primary" />
                      <p className="text-[11px] font-black uppercase tracking-[0.2em]">All caught up!</p>
                    </div>
                  )}

                  {/* Create New Question CTA at bottom of active tab */}
                  <button
                    onClick={() => onNavigate('ask_question')}
                    className="w-full py-10 bg-white/50 dark:bg-white/5 border-2 border-dashed border-secondary/20 dark:border-white/10 rounded-[44px] flex flex-col items-center justify-center gap-4 hover:bg-white dark:hover:bg-white/10 hover:border-primary/50 transition-all group"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                      <Plus size={32} strokeWidth={3} />
                    </div>
                    <div className="text-center">
                      <p className="text-charcoal dark:text-warmwhite font-black text-lg">Create a new question</p>
                      <p className="text-slate/40 text-[10px] font-bold uppercase tracking-widest mt-1">Start a new family conversation</p>
                    </div>
                  </button>
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
                            onClick={() => onAnswer(q)}
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
                      <p className="text-[11px] font-black uppercase tracking-[0.2em]">No archived questions</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Floating Action Button - Positioned at right-center for easy access */}
      {/* Uses absolute instead of fixed to stay aligned with the max-w-md container on desktop */}
      <button
        onClick={() => onNavigate('ask_question')}
        className={`absolute top-[45%] -translate-y-1/2 right-4 sm:right-6 z-[100] w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-95 transition-all duration-500 hover:scale-110 hover:-translate-x-1 scale-100 opacity-100`}
        title="Ask a Question"
      >
        <Plus size={28} strokeWidth={3} />
      </button>
    </div>
  );
};

export default Questions;