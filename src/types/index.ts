export interface Game {
  id: string;
  name: string;
  executablePath: string;
  coverImage?: string;
  platform?: 'steam' | 'epic' | 'xbox' | 'gog' | 'mods' | 'other';
  lastPlayed?: string;
  playTime?: number;
  category?: string;
  steamAppId?: string;
}

export interface ScannedGame {
  name: string;
  executablePath: string;
  coverImage?: string;
  platform: 'steam' | 'epic' | 'xbox' | 'gog' | 'mods' | 'other';
  steamAppId?: string;
}

export interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
  name: string;
  description: string;
  icon?: string;
  icongray?: string;
}

export interface AchievementResult {
  gameName: string;
  achievements: SteamAchievement[];
  totalAchieved: number;
  totalAchievements: number;
}

export interface SteamStoreInfo {
  name: string;
  short_description: string;
  detailed_description: string;
  header_image: string;
  screenshots: {
    id: number;
    path_full: string;
    path_thousand: string;
    path_600: string;
    path_medium: string;
  }[];
  release_date: { coming_soon: boolean; date: string };
  developers: string[];
  publishers: string[];
  genres: { id: number; description: string }[];
  categories: { id: number; description: string }[];
  pc_requirements: { minimum: string; recommended?: string };
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  is_free: boolean;
  price_overview?: { final_formatted: string };
  dlc?: number[];
  recommendations?: { total: number };
  metacritic?: { score: number; url: string };
}

export interface PlaySession {
  id: number;
  game_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
}

export interface CachedAchievement {
  id: number;
  game_id: string;
  apiname: string;
  achieved: number;
  unlocktime: number;
  name: string;
  description: string;
  icon: string | null;
  icongray: string | null;
}

export interface StellarBladeTrophy {
  name: string;
  steamAchievement: string;
  bCompleted: boolean;
  progressValue: number;
}

export interface StellarBladeSaveData {
  steamId: string;
  savePath: string;
  lastModified: string;
  fileSize: number;
  trophies: StellarBladeTrophy[];
  questCompletions: string[];
  endings: {
    killElder: boolean;
    killLily: boolean;
    saveLily: boolean;
  };
  newGamePlusCount: number;
}

export interface ElectronAPI {
  getGames: () => Promise<Game[]>;
  saveGames: (games: Game[]) => Promise<boolean>;
  scanGames: () => Promise<ScannedGame[]>;
  selectExe: () => Promise<string | null>;
  selectImage: () => Promise<string | null>;
  launchGame: (gameId: string) => Promise<boolean>;
  deleteGame: (gameId: string) => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  getCachedAchievements: (gameId: string) => Promise<CachedAchievement[]>;
  getPlaySessions: (gameId: string) => Promise<PlaySession[]>;
  getStats: () => Promise<{ total: number; steam: number; xbox: number; epic: number; gog: number; mods: number; other: number; totalPlayTime: number }>;
  getSteamStoreInfo: (steamAppId: string) => Promise<SteamStoreInfo | null>;
  hasStellarBladeSave: () => Promise<boolean>;
  parseStellarBladeSave: () => Promise<StellarBladeSaveData | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
