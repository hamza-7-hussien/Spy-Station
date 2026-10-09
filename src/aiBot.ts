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

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^a-zA-Z\u0600-\u06FF]/g, '')
    .trim();
}

export function generateUniqueBotName(
  existingPlayers: Record<string, PlayerData>,
  lang: Language
): string {
  const pool = lang === 'ar' || lang === 'fa' || lang === 'ur' ? ARABIC_BOT_NAMES : ENGLISH_BOT_NAMES;
  const existingNames = Object.values(existingPlayers).map(p => normalizeName(p.name || ''));

  const available = pool.filter(candidate => {
    const norm = normalizeName(candidate);
    return !existingNames.some(existing => existing.includes(norm) || norm.includes(existing));
  });

  if (available.length > 0) {
    const picked = available[Math.floor(Math.random() * available.length)];
    return `${picked} 🤖`;
  }

  const fallbackBase = lang === 'ar' ? 'رائد' : 'Cadet';
  const nextNum = Object.keys(existingPlayers).length + 1;
  return `${fallbackBase} ${nextNum} 🤖`;
}

// 🧠 STRICT ONE-WORD Human-level semantic associations for popular specific words
// Rule: Every single clue in this dictionary is strictly ONE SINGLE WORD (لا مسافات)
const SPECIFIC_WORD_ASSOCIATIONS: Record<string, { ar: string[]; en: string[] }> = {
  // Players
  'messi': {
    ar: ['أسطورة', 'مراوغ', 'أرجنتيني', 'هداف', 'ساحر', 'بطولات', 'تاريخي', 'موهبة', 'برشلونة'],
    en: ['legend', 'dribbler', 'Argentine', 'striker', 'magician', 'trophies', 'icon', 'captain']
  },
  'ميسي': {
    ar: ['أسطورة', 'مراوغ', 'أرجنتيني', 'هداف', 'ساحر', 'بطولات', 'تاريخي', 'موهبة', 'برشلونة'],
    en: ['legend', 'dribbler', 'Argentine', 'striker', 'magician', 'trophies', 'icon']
  },
  'ronaldo': {
    ar: ['صاروخ', 'هداف', 'برتغالي', 'قوة', 'رياضي', 'تاريخي', 'أسطورة', 'بطولات', 'حاسم'],
    en: ['striker', 'Portugal', 'athlete', 'legend', 'powerful', 'header', 'record', 'clutch']
  },
  'رونالدو': {
    ar: ['صاروخ', 'هداف', 'برتغالي', 'قوة', 'رياضي', 'تاريخي', 'أسطورة', 'بطولات', 'حاسم'],
    en: ['striker', 'Portugal', 'athlete', 'legend', 'powerful', 'header', 'record']
  },
  'salah': {
    ar: ['سريع', 'ليفربول', 'مصري', 'هداف', 'فخر', 'جناح', 'ذهبي', 'مهاري', 'بطل'],
    en: ['speed', 'Liverpool', 'Egyptian', 'finisher', 'winger', 'golden', 'skilled', 'champion']
  },
  'صلاح': {
    ar: ['سريع', 'ليفربول', 'مصري', 'هداف', 'فخر', 'جناح', 'ذهبي', 'مهاري', 'بطل'],
    en: ['speed', 'Liverpool', 'Egyptian', 'finisher', 'winger', 'golden', 'skilled']
  },
  'neymar': {
    ar: ['سامبا', 'برازيلي', 'مهاري', 'مراوغ', 'فنان', 'استعراضي', 'سريع'],
    en: ['samba', 'Brazil', 'showman', 'skills', 'dribbler', 'flashy', 'artist']
  },
  'نيمار': {
    ar: ['سامبا', 'برازيلي', 'مهاري', 'مراوغ', 'فنان', 'استعراضي', 'سريع'],
    en: ['samba', 'Brazil', 'showman', 'skills', 'dribbler', 'flashy']
  },
  'mbappe': {
    ar: ['سريع', 'صاروخي', 'فرنسي', 'مدريد', 'بطل', 'مهاجم', 'شاب'],
    en: ['lightning', 'French', 'pace', 'striker', 'Madrid', 'speedster', 'champion']
  },
  'مبابي': {
    ar: ['سريع', 'صاروخي', 'فرنسي', 'مدريد', 'بطل', 'مهاجم', 'شاب'],
    en: ['lightning', 'French', 'pace', 'striker', 'Madrid', 'speedster']
  },
  'haaland': {
    ar: ['فايكنج', 'ماكينة', 'نرويجي', 'سيتي', 'مرعب', 'قناص', 'طويل'],
    en: ['Viking', 'striker', 'Norwegian', 'powerhouse', 'finisher', 'beast']
  },
  'هالاند': {
    ar: ['فايكنج', 'ماكينة', 'نرويجي', 'سيتي', 'مرعب', 'قناص', 'طويل'],
    en: ['Viking', 'striker', 'Norwegian', 'powerhouse', 'finisher']
  },
  'benzema': {
    ar: ['حكومة', 'قناص', 'مهاجم', 'ذهبي', 'حاسم', 'تكتيكي', 'بطل'],
    en: ['striker', 'golden', 'clutch', 'finisher', 'leader', 'champion']
  },
  'بنزيما': {
    ar: ['حكومة', 'قناص', 'مهاجم', 'ذهبي', 'حاسم', 'تكتيكي', 'بطل'],
    en: ['striker', 'golden', 'clutch', 'finisher', 'leader']
  },

  // Food
  'pizza': {
    ar: ['إيطالي', 'جبنة', 'مثلثات', 'فرن', 'صلصة', 'عجين', 'مخبوز', 'لذيذ', 'سخن'],
    en: ['Italian', 'cheese', 'slices', 'crust', 'baked', 'sauce', 'dough', 'hot']
  },
  'بيتزا': {
    ar: ['إيطالي', 'جبنة', 'مثلثات', 'فرن', 'صلصة', 'عجين', 'مخبوز', 'لذيذ', 'سخن'],
    en: ['Italian', 'cheese', 'slices', 'crust', 'baked', 'sauce', 'dough']
  },
  'burger': {
    ar: ['مشوي', 'ساندوتش', 'لحم', 'بطاطس', 'جبنة', 'سريع', 'مقرمش', 'مدور'],
    en: ['grilled', 'bun', 'patty', 'cheddar', 'fastfood', 'beef', 'crispy']
  },
  'برجر': {
    ar: ['مشوي', 'ساندوتش', 'لحم', 'بطاطس', 'جبنة', 'سريع', 'مقرمش', 'مدور'],
    en: ['grilled', 'bun', 'patty', 'cheddar', 'fastfood', 'beef']
  },
  'koshary': {
    ar: ['مصري', 'مكرونة', 'دقة', 'شطة', 'بصل', 'عدس', 'شعبي', 'صلصة'],
    en: ['Egyptian', 'lentils', 'pasta', 'onions', 'spicy', 'traditional', 'sauce']
  },
  'كشري': {
    ar: ['مصري', 'مكرونة', 'دقة', 'شطة', 'بصل', 'عدس', 'شعبي', 'صلصة'],
    en: ['Egyptian', 'lentils', 'pasta', 'onions', 'spicy', 'traditional']
  },
  'shawarma': {
    ar: ['سيخ', 'تومية', 'صاج', 'لحمة', 'فراخ', 'ساندوتش', 'شامي', 'ملفوف'],
    en: ['wrap', 'garlic', 'rotisserie', 'spiced', 'streetfood', 'meat', 'toasted']
  },
  'شاورما': {
    ar: ['سيخ', 'تومية', 'صاج', 'لحمة', 'فراخ', 'ساندوتش', 'شامي', 'ملفوف'],
    en: ['wrap', 'garlic', 'rotisserie', 'spiced', 'streetfood', 'meat']
  },
  'sushi': {
    ar: ['ياباني', 'سمك', 'عيدان', 'أرز', 'صويا', 'نوري', 'بحر'],
    en: ['Japanese', 'raw', 'chopsticks', 'rolls', 'salmon', 'seaweed', 'rice']
  },
  'سوشي': {
    ar: ['ياباني', 'سمك', 'عيدان', 'أرز', 'صويا', 'نوري', 'بحر'],
    en: ['Japanese', 'raw', 'chopsticks', 'rolls', 'salmon', 'seaweed']
  },
  'molokhia': {
    ar: ['شوربة', 'طشة', 'خضراء', 'ثوم', 'شهقة', 'مصري', 'طبيخ'],
    en: ['stew', 'garlic', 'green', 'traditional', 'broth', 'fragrant']
  },
  'ملوخية': {
    ar: ['شوربة', 'طشة', 'خضراء', 'ثوم', 'شهقة', 'مصري', 'طبيخ'],
    en: ['stew', 'garlic', 'green', 'traditional', 'broth']
  },

  // Places
  'pyramids': {
    ar: ['فراعنة', 'أهرامات', 'تاريخ', 'حجارة', 'آثار', 'قديم', 'سياحة', 'الجيزة', 'عجائب'],
    en: ['pharaohs', 'ancient', 'stones', 'monument', 'heritage', 'Giza', 'wonders']
  },
  'الأهرامات': {
    ar: ['فراعنة', 'أهرامات', 'تاريخ', 'حجارة', 'آثار', 'قديم', 'سياحة', 'الجيزة', 'عجائب'],
    en: ['pharaohs', 'ancient', 'stones', 'monument', 'heritage', 'Giza']
  },
  'eiffel tower': {
    ar: ['باريس', 'فرنسا', 'حديد', 'معلم', 'أنوار', 'سياحة', 'ارتفاع', 'شهير'],
    en: ['Paris', 'France', 'iron', 'landmark', 'lights', 'tower', 'iconic']
  },
  'برج إيفل': {
    ar: ['باريس', 'فرنسا', 'حديد', 'معلم', 'أنوار', 'سياحة', 'ارتفاع', 'شهير'],
    en: ['Paris', 'France', 'iron', 'landmark', 'lights', 'tower']
  },

  // Games
  'gta': {
    ar: ['عالم', 'سيارات', 'مهمات', 'شرطة', 'مدينة', 'أسلحة', 'سرقة', 'أكشن'],
    en: ['open-world', 'cars', 'missions', 'police', 'city', 'weapons', 'heist']
  },
  'pubg': {
    ar: ['باراشوت', 'طيارة', 'لوت', 'أسلحة', 'زون', 'دروب', 'بقاء', 'سلاح'],
    en: ['parachute', 'airdrop', 'loot', 'weapons', 'zone', 'survival', 'tactical']
  },
  'minecraft': {
    ar: ['مربعات', 'بلوكات', 'بناء', 'تعدين', 'دايموند', 'استكشاف', 'عالم'],
    en: ['blocks', 'crafting', 'mining', 'diamond', 'sandbox', 'creeper', 'build']
  },

  // Animals
  'lion': {
    ar: ['ملك', 'مفترس', 'زئير', 'غابة', 'شجاع', 'صياد', 'قوي', 'حيوان'],
    en: ['king', 'predator', 'roar', 'mane', 'savannah', 'hunter', 'brave']
  },
  'الأسد': {
    ar: ['ملك', 'مفترس', 'زئير', 'غابة', 'شجاع', 'صياد', 'قوي', 'حيوان'],
    en: ['king', 'predator', 'roar', 'mane', 'savannah', 'hunter']
  }
};

