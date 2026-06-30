import { useState } from 'react'
import { FiPlay, FiTrash2, FiClock, FiChevronDown } from 'react-icons/fi'
import { Game } from '../../types'

interface GameCardProps {
  game: Game
  onLaunch: (game: Game) => void
  onDelete: (id: string) => void
  onChangePlatform: (id: string, platform: Game['platform']) => void
  onSelectGame: (game: Game) => void
}

const PLATFORM_COLORS: Record<string, string> = {
  steam: 'bg-steam-blue',
  epic: 'bg-purple-500',
  xbox: 'bg-steam-green',
  gog: 'bg-indigo-500',
  mods: 'bg-steam-orange',
  other: 'bg-steam-text-secondary',
}

const PLATFORM_LABELS: Record<string, string> = {
  steam: 'Steam',
  epic: 'Epic',
  xbox: 'Xbox',
  gog: 'GOG',
  mods: 'Mods',
  other: 'Local',
}

export default function GameCard({ game, onLaunch, onDelete, onChangePlatform, onSelectGame }: GameCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca jogado'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const platforms: ('steam' | 'epic' | 'xbox' | 'gog' | 'mods' | 'other')[] = ['steam', 'epic', 'xbox', 'gog', 'mods', 'other']

  const handleClick = () => {
    onSelectGame(game)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative bg-steam-card rounded-xl overflow-visible cursor-pointer shadow-card hover:shadow-card-hover hover:scale-[1.03] transition-all duration-300 ease-out"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick() }}
    >
      {/* Cover image */}
      <div className="aspect-video bg-gradient-to-br from-steam-card to-steam-darkest relative overflow-hidden rounded-t-xl">
        {/* Shimmer loading */}
        {!imageLoaded && game.coverImage && (
          <div className="absolute inset-0 shimmer bg-steam-card" />
        )}

        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.name}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl sm:text-4xl md:text-5xl opacity-30 group-hover:scale-110 transition-transform duration-300">
              {game.platform === 'mods' ? '🔧' : '🎮'}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

        {/* Platform badge */}
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            className={`flex items-center gap-1 ${PLATFORM_COLORS[game.platform || 'other']} px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] text-white font-semibold hover:brightness-110 transition-all shadow-md`}
          >
            {PLATFORM_LABELS[game.platform || 'other']}
            <FiChevronDown size={9} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </button>
          {showMenu && (
            <div className="absolute top-full left-0 mt-1.5 bg-steam-darkest/95 backdrop-blur-md border border-white/10 rounded-lg shadow-dropdown z-50 py-1.5 min-w-[110px] sm:min-w-[120px] animate-fade-in">
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={(e) => { e.stopPropagation(); onChangePlatform(game.id, p); setShowMenu(false) }}
                  className={`w-full text-left px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm hover:bg-white/10 flex items-center gap-2 transition-colors ${game.platform === p ? 'text-steam-blue' : 'text-steam-text'}`}
                >
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${PLATFORM_COLORS[p]}`} />
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 sm:p-3 md:p-3.5">
        <h3 className="font-semibold text-steam-light truncate text-[11px] sm:text-[12px] md:text-[13px] leading-tight" title={game.name}>
          {game.name}
        </h3>
        <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] md:text-[11px] text-steam-text-secondary">
          <FiClock size={9} className="opacity-60" />
          <span>{formatDate(game.lastPlayed)}</span>
        </div>
      </div>

      {/* Hover overlay - outside image area, inside card */}
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto z-20">
        <button
          onClick={(e) => { e.stopPropagation(); onLaunch(game) }}
          className="flex items-center gap-1 bg-steam-green hover:bg-steam-green/90 text-steam-dark px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg font-semibold text-[10px] sm:text-xs transition-all shadow-lg hover:shadow-glow-green"
        >
          <FiPlay size={11} fill="currentColor" />
          Jogar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleClick() }}
          className="px-2 py-1.5 sm:px-3 sm:py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[10px] sm:text-xs font-semibold transition-all backdrop-blur-sm"
        >
          Detalhes
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`Remover "${game.name}" da biblioteca?`)) onDelete(game.id)
          }}
          className="p-1.5 sm:p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all"
        >
          <FiTrash2 size={11} />
        </button>
      </div>
    </div>
  )
}
