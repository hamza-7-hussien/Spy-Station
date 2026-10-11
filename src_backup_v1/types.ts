export type Language = 'ar' | 'en';

export type GameMode =
  | 'normal'
  | 'chameleon'
  | 'rapid'
  | 'mole'
  | 'undercover'
  | 'silent'
  | 'blackout';

export type CategoryKey =
  | 'players'
  | 'food'
  | 'places'
  | 'movies'
  | 'games'
  | 'animals'
  | 'jobs'
  | 'singers'
  | 'memes'
  | 'awkward';

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
}

export interface RoomData {
  status: 'waiting' | 'playing' | 'voting' | 'resolving' | 'gameover';
  originalHostUid?: string;
  hostUid: string;
  categories: CategoryKey[];
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
  turnTimeLeft?: number;
  voteTimeLeft?: number;
  votes?: Record<string, string>; // voterUid -> targetUid or 'SKIP'
  winnerTeam?: 'crew' | 'spies' | null;
  finalSpies?: string[];
  finalPlayers?: Record<string, PlayerData>;
  players?: Record<string, PlayerData>;
  lobbyChat?: Record<string, { sender: string; text: string }>;
  gameChat?: Record<string, { uid?: string; sender: string; avatar?: string; text: string; round?: number; timestamp?: number }>;
  spyChat?: Record<string, { sender: string; text: string }>;
  speechBubbles?: Record<string, { text: string; timestamp: number }>;
  currentDrawing?: Array<Array<{ x: number; y: number }>> | null;
  scrambleActive?: boolean;
  joinRequests?: Record<string, JoinRequest>;
  announcement?: {
    msg: string;
    type: 'normal' | 'danger' | 'success';
    timestamp: number;
  };
  voiceStates?: Record<string, VoiceUserState>;
  blackoutActive?: boolean;
  lastBlackoutRound?: number;
  anonymousVoting?: boolean;
  trialPhase?: {
    accusedUid: string;
    accusedName: string;
    timeLeft: number;
  } | null;
  liveReactions?: Record<string, { uid: string; sender: string; emoji: string; timestamp: number }>;
  sfxBroadcast?: { id: string; sound: string; sender: string; timestamp: number } | null;
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
