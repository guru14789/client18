
import React from 'react';
import { Memory } from '../types';
import { PlayCircle, Trash2, Send, Clock } from 'lucide-react';

interface DraftsProps {
  drafts: Memory[];
  onPublish: (m: Memory) => void;
  onDelete: (id: string) => void;
}

const Drafts: React.FC<DraftsProps> = ({ drafts, onPublish, onDelete }) => {
  if (drafts.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-200">
          <Clock size={48} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">No Drafts</h2>
          <p className="text-sm text-gray-500 mt-2">Captured moments that haven't been shared yet will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Drafts</h1>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
          {drafts.length} Private
        </span>
      </div>

      <div className="space-y-4">
        {drafts.map((draft) => (
          <div key={draft.id} className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm flex gap-4">
            <div className="w-24 h-24 bg-gray-900 rounded-[18px] relative overflow-hidden flex-shrink-0">
               <img src={`https://picsum.photos/200/200?random=${draft.id}`} className="w-full h-full object-cover opacity-60" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle size={24} className="text-white" />
               </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <h3 className="font-bold text-gray-900 line-clamp-1 leading-tight">
                  {draft.questionText || "Recorded Story"}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">
                  {new Date(draft.timestamp).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => onPublish({ ...draft, isDraft: false })}
                  className="flex-1 bg-orange-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <Send size={12} />
                  Publish
                </button>
                <button 
                  onClick={() => onDelete(draft.id)}
                  className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
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
