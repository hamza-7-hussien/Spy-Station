import { CategoryKey, GameMode, Language, PlayerData } from './types';
import {
  CATEGORY_ASSOCIATIONS,
  inferWordSubClusterClues,
  normalizeArabicText,
  resolveWordAssociation
} from './aiBotKnowledge';

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
  return normalizeArabicText(name).replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
}

export function generateUniqueBotName(
  existingPlayers: Record<string, PlayerData>,
  lang: Language
): string {
  const pool = lang === 'ar' ? ARABIC_BOT_NAMES : ENGLISH_BOT_NAMES;
  const existingNames = Object.values(existingPlayers).map(p => normalizeName(p.name || ''));

  const available = pool.filter(candidate => {
    const norm = normalizeName(candidate);
    return !existingNames.some(existing => existing.includes(norm) || norm.includes(existing));
  });

  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  const fallbackBase = lang === 'ar' ? 'رائد' : 'Agent';
  const nextNum = Object.keys(existingPlayers).length + 1;
  return `${fallbackBase} ${nextNum}`;
}

export const SPY_CAMOUFLAGE_CLUES = {
  ar: ['مشهور', 'معروف', 'محبوب', 'قديم', 'حديث', 'مميز', 'كلاسيكي', 'مألوف', 'منتشر', 'رائع', 'أساسي', 'بارز', 'ممتع'],
  en: ['famous', 'popular', 'classic', 'common', 'known', 'essential', 'iconic', 'special', 'familiar', 'modern', 'notable', 'prominent', 'standard']
};

const GENERIC_CAMO_SET = new Set([
  ...SPY_CAMOUFLAGE_CLUES.ar.map(normalizeArabicText),
  ...SPY_CAMOUFLAGE_CLUES.en.map(s => s.toLowerCase()),
  'مشهورة', 'معروفة', 'حلوة', 'جميلة', 'كبير', 'كبيرة', 'عادي', 'تمام', 'جدا'
]);

const SPY_CATEGORY_BRIDGES: Record<CategoryKey, { ar: string[]; en: string[] }> = {
  players: { ar: ['نجم', 'قوي', 'سريع', 'بطل', 'مشهور', 'ملعب'], en: ['star', 'strong', 'fast', 'champion', 'famous', 'pro'] },
  food: { ar: ['شهي', 'مشهور', 'لذيذ', 'مفضل', 'طازة', 'سخن'], en: ['tasty', 'popular', 'fresh', 'warm', 'favorite', 'classic'] },
  places: { ar: ['معروف', 'سياحي', 'جميل', 'تاريخي', 'مشهور', 'كبير'], en: ['scenic', 'tourist', 'famous', 'historic', 'iconic', 'grand'] },
  movies: { ar: ['مشوق', 'ناجح', 'جماهيري', 'قصة', 'ممتع', 'بطل'], en: ['exciting', 'hit', 'story', 'popular', 'engaging', 'iconic'] },
  games: { ar: ['حماس', 'ممتع', 'مشهور', 'تحدي', 'لاعبين', 'قوي'], en: ['fun', 'exciting', 'popular', 'challenge', 'players', 'classic'] },
  animals: { ar: ['قوي', 'سريع', 'طبيعة', 'مشهور', 'غريب', 'كائن'], en: ['strong', 'wild', 'nature', 'fast', 'known', 'creature'] },
  jobs: { ar: ['مهم', 'أساسي', 'خبرة', 'تخصص', 'عمل', 'مفيد'], en: ['essential', 'skillful', 'career', 'important', 'service', 'expert'] },
  singers: { ar: ['مشهور', 'صوت', 'نجوم', 'جماهيري', 'حفلات', 'أغاني'], en: ['famous', 'voice', 'stage', 'hits', 'popular', 'artist'] }
};

