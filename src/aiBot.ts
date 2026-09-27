import { CategoryKey, Language, PlayerData } from './types';

// Diverse pool of realistic, human astronaut names in Arabic and English
const ARABIC_BOT_NAMES = [
  'فارس', 'زياد', 'مريم', 'طارق', 'ندى', 'يوسف', 'كريم', 'نور',
  'ماجد', 'ريان', 'سلمى', 'آدم', 'هنا', 'جميلة', 'رامي', 'بلال',
  'عادل', 'مروان', 'سليم', 'داليا', 'حسام', 'شريف', 'هادي', 'جنى',
  'ياسمين', 'إبراهيم', 'مصطفى', 'أمير', 'منى', 'باسل', 'عصام', 'ليلى'
];

const ENGLISH_BOT_NAMES = [
  'Faris', 'Ziad', 'Maryam', 'Tarek', 'Nada', 'Youssef', 'Kareem', 'Nour',
  'Maged', 'Rayan', 'Salma', 'Adam', 'Hana', 'Rami', 'Belal', 'Adel',
  'Marwan', 'Selim', 'Dalia', 'Hossam', 'Sherif', 'Hadi', 'Jana', 'Yasmine',
  'Amir', 'Mona', 'Basel', 'Essam', 'Layla', 'Elena', 'Lucas', 'Maya'
];

// Clean Arabic text for comparing names (remove diacritics, normalize alef/ta-marbuta)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^a-zA-Z\u0600-\u06FF]/g, '')
    .trim();
}

/**
 * Generates a completely unique, natural name that does NOT collide with or resemble
 * any existing player in the room (human or bot).
 */
export function generateUniqueBotName(
  existingPlayers: Record<string, PlayerData>,
  lang: Language
): string {
  const pool = lang === 'ar' ? ARABIC_BOT_NAMES : ENGLISH_BOT_NAMES;
  const existingNames = Object.values(existingPlayers).map(p => normalizeName(p.name || ''));

  // Filter out any name in the pool that matches or is a substring of an existing name
  const available = pool.filter(candidate => {
    const norm = normalizeName(candidate);
    return !existingNames.some(existing => existing.includes(norm) || norm.includes(existing));
  });

  if (available.length > 0) {
    const picked = available[Math.floor(Math.random() * available.length)];
    return `${picked} 🤖`;
  }

  // Fallback with unique counter if pool runs out
  const fallbackBase = lang === 'ar' ? 'رائد' : 'Cadet';
  const nextNum = Object.keys(existingPlayers).length + 1;
  return `${fallbackBase} ${nextNum} 🤖`;
}

