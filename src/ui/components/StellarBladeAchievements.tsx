import { useState, useEffect } from 'react'
import { FiAward, FiRefreshCw, FiCheck, FiX, FiDatabase } from 'react-icons/fi'
import { StellarBladeSaveData, StellarBladeTrophy } from '../../types'

interface StellarBladeAchievementsProps {
  gameId: string;
}

const TROPHY_ICONS: Record<string, string> = {
  Trophy_Platinum: '🏆',
  Trophy_Activate_FirstCamp: '⛺',
  Trophy_Activate_AllCamp: '🏕️',
  Trophy_KillCharacter: '⚔️',
  Trophy_KillCharacter_Brute: '👹',
  Trophy_KillCharacter_AllNative: '👾',
  Trophy_Acquire_AllNanoSuit: '👗',
  Trophy_Acquire_AllSkill: '🎯',
  Trophy_Acquire_AllSkill_v2: '♾️',
  Trophy_Acquire_AllCan: '🥫',
  Trophy_Acquire_AllRecords: '📋',
  Trophy_Open_AllBox: '📦',
  Trophy_CompleteLevel_AltesLabor: '🔬',
  Trophy_LevelUpMax_AllExoSpine: '🦾',
  Trophy_WeaponMaxUpgrade: '🗡️',
  Trophy_TumblerMaxUpgrade: '💊',
  Trophy_BodyMaxUpgrade: '💪',
  Trophy_BetaMaxUpgrade: '⚡',
  Trophy_UseItem_Gold_At_Shop: '🛒',
  Trophy_CharKill_BetaSkill: '💥',
  Trophy_CharKill_BurstSkill: '🔥',
  Trophy_CharKill_RangeSkill: '🎯',
  Trophy_CharKill_AssassinationSkills: '🗡️',
  Trophy_JustEvade: '💨',
  Trophy_JustParry: '🛡️',
}

export default function StellarBladeAchievements({ gameId }: StellarBladeAchievementsProps) {
  const [saveData, setSaveData] = useState<StellarBladeSaveData | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSave, setHasSave] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkSave()
  }, [gameId])

  const checkSave = async () => {
    try {
      const exists = await window.electronAPI.hasStellarBladeSave()
      setHasSave(exists)
      if (exists) {
        loadSave()
      }
    } catch (e) {
      console.error('Error checking Stellar Blade save:', e)
    }
  }

  const loadSave = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await window.electronAPI.parseStellarBladeSave()
      setSaveData(data)
    } catch (e) {
      setError('Erro ao ler o save do Stellar Blade')
      console.error('Error parsing Stellar Blade save:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!hasSave) {
    return (
      <div className="bg-steam-card rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <FiAward className="text-steam-text/30" size={20} />
          <h2 className="text-lg font-semibold text-steam-light">Stellar Blade Achievements</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-steam-text/50">
            Save do Stellar Blade não encontrado.
          </p>
          <p className="text-xs text-steam-text/30 mt-2">
            Certifique-se de que o jogo está instalado e já foi aberto pelo menos uma vez.
          </p>
        </div>
      </div>
    )
  }

  const completedCount = saveData?.trophies.filter(t => t.bCompleted).length ?? 0
  const totalCount = saveData?.trophies.length ?? 0
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="bg-steam-card rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-steam-light flex items-center gap-2">
          <FiAward className="text-steam-blue" />
          Stellar Blade Achievements
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-steam-text/60">
            {completedCount}/{totalCount}
          </span>
          <button
            onClick={loadSave}
            disabled={loading}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="Atualizar"
          >
            <FiRefreshCw size={14} className={`text-steam-text/40 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-steam-text/40">Progresso</span>
          <span className="text-xs font-medium text-steam-blue">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-steam-darker rounded-full overflow-hidden">
          <div
            className="h-full bg-steam-blue rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {loading && !saveData ? (
        <div className="flex items-center justify-center py-8 gap-3">
          <div className="w-5 h-5 border-2 border-steam-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-steam-text/60">Lendo save...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={loadSave}
            className="mt-3 px-4 py-2 bg-steam-blue/20 hover:bg-steam-blue/30 text-steam-blue rounded text-sm font-medium transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : saveData ? (
        <>
          {/* Save info */}
          <div className="flex items-center gap-4 mb-4 text-xs text-steam-text/40">
            <span className="flex items-center gap-1">
              <FiDatabase size={12} />
              Steam ID: {saveData.steamId}
            </span>
            <span>NG+: {saveData.newGamePlusCount}</span>
          </div>

          {/* Trophy grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-auto pr-1">
            {saveData.trophies.map((trophy) => (
              <TrophyCard key={trophy.name} trophy={trophy} />
            ))}
          </div>

          {/* Endings section */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-semibold text-steam-light mb-2">Endings</h3>
            <div className="flex flex-wrap gap-2">
              <EndingBadge label="Making New Memories" unlocked={saveData.endings.killElder} />
              <EndingBadge label="Cost of Lost Memories" unlocked={saveData.endings.killLily} />
              <EndingBadge label="Return to the Colony" unlocked={saveData.endings.saveLily} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function TrophyCard({ trophy }: { trophy: StellarBladeTrophy }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        trophy.bCompleted
          ? 'bg-steam-blue/10 border border-steam-blue/20'
          : 'bg-steam-darker/50 opacity-50'
      }`}
    >
      <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 text-lg ${
        trophy.bCompleted ? 'bg-steam-blue/20' : 'bg-white/5'
      }`}>
        {TROPHY_ICONS[trophy.name] || '🏅'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${trophy.bCompleted ? 'text-steam-light' : 'text-steam-text/50'}`}>
          {trophy.steamAchievement}
        </p>
        <p className="text-xs text-steam-text/30 truncate">{trophy.name}</p>
      </div>
      <div className="flex-shrink-0">
        {trophy.bCompleted ? (
          <FiCheck size={16} className="text-steam-green" />
        ) : (
          <FiX size={16} className="text-steam-text/20" />
        )}
      </div>
    </div>
  )
}

function EndingBadge({ label, unlocked }: { label: string; unlocked: boolean }) {
  return (
    <span className={`text-xs px-2 py-1 rounded ${
      unlocked
        ? 'bg-steam-green/20 text-steam-green border border-steam-green/30'
        : 'bg-white/5 text-steam-text/30 border border-white/5'
    }`}>
      {unlocked ? '✓' : '○'} {label}
    </span>
  )
}
