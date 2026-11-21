import { CategoryKey, CustomCategoryWord, GameMode, PlayerData, RoomData } from './types';
import { wordsDB } from './words';

export const DEFAULT_TURN_SECONDS = 20;
export const RAPID_TURN_SECONDS = 7;
export const DEFAULT_VOTE_SECONDS = 45;
export const SPY_GUESS_SECONDS = 15;
export const EJECTION_CINEMATIC_MS = 5000;
export const ROUND_GRACE_MS = 2000;
export const BLACKOUT_DURATION_MS = 3500;
export const AFK_MAX_MISSED_TURNS = 3;

export function getEffectiveTurnSeconds(
  gameMode?: GameMode | null,
  configuredTurnSeconds?: number | null
): number {
  if (gameMode === 'rapid') return RAPID_TURN_SECONDS;
  const parsed = Number(configuredTurnSeconds);
  return Number.isFinite(parsed) && parsed >= 5 ? parsed : DEFAULT_TURN_SECONDS;
}

export function getMinRequiredPlayers(
  gameMode?: GameMode | null,
  spyCount?: number | null
): number {
  const spies = Math.max(1, Number(spyCount) || 1);
  if (gameMode === 'mole') {
    return Math.max(5, spies * 2 + 1);
  }
  return Math.max(3, spies * 2);
}

export function getMaxAllowedSpies(
  gameMode?: GameMode | null,
  maxPlayers?: number | null
): number {
  const cap = Math.max(3, Number(maxPlayers) || 3);
  if (gameMode === 'mole') {
    return Math.max(1, Math.floor((cap - 1) / 2));
  }
  return Math.max(1, Math.floor(cap / 2));
}

export function isBotPlayer(player?: Partial<PlayerData> | null, uid?: string): boolean {
  const id = uid || player?.uid || '';
  return !!player?.isBot || id.startsWith('bot_');
}

