
import React, { useState } from 'react';
import { Play, Camera, Mic, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
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
    <div className="h-screen w-full bg-warmwhite flex flex-col items-center relative overflow-hidden">
      <div className="w-full h-[60%] bg-secondary/50 rounded-b-[60px] overflow-hidden relative shadow-2xl">
        <img
          src={steps[step].image}
          alt={steps[step].title}
          className="w-full h-full object-cover opacity-90 transition-all duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />
        <div className="absolute bottom-12 left-10 right-10 text-white">
          <h2 className="text-4xl font-bold mb-3 tracking-tight">{steps[step].title}</h2>
          <p className="text-support text-lg font-medium leading-relaxed opacity-90">{steps[step].desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-16">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded-full transition-all duration-500 shadow-sm ${step === i ? 'w-10 bg-primary' : 'w-2.5 bg-secondary'
              }`}
          />
        ))}
      </div>

      <div className="mt-auto mb-20 w-full px-10">
        {steps[step].isPermissionStep ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center gap-6">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-lg border border-secondary/20">
                <Camera size={24} />
              </div>
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-lg border border-secondary/20">
                <Mic size={24} />
              </div>
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-lg border border-secondary/20">
                <MapPin size={24} />
              </div>
            </div>
            <button
              onClick={requestPermissions}
              disabled={permissionStatus === 'requesting'}
              className="w-full h-16 bg-primary text-white rounded-[24px] font-black text-lg shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70"
            >
              {permissionStatus === 'requesting' ? (
                t('onboarding.requesting', currentLanguage)
              ) : permissionStatus === 'done' ? (
                <>{t('onboarding.ready', currentLanguage)} <ShieldCheck size={24} /></>
              ) : (
                <>{t('onboarding.enable', currentLanguage)} <ArrowRight size={20} /></>
              )}
            </button>
            <button
              onClick={onComplete}
              className="w-full text-slate text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
            >
              {t('onboarding.skip', currentLanguage)}
            </button>
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-28 h-28 border-2 border-primary/20 rounded-full animate-[ping_4s_infinite] opacity-50"></div>
            <div className="absolute w-22 h-22 border border-primary/30 rounded-full"></div>
            <button
              onClick={handleNext}
              className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-90 transition-transform z-10"
            >
              <Play size={24} fill="white" className="text-white ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
