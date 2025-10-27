
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Phase, Stats } from './types';
import { TRANSLATIONS, PHASE_DURATION_S } from './constants';
import { PlayIcon, PauseIcon, SoundOnIcon, SoundOffIcon, SunIcon, MoonIcon, LanguageIcon, ChartIcon } from './components/Icons';

type Language = 'en' | 'ru';
type Theme = 'light' | 'dark';

// Helper component defined outside the main component to prevent re-renders
const BreathingCircle = ({ phase, text, theme, countdown, isRunning }: { phase: Phase; text: string; theme: Theme; countdown: number; isRunning: boolean; }) => {
  const phaseStyles = useMemo(() => {
    const base = "absolute inset-0 rounded-full transition-all ease-in-out duration-4000 flex items-center justify-center p-4";
    
    const lightColors = {
      [Phase.Idle]: 'bg-slate-300',
      [Phase.Inhale]: 'bg-cyan-300',
      [Phase.HoldIn]: 'bg-sky-400',
      [Phase.Exhale]: 'bg-blue-600',
      [Phase.HoldOut]: 'bg-sky-400',
    };
    
    const darkColors = {
      [Phase.Idle]: 'bg-slate-700',
      [Phase.Inhale]: 'bg-cyan-600',
      [Phase.HoldIn]: 'bg-sky-700',
      [Phase.Exhale]: 'bg-indigo-900',
      [Phase.HoldOut]: 'bg-sky-700',
    };

    const scale = {
      [Phase.Idle]: 'scale-75',
      [Phase.Inhale]: 'scale-100',
      [Phase.HoldIn]: 'scale-100',
      [Phase.Exhale]: 'scale-50',
      [Phase.HoldOut]: 'scale-50',
    };

    const colors = theme === 'light' ? lightColors : darkColors;
    return `${base} ${colors[phase]} ${scale[phase]}`;
  }, [phase, theme]);

  const textSize = 'text-2xl sm:text-3xl md:text-4xl font-medium';

  return (
    <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80">
      <div className={phaseStyles}>
        <div className="flex flex-col items-center">
          <span className={`text-white text-center transition-opacity duration-500 ${textSize}`}>
            {text}
          </span>
          {isRunning && phase !== Phase.Idle && (
            <span className="text-white text-xl sm:text-2xl md:text-3xl font-mono opacity-75 mt-1 transition-opacity duration-500" aria-hidden="true">
              {countdown}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for session duration buttons
const DurationSelector = ({ onSelect, disabled, T }: { onSelect: (mins: number) => void; disabled: boolean; T: (typeof TRANSLATIONS)['en'] }) => (
  <div className="flex items-center gap-2 sm:gap-4 my-8">
    <span className="text-sm sm:text-base text-slate-600 dark:text-slate-300 hidden sm:block">{T.selectDuration}:</span>
    {[5, 10, 15].map((mins) => (
      <button
        key={mins}
        onClick={() => onSelect(mins)}
        disabled={disabled}
        className="px-4 py-2 text-sm sm:text-base bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105"
      >
        {mins} {T.min}
      </button>
    ))}
  </div>
);

// Helper component for stats display
const StatsModal = ({ stats, onClose, T }: { stats: Stats; onClose: () => void; T: (typeof TRANSLATIONS)['en'] }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-8 w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white text-center">{T.stats}</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-baseline p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <span className="text-slate-600 dark:text-slate-300">{T.sessions}:</span>
            <span className="text-3xl font-bold text-cyan-500 dark:text-cyan-400">{stats.sessions}</span>
          </div>
          <div className="flex justify-between items-baseline p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <span className="text-slate-600 dark:text-slate-300">{T.totalCycles}:</span>
            <span className="text-3xl font-bold text-sky-500 dark:text-sky-400">{stats.totalCycles}</span>
          </div>
        </div>
        <button onClick={onClose} className="mt-8 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 ease-in-out transform hover:scale-105">
          {T.close}
        </button>
      </div>
    </div>
);

export default function App() {
  const [phase, setPhase] = useState<Phase>(Phase.Idle);
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [phaseCountdown, setPhaseCountdown] = useState(PHASE_DURATION_S);
  const [language, setLanguage] = useState<Language>('en');
  const [isMuted, setIsMuted] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Stats>({ sessions: 0, totalCycles: 0 });

  const phaseTimerRef = useRef<number | undefined>(undefined);
  const sessionTimerRef = useRef<number | undefined>(undefined);
  const countdownTimerRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const T = TRANSLATIONS[language];

  const phaseText = useMemo(() => {
    if (!isRunning || phase === Phase.Idle) return "";
    
    const simpleMap = {
      [Phase.Inhale]: T.inhale,
      [Phase.HoldIn]: T.holdIn,
      [Phase.Exhale]: T.exhale,
      [Phase.HoldOut]: T.holdOut,
    };

    return simpleMap[phase as keyof typeof simpleMap] || "";
  }, [phase, T, isRunning]);

  const playDingSound = useCallback(() => {
    if (isMutedRef.current) return;

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser");
        return;
      }
    }
    
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  }, []);

  const advancePhase = useCallback(() => {
    setPhase(currentPhase => {
      switch (currentPhase) {
        case Phase.Idle: return Phase.Inhale;
        case Phase.Inhale: return Phase.HoldIn;
        case Phase.HoldIn: return Phase.Exhale;
        case Phase.Exhale: return Phase.HoldOut;
        case Phase.HoldOut: 
          setCycleCount(c => c + 1);
          return Phase.Inhale;
        default: return Phase.Inhale;
      }
    });
  }, []);

  const stopSession = useCallback(() => {
    setIsRunning(false);
    setPhase(Phase.Idle);
    if (phaseTimerRef.current !== undefined) clearInterval(phaseTimerRef.current);
    if (sessionTimerRef.current !== undefined) clearInterval(sessionTimerRef.current);
    if (countdownTimerRef.current !== undefined) clearInterval(countdownTimerRef.current);

    if (elapsedTime > 0) {
        setStats(prevStats => {
            const newStats = {
                sessions: prevStats.sessions + 1,
                totalCycles: prevStats.totalCycles + cycleCount,
            };
            localStorage.setItem('breathing_stats', JSON.stringify(newStats));
            return newStats;
        });
    }
    setElapsedTime(0);
    setDuration(0);
    setCycleCount(0);
  }, [elapsedTime, cycleCount]);

  useEffect(() => {
    if (isRunning) {
      if (elapsedTime >= duration) {
        stopSession();
      }
    }
  }, [elapsedTime, duration, isRunning, stopSession]);

  useEffect(() => {
    if (!isRunning || phase === Phase.Idle) return;
    playDingSound();
  }, [phase, isRunning, playDingSound]);


  const startSession = (mins: number) => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const totalSeconds = mins * 60;
    setDuration(totalSeconds);
    setElapsedTime(0);
    setCycleCount(0);
    setIsRunning(true);
    setPhase(Phase.Idle);
    setPhaseCountdown(PHASE_DURATION_S);
    
    setTimeout(() => {
        advancePhase();
        phaseTimerRef.current = window.setInterval(advancePhase, PHASE_DURATION_S * 1000);
    }, 100);

    sessionTimerRef.current = window.setInterval(() => {
      setElapsedTime(t => t + 1);
    }, 1000);

    countdownTimerRef.current = window.setInterval(() => {
      setPhaseCountdown(c => (c > 1 ? c - 1 : PHASE_DURATION_S));
    }, 1000);
  };
  
  useEffect(() => {
    const savedStats = localStorage.getItem('breathing_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }

    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const toggleLanguage = () => setLanguage(prev => (prev === 'en' ? 'ru' : 'en'));
  const toggleMute = () => setIsMuted(prev => !prev);
  
  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <div className={`flex flex-col items-center justify-between min-h-screen p-4 sm:p-8 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300 font-sans`}>
        {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} T={T} />}
        
        <header className="w-full max-w-5xl mx-auto flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold">{T.title}</h1>
            <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={() => setShowStats(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 ease-in-out transform hover:scale-110" aria-label={T.stats}>
                    <ChartIcon className="w-6 h-6"/>
                </button>
                <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 ease-in-out transform hover:scale-110" aria-label="Toggle language">
                    <LanguageIcon className="w-6 h-6"/>
                </button>
                <button onClick={toggleMute} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 ease-in-out transform hover:scale-110" aria-label="Toggle sound">
                    {isMuted ? <SoundOffIcon className="w-6 h-6"/> : <SoundOnIcon className="w-6 h-6"/>}
                </button>
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 ease-in-out transform hover:scale-110" aria-label="Toggle theme">
                    {theme === 'light' ? <MoonIcon className="w-6 h-6"/> : <SunIcon className="w-6 h-6"/>}
                </button>
            </div>
        </header>

        <main className="flex flex-col items-center justify-center flex-grow text-center">
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 dark:from-cyan-600 dark:to-blue-800 rounded-full opacity-20 dark:opacity-30" aria-hidden="true"></div>
                <BreathingCircle phase={phase} text={phaseText} theme={theme} countdown={phaseCountdown} isRunning={isRunning} />
            </div>
            
            {!isRunning && <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-md mb-4">{T.description}</p>}
            
            {isRunning ? (
                <div className="text-center">
                    <div className="text-5xl font-mono tracking-widest" aria-live="off">{formatTime(duration - elapsedTime)}</div>
                    <div className="mt-2 text-slate-500 dark:text-slate-400">{cycleCount} {T.cycles}</div>
                </div>
            ) : (
                <DurationSelector onSelect={startSession} disabled={isRunning} T={T} />
            )}
        </main>

        <footer className="w-full flex justify-center items-center h-20">
            {isRunning && (
                <button onClick={stopSession} className="p-4 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all duration-200 ease-in-out transform hover:scale-105" aria-label={T.stop}>
                    <PauseIcon className="w-8 h-8"/>
                </button>
            )}
        </footer>
      </div>
    </>
  );
}
