import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Stellar Blade Save Parser - READ ONLY
// Este módulo APENAS LE o save. NUNCA modifica.
// ============================================================

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

// Mapeamento Trophy Flag → Steam Achievement
const TROPHY_MAP: Record<string, string> = {
  Trophy_Platinum: 'EVE Protocol',
  Trophy_Activate_FirstCamp: 'Camp Preparation',
  Trophy_Activate_AllCamp: 'Meticulous Explorer',
  Trophy_KillCharacter: 'Cruel Liberator',
  Trophy_KillCharacter_Brute: 'Brute',
  Trophy_KillCharacter_AllNative: 'Naytiba Researcher',
  Trophy_Acquire_AllNanoSuit: 'Nano Suit Collector',
  Trophy_Acquire_AllSkill: 'Thorough Technician',
  Trophy_Acquire_AllSkill_v2: 'Infinite Blade',
  Trophy_Acquire_AllCan: 'Can Collector',
  Trophy_Acquire_AllRecords: 'Records Collector',
  Trophy_Open_AllBox: 'Box Hunter',
  Trophy_CompleteLevel_AltesLabor: 'Altess Levoire',
  Trophy_LevelUpMax_AllExoSpine: 'Perfect Exospine',
  Trophy_WeaponMaxUpgrade: 'Perfect Blood Edge',
  Trophy_TumblerMaxUpgrade: 'Perfect Rechargeable Tumbler',
  Trophy_BodyMaxUpgrade: 'Perfect Physical Enhancement',
  Trophy_BetaMaxUpgrade: 'Perfect Beta Energy Enhancement',
  Trophy_UseItem_Gold_At_Shop: 'Shopper',
  Trophy_CharKill_BetaSkill: 'Naytiba Hunter',
  Trophy_CharKill_BurstSkill: 'Relentless Destroyer',
  Trophy_CharKill_RangeSkill: 'Cold-blooded Sniper',
  Trophy_CharKill_AssassinationSkills: 'Silent Executioner',
  Trophy_JustEvade: 'Battlefield Martial Artist',
  Trophy_JustParry: 'Agile Gladiator',
};

// Mapeamento Quest → Steam Achievement
const QUEST_MAP: Record<string, string> = {
  Complete_Quest_Quest_Sub_032: 'Beyond Fate',
  Complete_Quest_Quest_Sub_033: 'Sisterly Love',
  Complete_Quest_Quest_Sub_043: 'Beep!',
};

/**
 * Localiza o arquivo save do Stellar Blade
 */
export function findStellarBladeSave(): string | null {
  const localAppData = process.env.LOCALAPPDATA || '';
  const basePath = path.join(localAppData, 'SB', 'Saved', 'SaveGames');

  if (!fs.existsSync(basePath)) return null;

  // Procurar pasta com Steam ID (17 dígitos)
  const entries = fs.readdirSync(basePath);
  for (const entry of entries) {
    if (/^\d{17}$/.test(entry)) {
      const saveFile = path.join(basePath, entry, 'StellarBladeSave00.sav');
      if (fs.existsSync(saveFile)) {
        return saveFile;
      }
    }
  }

  return null;
}

/**
 * Lê strings UTF-8 de um buffer a partir de um offset
 */
function readFString(buffer: Buffer, offset: number): { value: string; nextOffset: number } | null {
  if (offset + 4 > buffer.length) return null;

  const length = buffer.readUInt32LE(offset);
  if (length === 0 || offset + 4 + length > buffer.length) return null;

  const str = buffer.toString('ascii', offset + 4, offset + 4 + length - 1);
  return { value: str, nextOffset: offset + 4 + length };
}

/**
 * Busca um padrão de bytes no buffer
 */
function findPattern(buffer: Buffer, pattern: string, startOffset = 0): number {
  const text = buffer.toString('ascii');
  return text.indexOf(pattern, startOffset);
}

/**
 * Extrai o valor BoolProperty de uma propriedade
 */
function extractBoolValue(buffer: Buffer, offset: number): boolean | null {
  // Procurar "BoolProperty" após o offset
  const boolPropIdx = findPattern(buffer, 'BoolProperty', offset);
  if (boolPropIdx < 0 || boolPropIdx > offset + 300) return null;

  // Após "BoolProperty\0": size(4) + arrayIndex(4) + value(1)
  // "BoolProperty" = 12 chars + null = 13 bytes
  // size = 4 bytes, arrayIndex = 4 bytes = 8 bytes
  // total offset from BoolProperty start = 13 + 8 = 21
  const valueOffset = boolPropIdx + 21;
  if (valueOffset >= buffer.length) return null;

  const val = buffer[valueOffset];
  return val === 1;
}

/**
 * Extrai o valor UInt32Property de uma propriedade
 */
