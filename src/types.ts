export type Language =
  | 'ar'
  | 'en'
  | 'es'
  | 'fr'
  | 'de';

export type GameMode =
  | 'normal'
  | 'chameleon'
  | 'rapid'
  | 'mole'
  | 'undercover';

export type CategoryKey =
  | 'players'
  | 'food'
  | 'places'
  | 'movies'
  | 'games'
  | 'animals'
  | 'jobs'
  | 'singers';

export interface CustomCategoryWord {
  en: string;
  ar: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  creatorUid: string;
  creatorName: string;
  image?: string;
  icon?: string;
  words: CustomCategoryWord[];
  isPublished: boolean;
  playCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface RoomCustomCategorySnapshot {
  id: string;
  name: string;
  image?: string;
  icon?: string;
  words: CustomCategoryWord[];
}

export interface PlayerData {
  uid: string;
  name: string;
  avatar: string;
  joinedAt?: number;
  isSpectator?: boolean;
  isBot?: boolean;
  postGame?: 'inLobby' | null;
  role?: 'spy' | 'undercover' | 'crew';
  chameleonWord?: string; // in chameleon mode
  chameleonWordAr?: string;
  currentEmojiClue?: string | null;
  isSilenced?: boolean;
  disqualifiedVote?: boolean;
  missedTurns?: number;
}

export interface RoomData {
  status: 'waiting' | 'playing' | 'voting' | 'spy_guess' | 'resolving' | 'gameover';
  originalHostUid?: string;
  hostUid: string;
  categories: CategoryKey[];
  customCategoryIds?: string[];
  customCategorySnapshot?: Record<string, RoomCustomCategorySnapshot> | null;
  activeCustomCategoryId?: string | null;
  customCategoryWords?: CustomCategoryWord[] | null;
  wordCustomCategoryName?: string | null;
  wordCustomCategoryImage?: string | null;
  allowSpyLastChance?: boolean;
  spyGuessCandidateUid?: string | null;
  spyGuessOptions?: CustomCategoryWord[] | null;
  spyGuessEndsAt?: number | null;
  spyGuessResult?: {
    spyUid: string;
    guessedWord: string;
    isCorrect: boolean;
  } | null;
  spyCount: number;
  maxPlayers: number;
  turnSeconds: number;
  visibility: 'public' | 'private';
  gameMode: GameMode;
  createdAt: number;
  word?: string;
  wordAr?: string;
  wordCategory?: CategoryKey;
  wordImage?: string | null;
  spies?: string[];
  undercoverUid?: string | null; // Undercover agent who knows the spy
  round?: number;
  turnOrder?: string[];
  turnIndex?: number;
  turnTimeLeft?: number | null;
  turnEndsAt?: number | null;
  turnGraceUntil?: number | null;
  completedTurnsThisRound?: Record<string, boolean> | null; // uid -> true (strictly guarantees at most one turn per player/bot per round)
  voteTimeLeft?: number | null;
  voteEndsAt?: number | null;
  votes?: Record<string, string> | null; // voterUid -> targetUid or 'SKIP'
  winnerTeam?: 'crew' | 'spies' | null;
  finalSpies?: string[];
  finalPlayers?: Record<string, PlayerData>;
  players?: Record<string, PlayerData>;
  lobbyChat?: Record<string, { sender: string; text: string }>;
  gameChat?: Record<string, {
    uid?: string;
    sender: string;
    avatar?: string;
    text: string;
    translations?: { ar: string; en: string };
    isBot?: boolean;
    round?: number;
    timestamp?: number;
    drawingStrokes?: Array<Array<{ x: number; y: number }>> | null;
  }>;
  voteChat?: Record<string, { uid?: string; sender: string; avatar?: string; text: string; isBot?: boolean; timestamp?: number }> | null;
  spyChat?: Record<string, { sender: string; text: string }>;
  speechBubbles?: Record<string, {
    text: string;
    translations?: { ar: string; en: string };
    isBot?: boolean;
    timestamp: number;
  }>;
  currentDrawing?: Array<Array<{ x: number; y: number }>> | null;
  lastDrawing?: {
    uid: string;
    sender: string;
    strokes: Array<Array<{ x: number; y: number }>>;
    timestamp: number;
  } | null;
  scrambleActive?: boolean;
  joinRequests?: Record<string, JoinRequest>;
  announcement?: {
    msg: string;
    type: 'normal' | 'danger' | 'success';
    timestamp: number;
  };
  voiceStates?: Record<string, VoiceUserState>;
  blackoutActive?: boolean;
  blackoutEndsAt?: number | null;
  lastBlackoutRound?: number;
  isQuickMatch?: boolean;
  ejectionEndsAt?: number | null;
  ejectionEvent?: {
    uid: string;
    name: string;
    avatar?: string;
    isSpy: boolean;
    timestamp: number;
  } | null;
}

export interface VoiceUserState {
  uid: string;
  name: string;
  muted: boolean;
  deafened?: boolean;
  speaking: boolean;
  active: boolean;
  updatedAt: number;
}

export interface FriendRequest {
  name: string;
  avatar: string;
  timestamp: number;
}

export interface RoomInvite {
  roomCode: string;
  fromName: string;
  fromAvatar: string;
  timestamp: number;
}

export interface FriendEntry {
  name: string;
  avatar: string;
  since: number;
}

export interface RankTier {
  min: number;
  icon: string;
  key: string;
}

export interface JoinRequest {
  uid: string;
  name: string;
  avatar: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface MissionDossier {
  role: 'waiting' | 'spy' | 'crew' | 'undercover';
  word?: string | null;
  wordAr?: string | null;
  fellowSpies?: string[];
  protectedSpyUid?: string | null;
}
