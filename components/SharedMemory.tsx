import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, MessageCircle, Heart, Share2, CornerUpRight, ArrowLeft } from 'lucide-react';
import { Memory, User, Language } from '../types';
import { getMemoryById } from '../services/firebaseServices';
import { t } from '../services/i18n';
import { LocalizedText } from './LocalizedText';

interface SharedMemoryProps {
    memoryId: string;
    onClose: () => void;
    currentLanguage: Language;
    user?: User;
}

export const SharedMemory: React.FC<SharedMemoryProps> = ({ memoryId, onClose, currentLanguage, user }) => {
    const [memory, setMemory] = useState<Memory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const fetchMemory = async () => {
            try {
                const data = await getMemoryById(memoryId);
                if (data) {
                    setMemory(data);
                    document.title = `${data.questionText || 'Shared Memory'} | Inai`;
                } else {
                    setError("Memory not found or deleted.");
                }
            } catch (err) {
                console.error("Error fetching shared memory:", err);
                setError("Could not load memory.");
            } finally {
                setLoading(false);
            }
        };

        fetchMemory();
        return () => {
            document.title = "Inai - Family Heritage Vault";
        };
    }, [memoryId]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] bg-charcoal flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="font-bold tracking-widest uppercase text-xs opacity-50">Loading Memory...</p>
            </div>
        );
    }

    if (error || !memory) {
        return (
            <div className="fixed inset-0 z-[100] bg-charcoal flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <CornerUpRight size={40} className="text-white/20" />
                </div>
                <h2 className="text-2xl font-black mb-2 tracking-tight">Oops!</h2>
                <p className="text-white/60 mb-8 font-medium">{error || "This memory is no longer available."}</p>
                <button
                    onClick={onClose}
                    className="px-8 py-3 bg-white text-charcoal rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Video Container */}
            <div className="relative flex-1 bg-black flex items-center justify-center">
                <video
                    src={memory.videoUrl}
                    poster={memory.thumbnailUrl}
                    className="w-full h-full object-contain"
                    playsInline
                    controls
                    autoPlay
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />

                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-6 pt-12 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between z-10">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-all border border-white/10"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 px-4 text-center">
                        <h3 className="text-white font-black text-sm uppercase tracking-[0.2em]">Inai Shared Memory</h3>
                    </div>
                    <div className="w-10" />
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                    <div className="max-w-xs space-y-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                            <p className="text-[10px] font-black text-accent uppercase mb-1 tracking-widest">Question</p>
                            <p className="text-white font-bold leading-tight">
                                {memory.questionText || "A shared family story"}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black text-xs">
                                {memory.authorName?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">{memory.authorName}</p>
                                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Shared Legacy</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Call to Action */}
            {!user && (
                <div className="bg-charcoal p-8 pb-12 safe-area-bottom border-t border-white/5">
                    <div className="flex flex-col items-center gap-6">
                        <div className="text-center space-y-1">
                            <h4 className="text-white font-black text-xl tracking-tight">Preserve Your Own Heritage</h4>
                            <p className="text-white/40 text-sm font-medium">Join Inai to capture and share your family's history.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full bg-primary text-white font-bold py-5 rounded-[28px] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all text-lg"
                        >
                            Get Started with Inai
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharedMemory;
