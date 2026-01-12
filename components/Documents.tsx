import React, { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Plus, Trash2, Loader2, Info, Search, FileCode, Clock, Eye, X, AlertCircle, Archive, Shield, Smartphone } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from '../services/firebaseConfig';
import { uploadDocument } from '../services/firebaseStorage';
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
  const [targetFamilyId, setTargetFamilyId] = useState(user.families[0]);
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

      // 1. Upload to Firebase Storage
      const downloadURL = await uploadDocument(
        file,
        targetFamilyId,
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
      const newDocData = {
        name: file.name,
        type: 'application/pdf',
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        timestamp: new Date().toISOString(),
        serverTimestamp: serverTimestamp(),
        familyId: targetFamilyId,
        aiSummary,
        fileUrl: downloadURL,
        storagePath: `documents/${targetFamilyId}/${docId}_${Date.now()}_${file.name}`,
        uploaderId: user.id
      };

      await addDoc(collection(db, "documents"), newDocData);
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
      await deleteDoc(doc(db, "documents", document.id));
      // No storage deletion needed for local URLs
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

      <div className="px-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs font-bold flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition-colors"><X size={16} /></button>
          </div>
        )}

        <div className="bg-secondary/10 dark:bg-white/5 rounded-[36px] p-8 border border-secondary/30 dark:border-white/10 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white dark:bg-charcoal rounded-2xl flex items-center justify-center text-primary dark:text-white shadow-sm border border-secondary/20 dark:border-white/10 transition-transform group-hover:scale-110">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="font-black text-charcoal dark:text-warmwhite text-lg">{t('documents.add', currentLanguage)}</h3>
                  <p className="text-[10px] font-bold text-slate dark:text-support/40 uppercase tracking-widest">{t('documents.pdf_only', currentLanguage)}</p>
                </div>
              </div>
              {isUploading && (
                <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center">
                  <span className="text-[8px] font-black text-primary animate-none">{uploadProgress}%</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <select
                className="w-full bg-white dark:bg-charcoal p-3.5 rounded-xl border border-secondary/20 dark:border-white/10 text-sm outline-none font-bold text-charcoal dark:text-warmwhite appearance-none"
                value={targetFamilyId}
                onChange={(e) => setTargetFamilyId(e.target.value)}
              >
                {families.filter(f => user.families.includes(f.id)).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
                {t('documents.upload', currentLanguage)}
              </button>
            </div>
          </div>
        </div>

        <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-secondary/5 dark:bg-white/5 rounded-[40px] border-2 border-dashed border-secondary/40 dark:border-white/5">
            <div className="w-20 h-20 bg-warmwhite dark:bg-charcoal rounded-full flex items-center justify-center text-secondary shadow-inner">
              <FileCode size={32} />
            </div>
            <h3 className="text-lg font-black text-charcoal/40 dark:text-warmwhite/20 uppercase tracking-widest">{t('documents.empty', currentLanguage)}</h3>
          </div>
        ) : (
          <div className="space-y-5 pb-32">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="group bg-white dark:bg-white/5 border border-secondary/20 dark:border-white/10 rounded-[32px] p-6 shadow-sm hover:shadow-lg transition-all">
                <div className="flex gap-4 items-start relative z-10">
                  <div className="w-16 h-16 bg-support/10 dark:bg-white/10 rounded-2xl flex items-center justify-center text-primary dark:text-white shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <FileText size={30} />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-black text-charcoal dark:text-warmwhite truncate text-lg tracking-tight">{doc.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                        {families.find(f => f.id === doc.familyId) ? (
                          <LocalizedText
                            text={families.find(f => f.id === doc.familyId)!.name}
                            targetLanguage={currentLanguage}
                            originalLanguage={families.find(f => f.id === doc.familyId)!.motherTongue}
                          />
                        ) : 'Unknown'}
                      </span>
                      <span className="w-1 h-1 bg-slate/20 rounded-full"></span>
                      <span className="text-[10px] font-bold text-slate/40 uppercase">{doc.size}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setViewingDoc(doc)} className="p-3 bg-secondary/5 dark:bg-white/5 rounded-xl hover:bg-primary hover:text-white transition-all"><Eye size={18} /></button>
                    <button onClick={() => deleteDocument(doc)} className="p-3 bg-secondary/5 dark:bg-white/5 rounded-xl hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
                {doc.aiSummary && (
                  <div className="mt-5 bg-warmwhite dark:bg-charcoal/50 rounded-2xl p-5 flex gap-4 border border-secondary/10 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20"></div>
                    <p className="text-xs text-slate/80 dark:text-support/80 italic font-bold leading-relaxed">
                      <LocalizedText text={doc.aiSummary} targetLanguage={currentLanguage} />
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingDoc && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-warmwhite dark:bg-charcoal animate-in slide-in-from-bottom duration-500">
          <header className="p-8 flex items-center justify-between border-b border-secondary/10 dark:border-white/10 bg-white dark:bg-charcoal shadow-sm">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><FileText size={24} /></div>
              <h3 className="font-black text-charcoal dark:text-warmwhite truncate max-w-[200px] text-lg tracking-tight">{viewingDoc.name}</h3>
            </div>
            <button onClick={() => setViewingDoc(null)} className="p-4 bg-secondary/20 dark:bg-white/10 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={20} /></button>
          </header>

          <div className="flex-1 bg-secondary/5 dark:bg-black/20 p-8 flex flex-col items-center justify-center">
            {viewingDoc.fileUrl ? (
              <iframe src={viewingDoc.fileUrl} className="w-full h-full rounded-3xl shadow-2xl border-0 bg-white" title="PDF Viewer" />
            ) : (
              <div className="w-full max-w-sm bg-white dark:bg-white/5 aspect-[1/1.414] rounded-3xl shadow-2xl p-10 flex flex-col items-center justify-center text-center">
                <Shield size={48} className="text-primary mb-6" />
                <p className="font-black text-lg text-charcoal dark:text-warmwhite">{t('documents.secure_access', currentLanguage)}</p>
                <p className="text-xs text-slate mt-2">{t('documents.vault_desc', currentLanguage)}</p>
              </div>
            )}
          </div>

          <footer className="p-8 bg-white dark:bg-charcoal border-t border-secondary/10 dark:border-white/10 flex gap-4 safe-area-bottom">
            <button className="flex-1 bg-primary text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all" onClick={() => setViewingDoc(null)}>{t('documents.close', currentLanguage)}</button>
          </footer>
        </div>
      )}
    </div>
  );
};

export default Documents;