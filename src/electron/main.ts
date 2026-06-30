import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import https from 'https';
import { scanAllGames } from './gameScanner';
import * as db from './database';
import { parseStellarBladeSave, hasStellarBladeSave } from './stellarBladeParser';

const distPath = path.join(__dirname, '../dist/index.html');
const isDev = !fs.existsSync(distPath);

interface Game {
  id: string;
  name: string;
  executablePath: string;
  coverImage?: string;
  platform?: string;
  lastPlayed?: string;
  playTime?: number;
  steamAppId?: string;
}

interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
  name: string;
  description: string;
  icon?: string;
  icongray?: string;
}

interface AchievementResult {
  gameName: string;
  achievements: SteamAchievement[];
  totalAchieved: number;
  totalAchievements: number;
}

function fetchUrl(url: string, timeout = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

interface SteamStoreInfo {
  name: string;
  short_description: string;
  detailed_description: string;
  header_image: string;
  screenshots: { id: number; path_full: string; path_thousand: string; path_600: string; path_medium: string }[];
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

const STEAM_STORE_CACHE: Record<string, { data: SteamStoreInfo; timestamp: number }> = {};

async function fetchSteamStoreInfo(steamAppId: string): Promise<SteamStoreInfo | null> {
  const cached = STEAM_STORE_CACHE[steamAppId];
  if (cached && Date.now() - cached.timestamp < 21600000) {
    return cached.data;
  }

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&l=portuguese&cc=BR`;
    const data = await fetchUrl(url, 15000);
    const result = JSON.parse(data);

    if (result[steamAppId] && result[steamAppId].success) {
      const info = result[steamAppId].data as SteamStoreInfo;
      STEAM_STORE_CACHE[steamAppId] = { data: info, timestamp: Date.now() };
      return info;
    }
  } catch (e) {
    console.error(`Error fetching store info for app ${steamAppId}:`, e);
  }
  return null;
}

// Convert DB game row to UI Game interface
function dbToGame(row: db.GameRow): Game {
  return {
    id: row.id,
    name: row.name,
    executablePath: row.executable_path,
    coverImage: row.cover_image || undefined,
    platform: row.platform as Game['platform'],
    lastPlayed: row.last_played || undefined,
    playTime: row.play_time,
    steamAppId: row.steam_app_id || undefined,
  };
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1b2838',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await db.initDatabase(app.getPath('userData'));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  // Save any in-progress play sessions
  const games = db.getGames();
  const now = new Date();
  for (const game of games) {
    if (game.last_session_start) {
      const startTime = new Date(game.last_session_start).getTime();
      const elapsedMinutes = Math.round((now.getTime() - startTime) / 60000);
      if (elapsedMinutes > 0) {
        const newPlayTime = (game.play_time || 0) + elapsedMinutes;
        db.recordPlaySession(game.id, game.last_session_start, elapsedMinutes);
        db.updateGamePlayTime(game.id, newPlayTime, null);
      }
    }
  }
  db.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==================== IPC Handlers ====================

// Games
ipcMain.handle('get-games', () => {
  return db.getGames().map(dbToGame);
});

ipcMain.handle('save-games', (_event, games: Game[]) => {
  // Upsert all provided games
  for (const game of games) {
    db.upsertGame({
      id: game.id,
      name: game.name,
      executable_path: game.executablePath,
      cover_image: game.coverImage || null,
      platform: game.platform || 'other',
      last_played: game.lastPlayed || null,
      play_time: game.playTime || 0,
      last_session_start: null,
      steam_app_id: game.steamAppId || null,
    });
  }
  return true;
});

ipcMain.handle('delete-game', (_event, gameId: string) => {
  db.deleteGame(gameId);
  return true;
});

ipcMain.handle('scan-games', async () => {
  const scannedGames = await scanAllGames();
  return scannedGames;
});

ipcMain.handle('select-exe', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', 'bat', 'cmd'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-image', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// Launch game with play time tracking
ipcMain.handle('launch-game', async (_event, gameId: string) => {
  const game = db.getGame(gameId);
  if (!game) return false;

  try {
    // Record play session
    const now = new Date();
    if (game.last_session_start) {
      const startTime = new Date(game.last_session_start).getTime();
      const elapsedMinutes = Math.round((now.getTime() - startTime) / 60000);
      if (elapsedMinutes > 0) {
        const newPlayTime = (game.play_time || 0) + elapsedMinutes;
        db.recordPlaySession(game.id, game.last_session_start, elapsedMinutes);
        db.updateGamePlayTime(game.id, newPlayTime, now.toISOString());
      } else {
        db.updateGamePlayTime(game.id, game.play_time || 0, now.toISOString());
      }
    } else {
      db.updateGamePlayTime(game.id, game.play_time || 0, now.toISOString());
    }

    // Launch
    if (game.executable_path.startsWith('steam://')) {
      shell.openExternal(game.executable_path);
    } else {
      await shell.openPath(game.executable_path);
    }
    return true;
  } catch (e) {
    console.error('Error launching game:', e);
    return false;
  }
});

// Get cached achievements from database
ipcMain.handle('get-cached-achievements', (_event, gameId: string) => {
  return db.getAchievements(gameId);
});

// Play sessions
ipcMain.handle('get-play-sessions', (_event, gameId: string) => {
  return db.getPlaySessions(gameId);
});

// Stats
ipcMain.handle('get-stats', () => {
  const gameCount = db.getGameCount();
  const totalPlayTime = db.getTotalPlayTime();
  return { ...gameCount, totalPlayTime };
});

// Steam Store Info
ipcMain.handle('get-steam-store-info', async (_event, steamAppId: string) => {
  return await fetchSteamStoreInfo(steamAppId);
});

// Stellar Blade Save Parser (READ ONLY)
ipcMain.handle('has-stellar-blade-save', () => {
  return hasStellarBladeSave();
});

ipcMain.handle('parse-stellar-blade-save', () => {
  try {
    const data = parseStellarBladeSave();
    return data;
  } catch (e) {
    console.error('Error parsing Stellar Blade save:', e);
    return null;
  }
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());
