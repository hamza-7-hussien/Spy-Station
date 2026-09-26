export type Language = 'ar' | 'en';

export type GameMode = 'normal' | 'mole' | 'silent' | 'sabotage';

export type CategoryKey = 
  | 'players'
  | 'food'
  | 'places'
  | 'movies'
  | 'games'
  | 'animals'
  | 'jobs'
  | 'singers';

export type SabotageCardType = 'revote' | 'immunity' | 'swap';

export interface PlayerData {
  uid: string;
  name: string;
  avatar: string;
  joinedAt?: number;
  isSpectator?: boolean;
  postGame?: 'inLobby' | null;
  sabotageCard?: SabotageCardType | null;
  sabotageUsed?: boolean;
  immunityActiveRound?: number | null;
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
  gameChat?: Record<string, { sender: string; text: string }>;
  spyChat?: Record<string, { sender: string; text: string }>;
  currentDrawing?: Array<Array<{ x: number; y: number }>> | null;
  joinRequests?: Record<string, JoinRequest>;
  announcement?: {
    msg: string;
    type: 'normal' | 'danger' | 'success';
    timestamp: number;
  };
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
