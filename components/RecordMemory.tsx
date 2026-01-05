
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
  FilePlus
} from 'lucide-react';
import { User, Question, Memory, Family } from '../types';

interface RecordMemoryProps {
  user: User;
  question?: Question | null;
  onCancel: () => void;
  onComplete: (m: Memory) => void;
  families: Family[];
}

type RecordStage = 'prep' | 'recording' | 'review' | 'processing';

const RecordMemory: React.FC<RecordMemoryProps> = ({ user, question, onCancel, onComplete, families }) => {
  const [stage, setStage] = useState<RecordStage>('prep');
  const [timeLeft, setTimeLeft] = useState(90);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [targetFamilyId, setTargetFamilyId] = useState(user.families[0]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

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
    return () => clearTimeout(timer);
  }, [isCapturing, timeLeft]);

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
      setRecordedUrl(url);
      setStage('review');
    };

    mediaRecorder.start(1000); // Collect data in 1s chunks
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

  const handleFinish = (publish: boolean) => {
    const newMemory: Memory = {
      id: Date.now().toString(),
      responderId: user.id,
      videoUrl: recordedUrl || '',
      timestamp: new Date().toISOString(),
      familyId: targetFamilyId,
      isDraft: !publish,
      questionText: question?.text,
      questionTranslation: question?.translation,
    };
    onComplete(newMemory);
  };

  return (
    <div className="h-full flex flex-col bg-charcoal text-white overflow-hidden relative">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <div className="safe-area-top">
          <div className="p-6 flex items-center justify-between">
            <button onClick={onCancel} className="p-2.5 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/10 active:scale-90 transition-transform">
              <X size={24} />
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
      </div>

      {/* Main View Area */}
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
          <video 
            ref={previewRef}
            src={recordedUrl || ""}
            autoPlay 
            loop 
            playsInline
            controls
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <Loader2 size={48} className="animate-spin text-primary" />
            <p className="font-bold uppercase tracking-widest text-xs opacity-60">Processing Story...</p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      {/* Controls Overlay */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-8 pb-12 bg-gradient-to-t from-charcoal/90 via-transparent to-transparent">
        {stage === 'prep' && (
          <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {question && (
              <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 border border-white/10 shadow-2xl text-left">
                <p className="text-[10px] font-black text-accent uppercase mb-3 tracking-[0.2em]">Family Request</p>
                <h3 className="text-xl font-bold mb-2 leading-tight tracking-tight">{question.text}</h3>
                {question.translation && <p className="text-support/60 italic text-sm font-medium">{question.translation}</p>}
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
                Start Story
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
                    <p className="text-sm font-bold text-white text-center">{question.text}</p>
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
                <p className="text-[11px] font-black tracking-[0.4em] uppercase text-white/80 drop-shadow-md">Finish Recording</p>
              </div>
            )}
          </div>
        )}

        {stage === 'review' && (
          <div className="w-full space-y-4 animate-in slide-in-from-bottom duration-500">
            <div className="bg-primary/30 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 mb-4 shadow-xl">
              <p className="text-sm font-bold text-center tracking-tight">Your story is ready to be shared with the family!</p>
            </div>
            
            <button 
              onClick={() => handleFinish(true)}
              className="w-full bg-primary text-white font-bold py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 transition-all active:scale-95 text-xl"
            >
              <Send size={24} fill="white" />
              Share to Vault
            </button>
            
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if (recordedUrl) URL.revokeObjectURL(recordedUrl);
                  setRecordedUrl(null);
                  setStage('prep');
                  setTimeLeft(90);
                }}
                className="flex-1 bg-white/10 backdrop-blur-xl text-white font-bold py-4 rounded-[24px] flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95 border border-white/10"
              >
                <RefreshCcw size={18} />
                Retake
              </button>
              <button 
                onClick={() => handleFinish(false)}
                className="flex-1 bg-accent/20 backdrop-blur-xl text-accent font-bold py-4 rounded-[24px] flex items-center justify-center gap-2 hover:bg-accent/30 transition-all active:scale-95 border border-accent/20"
              >
                <FilePlus size={18} />
                Keep Draft
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordMemory;
