import React, { useEffect } from 'react';
import { Shield, Radio, Sparkles } from 'lucide-react';
import { sound } from '../audio';

interface SciFiAirlockDoorsProps {
  isOpen: boolean;
  label?: string;
  sublabel?: string;
  onAnimationComplete?: () => void;
}

export const SciFiAirlockDoors: React.FC<SciFiAirlockDoorsProps> = ({
  isOpen,
  label = 'DECK 07 // MISSION ACCESS',
  sublabel = 'SECURITY CLEARANCE VERIFIED',
  onAnimationComplete
}) => {
  useEffect(() => {
    if (isOpen) {
      sound.playAirlockDoor();
    }
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none overflow-hidden transition-opacity duration-700 ${
        isOpen ? 'opacity-0 delay-500' : 'opacity-100'
      }`}
      onTransitionEnd={() => {
        if (isOpen && onAnimationComplete) {
          onAnimationComplete();
        }
      }}
    >
      {/* LEFT TITANIUM BLAST DOOR */}
      <div
        className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-slate-950 via-slate-900 to-zinc-900 border-r-4 border-cyan-500/80 shadow-[10px_0_40px_rgba(0,0,0,0.9)] flex items-center justify-end pr-4 transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          isOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Futuristic armor panel ribs */}
        <div className="absolute inset-y-0 left-0 w-full opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(56,189,248,0.3)_50%,transparent_75%)] bg-[size:24px_24px] pointer-events-none" />

        {/* Hazard yellow/black accent stripes on edge */}
        <div className="absolute top-0 bottom-0 right-0 w-3 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_10px,#000_10px,#000_20px)] opacity-80" />

        <div className="space-y-4 text-right pr-6 hidden sm:block select-none">
          <div className="flex items-center justify-end gap-2 text-cyan-400 font-mono text-xs tracking-widest font-black uppercase">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>SYS_READY // P-01</span>
          </div>
          <div className="w-28 h-1 bg-cyan-500/40 ml-auto rounded-full" />
        </div>
      </div>

      {/* RIGHT TITANIUM BLAST DOOR */}
      <div
        className={`absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-slate-950 via-slate-900 to-zinc-900 border-l-4 border-cyan-500/80 shadow-[-10px_0_40px_rgba(0,0,0,0.9)] flex items-center justify-start pl-4 transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] ${
          isOpen ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="absolute inset-y-0 right-0 w-full opacity-10 bg-[linear-gradient(-45deg,transparent_25%,rgba(56,189,248,0.3)_50%,transparent_75%)] bg-[size:24px_24px] pointer-events-none" />

        {/* Hazard stripe on left edge */}
        <div className="absolute top-0 bottom-0 left-0 w-3 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_10px,#000_10px,#000_20px)] opacity-80" />

        <div className="space-y-4 text-left pl-6 hidden sm:block select-none">
          <div className="flex items-center justify-start gap-2 text-cyan-400 font-mono text-xs tracking-widest font-black uppercase">
            <span>SYS_READY // P-02</span>
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          </div>
          <div className="w-28 h-1 bg-cyan-500/40 rounded-full" />
        </div>
      </div>

      {/* CENTRAL HYDRAULIC BLAST LOCK INSIGNIA */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center transition-all duration-500 select-none ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 border-4 border-cyan-400 flex items-center justify-center shadow-[0_0_50px_rgba(56,189,248,0.8)]">
          <div className="absolute inset-1 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin" style={{ animationDuration: '10s' }} />
          <Shield className="w-10 h-10 text-cyan-300 animate-pulse drop-shadow-[0_0_15px_rgba(56,189,248,1)]" />
        </div>

        <div className="mt-4 px-4 py-1.5 rounded-2xl bg-black/90 border border-cyan-500/60 shadow-[0_0_25px_rgba(56,189,248,0.5)] text-center backdrop-blur-md">
          <div className="text-xs sm:text-sm font-heading font-black tracking-wider text-cyan-300 uppercase flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{label}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">
            {sublabel}
          </div>
        </div>
      </div>
    </div>
  );
};