export function shuffleArray<T>(items: T[], randomFn: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns active (!isSpectator) player UIDs ordered deterministically by join/seat order
 * (oldest joinedAt first, tie-broken by uid), optionally rotated by `rotateBy` seats.
 */
export function getOrderedActiveUids(
  players?: Record<string, PlayerData>,
  rotateBy: number = 0
): string[] {
  const ordered = Object.values(players || {})
    .filter(p => p && !p.isSpectator)
    .sort((a, b) => {
      const diff = (a.joinedAt || 0) - (b.joinedAt || 0);
      return diff !== 0 ? diff : a.uid.localeCompare(b.uid);
    })
    .map(p => p.uid);

  const unique = Array.from(new Set(ordered));
  if (unique.length <= 1) return unique;
  const shift = ((rotateBy % unique.length) + unique.length) % unique.length;
  return shift === 0 ? unique : [...unique.slice(shift), ...unique.slice(0, shift)];
}

export interface StartValidationResult {
  ok: boolean;
  reason?: 'not_enough_players' | 'players_not_in_lobby';
  minRequired: number;
  activeCount: number;
}

export function validateGameStart(room: Pick<RoomData, 'gameMode' | 'spyCount' | 'status' | 'players'>): StartValidationResult {
  const playersArr = Object.values(room.players || {});
  const minRequired = getMinRequiredPlayers(room.gameMode, room.spyCount);
  const activeCount = playersArr.length;

  if (activeCount < minRequired) {
    return {
      ok: false,
      reason: 'not_enough_players',
      minRequired,
      activeCount
    };
  }

  const allHumansInLobby = playersArr
    .filter(p => !isBotPlayer(p))
    .every(p => room.status === 'waiting' || p.postGame === 'inLobby');

  if (!allHumansInLobby) {
    return {
      ok: false,
      reason: 'players_not_in_lobby',
      minRequired,
      activeCount
    };
  }

  return {
    ok: true,
    minRequired,
    activeCount
  };
}

export function computeInitialGameSetup(params: {
  room: RoomData;
  wordPair: [string, string];
  wordCategory: CategoryKey;
  chameleonPair: [string, string];
  randomFn?: () => number;
}): {
  spies: string[];
  undercoverUid: string | null;
  players: Record<string, PlayerData>;
  turnOrder: string[];
  turnTimeLeft: number;
} {
  const { room, wordPair, wordCategory, chameleonPair, randomFn = Math.random } = params;
  const playersArr = Object.values(room.players || {});
  const allUids = Array.from(new Set(playersArr.map(p => p.uid)));

  const requestedSpies = Math.max(1, room.spyCount || 1);
  const maxPossibleSpies = Math.max(1, allUids.length - 1);
  const effectiveSpyCount = Math.min(requestedSpies, maxPossibleSpies);

  const shuffledForRoles = shuffleArray(allUids, randomFn);
  const spies = shuffledForRoles.slice(0, effectiveSpyCount);

  const nonSpies = shuffledForRoles.filter(uid => !spies.includes(uid));
  const undercoverUid =
    room.gameMode === 'undercover' && nonSpies.length > 0
      ? nonSpies[Math.floor(randomFn() * nonSpies.length)]
      : null;

  const resetPlayers: Record<string, PlayerData> = {};
  playersArr.forEach(p => {
    const isThisSpy = spies.includes(p.uid);
    const cleanPlayer: PlayerData = {
      uid: p.uid,
      name: p.name || 'Agent',
      avatar: p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`,
      joinedAt: p.joinedAt || 0,
      isSpectator: false,
      postGame: null,
      role: isThisSpy ? 'spy' : p.uid === undercoverUid ? 'undercover' : 'crew',
      isSilenced: false,
      disqualifiedVote: false,
      missedTurns: 0
    };

    if (isBotPlayer(p)) {
      cleanPlayer.isBot = true;
    }

    if (isThisSpy && room.gameMode === 'chameleon') {
      cleanPlayer.chameleonWord = chameleonPair[0] || wordPair[0];
      cleanPlayer.chameleonWordAr = chameleonPair[1] || wordPair[1];
    }

    resetPlayers[p.uid] = cleanPlayer;
  });

  // Sequential turn order by join/seat order (while roles remain random)
  const turnOrder = getOrderedActiveUids(resetPlayers, 0);
  const turnTimeLeft = getEffectiveTurnSeconds(room.gameMode, room.turnSeconds);

  return {
    spies,
    undercoverUid,
    players: resetPlayers,
    turnOrder,
    turnTimeLeft
  };
}

export interface TurnAdvanceResult {
  changed: boolean;
  room: RoomData;
  afkKickedName: string | null;
  roundChanged: boolean;
}

export function computeNextTurnState(
  inputRoom: RoomData,
  options: {
    expectedTurnIndex?: number;
    expectedRound?: number;
    wasTimeout?: boolean;
    now?: number;
    completedDrawing?: {
      uid: string;
      sender: string;
      strokes: Array<Array<{ x: number; y: number }>>;
    } | null;
  } = {}
): TurnAdvanceResult {
  const { expectedTurnIndex, expectedRound, wasTimeout = false, now = Date.now(), completedDrawing } = options;

  if (!inputRoom || inputRoom.status !== 'playing' || !inputRoom.turnOrder || inputRoom.turnOrder.length === 0) {
    return { changed: false, room: inputRoom, afkKickedName: null, roundChanged: false };
  }

  if (expectedRound !== undefined && (inputRoom.round || 1) !== expectedRound) {
    return { changed: false, room: inputRoom, afkKickedName: null, roundChanged: false };
  }

  if (expectedTurnIndex !== undefined && (inputRoom.turnIndex || 0) !== expectedTurnIndex) {
    return { changed: false, room: inputRoom, afkKickedName: null, roundChanged: false };
  }

  // Deep-clone relevant mutable branches so this stays completely pure
  const playersObj: Record<string, PlayerData> = {};
  Object.entries(inputRoom.players || {}).forEach(([uid, p]) => {
    playersObj[uid] = { ...p };
  });

  const completedTurns: Record<string, boolean> = {
    ...(inputRoom.completedTurnsThisRound || {})
  };

  const currentIdx = inputRoom.turnIndex || 0;
  const currentSpeakerUid = inputRoom.turnOrder[currentIdx];
  let afkKickedName: string | null = null;

  if (currentSpeakerUid && playersObj[currentSpeakerUid]) {
    if (wasTimeout) {
      const missed = (playersObj[currentSpeakerUid].missedTurns || 0) + 1;
      playersObj[currentSpeakerUid].missedTurns = missed;
      if (missed >= AFK_MAX_MISSED_TURNS && !playersObj[currentSpeakerUid].isSpectator) {
        playersObj[currentSpeakerUid].isSpectator = true;
        afkKickedName = playersObj[currentSpeakerUid].name || 'Agent';
      }
    } else {
      playersObj[currentSpeakerUid].missedTurns = 0;
    }
    completedTurns[currentSpeakerUid] = true;
  }

  const defaultTurnSeconds = getEffectiveTurnSeconds(inputRoom.gameMode, inputRoom.turnSeconds);

  const activeUids = getOrderedActiveUids(playersObj, 0);
  const unplayedUids = activeUids.filter(uid => !completedTurns[uid]);

  let nextRound = inputRoom.round || 1;
  let nextCompletedTurns: Record<string, boolean> | null = completedTurns;
  let nextTurnOrder = [...inputRoom.turnOrder];
  let nextTurnIndex = 0;
  let nextVotes = inputRoom.votes ?? null;
  let roundChanged = false;
  let nextBlackoutActive = inputRoom.blackoutActive ?? false;

  if (unplayedUids.length === 0) {
    nextRound = (inputRoom.round || 1) + 1;
    roundChanged = true;
    nextCompletedTurns = null;
    nextBlackoutActive = false;

    // Strict fixed sequential seat order every round (no jumping/rotating seats between rounds)
    nextTurnOrder = getOrderedActiveUids(playersObj, 0);
    nextTurnIndex = 0;
    nextVotes = null;
  } else {
    let nextFoundIndex = -1;

    for (let i = currentIdx + 1; i < nextTurnOrder.length; i++) {
      const cand = nextTurnOrder[i];
      if (unplayedUids.includes(cand) && playersObj[cand] && !playersObj[cand].isSpectator) {
        nextFoundIndex = i;
        break;
      }
    }

    if (nextFoundIndex === -1) {
      for (let i = 0; i <= currentIdx && i < nextTurnOrder.length; i++) {
        const cand = nextTurnOrder[i];
        if (unplayedUids.includes(cand) && playersObj[cand] && !playersObj[cand].isSpectator) {
          nextFoundIndex = i;
          break;
        }
      }
    }

    if (nextFoundIndex === -1) {
      const targetUid = unplayedUids[0];
      const cleanOrder = nextTurnOrder.filter(u => activeUids.includes(u));
      if (!cleanOrder.includes(targetUid)) cleanOrder.push(targetUid);
      nextTurnOrder = cleanOrder;
      nextFoundIndex = nextTurnOrder.indexOf(targetUid);
    }

    nextTurnIndex = Math.max(0, nextFoundIndex);
  }

  const nextGraceUntil = roundChanged ? now + ROUND_GRACE_MS : null;
  const nextTurnEndsAt = (nextGraceUntil || now) + defaultTurnSeconds * 1000;
  const nextLastDrawing = null;

  return {
    changed: true,
    afkKickedName,
    roundChanged,
    room: {
      ...inputRoom,
      players: playersObj,
      round: nextRound,
      completedTurnsThisRound: nextCompletedTurns || undefined,
      turnOrder: nextTurnOrder,
      turnIndex: nextTurnIndex,
      turnTimeLeft: defaultTurnSeconds,
      turnGraceUntil: nextGraceUntil,
      turnEndsAt: nextTurnEndsAt,
      votes: nextVotes,
      currentDrawing: null,
      lastDrawing: nextLastDrawing,
      blackoutActive: false
    }
  };
}

export function shouldTriggerBlackout(_room: RoomData, _timeLeft: number): boolean {
  return false;
}

export function getEligibleVoters(players?: Record<string, PlayerData>): PlayerData[] {
  return Object.values(players || {}).filter(p => !p.isSpectator && !p.disqualifiedVote);
}

export function areAllEligibleVotesSubmitted(room: Pick<RoomData, 'players' | 'votes'>): boolean {
  const eligible = getEligibleVoters(room.players);
  if (eligible.length === 0) return false;
  const votes = room.votes || {};
  return eligible.every(p => Boolean(votes[p.uid]));
}

export interface VoteResolutionResult {
  outcome:
    | 'nobody_ejected'
    | 'crew_win'
    | 'spies_win'
    | 'spy_last_chance'
    | 'spy_ejected_continue'
    | 'innocent_ejected_continue';
  ejectedUid: string | null;
  ejectedName: string | null;
  ejectionPayload: RoomData['ejectionEvent'];
  nextRoomFields: Partial<RoomData>;
}

export function buildSpyGuessOptions(
  room: Pick<RoomData, 'word' | 'wordAr' | 'wordCategory' | 'customCategoryWords'>,
  randomFn: () => number = Math.random
): CustomCategoryWord[] {
  const secretEn = (room.word || '').trim();
  const secretAr = (room.wordAr || secretEn).trim();
  const secretNorm = secretEn.toLowerCase();

  let pool: CustomCategoryWord[] = [];
  if (room.customCategoryWords && room.customCategoryWords.length > 0) {
    pool = room.customCategoryWords;
  } else {
    const cat = room.wordCategory && wordsDB[room.wordCategory] ? room.wordCategory : 'players';
    pool = wordsDB[cat].map(([en, ar]) => ({ en, ar }));
  }

  const seen = new Set<string>([secretNorm]);
  const decoys: CustomCategoryWord[] = [];
  for (const item of shuffleArray(pool, randomFn)) {
    const en = (item.en || item.ar || '').trim();
    const ar = (item.ar || en).trim();
    const key = en.toLowerCase();
    if (!en || seen.has(key)) continue;
    seen.add(key);
    decoys.push({ en, ar });
    if (decoys.length >= 5) break;
  }

  return shuffleArray([{ en: secretEn, ar: secretAr }, ...decoys], randomFn);
}

export function resolveSpyLastChanceGuess(
  room: RoomData,
  guessedWordEn: string | null
): {
  isCorrect: boolean;
  winnerTeam: 'spies' | 'crew';
  nextRoomFields: Partial<RoomData>;
} {
  const cleanGuess = (guessedWordEn || '').trim().toLowerCase();
  const cleanSecret = (room.word || '').trim().toLowerCase();
  const isCorrect = Boolean(cleanGuess && cleanSecret && cleanGuess === cleanSecret);
  const winnerTeam: 'spies' | 'crew' = isCorrect ? 'spies' : 'crew';
  const finalSpies =
    room.finalSpies && room.finalSpies.length > 0 ? room.finalSpies : room.spies || [];

  return {
    isCorrect,
    winnerTeam,
    nextRoomFields: {
      status: 'gameover',
      winnerTeam,
      finalSpies,
      finalPlayers: room.finalPlayers || room.players || {},
      spyGuessCandidateUid: null,
      spyGuessOptions: null,
      spyGuessEndsAt: null,
      spyGuessResult: {
        spyUid: room.spyGuessCandidateUid || finalSpies[0] || '',
        guessedWord: guessedWordEn || '',
        isCorrect
      }
    }
  };
}

export function resolveVoteOutcome(room: RoomData, now: number = Date.now()): VoteResolutionResult {
  const votes = room.votes || {};
  const counts: Record<string, number> = {};
  Object.values(votes).forEach(tgt => {
    if (!tgt || tgt === 'SKIP' || !room.players?.[tgt]) return;
    counts[tgt] = (counts[tgt] || 0) + 1;
  });

  let maxVotes = 0;
  let topCandidates: string[] = [];
  for (const key in counts) {
    if (counts[key] > maxVotes) {
      maxVotes = counts[key];
      topCandidates = [key];
    } else if (counts[key] === maxVotes) {
      topCandidates.push(key);
    }
  }

  const ejectedUid =
    maxVotes > 0 && topCandidates.length === 1
      ? topCandidates[0]
      : null;

  const currentSpies = room.spies || [];
  const playersObj: Record<string, PlayerData> = {};
  Object.entries(room.players || {}).forEach(([uid, p]) => {
    playersObj[uid] = {
      ...p,
      disqualifiedVote: false,
      isSilenced: false
    };
  });

  const nextRound = (room.round || 1) + 1;
  const nextTurnTime = getEffectiveTurnSeconds(room.gameMode, room.turnSeconds);

  if (!ejectedUid) {
    const safeActiveUids = getOrderedActiveUids(playersObj, 0);
    const graceUntil = now + ROUND_GRACE_MS;
    return {
      outcome: 'nobody_ejected',
      ejectedUid: null,
      ejectedName: null,
      ejectionPayload: null,
      nextRoomFields: {
        status: 'playing',
        round: nextRound,
        turnOrder: safeActiveUids,
        turnIndex: 0,
        completedTurnsThisRound: undefined,
        turnTimeLeft: nextTurnTime,
        turnGraceUntil: graceUntil,
        turnEndsAt: graceUntil + nextTurnTime * 1000,
        voteTimeLeft: null,
        voteEndsAt: null,
        votes: null,
        voteChat: null,
        currentDrawing: null,
        lastDrawing: null,
        blackoutActive: false,
        players: playersObj
      }
    };
  }

  const ejectedName = playersObj[ejectedUid]?.name || '?';
  const isEjectedSpy = currentSpies.includes(ejectedUid);
  const ejectionPayload: NonNullable<RoomData['ejectionEvent']> = {
    uid: ejectedUid,
    name: ejectedName,
    avatar: playersObj[ejectedUid]?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${ejectedUid}`,
    isSpy: isEjectedSpy,
    timestamp: now
  };

  if (playersObj[ejectedUid]) {
    playersObj[ejectedUid] = { ...playersObj[ejectedUid], isSpectator: true };
  }

  // Pause turn countdown until the 5s cinematic ejection overlay completes
  const ejectionEndsAt = now + EJECTION_CINEMATIC_MS + 300;

  if (isEjectedSpy) {
    const updatedSpies = currentSpies.filter(s => s !== ejectedUid);
    if (updatedSpies.length === 0) {
      if (room.allowSpyLastChance && (room.word || room.wordAr)) {
        const spyGuessOptions = buildSpyGuessOptions(room);
        return {
          outcome: 'spy_last_chance',
          ejectedUid,
          ejectedName,
          ejectionPayload,
          nextRoomFields: {
            status: 'spy_guess',
            finalSpies: currentSpies,
            finalPlayers: playersObj,
            players: playersObj,
            spies: updatedSpies,
            ejectionEndsAt,
            ejectionEvent: ejectionPayload,
            spyGuessCandidateUid: ejectedUid,
            spyGuessOptions,
            spyGuessEndsAt: ejectionEndsAt + SPY_GUESS_SECONDS * 1000,
            spyGuessResult: null,
            voteTimeLeft: null,
            voteEndsAt: null,
            votes: null,
            voteChat: null,
            blackoutActive: false
          }
        };
      }

      return {
        outcome: 'crew_win',
        ejectedUid,
        ejectedName,
        ejectionPayload,
        nextRoomFields: {
          status: 'gameover',
          winnerTeam: 'crew',
          finalSpies: currentSpies,
          finalPlayers: playersObj,
          players: playersObj,
          spies: updatedSpies,
          voteTimeLeft: null,
          voteEndsAt: null,
          votes: null,
          voteChat: null,
          blackoutActive: false,
          ejectionEvent: ejectionPayload
        }
      };
    }

    const safeActiveUids = getOrderedActiveUids(playersObj, 0);
    return {
      outcome: 'spy_ejected_continue',
      ejectedUid,
      ejectedName,
      ejectionPayload,
      nextRoomFields: {
        status: 'playing',
        round: nextRound,
        turnOrder: safeActiveUids,
        turnIndex: 0,
        completedTurnsThisRound: undefined,
        turnTimeLeft: nextTurnTime,
        ejectionEndsAt,
        turnGraceUntil: ejectionEndsAt,
        turnEndsAt: ejectionEndsAt + nextTurnTime * 1000,
        voteTimeLeft: null,
        voteEndsAt: null,
        votes: null,
        voteChat: null,
        currentDrawing: null,
        lastDrawing: null,
        blackoutActive: false,
        players: playersObj,
        spies: updatedSpies,
        ejectionEvent: ejectionPayload
      }
    };
  }

  const remainingActiveUids = getOrderedActiveUids(playersObj, 0);
  const remainingSpiesCount = currentSpies.filter(uid => remainingActiveUids.includes(uid)).length;
  const remainingInnocentCount = remainingActiveUids.length - remainingSpiesCount;

  const isMoleMode = room.gameMode === 'mole';
  // A match requires at least 3 active players; if an innocent is ejected and <= 2 players remain with an active spy, spies immediately win!
  const spiesWin =
    remainingActiveUids.length < 3
      ? remainingSpiesCount > 0
      : isMoleMode
      ? remainingSpiesCount >= remainingInnocentCount
      : remainingInnocentCount === 0 || remainingSpiesCount > remainingInnocentCount;

  if (spiesWin) {
    return {
      outcome: 'spies_win',
      ejectedUid,
      ejectedName,
      ejectionPayload,
      nextRoomFields: {
        status: 'gameover',
        winnerTeam: 'spies',
        finalSpies: currentSpies,
        finalPlayers: playersObj,
        players: playersObj,
        voteTimeLeft: null,
        voteEndsAt: null,
        votes: null,
        voteChat: null,
        blackoutActive: false,
        ejectionEvent: ejectionPayload
      }
    };
  }

  return {
    outcome: 'innocent_ejected_continue',
    ejectedUid,
    ejectedName,
    ejectionPayload,
    nextRoomFields: {
      status: 'playing',
      round: nextRound,
      turnOrder: remainingActiveUids,
      turnIndex: 0,
      completedTurnsThisRound: undefined,
      turnTimeLeft: nextTurnTime,
      ejectionEndsAt,
      turnGraceUntil: ejectionEndsAt,
      turnEndsAt: ejectionEndsAt + nextTurnTime * 1000,
      voteTimeLeft: null,
      voteEndsAt: null,
      votes: null,
      voteChat: null,
      currentDrawing: null,
      lastDrawing: null,
      blackoutActive: false,
      players: playersObj,
      ejectionEvent: ejectionPayload
    }
  };
}

export function shouldResetGameOverToLobby(players?: Record<string, PlayerData>): boolean {
  const list = Object.values(players || {});
  const humanPlayers = list.filter(p => !isBotPlayer(p));
  if (humanPlayers.length === 0) return false;
  return humanPlayers.every(p => p.postGame === 'inLobby');
}
