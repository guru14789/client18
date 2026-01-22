import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Play,
  RefreshCcw,
  Send,
  Video,
  Share2,
  SwitchCamera,
  Square,
  Loader2,
  FilePlus,
  CloudUpload
} from 'lucide-react';
import { User, Question, Memory, Family, Language } from '../types';
import { t } from '../services/i18n';
import { translateQuestion } from '../services/geminiService';
import { LocalizedText } from './LocalizedText';
import { uploadMemoryVideo, uploadQuestionVideo, uploadMemoryThumbnail } from '../services/firebaseStorage';

interface RecordMemoryProps {
  user: User;
  question?: Question | null;
  onCancel: () => void;
  onComplete: (m: Memory) => void;
  families: Family[];
  mode?: 'answer' | 'question';
  existingDraftId?: string;
  onDeleteDraft?: (id: string) => void;
  activeFamilyId: string | null;
  currentLanguage: Language;
}

type RecordStage = 'prep' | 'recording' | 'review' | 'processing';

const RecordMemory: React.FC<RecordMemoryProps> = ({ user, question, onCancel, onComplete, families, mode = 'answer', existingDraftId, onDeleteDraft, activeFamilyId, currentLanguage }) => {
  const [stage, setStage] = useState<RecordStage>('prep');
  const [timeLeft, setTimeLeft] = useState(90);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [targetFamilyId, setTargetFamilyId] = useState(activeFamilyId || families[0]?.id || '');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savingOption, setSavingOption] = useState<'app_whatsapp' | 'app_only' | 'draft' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Get supported MIME type
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // Initialize and manage camera stream
  useEffect(() => {
    // If answering a specific question, ALWAYS post to that question's family branch
    if (mode === 'answer' && question?.familyId) {
      setTargetFamilyId(question.familyId);
      return;
    }

    if (activeFamilyId) {
      setTargetFamilyId(activeFamilyId);
    } else if (families.length > 0) {
      setTargetFamilyId(families[0].id);
    }
  }, [activeFamilyId, families, question, mode]);

  useEffect(() => {
    const startCamera = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    if (stage === 'prep' || stage === 'recording') {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, stage]);

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      startActualRecording();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    let timer: any;
    if (isCapturing && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (isCapturing && timeLeft === 0) {
      stopRecording();
    }
  }, [isCapturing, timeLeft]);

  const generateThumbnail = (videoBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(videoBlob);

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Thumbnail generation timed out"));
      }, 5000);

      const cleanup = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        video.remove();
      };

      video.onloadeddata = () => {
        // Seek to 1 second or mid-point
        video.currentTime = Math.min(1, video.duration > 0 ? video.duration / 2 : 0);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            cleanup();
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          }, 'image/jpeg', 0.8);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      video.onerror = (e) => {
        cleanup();
        reject(e);
      };

      video.load();
    });
  };

  const startActualRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setRecordedUrl(url);
      setStage('review');
    };

    mediaRecorder.start(1000);
    setIsCapturing(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsCapturing(false);
    setStage('processing');
  };

  const handleStartRequest = () => {
    setCountdown(3);
    setStage('recording');
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleFinish = async (shareOption: 'app_whatsapp' | 'app_only' | 'draft') => {
    if (!videoBlob) return;

    setSavingOption(shareOption);
    setStage('processing');
    setUploadProgress(0);

    try {
      const memoryId = existingDraftId || Date.now().toString();

      let downloadURL: string;
      let thumbnailURL: string | undefined;
      let thumbnailFile: File | undefined;

      // Generate and upload thumbnail first
      try {
        const thumbBlob = await generateThumbnail(videoBlob);
        thumbnailFile = new File([thumbBlob], 'memory-screenshot.jpg', { type: 'image/jpeg' });
        thumbnailURL = await uploadMemoryThumbnail(thumbBlob, memoryId);
      } catch (thumbErr) {
        console.warn("Failed to generate/upload thumbnail:", thumbErr);
      }

      if (mode === 'question') {
        downloadURL = await uploadQuestionVideo(
          videoBlob,
          memoryId,
          (progress) => setUploadProgress(Math.round(progress))
        );
      } else {
        downloadURL = await uploadMemoryVideo(
          videoBlob,
          memoryId,
          (progress) => setUploadProgress(Math.round(progress))
        );
      }

      const newMemory: Memory = {
        id: memoryId,
        authorId: user.uid,
        authorName: user.displayName,
        videoUrl: downloadURL,
        thumbnailUrl: thumbnailURL,
        createdAt: new Date().toISOString(),
        publishedAt: shareOption === 'draft' ? null : new Date().toISOString(),
        familyIds: targetFamilyId ? [targetFamilyId] : [],
        status: shareOption === 'draft' ? 'draft' : 'published',
        questionId: mode === 'answer' ? question?.id : undefined,
        questionText: mode === 'answer' ? (question?.text.english || "") : undefined,
        language: mode === 'answer' ? Language.ENGLISH : undefined,
        likes: [],
        comments: []
      };

      if (shareOption === 'app_whatsapp') {
        const template = mode === 'answer'
          ? t('record.whatsapp_template_answer', currentLanguage)
          : t('record.whatsapp_template_question', currentLanguage);
        const qText = question?.text.english || "";
        const text = template.replace('{question}', qText);

        const shareData: any = {
          title: t('feed.share_title_tag', currentLanguage) || 'Family Connect',
          text: `${text}\n\nCheck it out here: ${downloadURL}`,
        };

        // If thumbnail is available and supported, include it as a file
        // Attaching a file usually allows WhatsApp to use the 'text' as a caption.
        if (thumbnailFile && navigator.canShare && navigator.canShare({ files: [thumbnailFile] })) {
          shareData.files = [thumbnailFile];
        } else {
          shareData.url = downloadURL;
        }

        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch (shareErr: any) {
            console.warn("Navigator share failed, falling back to URL:", shareErr);
            // Fallback to simple link if user cancelled or browser failed file share
            if (shareErr.name !== 'AbortError') {
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n" + downloadURL)}`;
              window.open(whatsappUrl, '_blank');
            }
          }
        } else {
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n" + downloadURL)}`;
          window.open(whatsappUrl, '_blank');
        }
      }

      onComplete(newMemory);
    } catch (err) {
      console.error("Error uploading video:", err);
      alert("Failed to upload video. Please check your internet and try again.");
      setStage('review');
    }
  };

  return (
    <div className="h-full flex flex-col bg-charcoal text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="pt-[calc(1.5rem+env(safe-area-inset-top))] px-6 pb-6 flex items-center justify-between">
          <button onClick={onCancel} className="p-3 bg-red-500/20 backdrop-blur-lg rounded-2xl border border-red-500/30 text-red-500 active:scale-95 transition-all shadow-lg hover:bg-red-500/30">
            <X size={24} strokeWidth={3} />
          </button>
          {stage === 'recording' && (
            <div className="flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full font-mono text-xs font-bold animate-pulse shadow-lg shadow-red-500/20">
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          )}
          {(stage === 'prep' || (stage === 'recording' && !isCapturing)) && (
            <button onClick={toggleCamera} className="p-2.5 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/10 active:scale-90 transition-transform">
              <SwitchCamera size={24} />
            </button>
          )}
        </div>
      </div>

      <div className="absolute inset-0 z-0 bg-black">
        {stage !== 'review' && stage !== 'processing' ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        ) : stage === 'review' ? (
          <div className="relative w-full h-full flex flex-col bg-black">
            <video
              ref={previewRef}
              src={recordedUrl || ""}
              autoPlay
              loop
              playsInline
              controls
              className="w-full h-full object-contain"
            />
            {question && (
              <div className="absolute top-24 left-6 right-6 z-40 bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/20 pointer-events-none">
                <p className="text-[9px] font-black text-accent uppercase mb-1 tracking-widest">{t('record.question_label', currentLanguage)}</p>
                <div className="text-sm font-bold leading-tight">
                  <LocalizedText
                    text={question.text.english}
                    targetLanguage={currentLanguage}
                    originalLanguage={Language.ENGLISH}
                    storedTranslation={question.text.translated}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <Loader2 size={48} className="animate-spin text-primary absolute" />
              <CloudUpload size={24} className="text-primary/60" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="font-black uppercase tracking-widest text-sm text-primary">
                {uploadProgress}%
              </p>
              <p className="font-bold uppercase tracking-[0.2em] text-[10px] opacity-40">
                {savingOption === 'draft' ? t('record.save_draft', currentLanguage) : t('record.publish', currentLanguage)}
              </p>
            </div>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-end p-8 pb-12 bg-gradient-to-t from-charcoal/90 via-transparent to-transparent">
        {stage === 'prep' && (
          <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {question && (
              <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 border border-white/10 shadow-2xl text-left">
                <p className="text-[10px] font-black text-accent uppercase mb-3 tracking-[0.2em]">{t('record.family_request', currentLanguage)}</p>
                <div className="text-xl font-bold mb-2 leading-tight tracking-tight">
                  <LocalizedText
                    text={question.text.english}
                    targetLanguage={currentLanguage}
                    originalLanguage={Language.ENGLISH}
                    storedTranslation={question.text.translated}
                  />
                </div>
                {question.text.translated && <p className="text-support/60 italic text-sm font-medium">{question.text.translated}</p>}
              </div>
            )}

            <div className="space-y-4 w-full">
              <button
                onClick={handleStartRequest}
                className="w-full bg-primary text-white font-bold py-5 rounded-[28px] shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 active:scale-95 transition-all text-xl"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Camera size={24} fill="white" />
                </div>
                {mode === 'question' ? t('record.mode.question', currentLanguage) : t('record.start', currentLanguage)}
              </button>
            </div>
          </div>
        )}

        {stage === 'recording' && (
          <div className="flex flex-col items-center justify-center w-full pb-8">
            {countdown !== null ? (
              <div className="text-[160px] font-black text-white animate-pulse drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]">{countdown}</div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {question && (
                  <div className="bg-black/60 backdrop-blur-md p-5 rounded-3xl mb-8 border border-white/10 max-w-xs shadow-2xl">
                    <div className="text-sm font-bold text-white text-center">
                      <LocalizedText
                        text={question.text.english}
                        targetLanguage={currentLanguage}
                        originalLanguage={Language.ENGLISH}
                        storedTranslation={question.text.translated}
                      />
                    </div>
                  </div>
                )}
                <div className="w-28 h-28 rounded-full border-4 border-white/40 flex items-center justify-center p-1.5 hover:border-white transition-all shadow-2xl bg-white/5">
                  <button
                    onClick={stopRecording}
                    className="w-full h-full bg-red-500 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-inner"
                  >
                    <Square size={32} fill="white" className="text-white" />
                  </button>
                </div>
                <p className="text-[11px] font-black tracking-[0.4em] uppercase text-white/80 drop-shadow-md">{t('record.finish', currentLanguage)}</p>
              </div>
            )}
          </div>
        )}

        {stage === 'review' && (
          <div className="w-full space-y-4 animate-in slide-in-from-bottom duration-500">
            <div className="bg-primary/30 backdrop-blur-xl rounded-[32px] p-4 border border-white/10 mb-2 shadow-xl text-center">
              <p className="text-sm font-bold tracking-tight">{t('record.share_title', currentLanguage)}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleFinish('app_whatsapp')}
                className="w-full bg-primary text-white font-bold py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 transition-all active:scale-95 text-lg"
              >
                <Share2 size={22} fill="white" />
                {t('record.share_whatsapp', currentLanguage)}
              </button>

              <button
                onClick={() => handleFinish('app_only')}
                className="w-full bg-white/10 backdrop-blur-xl text-white font-bold py-5 rounded-[28px] flex items-center justify-center gap-3 border border-white/20 transition-all active:scale-95 text-lg"
              >
                <Send size={22} fill="white" />
                {t('record.publish', currentLanguage)}
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (existingDraftId && onDeleteDraft) {
                      onDeleteDraft(existingDraftId);
                    }
                    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
                    setRecordedUrl(null);
                    setStage('prep');
                    setTimeLeft(90);
                  }}
                  className="flex-1 bg-white/10 backdrop-blur-xl text-white font-bold py-4 rounded-[24px] flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                >
                  <RefreshCcw size={18} />
                  {t('record.retake', currentLanguage)}
                </button>
                <button
                  onClick={() => handleFinish('draft')}
                  className="flex-1 bg-accent/20 backdrop-blur-xl text-accent font-bold py-4 rounded-[24px] flex items-center justify-center gap-2 hover:bg-accent/30 transition-all active:scale-95 border border-accent/20"
                >
                  <FilePlus size={18} />
                  {t('record.save_draft', currentLanguage)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default RecordMemory;