function extractUInt32Value(buffer: Buffer, offset: number): number | null {
  // Procurar "UInt32Property" após o offset
  const uint32Idx = findPattern(buffer, 'UInt32Property', offset);
  if (uint32Idx < 0 || uint32Idx > offset + 200) return null;

  // Após "UInt32Property\0": size(4) + arrayIndex(4) + value(4)
  // "UInt32Property" = 14 chars + null = 15 bytes
  // size = 4 bytes, arrayIndex = 4 bytes = 8 bytes
  // total offset from UInt32Property start = 15 + 8 = 23
  const valueOffset = uint32Idx + 23;
  if (valueOffset + 4 > buffer.length) return null;

  return buffer.readUInt32LE(valueOffset);
}

/**
 * Analisa o save do Stellar Blade e retorna dados de conquistas
 * APENAS LEITURA - não modifica o arquivo
 */
export function parseStellarBladeSave(savePath?: string): StellarBladeSaveData | null {
  const filePath = savePath || findStellarBladeSave();
  if (!filePath || !fs.existsSync(filePath)) return null;

  // Ler arquivo (apenas leitura)
  const buffer = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);
  const text = buffer.toString('ascii');

  // Extrair Steam ID: primeiro tenta do conteúdo do arquivo, depois do nome da pasta
  let steamId = '';
  // Buscar string de 17 dígitos no final do arquivo (precedida por uint32 length=18)
  const steamIdPattern = /\d{17}/;
  const lastChunk = text.slice(-200);
  const steamMatch = lastChunk.match(steamIdPattern);
  if (steamMatch) {
    steamId = steamMatch[0];
  } else {
    // Fallback: extrair do caminho (pasta com Steam ID)
    const pathParts = filePath.replace(/\\/g, '/').split('/');
    for (const part of pathParts) {
      if (/^\d{17}$/.test(part)) {
        steamId = part;
        break;
      }
    }
  }

  // === TROPHY FLAGS ===
  const trophies: StellarBladeTrophy[] = [];
  const trophyNames = Object.keys(TROPHY_MAP);

  for (const name of trophyNames) {
    const idx = text.indexOf(name + '\0');
    if (idx < 0) continue;

    // Extrair bCompleted (BoolProperty)
    const bCompleted = extractBoolValue(buffer, idx + name.length + 1) ?? false;

    // Extrair ProgressValue (UInt32Property) - opcional
    const progressValue = extractUInt32Value(buffer, idx + name.length + 1) ?? 0;

    trophies.push({
      name,
      steamAchievement: TROPHY_MAP[name],
      bCompleted,
      progressValue,
    });
  }

  // === QUEST COMPLETIONS ===
  const questCompletions: string[] = [];
  const questPattern = /Complete_Quest_[A-Za-z0-9_]+/g;
  let match: RegExpExecArray | null;
  const seenQuests = new Set<string>();

  while ((match = questPattern.exec(text)) !== null) {
    if (!seenQuests.has(match[0])) {
      seenQuests.add(match[0]);
      questCompletions.push(match[0]);
    }
  }

  // === ENDINGS ===
  const endings = {
    killElder: text.includes('EndingTimeStamp_KillElder') && buffer[text.indexOf('EndingTimeStamp_KillElder') - 1] !== 0,
    killLily: text.includes('EndingTimeStamp_KillLily') && buffer[text.indexOf('EndingTimeStamp_KillLily') - 1] !== 0,
    saveLily: text.includes('EndingTimeStamp_SaveLily') && buffer[text.indexOf('EndingTimeStamp_SaveLily') - 1] !== 0,
  };

  // === NEW GAME PLUS ===
  let newGamePlusCount = 0;
  const ngpIdx = text.indexOf('NewGamePlusPlayCount');
  if (ngpIdx >= 0) {
    // Procurar UInt32Property após NewGamePlusPlayCount
    const uint32Idx = findPattern(buffer, 'UInt32Property', ngpIdx);
    if (uint32Idx >= 0 && uint32Idx < ngpIdx + 200) {
      // "UInt32Property" = 15 bytes + size(4) + arrayIndex(4) = 23 bytes
      const valueOffset = uint32Idx + 23;
      if (valueOffset + 4 <= buffer.length) {
        newGamePlusCount = buffer.readUInt32LE(valueOffset);
      }
    }
  }

  return {
    steamId,
    savePath: filePath,
    lastModified: stats.mtime.toISOString(),
    fileSize: stats.size,
    trophies,
    questCompletions,
    endings,
    newGamePlusCount,
  };
}

/**
 * Verifica se um save do Stellar Blade existe
 */
export function hasStellarBladeSave(): boolean {
  return findStellarBladeSave() !== null;
}
