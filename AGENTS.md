# AGENTS.md - Game Launcher

## Project Overview
Personal Steam-like desktop game launcher built with Electron + React + Vite + TypeScript.

## Commands
- `npm run dev` - Start dev mode (auto-builds electron before launching)
- `npm run build` - Full build (vite + electron)
- `npm run electron:build` - Build electron files only (esbuild + sql-wasm.wasm copy)
- `npm run lint` - Run ESLint
- No test framework configured yet

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Desktop**: Electron 33
- **Database**: SQLite via sql.js (pure JS/WASM)
- **Styling**: Steam-like dark theme (#1b2838, #a4d007, #66c0f4)

## Architecture

### Electron (src/electron/)
- `main.ts` - Main process: window, IPC handlers, DB init, play time tracking
- `preload.ts` - Context bridge exposing electronAPI to renderer
- `database.ts` - SQLite module (sql.js) with tables: games, achievements, play_sessions
- `gameScanner.ts` - Scans Steam, Epic, Xbox, GOG, common dirs; `searchSteamStore()` returns {coverImage, steamAppId}
- `stellarBladeParser.ts` - READ-ONLY parser for Stellar Blade .sav files (UE4 binary format)

### Frontend (src/ui/)
- `App.tsx` - Root component with routing, state management
- `pages/Library.tsx` - Game library with grid/list views, search
- `pages/GameDetail.tsx` - Steam-like game detail (screenshots, achievements, sys requirements)
- `pages/AddGame.tsx` - Manual game addition form
- `components/GameCard.tsx` - Clickable game card with platform badge dropdown
- `components/Sidebar.tsx` - Navigation sidebar with game counts, collapsible on mobile (<768px)
- `components/TitleBar.tsx` - Custom frameless window title bar
- `components/StellarBladeAchievements.tsx` - Stellar Blade save-based achievements
- `components/AchievementNotification.tsx` - Steam-like achievement popup notifications

### Types (src/types/index.ts)
All TypeScript interfaces: Game, ScannedGame, SteamAchievement, AchievementResult, SteamStoreInfo, PlaySession, CachedAchievement, StellarBladeSaveData, StellarBladeTrophy, ElectronAPI

## Database Schema (SQLite)
```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  executable_path TEXT NOT NULL,
  cover_image TEXT,
  platform TEXT NOT NULL DEFAULT 'other',
  last_played TEXT,
  play_time INTEGER NOT NULL DEFAULT 0,
  last_session_start TEXT,
  steam_app_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  apiname TEXT NOT NULL,
  achieved INTEGER NOT NULL DEFAULT 0,
  unlocktime INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  icongray TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id, apiname)
);

CREATE TABLE play_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

## Key Patterns
- `searchSteamStore()` in gameScanner.ts: Single API call returns both cover and App ID, with in-memory cache
- Play time: Records `last_session_start` on launch, calculates elapsed on next launch or app quit
- Achievements cached in DB (no Steam API required)
- Stellar Blade parser: READ ONLY, maps 25 Trophy flags to Steam achievements

## Game Locations
- **Steam**: `C:\Program Files (x86)\Steam\steamapps\common\`, `D:\SteamLibrary\steamapps\common\`
- **Epic**: `C:\Program Files\Epic Games\`, `D:\Epic Games\`
- **GOG**: `C:\GOG Games\`, `D:\GOG Games\`
- **Xbox/MS Store**: PowerShell `Get-AppxPackage` (reads AppxManifest.xml for real names)
- **Common**: `C:\Games\`, `D:\Games\`, `D:\SteamLibrary\`, `E:\Games\`
- **Mods**: `C:\Modding\`, `D:\Modding\`, `C:\Tools\`, `D:\Tools\`

## Stellar Blade Save
- Location: `%LOCALAPPDATA%\SB\Saved\SaveGames\{steamId}\StellarBladeSave00.sav`
- Format: UE4 binary (header "EVAS", Release-4.26, ~10MB)
- Steam ID: FString near end of file (offset ~10,052,362), preceded by uint32 length=18
- Parser: `src/electron/stellarBladeParser.ts` (READ ONLY)
- BoolProperty offset: name + 21 bytes (13 "BoolProperty\0" + 4 size + 4 arrayIndex)
- UInt32Property offset: name + 23 bytes (15 "UInt32Property\0" + 4 size + 4 arrayIndex)
- Documentation: `docs/stellar-blade-save-format.md`, `docs/stellar-blade-parser.md`

## Responsive Design
- **Sidebar**: Collapsible with hamburger toggle. Auto-collapses below 768px. Uses `fixed` positioning on mobile with overlay.
- **Library grid**: `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`
- **GameDetail hero**: Height adjusts `h-56 sm:h-64 md:h-80`. Cover hidden on `sm:hidden`.
- **All components**: Use `sm:`, `md:` prefixes for padding, font sizes, gaps, and spacing.
- **Tailwind breakpoints**: Default v3 breakpoints (sm:640px, md:768px, lg:1024px, xl:1280px, 2xl:1536px)

## Important Notes
- Xbox game names: Package names (e.g., `Microsoft.ForteBaseGame`) are NOT display names; read `AppxManifest.xml` `<DisplayName>` instead
- Steam Store API (`store.steampowered.com/api/storesearch/`) returns `items[0].id` and `items[0].tiny_image` (no auth needed)
- sql.js requires `sql-wasm.wasm` in same dir as main.js (copied by build script)
- `webSecurity: false` in Electron for `file://` protocol images
- Build process: `vite build` for frontend, `node scripts/build-electron.js` for main/preload (CJS format)
- Electron cache errors ("Unable to move the cache") are harmless Windows GPU cache warnings

## User's Steam ID
76561197960285355

## Detailed Documentation
- `docs/SISTEMA-COMPLETO.md` - Complete system documentation
- `docs/stellar-blade-parser.md` - Stellar Blade parser documentation
- `docs/stellar-blade-save-format.md` - Save file format reference
