import React, { useState } from 'react';
import {
    X,
    ChevronDown,
    Video,
    Send,
    Loader2
} from 'lucide-react';
import { User, Family, Language, Question } from '../types';
import { t } from '../services/i18n';
import { translateQuestion } from '../services/geminiService';

interface CreateQuestionProps {
    user: User;
    families: Family[];
    onAddQuestion: (q: Question) => void;
    onRecordQuestion: () => void;
    onCancel: () => void;
    currentLanguage: Language;
    activeFamilyId: string | null;
}

const CreateQuestion: React.FC<CreateQuestionProps> = ({
    user,
    families,
    onAddQuestion,
    onRecordQuestion,
    onCancel,
    currentLanguage,
    activeFamilyId
}) => {
    const [newQuestionText, setNewQuestionText] = useState('');
    const [targetFamilyId, setTargetFamilyId] = useState(activeFamilyId || families[0]?.id || '');
    const [isTranslating, setIsTranslating] = useState(false);

    const handleAsk = async () => {
        if (!newQuestionText) return;

        setIsTranslating(true);
        try {
            let englishText = newQuestionText;
            let translatedText = newQuestionText;

            if (currentLanguage !== Language.ENGLISH) {
                englishText = await translateQuestion(newQuestionText, Language.ENGLISH);
            } else {
                translatedText = await translateQuestion(newQuestionText, Language.TAMIL);
            }

            const familyId = targetFamilyId || activeFamilyId || (families.length > 0 ? families[0].id : '');

            if (!familyId) {
                alert("Please select or create a family first before asking a question.");
                setIsTranslating(false);
                return;
            }

            const newQ: Question = {
                id: Date.now().toString(),
                askedBy: user.uid,
                askedByName: user.displayName,
                text: {
                    english: englishText,
                    translated: translatedText
                },
                type: 'text',
                upvotes: [],
                familyId: familyId,
                createdAt: new Date().toISOString()
            };

            await onAddQuestion(newQ);
            setNewQuestionText('');
            onCancel(); // Navigate back after success
        } catch (err) {
            console.error("Error asking question:", err);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-warmwhite dark:bg-charcoal animate-in slide-in-from-right duration-500">
            <div className="p-8 pb-4 shrink-0 sm:pt-8 pt-[calc(2rem+env(safe-area-inset-top))] border-b border-secondary/10 dark:border-white/5 bg-warmwhite/50 dark:bg-charcoal/50 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCancel}
                            className="p-2 text-red-500 hover:text-red-600 transition-colors active:scale-90"
                            aria-label="Close"
                        >
                            <X size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tighter leading-none">
                                {t('questions.new_title', currentLanguage)}
                            </h2>
                            <p className="text-[10px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em] mt-1">
                                Share a new spark
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleAsk}
                        disabled={!newQuestionText || isTranslating}
                        className="px-6 py-2.5 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95 text-[11px] uppercase tracking-widest"
                    >
                        {isTranslating ? <Loader2 className="animate-spin" size={16} /> : <Send size={14} strokeWidth={3} />}
                        {t('questions.post', currentLanguage)}
                    </button>
                </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-8 pb-32">
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em] px-1">
                        {t('questions.branch_label', currentLanguage)}
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-5 bg-white dark:bg-white/5 rounded-[24px] border border-secondary/20 dark:border-white/10 outline-none font-black text-charcoal dark:text-warmwhite appearance-none shadow-sm focus:border-primary/50 transition-all text-lg"
                            value={targetFamilyId}
                            onChange={(e) => setTargetFamilyId(e.target.value)}
                        >
                            {families.map(f => (
                                <option key={f.id} value={f.id}>{f.familyName}</option>
                            ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate/40">
                            <ChevronDown size={22} />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em] px-1">
                        {t('questions.question_label', currentLanguage)}
                    </label>
                    <textarea
                        placeholder={t('questions.placeholder', currentLanguage)}
                        className="w-full p-6 bg-white dark:bg-white/5 rounded-[32px] border border-secondary/20 dark:border-white/10 outline-none h-48 resize-none text-charcoal dark:text-warmwhite placeholder-slate/40 shadow-sm focus:border-primary/50 transition-all text-lg font-medium leading-relaxed"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                    />
                </div>

                <div className="space-y-6">
                    <div className="pt-2">
                        <button
                            onClick={onRecordQuestion}
                            className="group w-full py-6 bg-accent/5 hover:bg-accent/10 text-accent font-black rounded-[32px] flex items-center justify-center gap-4 border-2 border-dashed border-accent/20 transition-all active:scale-[0.98]"
                        >
                            <div className="bg-accent/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                                <Video size={24} strokeWidth={2.5} />
                            </div>
                            <span className="text-[12px] uppercase tracking-widest">{t('questions.record_video', currentLanguage)}</span>
                        </button>
                        <p className="text-center text-[9px] font-bold text-slate/30 dark:text-support/20 uppercase tracking-widest mt-4">
                            Tip: Video questions get 4x more responses
                        </p>
                    </div>

                    <button
                        onClick={handleAsk}
                        disabled={!newQuestionText || isTranslating}
                        className="w-full py-6 bg-primary text-white font-black rounded-[32px] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 disabled:opacity-50 transition-all active:scale-[0.98] text-[13px] uppercase tracking-[0.2em]"
                    >
                        {isTranslating ? <Loader2 className="animate-spin" size={24} /> : <Send size={22} strokeWidth={3} />}
                        {t('questions.post', currentLanguage)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateQuestion;