// Rich semantic association bank for categories and popular items
const CATEGORY_ASSOCIATIONS: Record<CategoryKey, { ar: string[]; en: string[] }> = {
  players: {
    ar: [
      'ملعب', 'هدف', 'تمريرة', 'سرعة', 'مهارة', 'بطولة', 'كابتن', 'حذاء',
      'دفاع', 'هجوم', 'أسيست', 'تسديدة', 'جمهور', 'صافرة', 'عالمي', 'موهبة',
      'تدريب', 'شهرة', 'مباراة', 'نادي', 'منتخب', 'رقم', 'حارس', 'مدرب'
    ],
    en: [
      'stadium', 'goal', 'pass', 'speed', 'skill', 'trophy', 'captain', 'boots',
      'defense', 'attack', 'assist', 'shot', 'crowd', 'whistle', 'talent',
      'training', 'match', 'club', 'jersey', 'striker', 'legend'
    ]
  },
  food: {
    ar: [
      'مطعم', 'لذيذ', 'ساخن', 'وجبة', 'مطبخ', 'طازج', 'توابل', 'شواء',
      'فرن', 'حلو', 'مالح', 'مقرمش', 'صلصة', 'جبنة', 'خبز', 'عشاء',
      'غداء', 'طبق', 'شهي', 'مائدة', 'مشروب', 'نكهة', 'طبخ', 'شيف'
    ],
    en: [
      'restaurant', 'delicious', 'hot', 'meal', 'kitchen', 'fresh', 'spices', 'grill',
      'oven', 'sweet', 'crispy', 'sauce', 'cheese', 'dinner', 'dish', 'tasty',
      'flavor', 'chef', 'snack', 'recipe'
    ]
  },
  places: {
    ar: [
      'سياحة', 'سفر', 'تاريخ', 'مدينة', 'معلم', 'طيران', 'جواز', 'بحر',
      'آثار', 'قديم', 'ارتفاع', 'مبنى', 'شهرة', 'عاصمة', 'طبيعة', 'زيارة',
      'فندق', 'خريطة', 'موقع', 'صيف', 'عطلة', 'ثقافة', 'أجواء', 'شارع'
    ],
    en: [
      'tourism', 'travel', 'history', 'city', 'landmark', 'flight', 'passport', 'sea',
      'monument', 'ancient', 'building', 'capital', 'nature', 'visit', 'hotel',
      'map', 'culture', 'vacation', 'destination', 'scenic'
    ]
  },
  movies: {
    ar: [
      'سينما', 'شاشة', 'دراما', 'إثارة', 'أكشن', 'مخرج', 'قصة', 'بطولة',
      'تمثيل', 'مشهد', 'كاميرا', 'كوميديا', 'نجم', 'مسرح', 'تتر', 'عرض',
      'شخصية', 'حوار', 'حلقة', 'نهاية', 'موسيقى', 'جوائز'
    ],
    en: [
      'cinema', 'screen', 'drama', 'action', 'director', 'story', 'starring',
      'acting', 'scene', 'camera', 'comedy', 'star', 'premiere', 'plot',
      'soundtrack', 'awards', 'blockbuster'
    ]
  },
  games: {
    ar: [
      'لعبة', 'مرحلة', 'تحكم', 'شاشة', 'أونلاين', 'جرافيك', 'تحدي', 'سيرفر',
      'سلاح', 'سكنات', 'فوز', 'مغامرة', 'قتال', 'نقاط', 'لاعبين', 'سرعة',
      'عالم', 'استراتيجية', 'تركيز', 'بطل'
    ],
    en: [
      'level', 'controller', 'graphics', 'online', 'challenge', 'server', 'weapon',
      'skins', 'victory', 'adventure', 'combat', 'points', 'multiplayer', 'speed',
      'world', 'strategy', 'gamer'
    ]
  },
  animals: {
    ar: [
      'طبيعة', 'غابة', 'سرعة', 'صوت', 'فرو', 'مفترس', 'أليف', 'بري',
      'حجم', 'عيون', 'ركض', 'أثر', 'قوي', 'ذيل', 'صحراء', 'بيئة',
      'حماية', 'طيران', 'سباحة', 'صيد'
    ],
    en: [
      'nature', 'jungle', 'speed', 'wild', 'predator', 'fur', 'fast', 'strong',
      'desert', 'tail', 'habitat', 'creature', 'hunting', 'paws', 'mammal'
    ]
  },
  jobs: {
    ar: [
      'مهنة', 'عمل', 'مكتب', 'راتب', 'شهادة', 'مهمة', 'زي', 'دوام',
      'خدمة', 'تخصص', 'مجهود', 'أمانة', 'تعب', 'فريق', 'مدير', 'خبرة'
    ],
    en: [
      'career', 'office', 'salary', 'degree', 'uniform', 'service', 'effort',
      'skill', 'team', 'manager', 'experience', 'profession', 'shift'
    ]
  },
  singers: {
    ar: [
      'صوت', 'أغنية', 'موسيقى', 'لحن', 'حفلة', 'جمهور', 'ألبوم', 'كلمات',
      'مايك', 'فرقة', 'طرب', 'شهرة', 'مسرح', 'إيقاع', 'نغم', 'فنان'
    ],
    en: [
      'voice', 'song', 'music', 'melody', 'concert', 'crowd', 'album', 'lyrics',
      'microphone', 'band', 'fame', 'stage', 'rhythm', 'artist'
    ]
  }
};

