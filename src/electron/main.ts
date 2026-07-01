import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import https from 'https';
import * as os from 'os';
import { exec } from 'child_process';
import { scanAllGames } from './gameScanner';
import * as db from './database';
import { parseStellarBladeSave, hasStellarBladeSave } from './stellarBladeParser';
import { fpsMonitor } from './fpsMonitor';

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
let notificationWindow: BrowserWindow | null = null;
let monitorWindow: BrowserWindow | null = null;

// CPU usage tracking
let lastCpuInfo = os.cpus();
let cpuUsagePercent = 0;

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

function createNotificationWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.js');
  const { width: screenWidth, height: screenHeight } = require('electron').screen.getPrimaryDisplay().workAreaSize;

  notificationWindow = new BrowserWindow({
    width: 360,
    height: 150,
    x: screenWidth - 380,
    y: screenHeight - 170,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  notificationWindow.setVisibleOnAllWorkspaces(true);
  notificationWindow.setAlwaysOnTop(true, 'screen-saver');

  if (isDev) {
    notificationWindow.loadFile(path.join(__dirname, '../src/electron/notification.html'));
  } else {
    notificationWindow.loadFile(path.join(__dirname, 'notification.html'));
  }

  notificationWindow.on('closed', () => {
    notificationWindow = null;
  });
}

function createMonitorWindow(): void {
  if (monitorWindow && !monitorWindow.isDestroyed()) {
    monitorWindow.focus();
    return;
  }

  const preloadPath = path.join(__dirname, 'preload.js');

  monitorWindow = new BrowserWindow({
    width: 560,
    height: 700,
    minWidth: 440,
    minHeight: 500,
    frame: false,
    backgroundColor: '#0e1621',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  if (isDev) {
    monitorWindow.loadFile(path.join(__dirname, '../src/electron/monitor.html'));
  } else {
    monitorWindow.loadFile(path.join(__dirname, 'monitor.html'));
  }

  monitorWindow.on('closed', () => {
    monitorWindow = null;
    stopSensorService();
  });
}

// Auto-resize monitor window to fit content
ipcMain.on('resize-monitor', (_event, height: number) => {
  if (monitorWindow && !monitorWindow.isDestroyed()) {
    const [width] = monitorWindow.getSize();
    const clampedHeight = Math.max(500, Math.min(900, height + 44)); // 32 titlebar + 12 padding
    monitorWindow.setSize(width, clampedHeight);
  }
});

// Hardware stats collection
function getCpuUsage(): { usage: number; model: string; cores: number } {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu, i) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const idleDiff = totalIdle - lastCpuInfo.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const totalDiff = totalTick - lastCpuInfo.reduce((acc, cpu) => {
    let total = 0;
    for (const type in cpu.times) {
      total += cpu.times[type as keyof typeof cpu.times];
    }
    return acc + total;
  }, 0);

  cpuUsagePercent = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
  lastCpuInfo = cpus;

  return {
    usage: cpuUsagePercent,
    model: cpus[0]?.model.replace(/\s+/g, ' ').trim() || 'Unknown CPU',
    cores: cpus.length,
  };
}

function getGpuStats(): Promise<{ usage: number; model: string; memory: string; temp: number | null }> {
  return new Promise((resolve) => {
    exec('nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits', { timeout: 3000 }, (error, stdout) => {
      if (error) {
        resolve({ usage: 0, model: 'N/A', memory: 'N/A', temp: null });
        return;
      }
      const lines = stdout.trim().split('\n');
      if (lines.length > 0) {
        const parts = lines[0].split(',').map(s => s.trim());
        resolve({
          model: parts[0] || 'Unknown GPU',
          usage: parseInt(parts[1]) || 0,
          memory: parts[2] && parts[3] ? `${parts[2]}MB / ${parts[3]}MB` : 'N/A',
          temp: parseInt(parts[4]) || null,
        });
      } else {
        resolve({ usage: 0, model: 'N/A', memory: 'N/A', temp: null });
      }
    });
  });
}

function getRamStats(): { usage: number; total: string; used: string; available: string } {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = totalBytes - freeBytes;
  const usage = Math.round((usedBytes / totalBytes) * 100);

  return {
    usage,
    total: formatBytes(totalBytes),
    used: formatBytes(usedBytes),
    available: formatBytes(freeBytes),
  };
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb.toFixed(1) + ' GB';
}

function getUptime(): string {
  const seconds = os.uptime();
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
}

function getDiskStats(): Promise<{ name: string; usage: number; total: string; free: string; readSpeed: string; writeSpeed: string }[]> {
  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -Command "$d = Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'; $p = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | Where-Object { $_.Name -ne '_Total' } | Select-Object -First 1; $r = @(); foreach ($disk in $d) { $read = if ($p) { $p.DiskReadBytesPersec } else { 0 }; $write = if ($p) { $p.DiskWriteBytesPersec } else { 0 }; $r += @{ id=$disk.DeviceID; total=[math]::Round($disk.Size/1GB,1); free=[math]::Round($disk.FreeSpace/1GB,1); read=$read; write=$write } }; $r | ConvertTo-Json -Compress"`;
    exec(cmd, { timeout: 5000 }, (error, stdout) => {
      if (error || !stdout?.trim()) { resolve([]); return; }
      try {
        let disks = JSON.parse(stdout.trim());
        if (!Array.isArray(disks)) disks = [disks];
        resolve(disks.map((d: any) => {
          const total = d.total || 0;
          const free = d.free || 0;
          const used = total - free;
          return {
            name: d.id || '?',
            usage: total > 0 ? Math.round((used / total) * 100) : 0,
            total: total + ' GB',
            free: free + ' GB',
            readSpeed: formatSpeed(d.read || 0),
            writeSpeed: formatSpeed(d.write || 0),
          };
        }));
      } catch { resolve([]); }
    });
  });
}

function getNetworkStats(): Promise<{ download: string; upload: string; adapter: string }> {
  return new Promise((resolve) => {
    exec('powershell -NoProfile -Command "Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface | Where-Object { $_.BytesReceivedPersec -gt 0 -or $_.BytesSentPersec -gt 0 } | Select-Object -First 1 | Select-Object @{N=\'down\';E={$_.BytesReceivedPersec}}, @{N=\'up\';E={$_.BytesSentPersec}}, @{N=\'adapter\';E={$_.Name}} | ConvertTo-Json -Compress"', { timeout: 5000 }, (error, stdout) => {
      if (error || !stdout?.trim()) { resolve({ download: '0 B/s', upload: '0 B/s', adapter: '' }); return; }
      try {
        const data = JSON.parse(stdout.trim());
        resolve({
          download: formatSpeed(data.down || 0),
          upload: formatSpeed(data.up || 0),
          adapter: data.adapter || '',
        });
      } catch { resolve({ download: '0 B/s', upload: '0 B/s', adapter: '' }); }
    });
  });
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + ' B/s';
  if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
  return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
}

// Sensor cache - avoids spawning PowerShell every 2s
interface FanData {
  name: string;
  rpm: number;
  duty?: number;
  hardware?: string;
}

let sensorCache: { cpu: number | null; cpuPackageTemp: number | null; gpu: number | null; cpuNeedsElevation: boolean; fans: FanData[] } = {
  cpu: null, cpuPackageTemp: null, gpu: null, cpuNeedsElevation: false, fans: []
};
let lastTempRead = 0;
const TEMP_CACHE_MS = 1500;

let sensorServiceRunning = false;
let sensorServiceProcess: any = null;

function getSensorScriptPath(): string {
  return isDev
    ? path.join(__dirname, '..', 'tools', 'read-sensors.ps1')
    : path.join(__dirname, 'tools', 'read-sensors.ps1');
}

function getSensorServicePath(): string {
  return isDev
    ? path.join(__dirname, '..', 'tools', 'sensor-service.ps1')
    : path.join(__dirname, 'tools', 'sensor-service.ps1');
}

function getStopFilePath(): string {
  return path.join(os.tmpdir(), 'lhm-sensor-service.stop');
}

function getCacheFilePath(): string {
  return path.join(os.tmpdir(), 'lhm-sensors-cache.json');
}

// Start the background sensor service (elevated, runs until stopped)
function startSensorService(): void {
  if (sensorServiceRunning) return;

  const servicePath = getSensorServicePath();
  if (!fs.existsSync(servicePath)) return;

  // Remove old stop file
  const stopFile = getStopFilePath();
  if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);

  // Launch elevated background process (UAC once)
  const psCommand = `Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "${servicePath}"' -Verb RunAs -WindowStyle Hidden`;
  const child = exec(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`, { timeout: 10000 }, (error) => {
    if (!error) {
      sensorServiceRunning = true;
      console.log('[Sensors] Background service started');
    }
  });
  sensorServiceProcess = child;
}

// Stop the background sensor service
function stopSensorService(): void {
  if (!sensorServiceRunning) return;

  const stopFile = getStopFilePath();
  fs.writeFileSync(stopFile, 'stop', 'utf-8');
  sensorServiceRunning = false;
  sensorServiceProcess = null;
  console.log('[Sensors] Background service stopped');
}

function getSensors(): Promise<{ cpu: number | null; fans: FanData[] }> {
  return new Promise((resolve) => {
    const now = Date.now();
    if (sensorCache.cpu !== null && now - lastTempRead < TEMP_CACHE_MS) {
      resolve({ cpu: sensorCache.cpu, cpuPackageTemp: sensorCache.cpuPackageTemp, fans: sensorCache.fans });
      return;
    }

    // Start background service on first call
    if (!sensorServiceRunning) {
      startSensorService();
      // Give service a moment to start and write first data
      setTimeout(() => {
        readSensorsFromCache().then(resolve);
      }, 2000);
      return;
    }

    readSensorsFromCache().then(resolve);
  });
}

function readSensorsFromCache(): Promise<{ cpu: number | null; fans: FanData[] }> {
  return new Promise((resolve) => {
    const cacheFile = getCacheFilePath();

    // Try to read from cache (written by background service)
    if (fs.existsSync(cacheFile)) {
      try {
        const raw = fs.readFileSync(cacheFile, 'utf-8').trim();
        const data = JSON.parse(raw);
        lastTempRead = Date.now();

        if (data.cpu) {
          if (data.cpu.temp > 0) {
            sensorCache.cpu = data.cpu.temp;
            sensorCache.cpuNeedsElevation = false;
          }
          if (data.cpu.packageTemp > 0) {
            sensorCache.cpuPackageTemp = data.cpu.packageTemp;
          }
        }
        if (data.gpu?.temp > 0) {
          sensorCache.gpu = data.gpu.temp;
        }
        if (Array.isArray(data.fans)) {
          sensorCache.fans = data.fans.map((f: any) => ({
            name: f.name,
            rpm: f.rpm || 0,
            duty: f.duty,
            hardware: f.hardware,
          }));
        }
        resolve({ cpu: sensorCache.cpu, cpuPackageTemp: sensorCache.cpuPackageTemp, fans: sensorCache.fans });
        return;
      } catch {}
    }

    // Fallback: direct read (GPU only, no admin needed)
    const scriptPath = getSensorScriptPath();
    if (!fs.existsSync(scriptPath)) {
      resolve({ cpu: sensorCache.cpu, cpuPackageTemp: sensorCache.cpuPackageTemp, fans: sensorCache.fans });
      return;
    }

    exec(`powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`, { timeout: 5000 }, (error, stdout) => {
      if (error || !stdout?.trim()) {
        resolve({ cpu: sensorCache.cpu, cpuPackageTemp: sensorCache.cpuPackageTemp, fans: sensorCache.fans });
        return;
      }
      try {
        const data = JSON.parse(stdout.trim());
        lastTempRead = now;
        // Fallback ONLY updates GPU - CPU temps require elevated service
        // (read-sensors.ps1 can't distinguish CCD vs Package without admin)
        if (data.gpu?.temp > 0) sensorCache.gpu = data.gpu.temp;
        if (Array.isArray(data.fans)) {
          sensorCache.fans = data.fans.map((f: any) => ({
            name: f.name, rpm: f.rpm || 0, duty: f.duty, hardware: f.hardware,
          }));
        }
        resolve({ cpu: sensorCache.cpu, cpuPackageTemp: sensorCache.cpuPackageTemp, fans: sensorCache.fans });
      } catch {
        resolve({ cpu: sensorCache.cpu, cpuPackageTemp: sensorCache.cpuPackageTemp, fans: sensorCache.fans });
      }
    });
  });
}

function getGpuTempFromLHM(): number | null {
  return sensorCache.gpu;
}

function cpuTempNeedsElevation(): boolean {
  return sensorCache.cpuNeedsElevation;
}

function elevateCpuTemp(): Promise<boolean> {
  startSensorService();
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 2000);
  });
}

// FPS Monitoring via PresentMon
// PresentMon requires admin - launched via Start-Process -Verb RunAs

app.whenReady().then(async () => {
  await db.initDatabase(app.getPath('userData'));
  createWindow();
  createNotificationWindow();
  startAchievementPolling();

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
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
  return { ...gameCount, totalPlayTime, version: pkg.version };
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

// Achievement Notification Window
ipcMain.on('show-achievement-notification', (_event, data: { name: string; description: string; gameName: string; icon?: string }) => {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.webContents.send('show-achievement', data);
    notificationWindow.showInactive();
  }
});

ipcMain.on('hide-achievement-notification', () => {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.webContents.send('hide-achievement');
  }
});

ipcMain.on('notification-hidden', () => {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.hide();
  }
});

// ==================== Background Achievement Polling ====================
// Tracks known achievements to detect new ones while games are running
const knownAchievements: Map<string, Set<string>> = new Map();

function startAchievementPolling(): void {
  setInterval(async () => {
    // Check which game is running
    const runningGameExe = await detectRunningGameProcess();
    if (!runningGameExe) return;

    // Find the game in DB by exe name
    const games = db.getGames();
    const game = games.find(g => {
      const parts = g.executable_path.split(/[\\/]/);
      const exe = parts[parts.length - 1].replace(/\.exe$/i, '');
      return exe.toLowerCase() === runningGameExe.replace(/\.exe$/i, '').toLowerCase();
    });
    if (!game) return;

    // Stellar Blade: re-parse save file for new trophies
    if (game.steam_app_id === '3489700') {
      try {
        const saveData = parseStellarBladeSave();
        if (!saveData) return;

        const gameKey = `sb_${game.id}`;
        const previousTrophies = knownAchievements.get(gameKey) || new Set<string>();

        for (const trophy of saveData.trophies) {
          if (trophy.bCompleted && !previousTrophies.has(trophy.name)) {
            // New trophy unlocked!
            previousTrophies.add(trophy.name);
            knownAchievements.set(gameKey, previousTrophies);

            // Send notification
            if (notificationWindow && !notificationWindow.isDestroyed()) {
              notificationWindow.webContents.send('show-achievement', {
                name: trophy.name,
                description: `Stellar Blade - ${trophy.steamAchievement}`,
                gameName: game.name,
                icon: undefined,
              });
              notificationWindow.showInactive();
            }
          }
        }
      } catch {}
    }

    // Steam games: check cached achievements for new ones
    if (game.steam_app_id && game.steam_app_id !== '3489700') {
      const achievements = db.getAchievements(game.id);
      if (!achievements || achievements.length === 0) return;

      const gameKey = `steam_${game.id}`;
      const previousAchs = knownAchievements.get(gameKey) || new Set<string>();

      for (const ach of achievements) {
        if (ach.achieved === 1 && !previousAchs.has(ach.apiname)) {
          previousAchs.add(ach.apiname);
          knownAchievements.set(gameKey, previousAchs);

          if (notificationWindow && !notificationWindow.isDestroyed()) {
            notificationWindow.webContents.send('show-achievement', {
              name: ach.name,
              description: ach.description || '',
              gameName: game.name,
              icon: ach.icon || undefined,
            });
            notificationWindow.showInactive();
          }
        }
      }
    }
  }, 15000); // Check every 15 seconds
}

// Monitor Window
ipcMain.on('open-monitor', () => {
  createMonitorWindow();
});

ipcMain.on('close-monitor', () => {
  if (monitorWindow && !monitorWindow.isDestroyed()) {
    monitorWindow.close();
  }
});

// Detect running game processes and auto-start FPS monitor
function detectRunningGameProcess(): Promise<string | null> {
  return new Promise((resolve) => {
    const games = db.getGames();
    const exeNames = games
      .map(g => {
        const parts = g.executable_path.split(/[\\/]/);
        return parts[parts.length - 1].replace(/\.exe$/i, '');
      })
      .filter(name => name.length > 0);

    if (exeNames.length === 0) {
      resolve(null);
      return;
    }

    const tasklistCmd = 'tasklist /FO CSV /NH';
    exec(tasklistCmd, { timeout: 3000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
        return;
      }

      const runningLines = stdout.trim().split('\n');

      // Exact match first
      for (const exeName of exeNames) {
        const found = runningLines.some(line =>
          line.toLowerCase().includes(`"${exeName.toLowerCase()}.exe"`)
        );
        if (found) {
          resolve(exeName + '.exe');
          return;
        }
      }

      // Partial match: many games have launcher exe (SB.exe) but different process name (SB-Win64-Shipping.exe)
      // Check if any running process starts with the same base name
      for (const exeName of exeNames) {
        const baseName = exeName.toLowerCase();
        if (baseName.length < 2) continue;
        const found = runningLines.some(line => {
          const procMatch = line.match(/"([^"]+\.exe)"/i);
          if (!procMatch) return false;
          const procName = procMatch[1].toLowerCase().replace(/\.exe$/i, '');
          return procName.startsWith(baseName) && procName !== baseName;
        });
        if (found) {
          const matchLine = runningLines.find(line => {
            const procMatch = line.match(/"([^"]+\.exe)"/i);
            if (!procMatch) return false;
            const procName = procMatch[1].toLowerCase().replace(/\.exe$/i, '');
            return procName.startsWith(baseName) && procName !== baseName;
          });
          if (matchLine) {
            const procMatch = matchLine.match(/"([^"]+\.exe)"/i);
            if (procMatch) {
              resolve(procMatch[1]);
              return;
            }
          }
        }
      }

      resolve(null);
    });
  });
}

let lastDetectedGame: string | null = null;

ipcMain.on('request-hardware-stats', async () => {
  if (!monitorWindow || monitorWindow.isDestroyed()) return;

  const cpu = getCpuUsage();
  const ram = getRamStats();

  // Run GPU, sensors, disk, network and game detection in parallel
  const [gpu, sensors, runningGame, disks, network] = await Promise.all([
    getGpuStats(),
    getSensors(),
    detectRunningGameProcess(),
    getDiskStats(),
    getNetworkStats(),
  ]);
  if (runningGame && runningGame !== lastDetectedGame) {
    console.log(`[FPS] Detected game: ${runningGame}`);
    lastDetectedGame = runningGame;
    fpsMonitor.startMonitoring(runningGame);
  } else if (!runningGame && lastDetectedGame) {
    console.log(`[FPS] Game exited: ${lastDetectedGame}`);
    lastDetectedGame = null;
    fpsMonitor.stopMonitoring();
  }

  const fpsData = fpsMonitor.getStats();

  monitorWindow.webContents.send('hardware-stats', {
    cpu,
    gpu,
    ram,
    temps: {
      cpu: sensors.cpu,
      gpu: gpu.temp || getGpuTempFromLHM(),
    },
    fans: sensors.fans,
    cpuPackageTemp: sensors.cpuPackageTemp || 0,
    disk: disks,
    network,
    fanControlRunning: true,
    cpuNeedsElevation: cpuTempNeedsElevation(),
    uptime: getUptime(),
    fps: fpsData.current,
    fpsMin: fpsData.min,
    fpsMax: fpsData.max,
    fpsAvg: fpsData.avg,
    fpsSource: fpsData.source,
    detectedGame: runningGame || null,
  });
});

// FPS Monitoring control
ipcMain.on('start-fps-monitor', (_event, processName: string) => {
  fpsMonitor.startMonitoring(processName);
});

ipcMain.on('stop-fps-monitor', () => {
  fpsMonitor.stopMonitoring();
});

ipcMain.on('check-fps-availability', (event) => {
  event.returnValue = fpsMonitor.isAvailable();
});

// CPU temp elevation (AMD needs admin for SMU)
ipcMain.handle('elevate-cpu-temp', async () => {
  const success = await elevateCpuTemp();
  return success;
});
