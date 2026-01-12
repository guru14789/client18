import React from 'react';
import { Memory, Language } from '../types';
import { PlayCircle, Trash2, Send, Clock, ChevronLeft } from 'lucide-react';
import { t } from '../services/i18n';

interface DraftsProps {
  drafts: Memory[];
  onPublish: (m: Memory) => void;
  onDelete: (id: string) => void;
  currentLanguage: Language;
  onBack: () => void;
}

const Drafts: React.FC<DraftsProps> = ({ drafts, onPublish, onDelete, currentLanguage, onBack }) => {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col h-full bg-warmwhite dark:bg-charcoal animate-in fade-in duration-500">
        <header className="p-6 flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white dark:bg-white/5 rounded-2xl border border-secondary/20 dark:border-white/10 active:scale-90 transition-transform shadow-sm">
            <ChevronLeft size={20} className="text-charcoal dark:text-warmwhite" />
          </button>
          <h1 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tighter">{t('login.draft_alert', currentLanguage).replace('{count}', '0')}</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-32 h-32 bg-secondary/10 dark:bg-white/5 rounded-full flex items-center justify-center text-secondary dark:text-support/40">
            <Clock size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-charcoal dark:text-warmwhite">{t('feed.no_memories', currentLanguage)}</h2>
            <p className="text-sm text-slate dark:text-support/60 max-w-[240px] leading-relaxed mx-auto">
              Captured moments that haven't been shared yet will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-warmwhite dark:bg-charcoal animate-in slide-in-from-right duration-500">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-warmwhite/90 dark:bg-charcoal/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white dark:bg-white/5 rounded-2xl border border-secondary/20 dark:border-white/10 active:scale-90 transition-transform shadow-sm">
            <ChevronLeft size={20} className="text-charcoal dark:text-warmwhite" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-charcoal dark:text-warmwhite tracking-tighter">{t('nav.drafts', currentLanguage) || 'Drafts'}</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{drafts.length} Private</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 no-scrollbar pb-32">
        {drafts.map((draft) => (
          <div key={draft.id} className="bg-white dark:bg-white/5 rounded-[32px] p-4 border border-secondary/20 dark:border-white/10 shadow-sm flex gap-4 group transition-all hover:shadow-md animate-in slide-in-from-bottom duration-300">
            <div className="w-24 h-24 bg-charcoal rounded-[24px] relative overflow-hidden flex-shrink-0 shadow-lg">
              <video src={draft.videoUrl} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <PlayCircle size={28} className="text-white fill-white/20" />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
              <div>
                <h3 className="font-bold text-charcoal dark:text-warmwhite line-clamp-2 leading-tight tracking-tight">
                  {draft.questionText || "Recorded Story"}
                </h3>
                <p className="text-[9px] text-slate/40 dark:text-support/40 font-black uppercase mt-1 tracking-[0.2em]">
                  {new Date(draft.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => onPublish({ ...draft, isDraft: false })}
                  className="flex-1 bg-primary text-white text-xs font-black uppercase tracking-widest py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  <Send size={14} fill="currentColor" />
                  {t('record.publish', currentLanguage)}
                </button>
                <button
                  onClick={() => onDelete(draft.id)}
                  className="p-3 bg-secondary/10 dark:bg-white/5 text-slate dark:text-support/60 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-colors active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Drafts;
