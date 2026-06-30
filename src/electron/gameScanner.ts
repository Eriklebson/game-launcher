import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

// Fetch URL and return text
function fetchUrl(url: string, timeout = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, (res) => {
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

// Steam Store search result cache to avoid duplicate API calls
const steamSearchCache = new Map<string, { coverImage?: string; steamAppId?: string }>();

// Search Steam Store API for a game cover and App ID (free, no auth needed)
async function searchSteamStore(gameName: string): Promise<{ coverImage?: string; steamAppId?: string }> {
  const cached = steamSearchCache.get(gameName.toLowerCase());
  if (cached) return cached;

  try {
    const searchName = encodeURIComponent(gameName);
    const url = `https://store.steampowered.com/api/storesearch/?term=${searchName}&l=english&cc=US`;
    const data = await fetchUrl(url, 8000);
    const result = JSON.parse(data);

    if (result.items && result.items.length > 0) {
      const item = result.items[0];
      const appId = String(item.id);
      const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`;
      const resultObj = { coverImage: headerUrl, steamAppId: appId };
      steamSearchCache.set(gameName.toLowerCase(), resultObj);
      return resultObj;
    }
  } catch (e) {}
  steamSearchCache.set(gameName.toLowerCase(), {});
  return {};
}

export interface ScannedGame {
  name: string;
  executablePath: string;
  coverImage?: string;
  platform: 'steam' | 'epic' | 'xbox' | 'gog' | 'mods' | 'other';
  steamAppId?: string;
}

// Windows Store packages that are NOT games
const XBOX_EXCLUDE = new Set([
  // Microsoft system apps
  'Microsoft.WindowsStore', 'Microsoft.XboxApp', 'Microsoft.XboxGameOverlay',
  'Microsoft.XboxGamingOverlay', 'Microsoft.XboxIdentityProvider',
  'Microsoft.XboxSpeechToTextOverlay', 'Microsoft.Xbox.TCUI',
  'Microsoft.WindowsCalculator', 'Microsoft.WindowsAlarms',
  'Microsoft.WindowsCamera', 'Microsoft.WindowsNotepad',
  'Microsoft.WindowsTerminal', 'Microsoft.WindowsFeedbackHub',
  'Microsoft.WindowsMaps', 'Microsoft.WindowsSoundRecorder',
  'Microsoft.Windows.Photos', 'Microsoft.WindowsPhotos',
  'Microsoft.BingWeather', 'Microsoft.BingNews',
  'Microsoft.BingFinance', 'Microsoft.BingSports',
  'Microsoft.GetHelp', 'Microsoft.Getstarted',
  'Microsoft.MicrosoftSolitaireCollection', 'Microsoft.MicrosoftStickyNotes',
  'Microsoft.MicrosoftOfficeHub', 'Microsoft.MicrosoftEdge',
  'Microsoft.WindowsCommunicationsApps', 'Microsoft.WindowsMail',
  'Microsoft.WindowsCalendar', 'Microsoft.People', 'Microsoft.SkypeApp',
  'Microsoft.Microsoft3DViewer', 'Microsoft.MixedReality.Portal',
  'Microsoft.NET.Native.Framework', 'Microsoft.NET.Native.Runtime',
  'Microsoft.VCLibs', 'Microsoft.UI.Xaml', 'Microsoft.AdaptiveCards',
  'Microsoft.WindowsAppRuntime', 'Microsoft.PowerAutomateDesktop',
  'Microsoft.PowerToys', 'Microsoft.WindowsTerminalPreview',
  'Microsoft.RawImageExtension', 'Microsoft.HEIFImageExtension',
  'Microsoft.WebpImageExtension', 'Microsoft.ScreenSketch',
  'Microsoft.HEVCVideoExtension', 'Microsoft.VP9VideoExtension',
  'Microsoft.AV1VideoExtension', 'Microsoft.WebMediaExtensions',
  'Microsoft.549981C3F5F10', 'Microsoft.Copilot',
  'Microsoft.Windows.Ai.Copilot.Provider', 'Microsoft.Paint',
  'Microsoft.Win32Calculator', 'Microsoft.WindowsOldApp',
  'Microsoft.WindowsSubsystemForAndroid', 'Microsoft.WindowsSubsystemForLinux',
  'Microsoft.YourPhone', 'Microsoft.GamingApp', 'Microsoft.XboxForWindows',
  'Microsoft.Xbox', 'Microsoft.WindowsTerminal',
  // Non-game utilities
  'CurseForge', 'MacroRecorder', 'MCA Selector', 'MCASelector',
  'LOOT', 'VisualStudio', 'Microsoft.VisualStudio',
  'Microsoft.Windows.Win32Application',
  'NexusModManager', 'Vortex', 'ModOrganizer',
  // Messaging / Social
  'TelegramMessengerLLP.TelegramDesktop', 'Telegram',
  'MSTeams', 'Microsoft.MicrosoftTeams',
  '5319275A.WhatsAppDesktop', 'WhatsApp',
  'Discord', 'DiscordInc.Discord',
  // Music / Video / Streaming
  'SpotifyAB.SpotifyMusic', 'Spotify',
  'Clipchamp.Clipchamp', 'Clipchamp',
  'Netflix', 'DisneyPlus', 'PrimeVideo',
  // Hardware control panels
  'NVIDIACorp.NVIDIAControlPanel', 'NVIDIA',
  'RealtekSemiconductorCorp.RealtekAudioControl', 'Realtek',
  'B9ECED6F.ArmouryCrate', 'ArmouryCrate',
  'Logitech', 'Corsair', 'Razer',
  // Runtimes / Frameworks
  'MicrosoftCorporationII.WinAppRuntime',
  'MicrosoftCorporationII.QuickAssist',
  // Productivity
  'Canva', 'Adobe', 'Figma',
  'Notion', 'Slack', 'Zoom',
  'Microsoft.OneDrive', 'OneDrive',
  'Dropbox', 'GoogleDrive',
  // Browsers
  'Brave', 'Opera', 'Mozilla', 'Vivaldi',
  // Development tools
  'GitHub', 'Postman', 'Docker',
  // More Microsoft non-game apps
  'Microsoft.Windows.DevHome', 'Microsoft.OutlookForWindows',
  'Microsoft.BingSearch', 'Microsoft.SecHealthUI',
  'Microsoft.DesktopAppInstaller', 'Microsoft.4297127D64EC6',
  'Microsoft.Edge.GameAssist', 'Microsoft.WidgetsPlatformRuntime',
  'Microsoft.Ink.Handwriting.Main.pt-BR.1.0',
  'Microsoft.StorePurchaseApp', 'Microsoft.ZuneMusic',
  'Microsoft.StartExperiencesApp', 'MicrosoftWindows.CrossDevice',
  'Microsoft.Todos', 'MicrosoftWindows.Client.WebExperience',
  'Microsoft.GamingServices', 'Microsoft.549981C3F5F10_8wekyb3d8bbwe',
  'Microsoft.Windows.Photos', 'Microsoft.WindowsAlarms',
  'Microsoft.WindowsTerminal_8wekyb3d8bbwe',
  'Microsoft.ScreenSketch_8wekyb3d8bbwe',
  'Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe',
  'Microsoft.WindowsFeedbackHub_8wekyb3d8bbwe',
  'Microsoft.GetHelp_8wekyb3d8bbwe',
  'Microsoft.Getstarted_8wekyb3d8bbwe',
  'Microsoft.MicrosoftSolitaireCollection_8wekyb3d8bbwe',
  'Microsoft.WindowsMaps_8wekyb3d8bbwe',
  'Microsoft.WindowsSoundRecorder_8wekyb3d8bbwe',
  'Microsoft.WindowsCamera_8wekyb3d8bbwe',
  'Microsoft.WindowsCalculator_8wekyb3d8bbwe',
  'Microsoft.MicrosoftOfficeHub_8wekyb3d8bbwe',
  'Microsoft.People_8wekyb3d8bbwe',
  'Microsoft.WindowsMail_8wekyb3d8bbwe',
  'Microsoft.WindowsCalendar_8wekyb3d8bbwe',
  'Microsoft.BingWeather_8wekyb3d8bbwe',
  'Microsoft.BingNews_8wekyb3d8bbwe',
  'Microsoft.BingFinance_8wekyb3d8bbwe',
  'Microsoft.BingSports_8wekyb3d8bbwe',
  'Microsoft.SkypeApp_8wekyb3d8bbwe',
  'Microsoft.Microsoft3DViewer_8wekyb3d8bbwe',
  'Microsoft.MixedReality.Portal_8wekyb3d8bbwe',
  'Microsoft.WindowsCommunicationsApps_8wekyb3d8bbwe',
  'Microsoft.WindowsStore_8wekyb3d8bbwe',
  'Microsoft.XboxApp_8wekyb3d8bbwe',
  'Microsoft.XboxGameOverlay_8wekyb3d8bbwe',
  'Microsoft.XboxGamingOverlay_8wekyb3d8bbwe',
  'Microsoft.XboxIdentityProvider_8wekyb3d8bbwe',
  'Microsoft.XboxSpeechToTextOverlay_8wekyb3d8bbwe',
  'Microsoft.Xbox.TCUI_8wekyb3d8bbwe',
  'Microsoft.YourPhone_8wekyb3d8bbwe',
  'Microsoft.GamingApp_8wekyb3d8bbwe',
  'Microsoft.XboxForWindows_8wekyb3d8bbwe',
  'Microsoft.Xbox_8wekyb3d8bbwe',
  'Microsoft.WindowsTerminal_8wekyb3d8bbwe',
]);

// Prefix patterns to exclude (non-game apps)
const XBOX_EXCLUDE_PREFIXES = [
  'Microsoft.', 'MicrosoftWindows.', 'Windows.',
  'Windows.Devices.', 'Windows.Services.', 'Windows.Security.',
  'Microsoft.NET.', 'Microsoft.VCLibs.', 'Microsoft.UI.',
  'Microsoft.WindowsAppRuntime', 'MicrosoftCorporationII.',
];

// Known modding tools
const MODS_MAP: Record<string, string> = {
  'loot': 'LOOT',
  'curseforge': 'CurseForge',
  'macrorecorder': 'MacroRecorder',
  'mca selector': 'MCA Selector',
  'mcaselector': 'MCA Selector',
  'nexus mod manager': 'Nexus Mod Manager',
  'vortex': 'Vortex',
  'mod organiser': 'Mod Organizer',
  'modorganizer': 'Mod Organizer',
  'wrye bash': 'Wrye Bash',
  'fo4edit': 'FO4Edit',
  'sseedit': 'SSEEdit',
  'xedit': 'xEdit',
  'fnis': 'FNIS',
  'nemesis': 'Nemesis',
  'body slide': 'BodySlide',
  'outfit studio': 'Outfit Studio',
  'creation kit': 'Creation Kit',
  'creationkit': 'Creation Kit',
  'geck': 'GECK',
  'construction set': 'Construction Set',
  'redkit': 'RedKit',
};

// Common non-game executables to skip
const SKIP_EXE_NAMES = new Set([
  'uninstall', 'setup', 'install', 'update', 'updater', 'downloader',
  'launcher', 'crash', 'report', 'error', 'config', 'settings',
  'tool', 'helper', 'service', 'agent', 'registry', 'eula', 'license',
  'readme', 'changelog', 'archive', 'backup', 'restore', 'cleanup',
  'repair', 'verify', 'patch', 'compiler', 'builder', 'deploy',
  'server', 'client', 'daemon', 'monitor', 'logger', 'debug',
  'test', 'benchmark', 'diagnostic', 'optimizer', 'cleaner',
  'manager', 'editor', 'viewer', 'browser', 'explorer',
  'upgrader', 'migrator', 'converter', 'importer', 'exporter',
]);

// Common non-game directory names to skip
const SKIP_DIRS = new Set([
  'redist', 'redistributable', 'vcredist', 'directx', 'dotnet',
  '__redist', 'support', 'docs', 'documentation', 'manual',
  'bin64', 'bin32', 'win32', 'win64', 'x64', 'x86', 'arm64',
  '.git', '.svn', '__pycache__', 'node_modules',
  'source', 'sources', 'src', 'build', 'temp', 'tmp',
  'cache', 'logs', 'log', 'data',
]);

function parseVdf(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*"([^"]+)"\s+"([^"]*)"/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}

function findExecutables(dir: string, depth = 0): string[] {
  if (depth > 3) return [];
  const execs: string[] = [];

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        const lowerFile = file.toLowerCase();

        if (stat.isDirectory()) {
          if (!lowerFile.startsWith('.') && !SKIP_DIRS.has(lowerFile)) {
            execs.push(...findExecutables(fullPath, depth + 1));
          }
        } else if (lowerFile.endsWith('.exe')) {
          const nameWithoutExt = lowerFile.replace('.exe', '');
          if (!SKIP_EXE_NAMES.has(nameWithoutExt)) {
            execs.push(fullPath);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // Sort: prefer root-level executables with shorter names
  execs.sort((a, b) => {
    const aDepth = a.split(path.sep).length;
    const bDepth = b.split(path.sep).length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.length - b.length;
  });

  return execs;
}

function findFirstExe(dir: string): string | null {
  const execs = findExecutables(dir, 0);
  return execs.length > 0 ? execs[0] : null;
}

// Read AppxManifest.xml to get the proper DisplayName for Xbox games
function getXboxDisplayName(installLocation: string, packageName: string): string {
  try {
    const manifestPath = path.join(installLocation, 'AppxManifest.xml');
    if (fs.existsSync(manifestPath)) {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      // Try Properties/DisplayName first (most reliable, e.g. Minecraft)
      const propsMatch = content.match(/<Properties>\s*<DisplayName>(.*?)<\/DisplayName>/is);
      if (propsMatch && propsMatch[1]) {
        return propsMatch[1].trim();
      }
      // Try uap:DisplayName
      const uapMatch = content.match(/<uap:DisplayName>(.*?)<\/uap:DisplayName>/i);
      if (uapMatch && uapMatch[1]) {
        return uapMatch[1].trim();
      }
      // Fallback to mp:DisplayName
      const mpMatch = content.match(/<mp:DisplayName>(.*?)<\/mp:DisplayName>/i);
      if (mpMatch && mpMatch[1]) {
        return mpMatch[1].trim();
      }
      // Fallback to <DisplayName> (older format, last resort)
      const simpleMatch = content.match(/<DisplayName>(.*?)<\/DisplayName>/i);
      if (simpleMatch && simpleMatch[1]) {
        return simpleMatch[1].trim();
      }
    }
  } catch (e) {}
  // Fallback to package name with underscores replaced
  return packageName.replace(/_/g, ' ');
}

// Get local cover image from Xbox game install directory (returns file:// URL)
function getXboxLocalCover(installLocation: string): string | undefined {
  try {
    // Try common cover image names in order of preference
    const coverNames = ['StoreLogo.png', 'Logo.png', 'LargeLogo.png', 'Square150x150Logo.png', 'Square44x44Logo.png'];
    for (const name of coverNames) {
      const imgPath = path.join(installLocation, name);
      if (fs.existsSync(imgPath)) {
        return 'file:///' + imgPath.replace(/\\/g, '/');
      }
    }
    // Check Assets folder
    const assetsDir = path.join(installLocation, 'Assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      const coverFile = files.find(f => f.endsWith('.png') && !f.includes('Small') && !f.includes('targetsize'));
      if (coverFile) {
        return 'file:///' + path.join(assetsDir, coverFile).replace(/\\/g, '/');
      }
    }
  } catch (e) {}
  return undefined;
}

function isModTool(name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(MODS_MAP).some(key => lower.includes(key));
}

function getModName(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(MODS_MAP)) {
    if (lower.includes(key)) return value;
  }
  return name;
}

// ==================== STEAM ====================

async function scanSteam(): Promise<ScannedGame[]> {
  const games: ScannedGame[] = [];

  const steamPaths = [
    path.join('C:', 'Program Files (x86)', 'Steam'),
    path.join('C:', 'Program Files', 'Steam'),
    path.join('D:', 'Steam'),
    path.join('E:', 'Steam'),
    path.join('F:', 'Steam'),
  ];

  let steamPath = '';
  for (const p of steamPaths) {
    if (fs.existsSync(path.join(p, 'steam.exe'))) {
      steamPath = p;
      break;
    }
  }

  if (!steamPath) return games;

  const libraryFile = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
  const libraryFolders: string[] = [];

  if (fs.existsSync(libraryFile)) {
    try {
      const content = fs.readFileSync(libraryFile, 'utf-8');
      const pathRegex = /"path"\s+"([^"]+)"/g;
      let match;
      while ((match = pathRegex.exec(content)) !== null) {
        libraryFolders.push(match[1]);
      }
    } catch (e) {}
  }

  const mainSteamApps = path.join(steamPath, 'steamapps');
  if (!libraryFolders.includes(mainSteamApps)) {
    libraryFolders.unshift(mainSteamApps);
  }

  for (const folder of libraryFolders) {
    const steamAppsPath = path.join(folder, 'steamapps');
    if (!fs.existsSync(steamAppsPath)) continue;

    try {
      const files = fs.readdirSync(steamAppsPath);
      for (const file of files) {
        if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue;

        try {
          const content = fs.readFileSync(path.join(steamAppsPath, file), 'utf-8');
          const data = parseVdf(content);

          const name = data['name'];
          const appid = data['appid'];
          const installDir = data['installdir'];

          if (!name || !installDir) continue;

          const gamePath = path.join(steamAppsPath, 'common', installDir);
          let exePath = '';

          if (fs.existsSync(gamePath)) {
            const executables = findExecutables(gamePath);
            if (executables.length > 0) {
              exePath = executables[0];
            }
          }

          if (!exePath) {
            exePath = `steam://rungameid/${appid}`;
          }

          const coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;

          games.push({
            name,
            executablePath: exePath,
            coverImage: coverUrl,
            platform: 'steam',
            steamAppId: appid,
          });
        } catch (e) {}
      }
    } catch (e) {}
  }

  return games;
}

