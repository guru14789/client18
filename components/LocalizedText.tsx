import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translateQuestion } from '../services/geminiService';

interface LocalizedTextProps {
    text: string;
    targetLanguage: Language;
    originalLanguage?: Language;
    storedTranslation?: string;
    className?: string;
}

export const LocalizedText: React.FC<LocalizedTextProps> = ({
    text,
    targetLanguage,
    originalLanguage,
    storedTranslation,
    className
}) => {
    const [translated, setTranslated] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // 1. If targeting English, always use the base text
        if (targetLanguage === Language.ENGLISH) {
            setTranslated(text);
            return;
        }

        // 2. If we have a stored translation that is DIFFERENT from the base text
        // and it was intended for this language, use it immediately.
        if (originalLanguage === targetLanguage && storedTranslation && storedTranslation !== text) {
            setTranslated(storedTranslation);
            return;
        }

        // 3. Otherwise, we need to translate (either it's a different language or the stored one is identical to English)
        const getTranslation = async () => {
            // Don't re-translate if we already have it from a previous run of this effect
            if (translated && translated !== text) return;

            setLoading(true);
            try {
                const result = await translateQuestion(text, targetLanguage);
                // Only set if Gemini actually gave us something different
                setTranslated(result || text);
            } catch (err) {
                setTranslated(text);
            } finally {
                setLoading(false);
            }
        };

        getTranslation();
    }, [text, targetLanguage, originalLanguage, storedTranslation]);

    if (loading) return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <div className="h-4 w-3/4 bg-slate/10 dark:bg-white/10 animate-pulse rounded-md" />
            <span className="text-[8px] font-bold text-slate/30 uppercase tracking-widest">Translating...</span>
        </div>
    );

    return <span className={className}>{translated || text}</span>;
};
