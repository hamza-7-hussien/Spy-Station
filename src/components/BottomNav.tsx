import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { Compass, Globe, Users, Settings, LucideIcon } from 'lucide-react';
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
    { id: 'home', label: t.navHome, icon: Compass },
    { id: 'stations', label: t.navStations, icon: Globe },
    { id: 'friends', label: t.navFriends, icon: Users, badge: badgeCount },
    { id: 'settings', label: t.navSettings, icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[68px] bg-[#0b101b]/95 border-t border-slate-800 backdrop-blur-xl flex items-center justify-around px-2">
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
            className={`flex flex-col items-center justify-center gap-1 w-full h-full relative transition-colors cursor-pointer ${
              isActive
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-sky-400 rounded-b-full" />
            )}
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[11px]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