// Safe, ambiguous clues for a clever SPY who wants to blend in
const SAFE_SPY_CLUES = {
  ar: [
    'مشهور', 'معروف', 'مميز', 'يومي', 'عالمي', 'مهم', 'محبوب',
    'قديم', 'حديث', 'واضح', 'أساسي', 'مثير', 'خاص', 'كبير', 'سريع'
  ],
  en: [
    'famous', 'popular', 'special', 'daily', 'global', 'important', 'loved',
    'classic', 'modern', 'clear', 'iconic', 'exciting', 'unique', 'big'
  ]
};

/**
 * Generates a realistic, human-level clue for an AI bot player.
 * - If Crew: uses the secret word's semantic context to give a smart, non-giveaway clue.
 * - If Spy: dynamically analyzes previous clues or uses a clever, safe ambiguous clue.
 */
export function generateSmartBotClue(params: {
  isSpy: boolean;
  word: string;
  wordAr: string;
  category: CategoryKey;
  language: Language;
  previousClues: string[];
}): string {
  const { isSpy, word, wordAr, category, language, previousClues } = params;
  const isAr = language === 'ar';
  const usedClues = new Set(previousClues.map(c => c.trim().toLowerCase()));

  // 🕵️ If Bot is the SPY:
  if (isSpy) {
    // If other players already provided clues, use an ambiguous clue that fits the conversation
    const pool = SAFE_SPY_CLUES[isAr ? 'ar' : 'en'];
    const candidates = pool.filter(c => !usedClues.has(c.toLowerCase()));
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return isAr ? 'معروف' : 'popular';
  }

  // 👨‍🚀 If Bot is CREW (knows the word):
  const secretEn = (word || '').toLowerCase();
  const secretAr = (wordAr || '').toLowerCase();

  const categoryPool = CATEGORY_ASSOCIATIONS[category] || CATEGORY_ASSOCIATIONS.places;
  const pool = isAr ? categoryPool.ar : categoryPool.en;

  // Filter pool so it never outputs the exact secret word or already used clues
  const candidates = pool.filter(clue => {
    const cLower = clue.toLowerCase();
    if (usedClues.has(cLower)) return false;
    if (cLower === secretEn || cLower === secretAr) return false;
    if (secretEn.includes(cLower) || secretAr.includes(cLower)) return false;
    return true;
  });

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Fallback safe contextual word
  return isAr ? 'مهم' : 'essential';
}

/**
 * Generates a strategic vote for the AI bot during voting phase.
 */
export function generateSmartBotVote(params: {
  botUid: string;
  isSpy: boolean;
  activePlayers: PlayerData[];
  spies: string[];
  gameChat?: Record<string, { uid?: string; text?: string }>;
}): string {
  const { botUid, isSpy, activePlayers, spies } = params;

  // Other players that can be voted for
  const otherCandidates = activePlayers.filter(p => p.uid !== botUid && !p.isSpectator);
  if (otherCandidates.length === 0) return 'SKIP';

  if (isSpy) {
    // The spy NEVER votes for themselves or fellow spies!
    // Picks an innocent crew member to shift blame
    const nonSpies = otherCandidates.filter(p => !spies.includes(p.uid));
    if (nonSpies.length > 0) {
      return nonSpies[Math.floor(Math.random() * nonSpies.length)].uid;
    }
    return otherCandidates[0].uid;
  }

  // If crew: has a smart chance of suspecting the actual spy or a random suspect
  const actualSpiesInGame = otherCandidates.filter(p => spies.includes(p.uid));
  // 60% chance to vote for the real spy, 40% chance for someone else
  if (actualSpiesInGame.length > 0 && Math.random() < 0.6) {
    return actualSpiesInGame[Math.floor(Math.random() * actualSpiesInGame.length)].uid;
  }

  return otherCandidates[Math.floor(Math.random() * otherCandidates.length)].uid;
}
