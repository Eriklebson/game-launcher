import { useState, useEffect } from 'react'
import { FiPlay, FiArrowLeft, FiAward, FiClock, FiFolder, FiMonitor, FiTrash2, FiExternalLink } from 'react-icons/fi'
import { Game, SteamStoreInfo, CachedAchievement, PlaySession } from '../../types'
import StellarBladeAchievements from '../components/StellarBladeAchievements'

interface GameDetailProps {
  game: Game
  onBack: () => void
  onLaunch: (game: Game) => void
  onDelete: (id: string) => void
}

const PLATFORM_COLORS: Record<string, string> = {
  steam: '#1b2838',
  epic: '#2d2d2d',
  xbox: '#107c10',
  gog: '#86328a',
  mods: '#e67e22',
  other: '#34495e',
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

export default function GameDetail({ game, onBack, onLaunch, onDelete }: GameDetailProps) {
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

  const totalPlayTime = (game.playTime || 0) + (game.lastPlayed ? 0 : 0)

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
    <div className="h-full overflow-auto">
      {/* ===== HERO BANNER (Steam style) ===== */}
      <div className="relative h-80 overflow-hidden">
        {headerImage ? (
          <img
            src={headerImage}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-steam-card to-steam-darker" />
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-steam-dark via-steam-dark/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-steam-dark/80 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white px-3 py-2 rounded text-sm transition-colors backdrop-blur-sm z-10"
        >
          <FiArrowLeft size={16} />
          Sua Biblioteca
        </button>

        {/* Game title section */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-6 max-w-6xl mx-auto">
            {/* Small capsule cover */}
            {game.coverImage && (
              <div className="w-28 h-40 rounded overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 hidden md:block">
                <img src={game.coverImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-4xl font-black text-white mb-2 drop-shadow-lg leading-tight">{game.name}</h1>

              {storeInfo && (
                <p className="text-sm text-white/70 mb-2">
                  {storeInfo.developers?.join(', ')}
                  {storeInfo.publishers?.length > 0 && storeInfo.publishers[0] !== storeInfo.developers?.[0] && (
                    <> · Publicado por {storeInfo.publishers.join(', ')}</>
                  )}
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: PLATFORM_COLORS[game.platform || 'other'] }}
                >
                  {PLATFORM_LABELS[game.platform || 'other']}
                </span>
                {storeInfo?.genres && storeInfo.genres.slice(0, 3).map(g => (
                  <span key={g.id} className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded">
                    {g.description}
                  </span>
                ))}
                {storeInfo?.release_date?.date && (
                  <span className="text-xs text-white/50">
                    {storeInfo.release_date.date}
                  </span>
                )}
                {storeInfo?.metacritic && (
                  <span className="text-xs font-bold bg-yellow-500 text-black px-2 py-0.5 rounded">
                    MC {storeInfo.metacritic.score}
                  </span>
                )}
              </div>
            </div>

            {/* Play Button */}
            <button
              onClick={() => onLaunch(game)}
              className="flex items-center gap-2 bg-steam-green hover:bg-steam-green/80 text-steam-dark px-8 py-3.5 rounded font-bold text-lg transition-colors shadow-lg flex-shrink-0"
            >
              <FiPlay size={22} fill="currentColor" />
              {game.platform === 'mods' ? 'Abrir' : 'Jogar'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ===== MAIN COLUMN (2/3 width) ===== */}
          <div className="lg:col-span-2 space-y-6">

            {/* Screenshots carousel */}
            {screenshots.length > 0 && (
              <div className="rounded-lg overflow-hidden">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <img
                    src={screenshots[activeScreenshot]?.path_full}
                    alt={`Screenshot ${activeScreenshot + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {screenshots.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveScreenshot(prev => prev > 0 ? prev - 1 : screenshots.length - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setActiveScreenshot(prev => prev < screenshots.length - 1 ? prev + 1 : 0)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
                {screenshots.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {screenshots.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveScreenshot(i)}
                        className={`flex-shrink-0 w-32 h-20 rounded overflow-hidden border-2 transition-colors ${
                          i === activeScreenshot ? 'border-steam-blue' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={s.path_medium || s.path_600} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {storeInfo && (
              <div className="bg-steam-card rounded-lg p-5">
                <h2 className="text-lg font-semibold text-steam-light mb-3">Sobre o jogo</h2>
                <div className="text-sm text-steam-text/70 leading-relaxed">
                  {showFullDesc ? (
                    <div dangerouslySetInnerHTML={{ __html: storeInfo.detailed_description || storeInfo.short_description }} />
                  ) : (
                    <p>{stripHtml(storeInfo.short_description)}</p>
                  )}
                </div>
                {storeInfo.detailed_description && storeInfo.detailed_description.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-steam-blue text-sm mt-2 hover:underline"
                  >
                    {showFullDesc ? 'Mostrar menos' : 'Ler mais'}
                  </button>
                )}
              </div>
            )}

            {/* Achievements Section */}
            {game.platform === 'steam' && game.steamAppId && (
              <div className="bg-steam-card rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-steam-light flex items-center gap-2">
                    <FiAward className="text-steam-blue" />
                    Conquistas Steam
                  </h2>
                  {displayAchievements && (
                    <span className="text-sm text-steam-text/60">
                      {displayAchieved}/{displayTotalAchievements}
                    </span>
                  )}
                </div>

                {displayAchievements && displayAchievements.length > 0 ? (
                  <>
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-steam-text/40">Progresso total</span>
                        <span className="text-xs font-medium text-steam-blue">{achievementProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-steam-darker rounded-full overflow-hidden">
                        <div
                          className="h-full bg-steam-blue rounded-full transition-all duration-700"
                          style={{ width: `${achievementProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Achievement grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-auto pr-1">
                      {displayAchievements.map((ach, i) => (
                        <div
                          key={'apiname' in ach ? ach.apiname : i}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            ach.achieved === 1
                              ? 'bg-steam-blue/10 border border-steam-blue/20'
                              : 'bg-steam-darker/50 opacity-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                            ach.achieved === 1 ? 'bg-steam-blue/20' : 'bg-white/5'
                          }`}>
                            <FiAward size={16} className={ach.achieved === 1 ? 'text-steam-blue' : 'text-steam-text/30'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${ach.achieved === 1 ? 'text-steam-light' : 'text-steam-text/50'}`}>
                              {ach.name}
                            </p>
                            <p className="text-xs text-steam-text/30 truncate">{ach.description}</p>
                          </div>
                          {ach.achieved === 1 && ach.unlocktime > 0 && (
                            <span className="text-[10px] text-steam-text/30 flex-shrink-0">
                              {new Date(ach.unlocktime * 1000).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-steam-text/50">
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
              <div className="bg-steam-card rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <FiAward className="text-steam-text/30" size={20} />
                  <h2 className="text-lg font-semibold text-steam-light">Conquistas</h2>
                </div>
                <div className="text-center py-8">
                  <p className="text-sm text-steam-text/50">
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
              <div className="bg-steam-card rounded-lg p-5">
                <button
                  onClick={() => setShowSysReq(!showSysReq)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-lg font-semibold text-steam-light">Requisitos do Sistema</h2>
                  <span className="text-steam-text/40">{showSysReq ? '▲' : '▼'}</span>
                </button>
                {showSysReq && (
                  <div className="mt-4 text-sm text-steam-text/60 space-y-4">
                    <div>
                      <h3 className="text-steam-light font-medium mb-1">Mínimo:</h3>
                      <div dangerouslySetInnerHTML={{ __html: storeInfo.pc_requirements.minimum }} />
                    </div>
                    {storeInfo.pc_requirements.recommended && (
                      <div>
                        <h3 className="text-steam-light font-medium mb-1">Recomendado:</h3>
                        <div dangerouslySetInnerHTML={{ __html: storeInfo.pc_requirements.recommended }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== SIDEBAR (1/3 width) ===== */}
          <div className="space-y-4">

            {/* Info card */}
            <div className="bg-steam-card rounded-lg p-5">
              <h3 className="text-sm font-semibold text-steam-light mb-3 uppercase tracking-wider opacity-60">Informações do Jogo</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiMonitor size={16} className="text-steam-text/40 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-steam-text/40">Plataforma</p>
                    <p className="text-sm text-steam-light">{PLATFORM_LABELS[game.platform || 'other']}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FiClock size={16} className="text-steam-text/40 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-steam-text/40">Tempo Total</p>
                    <p className="text-sm text-steam-light">{formatMinutes(game.playTime || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FiClock size={16} className="text-steam-text/40 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-steam-text/40">Última vez jogado</p>
                    <p className="text-sm text-steam-light">{formatDate(game.lastPlayed)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiFolder size={16} className="text-steam-text/40 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-steam-text/40">Local</p>
                    <p className="text-xs text-steam-light break-all leading-relaxed" title={game.executablePath}>
                      {shortPath(game.executablePath)}
                    </p>
                  </div>
                </div>
                {storeInfo?.is_free !== undefined && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-steam-text/40">Preço</p>
                    <p className="text-sm text-steam-light">
                      {storeInfo.is_free ? 'Gratuito' : storeInfo.price_overview?.final_formatted || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Play Sessions */}
            {playSessions.length > 0 && (
              <div className="bg-steam-card rounded-lg p-5">
                <h3 className="text-sm font-semibold text-steam-light mb-3 uppercase tracking-wider opacity-60">
                  Sessões Recentes ({playSessions.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {playSessions.slice(0, 10).map(session => (
                    <div key={session.id} className="flex justify-between items-center text-xs">
                      <span className="text-steam-text/50">
                        {new Date(session.start_time).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-steam-text/70 font-medium">
                        {formatMinutes(session.duration_minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories & Features */}
            {storeInfo?.categories && storeInfo.categories.length > 0 && (
              <div className="bg-steam-card rounded-lg p-5">
                <h3 className="text-sm font-semibold text-steam-light mb-3 uppercase tracking-wider opacity-60">Recursos</h3>
                <div className="flex flex-wrap gap-2">
                  {storeInfo.categories.map(c => (
                    <span key={c.id} className="text-xs bg-white/5 text-steam-text/70 px-2 py-1 rounded">
                      {c.description}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* DLC */}
            {storeInfo?.dlc && storeInfo.dlc.length > 0 && (
              <div className="bg-steam-card rounded-lg p-5">
                <h3 className="text-sm font-semibold text-steam-light mb-3 uppercase tracking-wider opacity-60">
                  DLC Disponível ({storeInfo.dlc.length})
                </h3>
                <p className="text-xs text-steam-text/40">
                  {storeInfo.dlc.length} DLCs disponíveis na Steam Store
                </p>
              </div>
            )}

            {/* Link to Steam Store */}
            {game.steamAppId && (
              <div className="bg-steam-card rounded-lg p-5">
                <a
                  href={`https://store.steampowered.com/app/${game.steamAppId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-steam-blue hover:underline"
                >
                  <FiExternalLink size={14} />
                  Ver na Steam Store
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="bg-steam-card rounded-lg p-5 space-y-2">
              <button
                onClick={() => onLaunch(game)}
                className="w-full flex items-center justify-center gap-2 bg-steam-green hover:bg-steam-green/80 text-steam-dark py-2.5 rounded font-semibold text-sm transition-colors"
              >
                <FiPlay size={16} />
                {game.platform === 'mods' ? 'Abrir' : 'Jogar Agora'}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remover "${game.name}" da biblioteca?`)) {
                    onDelete(game.id)
                    onBack()
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 py-2.5 rounded text-sm transition-colors"
              >
                <FiTrash2 size={16} />
                Remover da Biblioteca
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
