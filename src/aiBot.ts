import { CategoryKey, GameMode, Language, PlayerData } from './types';
import {
  CATEGORY_ASSOCIATIONS,
  inferWordSubClusterClues,
  normalizeArabicText,
  resolveWordAssociation
} from './aiBotKnowledge';
import { translateBotClueWord } from './aiBotCluePairs';

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

export function detectClueScriptLanguage(text: string): 'ar' | 'en' | null {
  const raw = (text || '').trim();
  if (!raw || raw.includes('⏩')) return null;
  const arMatches = raw.match(/[\u0600-\u06FF]/g) || [];
  const enMatches = raw.match(/[A-Za-z]/g) || [];
  if (arMatches.length === 0 && enMatches.length === 0) return null;
  return arMatches.length >= enMatches.length ? 'ar' : 'en';
}

export interface ChatClueLike {
  uid?: string;
  text?: string;
  round?: number;
  timestamp?: number;
  isBot?: boolean;
  translations?: {
    ar?: string;
    en?: string;
  };
}

export function resolveViewerClueLanguage(params: {
  viewerUid: string;
  round?: number;
  gameChat?: Record<string, ChatClueLike>;
  fallbackLang?: Language;
}): 'ar' | 'en' {
  const { viewerUid, round, gameChat, fallbackLang = 'en' } = params;
  const entries = Object.values(gameChat || {})
    .filter(c => c && c.uid === viewerUid && !c.isBot && !c.uid?.startsWith('bot_'))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  if (typeof round === 'number') {
    const currentRoundEntries = entries.filter(c => (c.round || 1) === round);
    for (let i = currentRoundEntries.length - 1; i >= 0; i--) {
      const detected = detectClueScriptLanguage(currentRoundEntries[i].text || '');
      if (detected) return detected;
    }

    const priorEntries = entries.filter(c => (c.round || 1) < round);
    for (let i = priorEntries.length - 1; i >= 0; i--) {
      const detected = detectClueScriptLanguage(priorEntries[i].text || '');
      if (detected) return detected;
    }
  } else {
    for (let i = entries.length - 1; i >= 0; i--) {
      const detected = detectClueScriptLanguage(entries[i].text || '');
      if (detected) return detected;
    }
  }

  return fallbackLang === 'ar' ? 'ar' : 'en';
}