// Rich ONE-WORD semantic association bank for categories
const CATEGORY_ASSOCIATIONS: Record<CategoryKey, { ar: string[]; en: string[] }> = {
  players: {
    ar: [
      'مهارة', 'سرعة', 'ملعب', 'بطولة', 'كابتن', 'تسديدة', 'دوري', 'موهبة',
      'مباراة', 'أسيست', 'جمهور', 'كرة', 'لياقة', 'تكتيك', 'هجوم', 'دفاع'
    ],
    en: [
      'skill', 'speed', 'pitch', 'trophy', 'captain', 'shot', 'league', 'talent',
      'match', 'assist', 'stadium', 'ball', 'fitness', 'tactics', 'striker', 'athlete'
    ]
  },
  food: {
    ar: [
      'لذيذ', 'سخن', 'طازة', 'وجبة', 'مطبخ', 'توابل', 'ريحة', 'أكل',
      'شهي', 'طبق', 'طعام', 'نكهة', 'مقرمش', 'صوص', 'حلو', 'مالح'
    ],
    en: [
      'delicious', 'fresh', 'meal', 'spices', 'aroma', 'flavor', 'savory', 'crispy',
      'sauce', 'sweet', 'cooked', 'tasty', 'recipe', 'kitchen', 'dinner', 'baked'
    ]
  },
  places: {
    ar: [
      'معلم', 'سياحة', 'سفر', 'عاصمة', 'بلد', 'موقع', 'آثار', 'تاريخ',
      'خريطة', 'طبيعة', 'مدينة', 'قارة', 'حضارة', 'مبنى', 'بحر', 'جبل'
    ],
    en: [
      'landmark', 'tourism', 'travel', 'capital', 'country', 'ancient', 'historic', 'heritage',
      'map', 'scenic', 'city', 'monument', 'culture', 'destination', 'island', 'coastal'
    ]
  },
  movies: {
    ar: [
      'سينما', 'فيلم', 'قصة', 'مخرج', 'أكشن', 'نجم', 'حوار', 'موسيقى',
      'دراما', 'مشهد', 'بطل', 'كاميرا', 'شاشة', 'شخصية', 'إنتاج', 'إثارة'
    ],
    en: [
      'cinema', 'film', 'plot', 'director', 'action', 'star', 'soundtrack', 'drama',
      'scene', 'actor', 'screen', 'blockbuster', 'character', 'thriller', 'climax', 'script'
    ]
  },
  games: {
    ar: [
      'لعبة', 'أونلاين', 'جرافيكس', 'تحدي', 'سيرفر', 'سلاح', 'تكتيك', 'فوز',
      'مرحلة', 'سكين', 'تحكم', 'لاعبين', 'نقاط', 'مهمة', 'حماس', 'عالم'
    ],
    en: [
      'gaming', 'multiplayer', 'controls', 'graphics', 'challenge', 'server', 'tactics', 'victory',
      'level', 'quest', 'scoreboard', 'virtual', 'arcade', 'skills', 'clutch', 'sandbox'
    ]
  },
  animals: {
    ar: [
      'كائن', 'بري', 'طبيعة', 'صوت', 'سرعة', 'قوة', 'فرو', 'غابة',
      'صيد', 'حيوان', 'أليف', 'مفترس', 'طيور', 'بحر', 'أنياب', 'سلالة'
    ],
    en: [
      'wildlife', 'creature', 'nature', 'sound', 'speed', 'fur', 'habitat', 'hunter',
      'predator', 'instinct', 'species', 'claws', 'paws', 'mammal', 'tame', 'jungle'
    ]
  },
  jobs: {
    ar: [
      'وظيفة', 'مهنة', 'عمل', 'مكتب', 'راتب', 'شركة', 'مدير', 'خبرة',
      'تخصص', 'مجهود', 'شهادة', 'ميدان', 'خدمة', 'مسؤولية', 'فريق', 'دوام'
    ],
    en: [
      'profession', 'career', 'office', 'salary', 'company', 'expert', 'uniform', 'duty',
      'service', 'skill', 'diploma', 'leadership', 'colleague', 'calling', 'effort', 'trade'
    ]
  },
  singers: {
    ar: [
      'مطرب', 'أغنية', 'صوت', 'ألحان', 'كلمات', 'موسيقى', 'ألبوم', 'حفلة',
      'طرب', 'فن', 'مسرح', 'إحساس', 'نجم', 'جمهور', 'شهرة', 'ميكروفون'
    ],
    en: [
      'vocalist', 'song', 'melody', 'lyrics', 'rhythm', 'album', 'concert', 'stage',
      'performance', 'hit', 'microphone', 'harmony', 'artist', 'tune', 'voice', 'musical'
    ]
  }
};

