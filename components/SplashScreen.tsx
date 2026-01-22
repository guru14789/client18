import React from 'react';
import { Language } from '../types';
import { t } from '../services/i18n';

interface SplashScreenProps {
  currentLanguage: Language;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ currentLanguage }) => {
  return (
    <div className="h-screen w-full bg-[#345E81] flex flex-col items-center justify-between py-16 px-6 relative overflow-hidden animate-in fade-in duration-700">

      {/* Central Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Tan Logo Box */}
        <div className="w-[180px] h-[180px] bg-[#D4A373] rounded-[48px] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in zoom-in-75 duration-1000 ease-out border-b-4 border-black/10">
          <span className="text-white text-[56px] font-black tracking-tighter drop-shadow-sm">
            Inai
          </span>
        </div>
      </div>

      {/* Bottom Labels and Loading */}
      <div className="flex flex-col items-center w-full space-y-8 animate-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
        <div className="text-center space-y-1">
          <h1 className="text-white text-[32px] font-black tracking-tight leading-none drop-shadow-sm">
            Inai Legacy
          </h1>
          <p className="text-white/60 text-base font-medium tracking-wide">
            {t('splash.tagline', currentLanguage) || 'Connecting Generations'}
          </p>
        </div>

        {/* Loading Dots (Tan) */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#D4A373] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2.5 h-2.5 bg-[#D4A373] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2.5 h-2.5 bg-[#D4A373] rounded-full animate-bounce"></div>
        </div>

        <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.5em] pb-4">
          v1.2.0
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
