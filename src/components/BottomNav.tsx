import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { Rocket, Globe, Users, Layers, Settings, LucideIcon } from 'lucide-react';
import { sound } from '../audio';

export type NavTabId = 'home' | 'stations' | 'friends' | 'categories' | 'settings';

interface Props {
  lang: Language;
  currentTab: NavTabId;
  badgeCount: number;
  onSelectTab: (tab: NavTabId) => void;
}

interface TabItem {
  id: NavTabId;
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
    { id: 'categories', label: t.navCategories, icon: Layers },
    { id: 'settings', label: t.navSettings, icon: Settings }
  ];

  return (
    <nav className="shrink-0 w-full z-40 min-h-[68px] pb-[env(safe-area-inset-bottom,0px)] bg-slate-950 border-t border-sky-500/25 flex items-center justify-around px-1 sm:px-2 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
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
            className={`flex flex-col items-center justify-center gap-1 w-full min-h-[44px] py-2 relative transition-all cursor-pointer ${
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
            <span className="text-[10px] sm:text-[11px] tracking-wide whitespace-nowrap shrink-0 truncate max-w-[72px]">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
