import React, { useState } from 'react';
import { Database, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { User, Language, Question, Memory, FamilyDocument } from '../types';
import {
    createFamily,
    createQuestion,
    createMemory,
    createOrUpdateUser,
    COLLECTIONS
} from '../services/firebaseDatabase';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

interface DeveloperToolsProps {
    user: User | null;
    onComplete?: () => void;
}

const DeveloperTools: React.FC<DeveloperToolsProps> = ({ user, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const seedData = async () => {
        if (!user) {
            alert("Please login first to seed data for your account.");
            return;
        }

        setLoading(true);
        setStatus('idle');

        try {
            // 1. Create a "Global" Family if needed, or just a dummy one
            const familyId = await createFamily({
                familyName: "The Smith Legacy",
                createdBy: user.uid,
                defaultLanguage: Language.ENGLISH,
                members: [user.uid],
                admins: [user.uid]
            });

            // 2. Update user to include this family
            await createOrUpdateUser(user.uid, {
                familyIds: [familyId],
                defaultFamilyId: familyId
            });

            // 3. Seed Questions
            const questions: Omit<Question, 'id'>[] = [
                {
                    familyId,
                    askedBy: "system",
                    askedByName: "StoryBot",
                    directedTo: "Grandparents",
                    type: 'text',
                    text: {
                        english: "What was your favorite childhood memory?",
                        translated: "உங்கள் குழந்தைப்பருவத்தின் மறக்க முடியாத நினைவு எது?"
                    },
                    upvotes: [],
                    createdAt: new Date().toISOString()
                },
                {
                    familyId,
                    askedBy: user.uid,
                    askedByName: user.displayName,
                    type: 'text',
                    text: {
                        english: "How did you and Grandma meet?",
                        translated: "நீங்களும் பாட்டியும் எப்படி சந்தித்தீர்கள்?"
                    },
                    upvotes: [user.uid],
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                }
            ];

            for (const q of questions) {
                await createQuestion(q);
            }

            // 4. Seed Memories (Stories)
            const memories: Omit<Memory, 'id'>[] = [
                {
                    authorId: user.uid,
                    familyIds: [familyId],
                    status: 'published',
                    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                    thumbnailUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=400",
                    questionText: "What was your first job like?",
                    language: Language.ENGLISH,
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    publishedAt: new Date(Date.now() - 172800000).toISOString(),
                    likes: [],
                    comments: [
                        {
                            id: "c1",
                            userId: "bot",
                            userName: "Alice",
                            text: "Wow, that sounds like quite an adventure!",
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                {
                    authorId: "dummy-member",
                    familyIds: [familyId],
                    status: 'published',
                    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    thumbnailUrl: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=400",
                    questionText: "Tell us about our family traditions.",
                    language: Language.ENGLISH,
                    createdAt: new Date(Date.now() - 432000000).toISOString(),
                    publishedAt: new Date(Date.now() - 432000000).toISOString(),
                    likes: [user.uid],
                    comments: []
                }
            ];

            for (const m of memories) {
                await createMemory(m);
            }

            // 5. Seed Documents
            const docs: Omit<FamilyDocument, 'id'>[] = [
                {
                    name: "Grandpa_Birth_Certificate.pdf",
                    type: "application/pdf",
                    size: "1.2 MB",
                    timestamp: new Date().toISOString(),
                    familyId,
                    aiSummary: "Official birth certificate for John Smith, dated June 15, 1945.",
                    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    storagePath: `families/${familyId}/documents/dummy1.pdf`,
                    uploaderId: user.uid
                }
            ];

            for (const d of docs) {
                await addDoc(collection(db, COLLECTIONS.DOCUMENTS), d);
            }

            console.log("✅ Dummy data seeded successfully!");
            setStatus('success');
            if (onComplete) onComplete();
        } catch (err) {
            console.error("❌ Error seeding data:", err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-charcoal border border-secondary/20 dark:border-white/10 rounded-[32px] p-6 shadow-xl max-w-sm mx-auto my-8 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-accent/20 rounded-2xl text-accent">
                    <Database size={24} />
                </div>
                <div>
                    <h3 className="font-black text-charcoal dark:text-warmwhite text-lg">Testing Tools</h3>
                    <p className="text-[10px] font-bold text-slate dark:text-support/40 uppercase tracking-widest">Inject Dummy Data</p>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-xs text-slate dark:text-support/60 leading-relaxed font-medium">
                    This will create a dummy family, add sample questions, stories, and documents to your account. Use this to quickly test the UI.
                </p>

                <button
                    onClick={seedData}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${status === 'success'
                            ? 'bg-green-500 text-white shadow-green-500/20'
                            : status === 'error'
                                ? 'bg-red-500 text-white shadow-red-500/20'
                                : 'bg-primary text-white shadow-primary/20 hover:brightness-110'
                        }`}
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : status === 'success' ? (
                        <><CheckCircle size={18} /> Done!</>
                    ) : status === 'error' ? (
                        <><AlertTriangle size={18} /> Failed</>
                    ) : (
                        "Seed Test Data"
                    )}
                </button>

                {status === 'success' && (
                    <p className="text-[10px] text-center text-green-500 font-bold animate-in fade-in">
                        Refresh the page to see changes.
                    </p>
                )}
            </div>
        </div>
    );
};

export default DeveloperTools;