export function resolveBotClueText(
  entry: { text?: string; translations?: { ar?: string; en?: string } } | null | undefined,
  targetLang: 'ar' | 'en'
): string {
  if (!entry) return '';
  const translated = entry.translations?.[targetLang];
  if (translated && translated.trim()) return translated;
  return entry.text || '';
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

function buildCluePair(candidate: string, sourceIsAr: boolean): { ar: string; en: string } {
  const single = toSingleWord(candidate, sourceIsAr);
  if (sourceIsAr) {
    const ar = single;
    const en = toSingleWord(translateBotClueWord(ar, 'en'), false);
    return { ar, en };
  }
  const en = single;
  const ar = toSingleWord(translateBotClueWord(en, 'ar'), true);
  return { ar, en };
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

  const available = combined.filter(c => {
    const pair = buildCluePair(c, isAr);
    return (
      !usedClues.has(normalizeArabicText(pair.ar)) &&
      !usedClues.has(normalizeArabicText(pair.en))
    );
  });
  if (available.length > 0) {
    const topSlice = contextualCandidates.length > 0
      ? available.slice(0, Math.max(2, contextualCandidates.length))
      : available.slice(0, Math.min(6, available.length));
    const picked = topSlice[Math.floor(Math.random() * topSlice.length)];
    return toSingleWord(picked, isAr);
  }

  return isAr ? 'معروف' : 'popular';
}

export function generateSmartBotCluePair(params: {
  isSpy: boolean;
  gameMode?: GameMode;
  chameleonWord?: string;
  chameleonWordAr?: string;
  word: string;
  wordAr: string;
  category: CategoryKey;
  language?: Language;
  previousClues: string[];
}): { ar: string; en: string; text: string } {
  const {
    isSpy,
    gameMode,
    chameleonWord,
    chameleonWordAr,
    word,
    wordAr,
    category,
    language = 'en',
    previousClues
  } = params;
  const isAr = language === 'ar';
  const usedClues = new Set<string>();
  previousClues.forEach(c => {
    const singleAr = toSingleWord(c, true);
    const singleEn = toSingleWord(c, false);
    if (singleAr) usedClues.add(normalizeArabicText(singleAr));
    if (singleEn) usedClues.add(normalizeArabicText(singleEn));
  });

  const isChameleonSpy = isSpy && gameMode === 'chameleon' && !!(chameleonWord || chameleonWordAr);

  if (isSpy && !isChameleonSpy) {
    const picked = pickSmartSpyClue(category, previousClues, usedClues, isAr);
    const pair = buildCluePair(picked, isAr);
    return {
      ...pair,
      text: isAr ? pair.ar : pair.en
    };
  }

  const effectiveWordEn = isChameleonSpy ? (chameleonWord || '') : (word || '');
  const effectiveWordAr = isChameleonSpy ? (chameleonWordAr || '') : (wordAr || '');
  const cleanEn = effectiveWordEn.toLowerCase().trim();
  const normAr = normalizeArabicText(effectiveWordAr);
  const forbiddenEn = (word || '').toLowerCase().trim();
  const forbiddenAr = normalizeArabicText(wordAr || '');

  const isForbiddenNormalized = (norm: string): boolean => {
    if (!norm || usedClues.has(norm)) return true;
    if (norm === cleanEn || norm === normAr || norm === forbiddenEn || norm === forbiddenAr) return true;
    if (cleanEn && (cleanEn.includes(norm) || norm.includes(cleanEn))) return true;
    if (normAr && (normAr.includes(norm) || norm.includes(normAr))) return true;
    if (forbiddenEn && (forbiddenEn.includes(norm) || norm.includes(forbiddenEn))) return true;
    if (forbiddenAr && (forbiddenAr.includes(norm) || norm.includes(forbiddenAr))) return true;
    return false;
  };

  const pickValidPairFromPool = (pool: string[], poolIsAr: boolean): { ar: string; en: string } | null => {
    const validPairs = pool
      .map(candidate => buildCluePair(candidate, poolIsAr))
      .filter(pair => {
        const nAr = normalizeArabicText(pair.ar);
        const nEn = normalizeArabicText(pair.en);
        return !isForbiddenNormalized(nAr) && !isForbiddenNormalized(nEn);
      });

    if (validPairs.length === 0) return null;
    return validPairs[Math.floor(Math.random() * validPairs.length)];
  };

  const directMatch = resolveWordAssociation(effectiveWordEn, effectiveWordAr);
  if (directMatch) {
    const pair = pickValidPairFromPool(isAr ? directMatch.ar : directMatch.en, isAr);
    if (pair) return { ...pair, text: isAr ? pair.ar : pair.en };
  }

  const clusterClues = inferWordSubClusterClues(effectiveWordEn, effectiveWordAr, category, isAr);
  const clusterPair = pickValidPairFromPool(clusterClues, isAr);
  if (clusterPair) return { ...clusterPair, text: isAr ? clusterPair.ar : clusterPair.en };

  const categoryPool = CATEGORY_ASSOCIATIONS[category] || CATEGORY_ASSOCIATIONS.places;
  const catPair = pickValidPairFromPool(isAr ? categoryPool.ar : categoryPool.en, isAr);
  if (catPair) return { ...catPair, text: isAr ? catPair.ar : catPair.en };

  return {
    ar: 'مميز',
    en: 'special',
    text: isAr ? 'مميز' : 'special'
  };
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
  return generateSmartBotCluePair(params).text;
}

export function evaluatePlayerSuspicionScores(params: {
  activePlayers: PlayerData[];
  spies: string[];
  gameChat?: Record<string, ChatClueLike>;
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
    if (!uid || scores[uid] === undefined || (!raw && !entry?.translations?.ar && !entry?.translations?.en)) return;

    playersWithClues.add(uid);
    const variants = [raw, entry?.translations?.ar || '', entry?.translations?.en || '']
      .map(v => v.trim())
      .filter(Boolean);
    const normVariants = variants.map(normalizeArabicText);
    const norm = normVariants[0] || '';

    if (variants.some(v => v.includes('⏩') || /تفويت|pass/i.test(v))) {
      scores[uid] += 25;
      return;
    }

    if (normVariants.some(n => GENERIC_CAMO_SET.has(n))) {
      scores[uid] += 35;
    }

    if (normVariants.some(n => seenClues.has(n))) {
      scores[uid] += 25;
    } else {
      normVariants.forEach(n => seenClues.add(n));
    }

    if (normVariants.some(n => expectedSet.has(n))) {
      scores[uid] -= 25;
    } else if (expectedSet.size > 0 && !normVariants.some(n => GENERIC_CAMO_SET.has(n))) {
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
  gameChat?: Record<string, ChatClueLike>;
  word?: string;
  wordAr?: string;
  wordCategory?: CategoryKey;
}): string {
  const { botUid, isSpy, isUndercover = false, activePlayers, spies, gameChat, word, wordAr, wordCategory } = params;
  const otherCandidates = activePlayers.filter(p => p.uid !== botUid && !p.isSpectator);
  if (otherCandidates.length === 0) return botUid;

  const scores = evaluatePlayerSuspicionScores({
    activePlayers,
    spies,
    gameChat,
    word,
    wordAr,
    wordCategory
  });

  // Spies and the Undercover protector both try to protect spies and vote out innocents
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
    return otherCandidates[0].uid;
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
  gameChat?: Record<string, ChatClueLike>;
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
  const targetLang: 'ar' | 'en' = lang === 'ar' ? 'ar' : 'en';
  const targetClue = Object.values(gameChat || {})
    .map(c => resolveBotClueText(c, targetLang))
    .filter((txt, idx) => {
      const entry = Object.values(gameChat || {})[idx];
      return entry?.uid === targetUid && txt && !/تفويت|pass/i.test(txt);
    })
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

export function getBotClueBankForWord(
  word: string,
  wordAr: string,
  category: CategoryKey
): Array<{ en: string; ar: string }> {
  const seen = new Set<string>();
  const out: Array<{ en: string; ar: string }> = [];
  const used: string[] = [];

  for (let i = 0; i < 6; i++) {
    const pair = generateSmartBotCluePair({
      isSpy: false,
      word,
      wordAr,
      category,
      language: i % 2 === 0 ? 'en' : 'ar',
      previousClues: used
    });
    const key = `${pair.en.toLowerCase()}|${pair.ar}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ en: pair.en, ar: pair.ar });
      used.push(pair.en, pair.ar);
    }
  }
  return out;
}

export function getBotSpyClueBank(category: CategoryKey): Array<{ en: string; ar: string }> {
  const bridges = SPY_CATEGORY_BRIDGES[category] || SPY_CATEGORY_BRIDGES.places;
  const maxLen = Math.min(bridges.en.length, bridges.ar.length);
  const out: Array<{ en: string; ar: string }> = [];
  for (let i = 0; i < maxLen; i++) {
    out.push({ en: bridges.en[i], ar: bridges.ar[i] });
  }
  const camoMax = Math.min(4, SPY_CAMOUFLAGE_CLUES.en.length, SPY_CAMOUFLAGE_CLUES.ar.length);
  for (let i = 0; i < camoMax; i++) {
    out.push({ en: SPY_CAMOUFLAGE_CLUES.en[i], ar: SPY_CAMOUFLAGE_CLUES.ar[i] });
  }
  return out;
}
