
import React, { useState } from 'react';
import { Play, Camera, Mic, MapPin, ShieldCheck, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Language } from '../types';
import { t } from '../services/i18n';

interface OnboardingProps {
  onComplete: () => void;
  currentLanguage: Language;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, currentLanguage }) => {
  const [step, setStep] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'requesting' | 'done'>('idle');

  const steps = [
    {
      image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=1000&auto=format&fit=crop",
      title: t('onboarding.step1.title', currentLanguage),
      desc: t('onboarding.step1.desc', currentLanguage)
    },
    {
      image: "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=1000&auto=format&fit=crop",
      title: t('onboarding.step2.title', currentLanguage),
      desc: t('onboarding.step2.desc', currentLanguage)
    },
    {
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1000&auto=format&fit=crop",
      title: t('onboarding.step3.title', currentLanguage),
      desc: t('onboarding.step3.desc', currentLanguage)
    },
    {
      image: "https://images.unsplash.com/photo-1464692805480-a69dfaafdb0d?q=80&w=1000&auto=format&fit=crop",
      title: t('onboarding.step4.title', currentLanguage),
      desc: t('onboarding.step4.desc', currentLanguage),
      isPermissionStep: true
    }
  ];

  const requestPermissions = async () => {
    setPermissionStatus('requesting');
    try {
      // Request media permissions
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      // Request location permission
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, resolve, { timeout: 5000 });
      });
      setPermissionStatus('done');
      setTimeout(onComplete, 800);
    } catch (err) {
      console.warn("Permissions partially denied or failed", err);
      setPermissionStatus('done');
      setTimeout(onComplete, 800);
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="h-screen w-full bg-warmwhite dark:bg-charcoal flex flex-col items-center relative overflow-hidden transition-colors">
      <div className="w-full flex-1 max-h-[55vh] sm:max-h-[60vh] bg-secondary/20 dark:bg-white/5 rounded-b-[64px] overflow-hidden relative shadow-2xl shrink-0">
        <img
          src={steps[step].image}
          alt={steps[step].title}
          className="w-full h-full object-cover transition-all duration-1000 hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent dark:from-black dark:via-black/20" />
        <div className="absolute bottom-12 left-10 right-10 text-white">
          <h2 className="text-4xl font-black mb-3 tracking-tighter leading-tight animate-in slide-in-from-left duration-500">{steps[step].title}</h2>
          <p className="text-support/90 dark:text-warmwhite/70 text-lg font-medium leading-relaxed opacity-90 line-clamp-2 animate-in slide-in-from-left duration-700 delay-100">{steps[step].desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-12 shrink-0">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-primary shadow-lg shadow-primary/20' : 'w-1.5 bg-secondary/40 dark:bg-white/10'
              }`}
          />
        ))}
      </div>

      <div className="mt-auto mb-16 w-full px-10 shrink-0">
        {steps[step].isPermissionStep ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center gap-4">
              {[Camera, Mic, MapPin].map((Icon, i) => (
                <div key={i} className="w-14 h-14 bg-white dark:bg-white/10 rounded-[22px] flex items-center justify-center text-primary shadow-xl border border-secondary/10 dark:border-white/5">
                  <Icon size={24} />
                </div>
              ))}
            </div>
            <button
              onClick={requestPermissions}
              disabled={permissionStatus === 'requesting'}
              className="w-full h-16 bg-primary text-white rounded-[28px] font-black text-lg shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70"
            >
              {permissionStatus === 'requesting' ? (
                <Loader2 size={24} className="animate-spin" />
              ) : permissionStatus === 'done' ? (
                <>{t('onboarding.ready', currentLanguage)} <ShieldCheck size={24} /></>
              ) : (
                <>{t('onboarding.enable', currentLanguage)} <ArrowRight size={20} /></>
              )}
            </button>
            <button
              onClick={onComplete}
              className="w-full text-slate/40 dark:text-support/30 text-[10px] font-black uppercase tracking-[0.3em] hover:text-primary transition-colors"
            >
              {t('onboarding.skip', currentLanguage)}
            </button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
              <button
                onClick={handleNext}
                className="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-90 transition-transform z-10"
              >
                <ArrowRight size={32} className="text-white" strokeWidth={3} />
              </button>
            </div>
            {step === 0 && (
              <p className="text-[10px] font-black text-slate/30 dark:text-support/20 uppercase tracking-[0.2em] animate-pulse">
                Tap to explore
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
