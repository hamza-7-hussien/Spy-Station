export interface SavedAccountProfile {
  uid: string;
  email: string;
  name: string;
  avatar: string;
  provider: 'google' | 'password';
  lastUsedAt: number;
}

const STORAGE_KEY = 'spy_station_saved_accounts';

export function getSavedAccounts(): SavedAccountProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedAccountProfile =>
          Boolean(item && typeof item.uid === 'string' && typeof item.email === 'string' && item.email.trim())
      )
      .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      .slice(0, 4);
  } catch {
    return [];
  }
}

export function saveAccountProfile(profile: Omit<SavedAccountProfile, 'lastUsedAt'>): void {
  try {
    const email = (profile.email || '').trim().toLowerCase();
    if (!email || !profile.uid) return;
    const current = getSavedAccounts().filter(
      a => a.uid !== profile.uid && a.email.toLowerCase() !== email
    );
    const updated: SavedAccountProfile[] = [
      {
        uid: profile.uid,
        email,
        name: profile.name || email.split('@')[0],
        avatar:
          profile.avatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.name || profile.uid)}`,
        provider: profile.provider,
        lastUsedAt: Date.now()
      },
      ...current
    ].slice(0, 4);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
}

export function removeSavedAccount(uidOrEmail: string): SavedAccountProfile[] {
  try {
    const key = (uidOrEmail || '').trim().toLowerCase();
    const filtered = getSavedAccounts().filter(
      a => a.uid !== uidOrEmail && a.email.toLowerCase() !== key
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
}
