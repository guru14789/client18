import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  ThumbsUp,
  Video,
  ChevronRight,
  Send,
  Languages,
  Loader2,
  Play
} from 'lucide-react';
import { Question, User, Family, Language } from '../types';
import { translateQuestion } from '../services/geminiService';
import { t } from '../services/i18n';
import { LocalizedText } from './LocalizedText';

interface QuestionsProps {
  user: User;
  families: Family[];
  onAnswer: (q: Question) => void;
  onRecordQuestion: () => void;
  currentLanguage: Language;
  questions: Question[];
  onToggleUpvote: (id: string) => void;
  onAddQuestion: (q: Question) => void;
  activeFamilyId: string | null;
}

const Questions: React.FC<QuestionsProps> = ({ user, families, onAnswer, onRecordQuestion, currentLanguage, questions, onToggleUpvote, onAddQuestion, activeFamilyId }) => {
  const [isAsking, setIsAsking] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [targetFamilyId, setTargetFamilyId] = useState(activeFamilyId || families[0]?.id || '');
  const [isTranslating, setIsTranslating] = useState(false);

  // No local state for questions anymore

  const handleAsk = async () => {
    if (!newQuestionText) return;

    setIsTranslating(true);
    try {
      // 1. Get an English version for the main text
      let englishText = newQuestionText;
      let translatedText = newQuestionText;

      if (currentLanguage !== Language.ENGLISH) {
        englishText = await translateQuestion(newQuestionText, Language.ENGLISH);
      } else {
        translatedText = await translateQuestion(newQuestionText, Language.TAMIL); // Default translation to Tamil if original is English
      }

      const newQ: Question = {
        id: Date.now().toString(),
        askedBy: user.uid,
        askedByName: user.name,
        textEnglish: englishText,
        textTranslated: translatedText,
        type: 'text',
        upvotes: [],
        familyId: targetFamilyId || activeFamilyId || families[0]?.id || '',
        createdAt: new Date().toISOString()
      };

      onAddQuestion(newQ);
      setNewQuestionText('');
      setIsAsking(false);
    } catch (err) {
      console.error("Error asking question:", err);
    } finally {
      setIsTranslating(false);
    }
  };


  return (
    <div className="bg-warmwhite dark:bg-charcoal min-h-full pb-32 relative transition-colors duration-300">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-charcoal dark:text-warmwhite tracking-tight">{t('questions.title', currentLanguage)}</h1>
          <button
            onClick={() => setIsAsking(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-bold shadow-md shadow-primary/20 active:scale-95 transition-all text-sm"
          >
            <PlusCircle size={18} />
            {t('dashboard.new', currentLanguage)}
          </button>
        </div>

        {isAsking && (
          <div className="fixed inset-0 bg-charcoal/60 dark:bg-black/60 backdrop-blur-sm z-[100] p-6 flex items-center justify-center">
            <div className="bg-warmwhite dark:bg-charcoal w-full max-w-sm rounded-[40px] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 border border-secondary/20 dark:border-white/10">
              <h2 className="text-xl font-bold text-charcoal dark:text-warmwhite">{t('questions.new_title', currentLanguage)}</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate dark:text-support/60 uppercase tracking-widest px-1">{t('questions.branch_label', currentLanguage)}</label>
                  <select
                    className="w-full mt-1 p-4 bg-white dark:bg-white/5 rounded-2xl border border-secondary/30 dark:border-white/10 outline-none font-bold text-charcoal dark:text-warmwhite appearance-none"
                    value={targetFamilyId}
                    onChange={(e) => setTargetFamilyId(e.target.value)}
                  >
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.familyName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate dark:text-support/60 uppercase tracking-widest px-1">{t('questions.question_label', currentLanguage)}</label>
                  <textarea
                    placeholder={t('questions.placeholder', currentLanguage)}
                    className="w-full mt-1 p-4 bg-white dark:bg-white/5 rounded-2xl border border-secondary/30 dark:border-white/10 outline-none h-32 resize-none text-charcoal dark:text-warmwhite placeholder-slate/50"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={onRecordQuestion}
                  className="w-full py-4 bg-accent/20 text-accent font-bold rounded-2xl flex items-center justify-center gap-2 border border-accent/30 transition-all active:scale-95"
                >
                  <Video size={20} />
                  {t('questions.record_video', currentLanguage)}
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAsking(false)}
                    className="flex-1 py-4 text-slate dark:text-support/60 font-bold hover:bg-secondary/20 dark:hover:bg-white/5 rounded-2xl transition-all"
                  >
                    {t('questions.cancel', currentLanguage)}
                  </button>
                  <button
                    onClick={handleAsk}
                    disabled={!newQuestionText || isTranslating}
                    className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isTranslating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    {t('questions.post', currentLanguage)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {questions.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0)).map((q) => {
            const hasUpvoted = q.upvotes?.includes(user.uid);
            return (
              <div key={q.id} className="bg-white dark:bg-white/5 border border-secondary/20 dark:border-white/10 rounded-[32px] p-6 shadow-sm space-y-4 transition-all hover:shadow-md active:scale-[0.99]">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider">{q.askedByName} {t('questions.asked', currentLanguage)}</p>
                      <h3 className="text-lg font-bold text-charcoal dark:text-warmwhite leading-snug">
                        <LocalizedText
                          text={q.textEnglish || ''}
                          targetLanguage={currentLanguage}
                          originalLanguage={Language.ENGLISH}
                          storedTranslation={q.textTranslated}
                        />
                      </h3>
                      {q.textTranslated && q.textTranslated !== q.textEnglish && currentLanguage !== Language.ENGLISH && (
                        <p className="text-primary dark:text-support/60 italic text-sm font-semibold mt-1">
                          {q.textTranslated}
                        </p>
                      )}
                    </div>

                    {q.type === 'video' && q.videoUrl && (
                      <div
                        className="relative w-full aspect-video rounded-3xl overflow-hidden bg-charcoal group cursor-pointer border border-secondary/10 dark:border-white/5 active:scale-[0.98] transition-all shadow-inner mt-4"
                        onClick={() => onAnswer(q)}
                      >
                        <video
                          src={q.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl scale-110 group-hover:scale-125 transition-transform">
                            <Play size={24} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-accent/90 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                          Video {t('record.mode.question', currentLanguage)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => onToggleUpvote(q.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold border ${hasUpvoted
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'text-primary dark:text-white bg-support/10 dark:bg-white/10 border-support/10 dark:border-white/10'
                      }`}
                  >
                    <ThumbsUp size={16} className={hasUpvoted ? 'text-white fill-white' : 'text-primary dark:text-white'} />
                    <span className="text-sm">{q.upvotes?.length || 0}</span>
                  </button>

                  <button
                    onClick={() => onAnswer(q)}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md shadow-primary/10 hover:brightness-110 transition-all active:scale-95"
                  >
                    {t('questions.answer', currentLanguage)}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Questions;