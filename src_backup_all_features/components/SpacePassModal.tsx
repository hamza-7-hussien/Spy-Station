import React, { useState } from 'react';
import { X, Trophy, Sparkles, CheckCircle2, Lock, Flame, Shield, Award, Star } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  userXp: number;
}

const PASS_TIERS = [
  { level: 1, xpReq: 0, titleAr: 'مستجد المحطة', titleEn: 'Station Cadet', icon: '🧑‍🚀', reward: 'شارة البداية' },
  { level: 5, xpReq: 500, titleAr: 'صائد الجواسيس', titleEn: 'Spy Hunter', icon: '🕵️‍♂️', reward: '+100 XP' },
  { level: 10, xpReq: 1000, titleAr: 'ثعلب الفضاء الماكر', titleEn: 'Space Fox', icon: '🦊', reward: 'لون بدلة أزرق متوهج' },
  { level: 20, xpReq: 2000, titleAr: 'المحقق الصامت', titleEn: 'Silent Detective', icon: '🔍', reward: 'إيموجي حصري 🎯' },
  { level: 30, xpReq: 3500, titleAr: 'شبح المجرة', titleEn: 'Galaxy Phantom', icon: '👻', reward: 'تأثير دخان فضائي' },
  { level: 50, xpReq: 5000, titleAr: 'أسطورة الفضاء الخالدة', titleEn: 'Cosmic Legend', icon: '👑', reward: 'التاج الملكي الفضائي' }
];

const LEADERBOARD_DATA = [
  { rank: 1, name: 'سيف المجرة ⚡', xp: 8420, wins: 54, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Seif' },
  { rank: 2, name: 'العميل زيرو 🕵️', xp: 7150, wins: 48, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zero' },
  { rank: 3, name: 'قناصة النجوم 🎯', xp: 5980, wins: 39, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sniper' },
  { rank: 4, name: 'نور القمر 🌙', xp: 4300, wins: 31, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Noor' },
  { rank: 5, name: 'كابتن رامي 🚀', xp: 3200, wins: 22, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ramy' }
];

export const SpacePassModal: React.FC<Props> = ({ isOpen, onClose, lang, userXp }) => {
  const [activeTab, setActiveTab] = useState<'pass' | 'leaderboard' | 'missions'>('pass');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-purple-500/40 p-5 sm:p-6 shadow-2xl shadow-purple-500/20 text-start space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-purple-400">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-black font-heading text-slate-100">
              {lang === 'ar' ? 'المسار الفضائي ولوحة الصدارة' : 'Space Pass & Leaderboard'}
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('pass');
            }}
            className={`py-2 rounded-xl transition cursor-pointer text-center ${
              activeTab === 'pass'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'ar' ? 'المسار 🚀' : 'Pass 🚀'}
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('leaderboard');
            }}
            className={`py-2 rounded-xl transition cursor-pointer text-center ${
              activeTab === 'leaderboard'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'ar' ? 'المتصدرين 🏆' : 'Top 🏆'}
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('missions');
            }}
            className={`py-2 rounded-xl transition cursor-pointer text-center ${
              activeTab === 'missions'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'ar' ? 'المهام 🎯' : 'Missions 🎯'}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* TAB 1: PASS */}
          {activeTab === 'pass' && (
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-purple-300 font-bold uppercase">{lang === 'ar' ? 'رصيدك الحالي' : 'Current XP'}</div>
                  <div className="text-xl font-black font-heading text-white">{userXp} XP</div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-xl">
                  ⚡
                </div>
              </div>

              {PASS_TIERS.map(tier => {
                const isUnlocked = userXp >= tier.xpReq;
                const progress = Math.min(100, Math.round((userXp / Math.max(1, tier.xpReq)) * 100));

                return (
                  <div
                    key={tier.level}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      isUnlocked
                        ? 'bg-purple-950/30 border-purple-500/40'
                        : 'bg-slate-950/60 border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl p-2 rounded-xl bg-slate-900 border border-slate-800">
                        {tier.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            {lang === 'ar' ? tier.titleAr : tier.titleEn}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-purple-300 font-bold">
                            Lvl {tier.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {tier.reward} • {tier.xpReq} XP
                        </div>
                      </div>
                    </div>

                    <div>
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{lang === 'ar' ? 'مفتوح' : 'Unlocked'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-2">
              {LEADERBOARD_DATA.map(item => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 font-black font-heading text-center ${
                      item.rank === 1 ? 'text-amber-400 text-base' : item.rank === 2 ? 'text-slate-300 text-sm' : item.rank === 3 ? 'text-amber-600 text-sm' : 'text-slate-500'
                    }`}>
                      #{item.rank}
                    </span>
                    <img src={item.avatar} alt={item.name} className="w-8 h-8 rounded-full border border-sky-400" />
                    <div>
                      <div className="font-bold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.wins} {lang === 'ar' ? 'انتصار' : 'Wins'}</div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-purple-300 text-sm">
                    {item.xp.toLocaleString()} XP
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: MISSIONS */}
          {activeTab === 'missions' && (
            <div className="space-y-2">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white">{lang === 'ar' ? 'العب 3 مباريات' : 'Play 3 Matches'}</span>
                  <span className="text-amber-400">+150 XP</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-purple-500 w-2/3" />
                </div>
                <span className="text-[10px] text-slate-400">2 / 3 {lang === 'ar' ? 'مكتمل' : 'Completed'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white">{lang === 'ar' ? 'اكشف الجاسوس بنجاح' : 'Expose the Spy'}</span>
                  <span className="text-emerald-400">+200 XP</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full" />
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">{lang === 'ar' ? 'تم الإنجاز! 🎉' : 'Completed! 🎉'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white">{lang === 'ar' ? 'أطلق صدمة أو ضحكة بالساوند بورد' : 'Trigger SFX in Game'}</span>
                  <span className="text-purple-400">+50 XP</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-purple-500 w-1/2" />
                </div>
                <span className="text-[10px] text-slate-400">1 / 2 {lang === 'ar' ? 'مكتمل' : 'Completed'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
