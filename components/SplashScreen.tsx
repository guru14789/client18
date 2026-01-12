import React from 'react';
import { Language } from '../types';
import { t } from '../services/i18n';

interface SplashScreenProps {
  currentLanguage: Language;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ currentLanguage }) => {
  return (
    <div className="h-screen w-full bg-primary flex flex-col items-center justify-between py-12 px-6 relative overflow-hidden animate-in fade-in duration-700">

      {/* Animated Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="w-40 h-40 bg-accent rounded-[40px] flex items-center justify-center shadow-2xl animate-in zoom-in-50 slide-in-from-bottom-8 duration-1000 ease-out border-4 border-white/20">
          <div className="relative">
            <span className="text-white text-4xl font-black tracking-tighter">{t('splash.name', currentLanguage)}</span>
            <div className="absolute -top-1 -right-2 w-3 h-3 bg-white rounded-full animate-ping shadow-lg shadow-white/50"></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mb-10 relative z-10 animate-in slide-in-from-bottom-4 fade-in duration-1000 delay-500 fill-mode-both">
        <h1 className="text-white text-[28px] font-bold tracking-tight">{t('splash.title', currentLanguage)}</h1>
        <p className="text-support text-sm font-medium tracking-wide">{t('splash.tagline', currentLanguage)}</p>
        <div className="flex items-center gap-2 mt-4">
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
        </div>
        <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.4em] mt-6">v1.2.0</p>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/20 rounded-full"></div>
    </div>
  );
};

export default SplashScreen;
