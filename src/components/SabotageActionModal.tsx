import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, PlayerData, SabotageAbility } from '../types';
import { X, Radar, VolumeX, Crosshair, Radio, AlertTriangle } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  currentUserUid: string;
  ability: SabotageAbility;
  turnOrder: string[];
  players: Record<string, PlayerData>;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (targetUid: string) => void;
  onExecuteScramble?: () => void;
}

export const SabotageActionModal: React.FC<Props> = ({
  lang,
  currentUserUid,
  ability,
  turnOrder,
  players,
  isOpen,
  onClose,
  onExecute,
  onExecuteScramble
}) => {
  const [selectedTargetUid, setSelectedTargetUid] = useState<string | null>(null);

  if (!isOpen) return null;
  const t = dictionary[lang];

  const candidateUids = turnOrder.filter(uid => {
    if (uid === currentUserUid) return false;
    const p = players[uid];
    return p && !p.isSpectator;
  });

  const getAbilityDetails = () => {
    switch (ability) {
      case 'thermal_scan':
        return {
          title: lang === 'ar' ? 'رادار الفحص الحراري' : 'Thermal Heat Scan',
          desc:
            lang === 'ar'
              ? 'اختر لاعباً لفحص ما إذا كان الجاسوس يجلس بجواره مباشرة في الطاولة!'
              : 'Scan a player to check if a spy sits directly next to them!',
          icon: Radar,
          color: 'from-amber-500 to-rose-500',
          btnText: lang === 'ar' ? 'بدء الفحص الحراري 📡' : 'Start Thermal Scan 📡'
        };
      case 'silence_hack':
        return {
          title: lang === 'ar' ? 'بروتوكول الصمت' : 'Silence Protocol Hack',
          desc:
            lang === 'ar'
              ? 'اختر لاعباً لكتمه في دوره القادم؛ سيُمنع من الكلام ويُجبر على التلميح بإيموجي فقط!'
              : 'Silence a player for their next turn; forces them to clue with emojis only!',
          icon: VolumeX,
          color: 'from-purple-500 to-indigo-500',
          btnText: lang === 'ar' ? 'تفعيل بروتوكول الصمت 🤐' : 'Engage Silence Hack 🤐'
        };
      case 'silver_bullet':
        return {
          title: lang === 'ar' ? 'الرصاصة الفضية (اتهام فوري)' : 'Silver Bullet Accusation',
          desc:
            lang === 'ar'
              ? 'مخاطرة عالية! اتهم لاعباً فوراً: إذا كان هو الجاسوس تفوزون، وإذا كان بريئاً ستُحرم من التصويت!'
              : 'High risk! Accuse immediately: win if spy, lose voting rights if innocent!',
          icon: Crosshair,
          color: 'from-rose-500 to-red-600',
          btnText: lang === 'ar' ? 'إطلاق الاتهام المباشر 🎯' : 'Fire Silver Bullet 🎯'
        };
      case 'signal_scramble':
        return {
          title: lang === 'ar' ? 'تشويش الإشارة اللاسلكية' : 'Signal Scrambler',
          desc:
            lang === 'ar'
              ? 'تشويش أجهزة الاتصال ومؤقت المحطة لإرباك الجميع وخلق حالة فوضى!'
              : 'Scramble station signals and timers to create tactical confusion!',
          icon: Radio,
          color: 'from-cyan-500 to-sky-600',
          btnText: lang === 'ar' ? 'إطلاق نبضة التشويش ⚡' : 'Trigger Signal Scramble ⚡'
        };
    }
  };

  const details = getAbilityDetails();
  const Icon = details.icon;

  const handleConfirm = () => {
    sound.triggerHaptic('medium');
    sound.playSabotageScan();
    if (ability === 'signal_scramble') {
      if (onExecuteScramble) onExecuteScramble();
      else if (candidateUids[0]) onExecute(candidateUids[0]);
    } else {
      if (!selectedTargetUid) return;
      onExecute(selectedTargetUid);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-5 sm:p-6 shadow-2xl relative text-start space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 inset-inline-end-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${details.color} text-white shadow-lg`}>
            <Icon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white font-heading">
              {details.title}
            </h3>
            <p className="text-xs text-slate-400 leading-snug">{details.desc}</p>
          </div>
        </div>

        {/* Warning badge for Silver Bullet */}
        {ability === 'silver_bullet' && (
          <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-300 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'تحذير: الاتهام الخاطئ سيحرمك من حق التصويت في هذه الجولة!'
                : 'Warning: A false accusation disables your vote this round!'}
            </span>
          </div>
        )}

        {/* Target selection list (if applicable) */}
        {ability !== 'signal_scramble' && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {lang === 'ar' ? 'حدد اللاعب المستهدف:' : 'Select Target Player:'}
            </div>
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {candidateUids.map(uid => {
                const p = players[uid];
                const isSelected = selectedTargetUid === uid;
                return (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedTargetUid(uid);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={p?.name}
                        className="w-8 h-8 rounded-full border border-sky-400/30 object-cover"
                      />
                      <span className="font-bold text-xs sm:text-sm">{p?.name || 'Agent'}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                        isSelected ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          disabled={ability !== 'signal_scramble' && !selectedTargetUid}
          className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
            ability !== 'signal_scramble' && !selectedTargetUid
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : `bg-gradient-to-r ${details.color} text-white hover:brightness-110 active:scale-95`
          }`}
        >
          <span>{details.btnText}</span>
        </button>
      </div>
    </div>
  );
};
