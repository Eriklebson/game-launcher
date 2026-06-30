import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

let db: SqlJsDatabase | null = null;
let dbPath = '';

export interface GameRow {
  id: string;
  name: string;
  executable_path: string;
  cover_image: string | null;
  platform: string;
  last_played: string | null;
  play_time: number;
  last_session_start: string | null;
  steam_app_id: string | null;
}

export interface AchievementRow {
  id?: number;
  game_id: string;
  apiname: string;
  achieved: number;
  unlocktime: number;
  name: string;
  description: string;
  icon: string | null;
  icongray: string | null;
}

export interface PlaySessionRow {
  id?: number;
  game_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
}

export async function initDatabase(userDataPath: string): Promise<void> {
  dbPath = path.join(userDataPath, 'game-launcher.db');
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, file),
  });

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode for better performance
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS play_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  save();
}

function save(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getGames(): GameRow[] {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM games ORDER BY name ASC');
  const games: GameRow[] = [];
  while (stmt.step()) {
    games.push(stmt.getAsObject() as unknown as GameRow);
  }
  stmt.free();
  return games;
}

export function getGame(id: string): GameRow | null {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const game = stmt.getAsObject() as unknown as GameRow;
    stmt.free();
    return game;
  }
  stmt.free();
  return null;
}

export function upsertGame(game: GameRow): void {
  if (!db) return;
  db.run(`
    INSERT INTO games (id, name, executable_path, cover_image, platform, last_played, play_time, last_session_start, steam_app_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      cover_image = COALESCE(excluded.cover_image, games.cover_image),
      platform = excluded.platform,
      last_played = COALESCE(excluded.last_played, games.last_played),
      play_time = excluded.play_time,
      last_session_start = COALESCE(excluded.last_session_start, games.last_session_start),
      steam_app_id = COALESCE(excluded.steam_app_id, games.steam_app_id),
      updated_at = datetime('now')
  `, [
    game.id, game.name, game.executable_path, game.cover_image,
    game.platform, game.last_played, game.play_time,
    game.last_session_start, game.steam_app_id
  ]);
  save();
}

export function deleteGame(id: string): void {
  if (!db) return;
  db.run('DELETE FROM play_sessions WHERE game_id = ?', [id]);
  db.run('DELETE FROM achievements WHERE game_id = ?', [id]);
  db.run('DELETE FROM games WHERE id = ?', [id]);
  save();
}

export function updateGamePlayTime(id: string, playTime: number, lastSessionStart: string | null): void {
  if (!db) return;
  db.run(`
    UPDATE games SET play_time = ?, last_session_start = ?, last_played = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `, [playTime, lastSessionStart, id]);
  save();
}

export function recordPlaySession(gameId: string, startTime: string, durationMinutes: number): void {
  if (!db) return;
  db.run(`
    INSERT INTO play_sessions (game_id, start_time, end_time, duration_minutes)
    VALUES (?, ?, datetime('now'), ?)
  `, [gameId, startTime, durationMinutes]);
  save();
}

export function getPlaySessions(gameId: string): PlaySessionRow[] {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM play_sessions WHERE game_id = ? ORDER BY start_time DESC');
  stmt.bind([gameId]);
  const sessions: PlaySessionRow[] = [];
  while (stmt.step()) {
    sessions.push(stmt.getAsObject() as unknown as PlaySessionRow);
  }
  stmt.free();
  return sessions;
}

export function saveAchievements(gameId: string, achievements: { apiname: string; achieved: number; unlocktime: number; name: string; description: string; icon?: string; icongray?: string }[]): void {
  if (!db) return;
  // Delete old achievements for this game
  db.run('DELETE FROM achievements WHERE game_id = ?', [gameId]);

  const stmt = db.prepare(`
    INSERT INTO achievements (game_id, apiname, achieved, unlocktime, name, description, icon, icongray)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ach of achievements) {
    stmt.bind([gameId, ach.apiname, ach.achieved, ach.unlocktime, ach.name, ach.description, ach.icon || null, ach.icongray || null]);
    stmt.step();
    stmt.reset();
  }
  stmt.free();
  save();
}

export function getAchievements(gameId: string): AchievementRow[] {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM achievements WHERE game_id = ? ORDER BY achieved DESC, name ASC');
  stmt.bind([gameId]);
  const achievements: AchievementRow[] = [];
  while (stmt.step()) {
    achievements.push(stmt.getAsObject() as unknown as AchievementRow);
  }
  stmt.free();
  return achievements;
}

export function getTotalPlayTime(): number {
  if (!db) return 0;
  const stmt = db.prepare('SELECT COALESCE(SUM(play_time), 0) as total FROM games');
  stmt.step();
  const result = stmt.getAsObject() as { total: number };
  stmt.free();
  return result.total;
}

export function getGameCount(): { total: number; steam: number; xbox: number; epic: number; gog: number; mods: number; other: number } {
  if (!db) return { total: 0, steam: 0, xbox: 0, epic: 0, gog: 0, mods: 0, other: 0 };
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN platform = 'steam' THEN 1 ELSE 0 END) as steam,
      SUM(CASE WHEN platform = 'xbox' THEN 1 ELSE 0 END) as xbox,
      SUM(CASE WHEN platform = 'epic' THEN 1 ELSE 0 END) as epic,
      SUM(CASE WHEN platform = 'gog' THEN 1 ELSE 0 END) as gog,
      SUM(CASE WHEN platform = 'mods' THEN 1 ELSE 0 END) as mods,
      SUM(CASE WHEN platform NOT IN ('steam','xbox','epic','gog','mods') THEN 1 ELSE 0 END) as other
    FROM games
  `);
  stmt.step();
  const result = stmt.getAsObject() as any;
  stmt.free();
  return {
    total: result.total || 0,
    steam: result.steam || 0,
    xbox: result.xbox || 0,
    epic: result.epic || 0,
    gog: result.gog || 0,
    mods: result.mods || 0,
    other: result.other || 0,
  };
}

export function close(): void {
  if (db) {
    save();
    db.close();
    db = null;
  }
}