function toSingleWord(raw: string, isAr: boolean): string {
  if (!raw) return isAr ? 'معروف' : 'known';
  const clean = raw
    .trim()
    .split(/\s+/)[0]
    .replace(/[،,.:;!?"'()[\]{}<>\\/]/g, '')
    .trim();
  return clean || (isAr ? 'معروف' : 'known');
}

function pickSmartSpyClue(
  category: CategoryKey,
  previousClues: string[],
  usedClues: Set<string>,
  isAr: boolean
): string {
  const joinedPrev = previousClues.map(normalizeArabicText).join(' ');
  const contextualCandidates: string[] = [];

  if (/مصري|اهلي|زمالك|قاهره|نيل|بلدي|شعبي/.test(joinedPrev)) {
    contextualCandidates.push(...(isAr ? ['مصري', 'محبوب', 'عربي', 'جماهيري', 'أصيل'] : ['Egyptian', 'local', 'beloved', 'classic']));
  }
  if (/اجنبي|هوليود|عالمي|نتفليكس|امريكي|اوروبي|انجليزي|اسبان|فرنس|ايطال/.test(joinedPrev)) {
    contextualCandidates.push(...(isAr ? ['عالمي', 'أجنبي', 'ناجح', 'ضخم', 'قوي'] : ['global', 'blockbuster', 'hit', 'massive']));
  }
  if (/سريع|جناح|مراوغ|مهار|صاروخ|لياقه/.test(joinedPrev)) {
    contextualCandidates.push(...(isAr ? ['حاسم', 'نجم', 'قوي', 'مهاري'] : ['clutch', 'star', 'skilled', 'elite']));
  }
  if (/حلو|سكر|شربات|كيك|شوكولاته|قشطه/.test(joinedPrev)) {
    contextualCandidates.push(...(isAr ? ['مسكر', 'خفيف', 'شهي', 'مفضل'] : ['sweet', 'treat', 'tasty', 'favorite']));
  }
  if (/مشوي|لحم|فحم|فرن|سخن|جبنه|توابل|شطه/.test(joinedPrev)) {
    contextualCandidates.push(...(isAr ? ['سخن', 'شهي', 'دسم', 'مقرمش'] : ['savory', 'hot', 'rich', 'flavorful']));
  }
  if (/بحر|محيط|سمك|غوص|جزيره|سباحه/.test(joinedPrev)) {
    contextualCandidates.push(...(isAr ? ['أزرق', 'بحري', 'عميق', 'هادي'] : ['coastal', 'deep', 'blue', 'ocean']));
  }
  if (/سلاح|حرب|قتال|زون|اونلاين|سيرفر/.test(joinedPrev)) {
    contextualCandidates.push(...(isAr ? ['حماس', 'تكتيك', 'تنافسي', 'أكشن'] : ['tactical', 'intense', 'competitive', 'action']));
  }

  const bridges = SPY_CATEGORY_BRIDGES[category]?.[isAr ? 'ar' : 'en'] || [];
  const baseCamo = SPY_CAMOUFLAGE_CLUES[isAr ? 'ar' : 'en'];
  const combined = [...contextualCandidates, ...bridges, ...baseCamo];

  const available = combined.filter(c => !usedClues.has(normalizeArabicText(toSingleWord(c, isAr))));
  if (available.length > 0) {
    const topSlice = contextualCandidates.length > 0
      ? available.slice(0, Math.max(2, contextualCandidates.length))
      : available.slice(0, Math.min(6, available.length));
    const picked = topSlice[Math.floor(Math.random() * topSlice.length)];
    return toSingleWord(picked, isAr);
  }

  return isAr ? 'معروف' : 'popular';
}

export function generateSmartBotClue(params: {
  isSpy: boolean;
  gameMode?: GameMode;
  chameleonWord?: string;
  chameleonWordAr?: string;
  word: string;
  wordAr: string;
  category: CategoryKey;
  language: Language;
  previousClues: string[];
}): string {
  const {
    isSpy,
    gameMode,
    chameleonWord,
    chameleonWordAr,
    word,
    wordAr,
    category,
    language,
    previousClues
  } = params;
  const isAr = language === 'ar';
  const usedClues = new Set(previousClues.map(c => normalizeArabicText(toSingleWord(c, isAr))));

  const isChameleonSpy = isSpy && gameMode === 'chameleon' && !!(chameleonWord || chameleonWordAr);

  if (isSpy && !isChameleonSpy) {
    return pickSmartSpyClue(category, previousClues, usedClues, isAr);
  }

  const effectiveWordEn = isChameleonSpy ? (chameleonWord || '') : (word || '');
  const effectiveWordAr = isChameleonSpy ? (chameleonWordAr || '') : (wordAr || '');
  const cleanEn = effectiveWordEn.toLowerCase().trim();
  const normAr = normalizeArabicText(effectiveWordAr);
  const forbiddenEn = (word || '').toLowerCase().trim();
  const forbiddenAr = normalizeArabicText(wordAr || '');

  const isValidClue = (candidate: string): boolean => {
    const single = toSingleWord(candidate, isAr);
    const norm = normalizeArabicText(single);
    if (!norm || usedClues.has(norm)) return false;
    if (norm === cleanEn || norm === normAr || norm === forbiddenEn || norm === forbiddenAr) return false;
    if (cleanEn && (cleanEn.includes(norm) || norm.includes(cleanEn))) return false;
    if (normAr && (normAr.includes(norm) || norm.includes(normAr))) return false;
    return true;
  };

  const directMatch = resolveWordAssociation(effectiveWordEn, effectiveWordAr);
  if (directMatch) {
    const specificList = (isAr ? directMatch.ar : directMatch.en).filter(isValidClue);
    if (specificList.length > 0) {
      return toSingleWord(specificList[Math.floor(Math.random() * specificList.length)], isAr);
    }
  }

  const clusterClues = inferWordSubClusterClues(effectiveWordEn, effectiveWordAr, category, isAr).filter(isValidClue);
  if (clusterClues.length > 0) {
    return toSingleWord(clusterClues[Math.floor(Math.random() * clusterClues.length)], isAr);
  }

  const categoryPool = CATEGORY_ASSOCIATIONS[category] || CATEGORY_ASSOCIATIONS.places;
  const filtered = (isAr ? categoryPool.ar : categoryPool.en).filter(isValidClue);
  if (filtered.length > 0) {
    return toSingleWord(filtered[Math.floor(Math.random() * filtered.length)], isAr);
  }

  return isAr ? 'مميز' : 'special';
}

export function generateBotSilentDrawing(
  category: CategoryKey,
  isSpy: boolean,
  wordEn: string = ''
): Array<Array<{ x: number; y: number }>> {
  if (isSpy) {
    return [
      [
        { x: 0.42, y: 0.34 }, { x: 0.48, y: 0.24 }, { x: 0.56, y: 0.27 },
        { x: 0.55, y: 0.42 }, { x: 0.5, y: 0.52 }, { x: 0.5, y: 0.62 }
      ],
      [{ x: 0.5, y: 0.72 }, { x: 0.5, y: 0.76 }]
    ];
  }

  const en = wordEn.toLowerCase();
  if (/pizza|pie|burger|cheese/.test(en)) {
    return [
      [{ x: 0.32, y: 0.26 }, { x: 0.68, y: 0.34 }, { x: 0.48, y: 0.76 }, { x: 0.32, y: 0.26 }],
      [{ x: 0.44, y: 0.42 }, { x: 0.48, y: 0.45 }],
      [{ x: 0.54, y: 0.50 }, { x: 0.57, y: 0.53 }]
    ];
  }
  if (/pyramid|sphinx|eiffel|tower|burj|castle/.test(en)) {
    return [
      [{ x: 0.22, y: 0.75 }, { x: 0.50, y: 0.22 }, { x: 0.78, y: 0.75 }, { x: 0.22, y: 0.75 }],
      [{ x: 0.50, y: 0.22 }, { x: 0.60, y: 0.75 }]
    ];
  }

  switch (category) {
    case 'players':
      return [
        [{ x: 0.5, y: 0.25 }, { x: 0.62, y: 0.35 }, { x: 0.62, y: 0.52 }, { x: 0.5, y: 0.62 }, { x: 0.38, y: 0.52 }, { x: 0.38, y: 0.35 }, { x: 0.5, y: 0.25 }],
        [{ x: 0.32, y: 0.76 }, { x: 0.5, y: 0.68 }, { x: 0.68, y: 0.76 }]
      ];
    case 'food':
      return [
        [{ x: 0.28, y: 0.52 }, { x: 0.72, y: 0.52 }, { x: 0.64, y: 0.74 }, { x: 0.36, y: 0.74 }, { x: 0.28, y: 0.52 }],
        [{ x: 0.42, y: 0.30 }, { x: 0.40, y: 0.42 }],
        [{ x: 0.56, y: 0.28 }, { x: 0.54, y: 0.42 }]
      ];
    case 'places':
      return [
        [{ x: 0.22, y: 0.74 }, { x: 0.5, y: 0.24 }, { x: 0.78, y: 0.74 }, { x: 0.22, y: 0.74 }],
        [{ x: 0.74, y: 0.26 }, { x: 0.80, y: 0.32 }]
      ];
    case 'movies':
      return [
        [{ x: 0.26, y: 0.30 }, { x: 0.74, y: 0.30 }, { x: 0.74, y: 0.72 }, { x: 0.26, y: 0.72 }, { x: 0.26, y: 0.30 }],
        [{ x: 0.44, y: 0.42 }, { x: 0.60, y: 0.51 }, { x: 0.44, y: 0.60 }, { x: 0.44, y: 0.42 }]
      ];
    case 'games':
      return [
        [
          { x: 0.28, y: 0.40 }, { x: 0.72, y: 0.40 }, { x: 0.76, y: 0.64 }, { x: 0.62, y: 0.64 },
          { x: 0.54, y: 0.54 }, { x: 0.46, y: 0.54 }, { x: 0.38, y: 0.64 }, { x: 0.24, y: 0.64 }, { x: 0.28, y: 0.40 }
        ],
        [{ x: 0.36, y: 0.46 }, { x: 0.36, y: 0.54 }],
        [{ x: 0.64, y: 0.48 }, { x: 0.66, y: 0.50 }]
      ];
    case 'animals':
      return [
        [{ x: 0.34, y: 0.40 }, { x: 0.38, y: 0.24 }, { x: 0.46, y: 0.36 }, { x: 0.54, y: 0.36 }, { x: 0.62, y: 0.24 }, { x: 0.66, y: 0.40 }, { x: 0.60, y: 0.66 }, { x: 0.40, y: 0.66 }, { x: 0.34, y: 0.40 }],
        [{ x: 0.45, y: 0.54 }, { x: 0.55, y: 0.54 }]
      ];
    case 'singers':
      return [
        [{ x: 0.46, y: 0.68 }, { x: 0.46, y: 0.28 }, { x: 0.66, y: 0.22 }, { x: 0.66, y: 0.58 }],
        [{ x: 0.38, y: 0.68 }, { x: 0.46, y: 0.68 }]
      ];
    default:
      return [
        [{ x: 0.30, y: 0.36 }, { x: 0.70, y: 0.36 }, { x: 0.70, y: 0.72 }, { x: 0.30, y: 0.72 }, { x: 0.30, y: 0.36 }],
        [{ x: 0.42, y: 0.36 }, { x: 0.42, y: 0.26 }, { x: 0.58, y: 0.26 }, { x: 0.58, y: 0.36 }]
      ];
  }
}

export function evaluatePlayerSuspicionScores(params: {
  activePlayers: PlayerData[];
  spies: string[];
  gameChat?: Record<string, { uid?: string; text?: string }>;
  word?: string;
  wordAr?: string;
  wordCategory?: CategoryKey;
}): Record<string, number> {
  const { activePlayers, spies, gameChat, word = '', wordAr = '', wordCategory } = params;
  const scores: Record<string, number> = {};
  activePlayers.forEach(p => {
    scores[p.uid] = 0;
  });

  const assoc = resolveWordAssociation(word, wordAr);
  const expectedSet = new Set<string>();
  if (assoc) {
    [...assoc.ar, ...assoc.en].forEach(w => expectedSet.add(normalizeArabicText(w)));
  }
  if (wordCategory) {
    inferWordSubClusterClues(word, wordAr, wordCategory, true).forEach(w => expectedSet.add(normalizeArabicText(w)));
    inferWordSubClusterClues(word, wordAr, wordCategory, false).forEach(w => expectedSet.add(normalizeArabicText(w)));
  }

  const seenClues = new Set<string>();
  const playersWithClues = new Set<string>();

  Object.values(gameChat || {}).forEach(entry => {
    const uid = entry?.uid;
    const raw = (entry?.text || '').trim();
    if (!uid || scores[uid] === undefined || !raw) return;

    playersWithClues.add(uid);
    const norm = normalizeArabicText(raw);

    if (raw.includes('⏩') || /تفويت|pass/i.test(raw)) {
      scores[uid] += 25;
      return;
    }

    if (GENERIC_CAMO_SET.has(norm)) {
      scores[uid] += 35;
    }

    if (seenClues.has(norm)) {
      scores[uid] += 25;
    } else {
      seenClues.add(norm);
    }

    if (expectedSet.has(norm)) {
      scores[uid] -= 25;
    } else if (expectedSet.size > 0 && !GENERIC_CAMO_SET.has(norm)) {
      scores[uid] += spies.includes(uid) ? 18 : 5;
    }
  });

  activePlayers.forEach(p => {
    if (!playersWithClues.has(p.uid)) {
      scores[p.uid] += 15;
    }
    if (spies.includes(p.uid)) {
      scores[p.uid] += 22;
    }
  });

  return scores;
}

export function generateSmartBotVote(params: {
  botUid: string;
  isSpy: boolean;
  isUndercover?: boolean;
  activePlayers: PlayerData[];
  spies: string[];
  gameChat?: Record<string, { uid?: string; text?: string }>;
  word?: string;
  wordAr?: string;
  wordCategory?: CategoryKey;
}): string {
  const { botUid, isSpy, isUndercover = false, activePlayers, spies, gameChat, word, wordAr, wordCategory } = params;
  const otherCandidates = activePlayers.filter(p => p.uid !== botUid && !p.isSpectator);
  if (otherCandidates.length === 0) return 'SKIP';

  const scores = evaluatePlayerSuspicionScores({
    activePlayers,
    spies,
    gameChat,
    word,
    wordAr,
    wordCategory
  });

  // Spies and the Undercover protector both try to protect spies and vote out innocents (or skip)
  if (isSpy || isUndercover) {
    const nonSpies = otherCandidates.filter(p => !spies.includes(p.uid));
    if (nonSpies.length > 0) {
      const ranked = [...nonSpies].sort((a, b) => {
        const scoreA = (scores[a.uid] || 0) + (!a.isBot && !a.uid.startsWith('bot_') ? 8 : 0);
        const scoreB = (scores[b.uid] || 0) + (!b.isBot && !b.uid.startsWith('bot_') ? 8 : 0);
        return scoreB - scoreA;
      });
      const topChoices = ranked.slice(0, Math.min(2, ranked.length));
      return topChoices[Math.floor(Math.random() * topChoices.length)].uid;
    }
    return isUndercover ? 'SKIP' : otherCandidates[0].uid;
  }

  const ranked = [...otherCandidates].sort((a, b) => (scores[b.uid] || 0) - (scores[a.uid] || 0));
  const top = ranked[0];
  const second = ranked[1];

  if (top && (scores[top.uid] || 0) >= 15) {
    if (second && (scores[second.uid] || 0) >= (scores[top.uid] || 0) - 10 && Math.random() < 0.15) {
      return second.uid;
    }
    return top.uid;
  }

  const actualSpies = otherCandidates.filter(p => spies.includes(p.uid));
  if (actualSpies.length > 0 && Math.random() < 0.78) {
    return actualSpies[Math.floor(Math.random() * actualSpies.length)].uid;
  }
  return ranked[Math.floor(Math.random() * Math.min(2, ranked.length))].uid;
}

export function generateBotLobbyGreeting(lang: Language): string {
  const arLines = [
    'أهلاً يا شباب، يلا نبدأ الجولة.',
    'جاهز ومركز مع تلميحات الجميع.',
    'مستعد للمهمة، بالتوفيق للكل.',
    'خلونا نبدأ بسرعة ونشوف مين الجاسوس.'
  ];
  const enLines = [
    'Ready to start whenever the host is.',
    'Paying close attention to every clue.',
    'Good luck crew, let us launch.',
    'Ready for round one, no guessing.'
  ];
  const pool = lang === 'ar' ? arLines : enLines;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateBotVoteDiscussionLine(params: {
  botUid: string;
  isSpy: boolean;
  isUndercover?: boolean;
  targetUid: string;
  activePlayers: PlayerData[];
  gameChat?: Record<string, { uid?: string; text?: string }>;
  lang: Language;
}): string | null {
  const { botUid, isSpy, isUndercover = false, targetUid, activePlayers, gameChat, lang } = params;
  if (targetUid === 'SKIP') {
    return lang === 'ar'
      ? 'الصورة لسه مش واضحة، يفضل نعمل تخطي الجولة دي.'
      : 'Not enough evidence yet, better to skip this round.';
  }

  const target = activePlayers.find(p => p.uid === targetUid && p.uid !== botUid);
  if (!target) return null;

  const targetName = (target.name || 'Agent').replace(/\s*🤖$/, '');
  const targetClue = Object.values(gameChat || {})
    .filter(c => c.uid === targetUid && c.text && !/تفويت|pass/i.test(c.text))
    .map(c => c.text!)
    .pop();

  if (lang === 'ar') {
    if (isSpy || isUndercover) {
      const deflectAr = targetClue
        ? [
            `تلميح "${targetClue}" من ${targetName} غامض شوية، ركزوا معاه.`,
            `حاسس إن ${targetName} هو اللي بيشتتنا بتلميح "${targetClue}".`,
            `أنا مقتنع إن الشك الأقوى ناحية ${targetName}.`
          ]
        : [
            `أنا شايف إن ${targetName} متوتر ومش واثق في تلميحه.`,
            `تصويتي هيروح لـ ${targetName} الجولة دي.`
          ];
      return deflectAr[Math.floor(Math.random() * deflectAr.length)];
    }

    const crewAr = targetClue
      ? [
          `تلميح "${targetClue}" من ${targetName} عام ومريب جداً.`,
          `أنا صوتي رايح لـ ${targetName}، "${targetClue}" بعيد شوية عن الكلمة.`,
          `ركزوا في تلميح ${targetName} ("${targetClue}").. مش مقنع.`
        ]
      : [
          `أنا شاكك في ${targetName} جداً الجولة دي.`,
          `${targetName} مش مقنع، أعتقد هو الجاسوس.`
        ];
    return crewAr[Math.floor(Math.random() * crewAr.length)];
  }

  if (isSpy || isUndercover) {
    return targetClue
      ? `"${targetClue}" from ${targetName} feels off compared to the rest.`
      : `Watch ${targetName} closely this round.`;
  }
  return targetClue
    ? `Honestly "${targetClue}" from ${targetName} sounds too vague.`
    : `${targetName} looks suspicious, voting them out.`;
}
