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
  steam: 'bg-blue-600',
  epic: 'bg-purple-600',
  xbox: 'bg-green-700',
  gog: 'bg-indigo-600',
  mods: 'bg-orange-600',
  other: 'bg-gray-600',
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
      className="group relative bg-steam-card rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-steam-blue/50 hover:scale-[1.02]"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick() }}
    >
      {/* Cover image */}
      <div className="aspect-video bg-gradient-to-br from-steam-card to-steam-darker relative">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-steam-text/30">
            {game.platform === 'mods' ? '🔧' : '🎮'}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onLaunch(game) }}
            className="flex items-center gap-2 bg-steam-green hover:bg-steam-green/80 text-steam-dark px-3 py-2 rounded font-semibold text-sm transition-colors"
          >
            <FiPlay size={14} />
            Jogar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleClick() }}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-semibold transition-colors"
          >
            Detalhes
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Remover "${game.name}" da biblioteca?`)) onDelete(game.id)
            }}
            className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors"
          >
            <FiTrash2 size={14} />
          </button>
        </div>

        {/* Platform badge */}
        <div className="absolute top-2 left-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            className={`flex items-center gap-1 ${PLATFORM_COLORS[game.platform || 'other']} px-2 py-1 rounded text-xs text-white font-medium hover:opacity-80`}
          >
            {PLATFORM_LABELS[game.platform || 'other']}
            <FiChevronDown size={12} />
          </button>
          {showMenu && (
            <div className="absolute top-full left-0 mt-1 bg-steam-darker border border-white/10 rounded shadow-lg z-50 py-1">
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={(e) => { e.stopPropagation(); onChangePlatform(game.id, p); setShowMenu(false) }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 flex items-center gap-2 ${game.platform === p ? 'text-steam-blue' : 'text-steam-text'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[p]}`} />
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-steam-light truncate" title={game.name}>{game.name}</h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-steam-text/60">
          <FiClock size={12} />
          <span>{formatDate(game.lastPlayed)}</span>
        </div>
      </div>
    </div>
  )
}
