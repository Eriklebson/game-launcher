import { useState, useEffect } from 'react'
import { FiPlay, FiArrowLeft, FiAward, FiClock, FiFolder, FiMonitor, FiTrash2, FiExternalLink } from 'react-icons/fi'
import { Game, SteamStoreInfo, CachedAchievement, PlaySession } from '../../types'
import StellarBladeAchievements from '../components/StellarBladeAchievements'

interface GameDetailProps {
  game: Game
  onBack: () => void
  onLaunch: (game: Game) => void
  onDelete: (id: string) => void
  onAchievementsLoaded?: (gameName: string, achievements: { apiname: string; achieved: number; name: string; description: string; icon?: string }[]) => void
}

const PLATFORM_COLORS: Record<string, string> = {
  steam: '#66c0f4',
  epic: '#a855f7',
  xbox: '#22c55e',
  gog: '#c084fc',
  mods: '#f97316',
  other: '#64748b',
}

const PLATFORM_LABELS: Record<string, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  xbox: 'Xbox / Microsoft Store',
  gog: 'GOG',
  mods: 'Mods & Ferramentas',
  other: 'Jogo Local',
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}

export default function GameDetail({ game, onBack, onLaunch, onDelete, onAchievementsLoaded }: GameDetailProps) {
  const [cachedAchievements, setCachedAchievements] = useState<CachedAchievement[]>([])
  const [storeInfo, setStoreInfo] = useState<SteamStoreInfo | null>(null)
  const [loadingStore, setLoadingStore] = useState(false)
  const [playSessions, setPlaySessions] = useState<PlaySession[]>([])
  const [activeScreenshot, setActiveScreenshot] = useState(0)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [showSysReq, setShowSysReq] = useState(false)

  useEffect(() => {
    loadPlaySessions()
    if (game.steamAppId) {
      loadCachedAchievements()
      loadStoreInfo()
    }
  }, [game.id, game.steamAppId])

  const loadCachedAchievements = async () => {
    try {
      const cached = await window.electronAPI.getCachedAchievements(game.id)
      setCachedAchievements(cached)
      // Notify parent about loaded achievements for notification detection
      if (onAchievementsLoaded && cached.length > 0) {
        onAchievementsLoaded(game.name, cached)
      }
    } catch (e) {
      console.error('Error loading cached achievements:', e)
    }
  }

  const loadStoreInfo = async () => {
    if (!game.steamAppId) return
    try {
      setLoadingStore(true)
      const info = await window.electronAPI.getSteamStoreInfo(game.steamAppId)
      setStoreInfo(info)
    } catch (e) {
      console.error('Error loading store info:', e)
    } finally {
      setLoadingStore(false)
    }
  }

  const loadPlaySessions = async () => {
    try {
      const sessions = await window.electronAPI.getPlaySessions(game.id)
      setPlaySessions(sessions)
    } catch (e) {
      console.error('Error loading play sessions:', e)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca jogado'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const achievementProgress = cachedAchievements.length > 0
    ? Math.round((cachedAchievements.filter(a => a.achieved === 1).length / cachedAchievements.length) * 100)
    : 0

  const displayAchievements = cachedAchievements.length > 0 ? cachedAchievements : null
  const displayAchieved = cachedAchievements.filter(a => a.achieved === 1).length
  const displayTotalAchievements = cachedAchievements.length

  const shortPath = (p: string) => {
    const parts = p.split(/[/\\]/)
    return parts.length > 3 ? '...' + parts.slice(-3).join('\\') : p
  }

  const headerImage = storeInfo?.header_image || game.coverImage
  const screenshots = storeInfo?.screenshots || []

  return (
    <div className="h-full overflow-auto scroll-smooth">
      {/* ===== HERO BANNER ===== */}
      <div className="relative h-56 sm:h-64 md:h-80 overflow-hidden">
        {headerImage ? (
          <>
            <img
              src={headerImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 backdrop-blur-2xl bg-steam-dark/40" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-steam-card via-steam-darker to-steam-darkest" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-steam-dark via-steam-dark/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-steam-dark/90 via-steam-dark/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 bg-black/40 hover:bg-black/60 text-white/90 hover:text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-all backdrop-blur-md z-10 border border-white/10"
        >
          <FiArrowLeft size={14} />
          <span className="hidden sm:inline">Biblioteca</span>
        </button>

        {/* Game title section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6">
          <div className="flex items-end gap-3 sm:gap-5 max-w-6xl mx-auto">
            {/* Capsule cover - hidden on very small screens */}
            {game.coverImage && (
              <div className="w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-40 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/10 hidden sm:block transition-transform hover:scale-105">
                <img src={game.coverImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-white mb-1 sm:mb-2 drop-shadow-xl leading-tight tracking-tight">
                {game.name}
              </h1>

              {storeInfo && (
                <p className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2.5 font-medium hidden sm:block">
                  {storeInfo.developers?.join(', ')}
                  {storeInfo.publishers?.length > 0 && storeInfo.publishers[0] !== storeInfo.developers?.[0] && (
                    <span className="text-white/40"> · Publicado por {storeInfo.publishers.join(', ')}</span>
                  )}
                </p>
              )}

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-bold text-white shadow-lg"
                  style={{ backgroundColor: PLATFORM_COLORS[game.platform || 'other'] }}
                >
                  {PLATFORM_LABELS[game.platform || 'other']}
                </span>
                {storeInfo?.genres && storeInfo.genres.slice(0, 2).map(g => (
                  <span key={g.id} className="text-[10px] sm:text-[11px] text-white/50 bg-white/10 backdrop-blur-sm px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-medium hidden sm:inline">
                    {g.description}
                  </span>
                ))}
                {storeInfo?.metacritic && (
                  <span className="text-[10px] sm:text-[11px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow-lg">
                    MC {storeInfo.metacritic.score}
                  </span>
                )}
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={() => onLaunch(game)}
              className="flex items-center gap-1.5 sm:gap-2 bg-steam-green hover:bg-steam-green/90 text-steam-dark px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 rounded-xl font-bold text-sm sm:text-base md:text-lg transition-all shadow-lg hover:shadow-glow-green hover:scale-105 flex-shrink-0 active:scale-95"
            >
              <FiPlay size={16} fill="currentColor" className="sm:hidden" />
              <FiPlay size={20} fill="currentColor" className="hidden sm:block" />
              {game.platform === 'mods' ? 'Abrir' : 'Jogar'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* ===== MAIN COLUMN ===== */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">

            {/* Screenshots carousel */}
            {screenshots.length > 0 && (
              <div className="rounded-xl overflow-hidden animate-fade-in">
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-lg">
                  <img
                    src={screenshots[activeScreenshot]?.path_full}
                    alt={`Screenshot ${activeScreenshot + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {screenshots.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveScreenshot(prev => prev > 0 ? prev - 1 : screenshots.length - 1)}
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm text-sm"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setActiveScreenshot(prev => prev < screenshots.length - 1 ? prev + 1 : 0)}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm text-sm"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
                {screenshots.length > 1 && (
                  <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3 overflow-x-auto pb-2">
                    {screenshots.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveScreenshot(i)}
                        className={`flex-shrink-0 w-20 h-14 sm:w-28 sm:h-18 md:w-32 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          i === activeScreenshot
                            ? 'border-steam-blue shadow-glow-blue scale-105'
                            : 'border-transparent opacity-50 hover:opacity-100 hover:border-white/20'
                        }`}
                      >
                        <img
                          src={s.path_600 || s.path_thousand || s.path_full}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = s.path_full
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {storeInfo && (
              <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.03] animate-fade-in">
                <h2 className="text-base sm:text-lg font-bold text-steam-light mb-2 sm:mb-3">Sobre o jogo</h2>
                <div className="text-xs sm:text-sm text-steam-text/70 leading-relaxed">
                  {showFullDesc ? (
                    <div dangerouslySetInnerHTML={{ __html: storeInfo.detailed_description || storeInfo.short_description }} />
                  ) : (
                    <p>{stripHtml(storeInfo.short_description)}</p>
                  )}
                </div>
                {storeInfo.detailed_description && storeInfo.detailed_description.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-steam-blue text-xs sm:text-sm mt-2 sm:mt-3 hover:text-steam-blue/80 font-medium transition-colors"
                  >
                    {showFullDesc ? '← Mostrar menos' : 'Ler mais →'}
                  </button>
                )}
              </div>
            )}

            {/* Achievements Section */}
            {game.platform === 'steam' && game.steamAppId && (
              <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.03] animate-fade-in">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-steam-light flex items-center gap-2">
                    <FiAward className="text-steam-blue" />
                    Conquistas Steam
                  </h2>
                  {displayAchievements && (
                    <span className="text-xs sm:text-sm text-steam-text-secondary font-medium">
                      {displayAchieved}/{displayTotalAchievements}
                    </span>
                  )}
                </div>

                {displayAchievements && displayAchievements.length > 0 ? (
                  <>
                    {/* Progress bar */}
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] sm:text-xs text-steam-text-secondary/60">Progresso total</span>
                        <span className="text-[10px] sm:text-xs font-bold text-steam-blue">{achievementProgress}%</span>
                      </div>
                      <div className="w-full h-2 sm:h-2.5 bg-steam-darker/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-steam-blue to-steam-blue/80 rounded-full transition-all duration-700 ease-out shadow-sm"
                          style={{ width: `${achievementProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Achievement grid */}
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-auto pr-1">
                      {displayAchievements.map((ach, i) => (
                        <div
                          key={'apiname' in ach ? ach.apiname : i}
                          className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all duration-200 ${
                            ach.achieved === 1
                              ? 'bg-steam-blue/10 border border-steam-blue/20 shadow-sm'
                              : 'bg-steam-darker/40 opacity-50 hover:opacity-70'
                          }`}
                        >
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            ach.achieved === 1 ? 'bg-steam-blue/20' : 'bg-white/5'
                          }`}>
                            <FiAward size={14} className={ach.achieved === 1 ? 'text-steam-blue' : 'text-steam-text/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs sm:text-sm truncate font-medium ${ach.achieved === 1 ? 'text-steam-light' : 'text-steam-text/50'}`}>
                              {ach.name}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-steam-text-secondary/50 truncate">{ach.description}</p>
                          </div>
                          {ach.achieved === 1 && ach.unlocktime > 0 && (
                            <span className="text-[9px] sm:text-[10px] text-steam-text-secondary/40 flex-shrink-0 font-mono">
                              {new Date(ach.unlocktime * 1000).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-xl bg-steam-darker/50 flex items-center justify-center">
                      <FiAward className="text-steam-text-secondary/30" size={18} />
                    </div>
                    <p className="text-xs sm:text-sm text-steam-text-secondary/60">
                      Este jogo não possui conquistas salvas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Stellar Blade Save-Based Achievements */}
            {game.steamAppId === '3489700' && (
              <StellarBladeAchievements gameId={game.id} />
            )}

            {/* Non-Steam games */}
            {(game.platform !== 'steam') && (
              <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.03] animate-fade-in">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-steam-darker/50 flex items-center justify-center">
                    <FiAward className="text-steam-text-secondary/30" size={14} />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-steam-light">Conquistas</h2>
                </div>
                <div className="text-center py-5 sm:py-6">
                  <p className="text-xs sm:text-sm text-steam-text-secondary/60">
                    Este jogo não foi detectado como jogo Steam.{' '}
                    {game.platform === 'xbox' ? 'Conquistas do Xbox Live não são suportadas no momento.' :
                     game.platform === 'epic' ? 'Conquistas da Epic Games Store não são suportadas no momento.' :
                     'Conquistas automáticas não estão disponíveis para este jogo.'}
                  </p>
                </div>
              </div>
            )}

            {/* System Requirements */}
            {storeInfo?.pc_requirements && (
              <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl border border-white/[0.03] overflow-hidden animate-fade-in">
                <button
                  onClick={() => setShowSysReq(!showSysReq)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <h2 className="text-base sm:text-lg font-bold text-steam-light">Requisitos do Sistema</h2>
                  <span className={`text-steam-text-secondary/40 transition-transform duration-300 ${showSysReq ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showSysReq && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-steam-text-secondary/70 space-y-3 sm:space-y-4 border-t border-white/[0.03] pt-3 sm:pt-4">
                    <div>
                      <h3 className="text-steam-light font-semibold mb-2 text-[10px] sm:text-xs uppercase tracking-wider">Mínimo</h3>
                      <div dangerouslySetInnerHTML={{ __html: storeInfo.pc_requirements.minimum }} />
                    </div>
                    {storeInfo.pc_requirements.recommended && (
                      <div>
                        <h3 className="text-steam-light font-semibold mb-2 text-[10px] sm:text-xs uppercase tracking-wider">Recomendado</h3>
                        <div dangerouslySetInnerHTML={{ __html: storeInfo.pc_requirements.recommended }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== SIDEBAR ===== */}
          <div className="space-y-3 sm:space-y-4">

            {/* Info card */}
            <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.03] animate-fade-in">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-steam-text-secondary/50 mb-3 sm:mb-4 uppercase tracking-wider">Informações do Jogo</h3>
              <div className="space-y-2.5 sm:space-y-3.5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-steam-darker/50 flex items-center justify-center flex-shrink-0">
                    <FiMonitor size={12} className="text-steam-text-secondary/50" />
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] text-steam-text-secondary/40 uppercase tracking-wider">Plataforma</p>
                    <p className="text-xs sm:text-sm text-steam-light font-medium">{PLATFORM_LABELS[game.platform || 'other']}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-steam-darker/50 flex items-center justify-center flex-shrink-0">
                    <FiClock size={12} className="text-steam-text-secondary/50" />
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] text-steam-text-secondary/40 uppercase tracking-wider">Tempo Total</p>
                    <p className="text-xs sm:text-sm text-steam-light font-medium">{formatMinutes(game.playTime || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-steam-darker/50 flex items-center justify-center flex-shrink-0">
                    <FiClock size={12} className="text-steam-text-secondary/50" />
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] text-steam-text-secondary/40 uppercase tracking-wider">Última vez jogado</p>
                    <p className="text-xs sm:text-sm text-steam-light font-medium">{formatDate(game.lastPlayed)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-steam-darker/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiFolder size={12} className="text-steam-text-secondary/50" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-steam-text-secondary/40 uppercase tracking-wider">Local</p>
                    <p className="text-[10px] sm:text-[11px] text-steam-text-secondary/70 break-all leading-relaxed font-mono" title={game.executablePath}>
                      {shortPath(game.executablePath)}
                    </p>
                  </div>
                </div>
                {storeInfo?.is_free !== undefined && (
                  <div className="pt-2.5 sm:pt-3 border-t border-white/[0.03]">
                    <p className="text-[9px] sm:text-[10px] text-steam-text-secondary/40 uppercase tracking-wider">Preço</p>
                    <p className="text-xs sm:text-sm text-steam-green font-bold">
                      {storeInfo.is_free ? 'Gratuito' : storeInfo.price_overview?.final_formatted || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Play Sessions */}
            {playSessions.length > 0 && (
              <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.03] animate-fade-in">
                <h3 className="text-[10px] sm:text-[11px] font-bold text-steam-text-secondary/50 mb-2.5 sm:mb-3 uppercase tracking-wider">
                  Sessões Recentes ({playSessions.length})
                </h3>
                <div className="space-y-1 sm:space-y-1.5 max-h-40 sm:max-h-48 overflow-auto">
                  {playSessions.slice(0, 10).map(session => (
                    <div key={session.id} className="flex justify-between items-center text-[10px] sm:text-xs py-1 sm:py-1.5 border-b border-white/[0.02] last:border-0">
                      <span className="text-steam-text-secondary/50 font-mono text-[10px] sm:text-[11px]">
                        {new Date(session.start_time).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-steam-text-secondary/70 font-medium">
                        {formatMinutes(session.duration_minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories & Features */}
            {storeInfo?.categories && storeInfo.categories.length > 0 && (
              <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.03] animate-fade-in">
                <h3 className="text-[10px] sm:text-[11px] font-bold text-steam-text-secondary/50 mb-2.5 sm:mb-3 uppercase tracking-wider">Recursos</h3>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {storeInfo.categories.map(c => (
                    <span key={c.id} className="text-[10px] sm:text-[11px] bg-steam-darker/50 text-steam-text-secondary/70 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium">
                      {c.description}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* DLC */}
            {storeInfo?.dlc && storeInfo.dlc.length > 0 && (
              <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.03] animate-fade-in">
                <h3 className="text-[10px] sm:text-[11px] font-bold text-steam-text-secondary/50 mb-1.5 sm:mb-2 uppercase tracking-wider">
                  DLC Disponível ({storeInfo.dlc.length})
                </h3>
                <p className="text-[10px] sm:text-[11px] text-steam-text-secondary/50">
                  {storeInfo.dlc.length} DLCs na Steam Store
                </p>
              </div>
            )}

            {/* Link to Steam Store */}
            {game.steamAppId && (
              <a
                href={`https://store.steampowered.com/app/${game.steamAppId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs sm:text-sm text-steam-blue/80 hover:text-steam-blue font-medium transition-colors p-2.5 sm:p-3 bg-steam-card/40 rounded-xl border border-white/[0.03] hover:border-steam-blue/20"
              >
                <FiExternalLink size={13} />
                Ver na Steam Store
              </a>
            )}

            {/* Actions */}
            <div className="bg-steam-card/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/[0.03] space-y-2 animate-fade-in">
              <button
                onClick={() => onLaunch(game)}
                className="w-full flex items-center justify-center gap-2 bg-steam-green hover:bg-steam-green/90 text-steam-dark py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow-glow-green active:scale-[0.98]"
              >
                <FiPlay size={14} fill="currentColor" />
                {game.platform === 'mods' ? 'Abrir' : 'Jogar Agora'}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remover "${game.name}" da biblioteca?`)) {
                    onDelete(game.id)
                    onBack()
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border border-red-500/10"
              >
                <FiTrash2 size={13} />
                Remover
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
