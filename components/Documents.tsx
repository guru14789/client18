import React, { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Plus, Trash2, Loader2, Info, Search, FileCode, Clock, Eye, X, AlertCircle, Archive, Shield, Smartphone, ChevronRight } from 'lucide-react';
import { createDocument, deleteDocument as deleteDocService, uploadDocument } from '../services/firebaseServices';
import { User, Family, FamilyDocument, Language } from '../types';
import { t } from '../services/i18n';
import { generateDocumentContext } from '../services/geminiService';
import { LocalizedText } from './LocalizedText';

interface DocumentsProps {
  user: User;
  families: Family[];
  documents: FamilyDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<FamilyDocument[]>>;
  currentLanguage: Language;
}

const Documents: React.FC<DocumentsProps> = ({ user, families, documents, setDocuments, currentLanguage }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [targetFamilyId, setTargetFamilyId] = useState(families[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<FamilyDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError(t('documents.pdf_error', currentLanguage));
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const docId = Date.now().toString();
      const extension = file.name.split('.').pop() || 'pdf';

      // 1. Upload to Firebase Storage
      const downloadURL = await uploadDocument(
        file,
        docId,
        (progress) => setUploadProgress(Math.round(progress))
      );

      // 2. Generate AI Summary (Uses Gemini)
      let aiSummary = "";
      try {
        const base64Data = await fileToBase64(file);
        aiSummary = await generateDocumentContext(file.name, base64Data, file.type);
      } catch (aiErr) {
        console.warn("AI summary generation failed", aiErr);
        aiSummary = t('documents.ai_fallback', currentLanguage);
      }

      // 3. Save Metadata to Firestore
      const newDocData: Omit<FamilyDocument, 'id'> = {
        name: file.name,
        type: 'application/pdf',
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        timestamp: new Date().toISOString(),
        familyId: targetFamilyId,
        aiSummary,
        fileUrl: downloadURL,
        storagePath: `families/${targetFamilyId}/documents/${docId}.${extension}`,
        uploaderId: user.uid
      };

      await createDocument(newDocData);
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setError(t('documents.error', currentLanguage));
      setIsUploading(false);
    }
  };

  const deleteDocument = async (document: FamilyDocument) => {
    if (!confirm(t('documents.delete_confirm', currentLanguage))) return;
    try {
      await deleteDocService(document.id, user.uid);
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-warmwhite dark:bg-charcoal min-h-full transition-colors duration-300">
      <div className="px-6 mb-8 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[28px] font-black text-charcoal dark:text-warmwhite tracking-tight">{t('documents.title', currentLanguage)}</h2>
          <div className="flex items-center gap-2 bg-primary/5 dark:bg-white/10 px-4 py-1.5 rounded-full border border-primary/10 dark:border-white/10">
            <Archive size={14} className="text-primary dark:text-white" />
            <span className="text-[10px] font-black text-primary dark:text-white uppercase tracking-widest">
              {filteredDocs.length} {t('documents.records', currentLanguage)}
            </span>
          </div>
        </div>
        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" size={18} />
          <input
            type="text"
            placeholder={t('documents.search', currentLanguage)}
            className="w-full bg-white dark:bg-white/5 border border-secondary/30 dark:border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-charcoal dark:text-warmwhite outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-6 space-y-8 animate-in fade-in duration-500">
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-5 rounded-3xl flex items-center gap-4 text-red-600 shadow-sm">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-[11px] font-black uppercase tracking-wider flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-xl transition-colors"><X size={18} /></button>
          </div>
        )}

        <div className="bg-white dark:bg-white/5 rounded-[48px] p-10 border border-secondary/20 dark:border-white/10 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-primary/10 dark:bg-white/10 rounded-[24px] flex items-center justify-center text-primary dark:text-white shadow-sm border border-white dark:border-charcoal transition-transform group-hover:scale-110">
                  <Shield size={32} />
                </div>
                <div>
                  <h3 className="font-black text-charcoal dark:text-warmwhite text-2xl tracking-tight">{t('documents.add', currentLanguage)}</h3>
                  <p className="text-[10px] font-black text-slate/40 dark:text-support/40 uppercase tracking-[0.2em] mt-1">{t('documents.pdf_only', currentLanguage)}</p>
                </div>
              </div>
              {isUploading && (
                <div className="relative w-12 h-12 rounded-full border-4 border-primary/10 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black text-primary">{uploadProgress}%</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <select
                  className="w-full bg-secondary/5 dark:bg-white/5 p-4 rounded-2xl border border-secondary/10 dark:border-white/10 text-[13px] outline-none font-black text-charcoal dark:text-warmwhite appearance-none pr-12 focus:border-primary/50 transition-colors"
                  value={targetFamilyId}
                  onChange={(e) => setTargetFamilyId(e.target.value)}
                >
                  {families.map(f => (
                    <option key={f.id} value={f.id}>{f.familyName}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate/40">
                  <ChevronRight size={18} className="rotate-90" />
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full bg-primary text-white py-6 rounded-[28px] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} strokeWidth={3} />}
                {t('documents.upload', currentLanguage)}
              </button>
            </div>
          </div>
        </div>

        <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-secondary/5 dark:bg-white/5 rounded-[48px] border-2 border-dashed border-secondary/20 dark:border-white/10">
            <div className="w-24 h-24 bg-white dark:bg-charcoal rounded-full flex items-center justify-center text-slate/20 shadow-inner">
              <Archive size={40} />
            </div>
            <h3 className="text-[11px] font-black text-slate/30 dark:text-warmwhite/20 uppercase tracking-[0.3em]">{t('documents.empty', currentLanguage)}</h3>
          </div>
        ) : (
          <div className="space-y-6 pb-32">
            {filteredDocs.map((doc) => {
              const family = families.find(f => f.id === doc.familyId);
              return (
                <div key={doc.id} className="group bg-white dark:bg-white/5 border border-secondary/20 dark:border-white/10 rounded-[40px] p-8 shadow-sm hover:shadow-xl transition-all hover:border-primary/20">
                  <div className="flex gap-6 items-start relative z-10">
                    <div className="w-16 h-16 bg-primary/5 dark:bg-white/5 rounded-[24px] flex items-center justify-center text-primary dark:text-white shrink-0 group-hover:bg-primary group-hover:text-white group-hover:scale-105 transition-all">
                      <FileText size={32} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-charcoal dark:text-warmwhite truncate text-[19px] tracking-tight leading-tight">{doc.name}</h4>
                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="px-3 py-1 bg-support/20 dark:bg-white/10 rounded-full">
                          <span className="text-[10px] font-black text-accent dark:text-white/60 uppercase tracking-widest whitespace-nowrap">
                            {family ? (
                              <LocalizedText
                                text={family.familyName}
                                targetLanguage={currentLanguage}
                                originalLanguage={family.defaultLanguage as any}
                              />
                            ) : 'Unknown'}
                          </span>
                        </div>
                        <span className="w-1 h-1 bg-slate/20 rounded-full shrink-0"></span>
                        <span className="text-[10px] font-black text-slate/30 dark:text-support/30 uppercase tracking-widest">{doc.size}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button onClick={() => setViewingDoc(doc)} className="p-4 bg-secondary/10 dark:bg-white/10 rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95 shadow-sm"><Eye size={20} /></button>
                      <button onClick={() => deleteDocument(doc)} className="p-4 bg-secondary/10 dark:bg-white/10 rounded-2xl hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95 shadow-sm"><Trash2 size={20} /></button>
                    </div>
                  </div>
                  {doc.aiSummary && (
                    <div className="mt-8 bg-warmwhite dark:bg-black/20 rounded-[32px] p-6 border border-secondary/10 dark:border-white/5 relative overflow-hidden group/ai">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/30 group-hover/ai:bg-primary transition-colors"></div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{t('documents.vault_desc', currentLanguage)}</span>
                      </div>
                      <div className="text-[13px] text-charcoal/80 dark:text-warmwhite/70 italic font-bold leading-relaxed px-1">
                        <LocalizedText text={doc.aiSummary} targetLanguage={currentLanguage} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewingDoc && (
        <div className="fixed inset-0 z-[500] flex flex-col bg-warmwhite dark:bg-charcoal animate-in slide-in-from-bottom duration-500">
          <header className="px-8 py-6 flex items-center justify-between border-b border-secondary/10 dark:border-white/10 bg-white dark:bg-charcoal shadow-sm">
            <div className="flex items-center gap-5">
              <div className="p-3.5 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20"><FileText size={20} strokeWidth={3} /></div>
              <h3 className="font-black text-charcoal dark:text-warmwhite truncate max-w-[240px] text-lg tracking-tight">{viewingDoc.name}</h3>
            </div>
            <button onClick={() => setViewingDoc(null)} className="p-4 bg-secondary/10 dark:bg-white/10 rounded-full hover:bg-red-500 hover:text-white transition-all active:scale-90"><X size={20} /></button>
          </header>

          <div className="flex-1 bg-secondary/5 dark:bg-black/30 p-4 sm:p-10 flex flex-col items-center justify-center relative">
            {viewingDoc.fileUrl ? (
              <iframe src={viewingDoc.fileUrl} className="w-full h-full rounded-[40px] shadow-2xl border-4 border-white dark:border-white/10 bg-white" title="PDF Viewer" />
            ) : (
              <div className="w-full max-w-sm bg-white dark:bg-white/5 aspect-[1/1.414] rounded-[48px] shadow-2xl p-12 flex flex-col items-center justify-center text-center border border-white/20">
                <Shield size={64} className="text-primary mb-8" />
                <p className="font-black text-2xl text-charcoal dark:text-warmwhite tracking-tight">{t('documents.secure_access', currentLanguage)}</p>
                <p className="text-sm font-bold text-slate/60 mt-4 leading-relaxed">{t('documents.vault_desc', currentLanguage)}</p>
              </div>
            )}
          </div>

          <footer className="px-8 py-8 bg-white dark:bg-charcoal border-t border-secondary/10 dark:border-white/10 flex gap-4 safe-area-bottom">
            <button className="flex-1 bg-primary text-white py-6 rounded-[32px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all" onClick={() => setViewingDoc(null)}>{t('documents.close', currentLanguage)}</button>
          </footer>
        </div>
      )}
    </div>
  );
};

export default Documents;