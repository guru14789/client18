
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Smartphone, ChevronLeft, ChevronDown, Phone, Search, X, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';

interface Country {
  name: string;
  code: string;
  flag: string;
  iso: string;
}

const COUNTRIES: Country[] = [
  { name: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩', iso: 'ID' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', iso: 'GB' },
  { name: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', iso: 'CA' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', iso: 'AU' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', iso: 'DE' },
  { name: 'France', code: '+33', flag: '🇫🇷', iso: 'FR' },
  { name: 'Spain', code: '+34', flag: '🇪🇸', iso: 'ES' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', iso: 'BR' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽', iso: 'MX' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷', iso: 'KR' },
];

interface LoginProps {
  onLogin: (phone: string, name: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [name, setName] = useState('');
  const [step, setStep] = useState<'welcome' | 'phone' | 'otp' | 'nameEntry'>('welcome');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [countrySearch, setCountrySearch] = useState('');
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const cachedPhone = localStorage.getItem('inai_cached_phone');
    const cachedCountryIso = localStorage.getItem('inai_cached_country');
    
    if (cachedPhone) setPhoneNumber(cachedPhone);
    if (cachedCountryIso) {
      const country = COUNTRIES.find(c => c.iso === cachedCountryIso);
      if (country) setSelectedCountry(country);
    }
  }, []);

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
      c.code.includes(countrySearch)
    );
  }, [countrySearch]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 8) return;
    
    setLoading(true);
    localStorage.setItem('inai_cached_phone', phoneNumber);
    localStorage.setItem('inai_cached_country', selectedCountry.iso);
    
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 1000);
  };

  const handleVerifyOtp = (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 4) return;
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const fullPhone = `${selectedCountry.code}${phoneNumber}`;
      
      // Check registry for existing user
      const userRegistry = JSON.parse(localStorage.getItem('inai_user_registry') || '{}');
      const existingName = userRegistry[fullPhone];
      
      if (existingName) {
        onLogin(fullPhone, existingName);
      } else {
        setStep('nameEntry');
      }
    }, 1000);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    const fullPhone = `${selectedCountry.code}${phoneNumber}`;
    onLogin(fullPhone, name.trim());
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) otpRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d !== '')) {
      // Auto-trigger verify
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  if (step === 'welcome') {
    return (
      <div className="h-screen w-full bg-warmwhite flex flex-col items-center px-8 relative overflow-hidden">
        <div className="relative w-full h-[40%] flex items-center justify-center mt-12">
          <div className="w-28 h-28 bg-primary rounded-[36px] flex items-center justify-center shadow-2xl z-10 border-4 border-white animate-in zoom-in-50 duration-700">
            <span className="text-white text-2xl font-black tracking-tighter">Inai</span>
          </div>
          <div className="absolute top-4 right-12 w-16 h-16 bg-secondary/40 rounded-[24px] shadow-sm animate-pulse"></div>
          <div className="absolute bottom-8 left-8 w-24 h-24 bg-support/30 rounded-[32px] shadow-sm animate-pulse delay-700"></div>
        </div>

        <div className="text-center space-y-3 mb-12">
          <h1 className="text-[44px] font-black text-charcoal tracking-tighter leading-none">Connect</h1>
          <p className="text-slate text-lg font-medium max-w-[280px] mx-auto opacity-70">Preserve your family heritage in a secure vault.</p>
        </div>

        <div className="w-full space-y-4 mb-16">
          <button 
            onClick={() => setStep('phone')}
            className="w-full h-16 bg-primary rounded-[24px] flex items-center justify-center gap-4 text-white font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            <Smartphone size={24} />
            Phone Number
          </button>
          <button 
            onClick={() => {
              // Simulate Google login logic
              const fullId = "google_demo_user@gmail.com";
              const userRegistry = JSON.parse(localStorage.getItem('inai_user_registry') || '{}');
              const existingName = userRegistry[fullId];
              setPhoneNumber(fullId); // Use as ID for demo
              if (existingName) onLogin(fullId, existingName);
              else setStep('nameEntry');
            }}
            className="w-full h-16 bg-white border border-secondary rounded-[24px] flex items-center justify-center gap-4 text-charcoal font-black text-lg shadow-sm active:scale-95 transition-all"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" alt="Google" className="w-6 h-6" />
            Google
          </button>
        </div>
      </div>
    );
  }

  if (step === 'phone') {
    return (
      <div className="h-screen w-full bg-warmwhite flex flex-col px-8 animate-in slide-in-from-right duration-300">
        <div className="pt-12 pb-8">
          <button onClick={() => setStep('welcome')} className="p-3 bg-white rounded-2xl shadow-sm text-charcoal active:scale-90 transition-transform border border-secondary/20">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="space-y-2 mb-10">
          <h1 className="text-4xl font-black text-charcoal tracking-tighter">Your Number</h1>
          <p className="text-lg text-slate font-medium opacity-60">We'll send a code to verify you.</p>
        </div>

        <form onSubmit={handleSendOtp} className="flex flex-col flex-1">
          <div className="flex items-center w-full h-16 px-4 bg-white border border-secondary/30 rounded-[24px] overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-sm">
            <button 
              type="button"
              onClick={() => setShowCountryPicker(true)}
              className="flex items-center gap-2 pr-4 border-r border-secondary h-10 hover:bg-warmwhite transition-colors"
            >
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="font-bold text-charcoal">{selectedCountry.code}</span>
              <ChevronDown size={18} className="text-slate opacity-40" />
            </button>
            <input
              type="tel"
              placeholder="000 0000 000"
              className="flex-1 px-4 text-xl bg-transparent outline-none text-charcoal placeholder-slate/20 font-bold"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>

          <div className="mt-auto pb-16">
            <button
              type="submit"
              disabled={loading || phoneNumber.length < 8}
              className="w-full h-16 bg-primary text-white font-black rounded-[24px] text-lg shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <>Get Code <ArrowRight size={20} /></>}
            </button>
          </div>
        </form>

        {showCountryPicker && (
          <div className="fixed inset-0 z-[200] bg-warmwhite animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="p-6 border-b border-secondary/20 flex items-center gap-4 bg-white">
              <button onClick={() => setShowCountryPicker(false)} className="p-3 bg-secondary/20 rounded-2xl text-charcoal">
                <X size={20} />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" size={18} />
                <input 
                  type="text" 
                  placeholder="Search countries..."
                  className="w-full bg-secondary/10 pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-charcoal font-bold"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              {filteredCountries.map((country) => (
                <button
                  key={country.iso}
                  onClick={() => {
                    setSelectedCountry(country);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                  className="w-full flex items-center justify-between p-6 border-b border-secondary/10 hover:bg-secondary/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{country.flag}</span>
                    <span className="font-bold text-charcoal">{country.name}</span>
                  </div>
                  <span className="text-slate font-bold">{country.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="h-screen w-full bg-warmwhite flex flex-col px-8 animate-in slide-in-from-right duration-300">
        <div className="pt-12 pb-8">
          <button onClick={() => setStep('phone')} className="p-3 bg-white rounded-2xl shadow-sm text-charcoal active:scale-90 transition-transform border border-secondary/20">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="space-y-2 mb-10">
          <h1 className="text-4xl font-black text-charcoal tracking-tighter">Verification</h1>
          <p className="text-lg text-slate font-medium opacity-60">Enter the 4-digit code sent to you.</p>
        </div>

        <div className="flex justify-between gap-4 mb-10">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { otpRefs.current[i] = el; }}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-full aspect-square bg-white border border-secondary/30 rounded-3xl text-center text-4xl font-black text-charcoal outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
              autoFocus={i === 0}
            />
          ))}
        </div>

        <div className="text-center">
          <button className="text-primary font-black text-sm uppercase tracking-widest bg-primary/5 px-6 py-2 rounded-full">Resend Code</button>
        </div>

        <div className="mt-auto pb-16">
          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.some(d => !d)}
            className="w-full h-16 bg-primary text-white font-black rounded-[24px] text-lg shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : 'Confirm Code'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'nameEntry') {
    return (
      <div className="h-screen w-full bg-warmwhite flex flex-col px-8 animate-in slide-in-from-bottom duration-500">
        <div className="pt-12 pb-8 flex flex-col items-center">
           <div className="w-20 h-20 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary mb-6">
              <UserIcon size={40} />
           </div>
           <h1 className="text-3xl font-black text-charcoal tracking-tighter text-center">Nearly there!</h1>
           <p className="text-slate font-medium opacity-60 text-center mt-2">What should your family call you?</p>
        </div>

        <form onSubmit={handleNameSubmit} className="flex-1 flex flex-col mt-10">
          <div className="bg-white border border-secondary/30 rounded-[28px] p-6 shadow-sm">
            <label className="text-[10px] font-black text-slate uppercase tracking-[0.3em] block mb-3 px-1">Your Full Name</label>
            <input 
              type="text"
              placeholder="e.g. Grandma Rose"
              className="w-full bg-transparent outline-none text-2xl font-black text-charcoal placeholder-slate/10"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <p className="mt-6 text-sm text-slate text-center px-4 opacity-50 font-medium">
            This name will be shown to your family members when you share memories.
          </p>

          <div className="mt-auto pb-16">
            <button
              type="submit"
              disabled={name.trim().length < 2}
              className="w-full h-16 bg-primary text-white font-black rounded-[24px] text-lg shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            >
              Start Preserving <ArrowRight size={20} />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return null;
};

export default Login;
