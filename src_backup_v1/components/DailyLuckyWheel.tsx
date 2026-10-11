import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Sparkles, Trophy, RotateCw, CheckCircle2 } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onRewardClaimed: (rewardText: string, xpBonus: number) => void;
}

interface Segment {
  labelAr: string;
  labelEn: string;
  color: string;
  xp: number;
}

const SEGMENTS: Segment[] = [
  { labelAr: '+100 XP', labelEn: '+100 XP', color: '#0284c7', xp: 100 },
  { labelAr: '+250 XP 🚀', labelEn: '+250 XP 🚀', color: '#7c3aed', xp: 250 },
  { labelAr: 'لقب: ثعلب الفضاء 🦊', labelEn: 'Title: Space Fox 🦊', color: '#ea580c', xp: 150 },
  { labelAr: '+500 XP 💎', labelEn: '+500 XP 💎', color: '#059669', xp: 500 },
  { labelAr: 'مضاعف XP ⚡', labelEn: '2X XP Booster ⚡', color: '#d97706', xp: 200 },
  { labelAr: '+150 XP 🎯', labelEn: '+150 XP 🎯', color: '#db2777', xp: 150 },
  { labelAr: 'لقب: صائد الجواسيس 🕵️', labelEn: 'Title: Spy Hunter 🕵️', color: '#4f46e5', xp: 250 },
  { labelAr: 'الجائزة الكبرى 1000 XP 🌟', labelEn: 'Jackpot 1000 XP 🌟', color: '#e11d48', xp: 1000 }
];

export const DailyLuckyWheel: React.FC<Props> = ({ isOpen, onClose, lang, onRewardClaimed }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<Segment | null>(null);
  const [hasSpunToday, setHasSpunToday] = useState(false);

  useEffect(() => {
    const lastSpin = localStorage.getItem('last_wheel_spin_date');
    const today = new Date().toDateString();
    if (lastSpin === today) {
      setHasSpunToday(true);
    } else {
      setHasSpunToday(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonReward(null);
    sound.playClick();
    sound.triggerHaptic('medium');

    // Pick random segment
    const segmentIndex = Math.floor(Math.random() * SEGMENTS.length);
    const segmentAngle = 360 / SEGMENTS.length;
    // Calculate final rotation (min 5 full rotations + segment angle)
    const extraSpins = 5 * 360;
    // Align pointer at top (270 deg or 0 deg offset)
    const targetAngle = extraSpins + (360 - (segmentIndex * segmentAngle + segmentAngle / 2));
    const finalRotation = rotation + targetAngle;
    setRotation(finalRotation);

    // Tick audio interval while spinning
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      sound.playTone(300 + (tickCount % 4) * 50, 'triangle', 0.03, 0.2);
      if (tickCount > 25) clearInterval(tickInterval);
    }, 120);

    setTimeout(() => {
      clearInterval(tickInterval);
      const chosen = SEGMENTS[segmentIndex];
      setWonReward(chosen);
      setIsSpinning(false);
      setHasSpunToday(true);
      localStorage.setItem('last_wheel_spin_date', new Date().toDateString());

      sound.playCheerApplause();
      sound.triggerHaptic('heavy');
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch {}

      onRewardClaimed(lang === 'ar' ? chosen.labelAr : chosen.labelEn, chosen.xp);
    }, 4200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-purple-500/40 p-6 shadow-2xl shadow-purple-500/20 text-center space-y-4">
        {/* Close button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 end-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 text-purple-400">
          <Sparkles className="w-6 h-6 animate-pulse" />
          <h3 className="text-lg font-black font-heading text-slate-100">
            {lang === 'ar' ? 'عجلة الحظ المدارية' : 'Orbital Lucky Wheel'}
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          {lang === 'ar'
            ? 'قم بتدوير العجلة المدارية يومياً واربح نقاط خبرة وألقاباً أسطورية مجاناً!'
            : 'Spin the orbital wheel daily for bonus XP and legendary agent titles!'}
        </p>

        {/* Wheel Graphic Container */}
        <div className="relative w-64 h-64 mx-auto my-2 flex items-center justify-center">
          {/* Top Indicator Pointer */}
          <div className="absolute top-0 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] -translate-y-1"></div>

          {/* Rotating Wheel */}
          <div
            className="w-full h-full rounded-full border-4 border-slate-800 shadow-[0_0_30px_rgba(168,85,247,0.3)] overflow-hidden transition-transform duration-[4200ms] ease-out relative"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {SEGMENTS.map((seg, idx) => {
              const angle = 360 / SEGMENTS.length;
              const startAngle = idx * angle;
              return (
                <div
                  key={idx}
                  className="absolute inset-0 flex items-start justify-center pt-2 text-[10px] font-bold text-white uppercase select-none"
                  style={{
                    transform: `rotate(${startAngle + angle / 2}deg)`,
                    transformOrigin: '50% 50%'
                  }}
                >
                  <span
                    className="px-1.5 py-0.5 rounded shadow text-center font-black max-w-[85px] truncate"
                    style={{ backgroundColor: seg.color }}
                  >
                    {lang === 'ar' ? seg.labelAr : seg.labelEn}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center Hub */}
          <div className="absolute z-10 w-12 h-12 rounded-full bg-slate-900 border-2 border-purple-400 flex items-center justify-center shadow-lg">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* Result Announcement */}
        {wonReward && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 animate-in zoom-in-95 space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'مبروك! ربحت:' : 'Congratulations! You won:'}</span>
            </div>
            <p className="text-base font-black text-slate-100 font-heading">
              {lang === 'ar' ? wonReward.labelAr : wonReward.labelEn}
            </p>
          </div>
        )}

        {/* Spin Button */}
        <button
          disabled={isSpinning}
          onClick={handleSpin}
          className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
            isSpinning
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-purple-500/25'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>
            {isSpinning
              ? lang === 'ar'
                ? 'العجلة تدور...'
                : 'Spinning...'
              : hasSpunToday
              ? lang === 'ar'
                ? 'تدوير إضافي تجريبي 🔄'
                : 'Extra Spin 🔄'
              : lang === 'ar'
              ? 'تدوير العجلة الآن! 🎲'
              : 'Spin Now! 🎲'}
          </span>
        </button>
      </div>
    </div>
  );
};
