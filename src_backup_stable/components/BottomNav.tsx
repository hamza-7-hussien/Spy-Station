import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { Rocket, Globe, Users, Settings, LucideIcon } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  currentTab: 'home' | 'stations' | 'friends' | 'settings';
  badgeCount: number;
  onSelectTab: (tab: 'home' | 'stations' | 'friends' | 'settings') => void;
}

interface TabItem {
  id: 'home' | 'stations' | 'friends' | 'settings';
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const BottomNav: React.FC<Props> = ({
  lang,
  currentTab,
  badgeCount,
  onSelectTab
}) => {
  const t = dictionary[lang];

  const tabs: TabItem[] = [
    { id: 'home', label: t.navHome, icon: Rocket },
    { id: 'stations', label: t.navStations, icon: Globe },
    { id: 'friends', label: t.navFriends, icon: Users, badge: badgeCount },
    { id: 'settings', label: t.navSettings, icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[72px] bg-slate-950/90 border-t border-sky-500/20 backdrop-blur-xl flex items-center justify-around px-2 shadow-2xl">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              sound.playTone(420, 'sine', 0.08);
              sound.triggerHaptic('light');
              onSelectTab(tab.id);
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full relative transition-all cursor-pointer ${
              isActive
                ? 'text-sky-400 font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : ''}`} />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