// ==================== EPIC ====================

async function scanEpic(): Promise<ScannedGame[]> {
  const games: ScannedGame[] = [];

  const manifestPaths = [
    path.join('C:', 'ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'),
    path.join(process.env.LOCALAPPDATA || '', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'),
  ];

  for (const manifestDir of manifestPaths) {
    if (!fs.existsSync(manifestDir)) continue;

    try {
      const files = fs.readdirSync(manifestDir).filter(f => f.endsWith('.item'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(manifestDir, file), 'utf-8');
          const data = JSON.parse(content);

          const name = data.DisplayName || data.AppName;
          const exePath = data.InstallLocation ? findFirstExe(data.InstallLocation) : null;

          if (name && exePath) {
            games.push({
              name,
              executablePath: exePath,
              coverImage: data.ThumbnailUrl,
              platform: 'epic',
            });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return games;
}

// ==================== GOG ====================

async function scanGog(): Promise<ScannedGame[]> {
  const games: ScannedGame[] = [];

  const gogPaths = [
    path.join('C:', 'GOG Games'),
    path.join('D:', 'GOG Games'),
    path.join('E:', 'GOG Games'),
    path.join('F:', 'GOG Games'),
    path.join('C:', 'Program Files (x86)', 'GOG Galaxy', 'Games'),
  ];

  for (const gogPath of gogPaths) {
    if (!fs.existsSync(gogPath)) continue;

    try {
      const dirs = fs.readdirSync(gogPath);
      for (const dir of dirs) {
        const fullPath = path.join(gogPath, dir);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        const exePath = findFirstExe(fullPath);
        if (exePath) {
          const steamInfo = await searchSteamStore(dir);
          games.push({
            name: dir,
            executablePath: exePath,
            coverImage: steamInfo.coverImage,
            platform: 'gog',
            steamAppId: steamInfo.steamAppId,
          });
        }
      }
    } catch (e) {}
  }

  return games;
}

// ==================== XBOX / MS STORE ====================

async function scanXbox(): Promise<ScannedGame[]> {
  const games: ScannedGame[] = [];

  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-AppxPackage | Where-Object {$_.SignatureKind -ne \'System\' -and $_.IsFramework -eq $false} | Select-Object Name, InstallLocation, PackageFamilyName | ConvertTo-Json"',
      { timeout: 15000 }
    );

    const packages = JSON.parse(stdout || '[]');
    const packageArray = Array.isArray(packages) ? packages : [packages];

    console.log(`Xbox scan: ${packageArray.length} packages found`);

    for (const pkg of packageArray) {
      if (!pkg.InstallLocation || !pkg.Name) continue;

      // Only skip exact known non-game packages
      if (XBOX_EXCLUDE.has(pkg.Name)) continue;

      // Skip framework/runtime packages
      if (pkg.Name.includes('VCLibs') || pkg.Name.includes('NET.Native') || pkg.Name.includes('UI.Xaml')) continue;
      if (pkg.Name.includes('WindowsAppRuntime') || pkg.Name.includes('WinAppRuntime')) continue;

      try {
        const exePath = findFirstExe(pkg.InstallLocation);
        if (exePath) {
          const displayName = getXboxDisplayName(pkg.InstallLocation, pkg.Name);

          // Check if it's a mod tool
          if (isModTool(displayName)) {
            games.push({
              name: getModName(displayName),
              executablePath: exePath,
              platform: 'mods',
            });
            console.log(`  [MODS] ${displayName}`);
          } else {
            const localCover = getXboxLocalCover(pkg.InstallLocation);
            let coverImage: string | undefined = localCover;
            let steamAppId: string | undefined;
            if (!localCover) {
              const steamInfo = await searchSteamStore(displayName);
              coverImage = steamInfo.coverImage;
              steamAppId = steamInfo.steamAppId;
            }

            games.push({
              name: displayName,
              executablePath: exePath,
              coverImage,
              platform: 'xbox',
              steamAppId,
            });
            console.log(`  [XBOX] ${displayName}${coverImage ? ' (with cover)' : ''}`);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  return games;
}

// ==================== COMMON DIRS ====================

async function scanCommonDirs(): Promise<ScannedGame[]> {
  const games: ScannedGame[] = [];

  const commonPaths = [
    path.join('C:', 'Games'),
    path.join('D:', 'Games'),
    path.join('E:', 'Games'),
    path.join('F:', 'Games'),
    path.join('C:', 'Program Files', 'Games'),
    path.join('C:', 'Program Files (x86)', 'Games'),
  ];

  for (const dir of commonPaths) {
    if (!fs.existsSync(dir)) continue;

    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        const exePath = findFirstExe(fullPath);
        if (exePath) {
          // Check if it's a mod tool
          if (isModTool(entry)) {
            games.push({
              name: getModName(entry),
              executablePath: exePath,
              platform: 'mods',
            });
          } else {
            const steamInfo = await searchSteamStore(entry);
            games.push({
              name: entry,
              executablePath: exePath,
              coverImage: steamInfo.coverImage,
              platform: 'other',
              steamAppId: steamInfo.steamAppId,
            });
          }
        }
      }
    } catch (e) {}
  }

  return games;
}

// ==================== MAIN ====================

export async function scanAllGames(): Promise<ScannedGame[]> {
  console.log('Starting game scan...');

  const [steamGames, epicGames, gogGames, xboxGames, commonGames] = await Promise.all([
    scanSteam(),
    scanEpic(),
    scanGog(),
    scanXbox(),
    scanCommonDirs(),
  ]);

  const allGames = [...steamGames, ...epicGames, ...gogGames, ...xboxGames, ...commonGames];

  // Remove duplicates by executable path
  const seen = new Set<string>();
  const uniqueGames = allGames.filter(game => {
    if (seen.has(game.executablePath)) return false;
    seen.add(game.executablePath);
    return true;
  });

  console.log(`Scan complete: ${uniqueGames.length} games found`);
  console.log(`  Steam: ${steamGames.length}`);
  console.log(`  Epic: ${epicGames.length}`);
  console.log(`  GOG: ${gogGames.length}`);
  console.log(`  Xbox: ${xboxGames.length}`);
  console.log(`  Common dirs: ${commonGames.length}`);

  return uniqueGames;
}