// 🕵️ Clever, conversational disguise clues for a smart SPY
// Rule: Every single camouflage clue is strictly ONE SINGLE WORD (لا مسافات)
const SPY_CAMOUFLAGE_CLUES = {
  ar: [
    'مشهور',
    'معروف',
    'يومي',
    'محبوب',
    'قديم',
    'حديث',
    'مميز',
    'كلاسيكي',
    'مألوف',
    'منتشر',
    'رائع',
    'أساسي',
    'مهم',
    'بارز',
    'ممتع'
  ],
  en: [
    'famous',
    'popular',
    'classic',
    'common',
    'known',
    'daily',
    'essential',
    'iconic',
    'special',
    'familiar',
    'modern',
    'notable',
    'universal',
    'prominent',
    'standard'
  ]
};

/**
 * Sanitizes any raw string into strictly ONE single word (no spaces, no punctuation).
 */
function toSingleWord(raw: string, isAr: boolean): string {
  if (!raw) return isAr ? 'معروف' : 'known';
  // Take first word before whitespace, remove punctuation
  const clean = raw
    .trim()
    .split(/\s+/)[0]
    .replace(/[،,.:;!?"'()[\]{}<>\\/]/g, '')
    .trim();
  return clean || (isAr ? 'معروف' : 'known');
}

/**
 * Generates an intelligent, human-level clue for an AI bot player.
 * GUARANTEE: Strictly returns ONE SINGLE WORD.
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
  const isAr = language === 'ar' || language === 'fa' || language === 'ur';
  const usedClues = new Set(previousClues.map(c => toSingleWord(c, isAr).toLowerCase()));

  // 🕵️ If Bot is the SPY (Doesn't know the word - Blends in like a smart human with single word):
  if (isSpy) {
    const camoPool = SPY_CAMOUFLAGE_CLUES[isAr ? 'ar' : 'en'];
    const candidates = camoPool.filter(c => !usedClues.has(c.toLowerCase()));
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      return toSingleWord(picked, isAr);
    }
    return isAr ? 'معروف' : 'popular';
  }

  // 👨‍🚀 If Bot is CREW (Knows the word - Gives authentic, single-word clues):
  const cleanEn = (word || '').toLowerCase().trim();
  const cleanAr = (wordAr || '').toLowerCase().trim();

  // 1. First check if we have dedicated word-specific associations!
  const directMatch = SPECIFIC_WORD_ASSOCIATIONS[cleanEn] || SPECIFIC_WORD_ASSOCIATIONS[cleanAr];
  if (directMatch) {
    const specificList = isAr ? directMatch.ar : directMatch.en;
    const available = specificList.filter(
      c => !usedClues.has(c.toLowerCase()) && c.toLowerCase() !== cleanEn && c.toLowerCase() !== cleanAr
    );
    if (available.length > 0) {
      const picked = available[Math.floor(Math.random() * available.length)];
      return toSingleWord(picked, isAr);
    }
  }

  // 2. Fall back to category-level rich associative descriptors
  const categoryPool = CATEGORY_ASSOCIATIONS[category] || CATEGORY_ASSOCIATIONS.places;
  const pool = isAr ? categoryPool.ar : categoryPool.en;

  const filtered = pool.filter(clue => {
    const cLower = clue.toLowerCase();
    if (usedClues.has(cLower)) return false;
    if (cLower === cleanEn || cLower === cleanAr) return false;
    if (cleanEn.includes(cLower) || cleanAr.includes(cLower)) return false;
    return true;
  });

  if (filtered.length > 0) {
    const picked = filtered[Math.floor(Math.random() * filtered.length)];
    return toSingleWord(picked, isAr);
  }

  return isAr ? 'مميز' : 'special';
}

/**
 * Generates a realistic, strategic vote for the AI bot during the voting phase.
 * Never leaves voting blank or fails to return a target.
 */
export function generateSmartBotVote(params: {
  botUid: string;
  isSpy: boolean;
  activePlayers: PlayerData[];
  spies: string[];
  gameChat?: Record<string, { uid?: string; text?: string }>;
}): string {
  const { botUid, isSpy, activePlayers, spies } = params;

  // Potential targets to vote for
  const otherCandidates = activePlayers.filter(p => p.uid !== botUid && !p.isSpectator);
  if (otherCandidates.length === 0) return 'SKIP';

  if (isSpy) {
    // 🕵️ SPY BEHAVIOR:
    // The spy NEVER votes for themselves or fellow spies!
    // Blames innocent crew members, preferring human players to cause maximum distraction
    const nonSpies = otherCandidates.filter(p => !spies.includes(p.uid));
    if (nonSpies.length > 0) {
      // Prioritize human players 65% of the time to frame them
      const humanInnocents = nonSpies.filter(p => !p.isBot && !p.uid.startsWith('bot_'));
      if (humanInnocents.length > 0 && Math.random() < 0.65) {
        return humanInnocents[Math.floor(Math.random() * humanInnocents.length)].uid;
      }
      return nonSpies[Math.floor(Math.random() * nonSpies.length)].uid;
    }
    return otherCandidates[0].uid;
  }

  // 👨‍🚀 CREW BEHAVIOR:
  // Intelligent deduction: 75% chance to focus on an actual spy in the game
  const actualSpies = otherCandidates.filter(p => spies.includes(p.uid));
  if (actualSpies.length > 0 && Math.random() < 0.75) {
    return actualSpies[Math.floor(Math.random() * actualSpies.length)].uid;
  }

  // 25% chance to suspect someone else (human mistake / tension)
  return otherCandidates[Math.floor(Math.random() * otherCandidates.length)].uid;
}
