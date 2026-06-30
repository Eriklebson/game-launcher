import { useState } from 'react'
import { FiSearch, FiGrid, FiList } from 'react-icons/fi'
import GameCard from '../components/GameCard'
import { Game } from '../../types'

interface LibraryProps {
  games: Game[]
  loading: boolean
  scanning: boolean
  onLaunch: (game: Game) => void
  onDelete: (id: string) => void
  onChangePlatform: (id: string, platform: Game['platform']) => void
  onSelectGame: (game: Game) => void
  showModsTab: boolean
}

export default function Library({ games, loading, scanning, onLaunch, onDelete, onChangePlatform, onSelectGame, showModsTab }: LibraryProps) {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">{showModsTab ? '🔧' : '🎮'}</div>
          <div className="text-steam-text">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-steam-light">
            {showModsTab ? 'Mods & Ferramentas' : 'Biblioteca'}
          </h1>
          {scanning && (
            <div className="flex items-center gap-2 text-steam-blue text-sm">
              <div className="w-4 h-4 border-2 border-steam-blue border-t-transparent rounded-full animate-spin" />
              Escaneando...
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-steam-text/40" size={18} />
            <input
              type="text"
              placeholder={`Buscar ${showModsTab ? 'mods' : 'jogos'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-steam-darker border border-white/10 rounded pl-10 pr-4 py-2 text-sm text-steam-text placeholder-steam-text/40 focus:outline-none focus:border-steam-blue/50 w-64"
            />
          </div>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-steam-blue/20 text-steam-blue' : 'text-steam-text hover:bg-white/5'
            }`}
          >
            <FiGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' ? 'bg-steam-blue/20 text-steam-blue' : 'text-steam-text hover:bg-white/5'
            }`}
          >
            <FiList size={18} />
          </button>
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-steam-text/60">
          <div className="text-6xl mb-4">{showModsTab ? '🔧' : '🎮'}</div>
          <p className="text-lg">
            {showModsTab ? 'Nenhum mod encontrado' : 'Nenhum jogo encontrado'}
          </p>
          {!showModsTab && (
            <p className="text-sm mt-2">Clique em "Varrer Jogos" ou "Adicionar Jogo"</p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onLaunch={onLaunch}
              onDelete={onDelete}
              onChangePlatform={onChangePlatform}
              onSelectGame={onSelectGame}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGames.map(game => (
            <div
              key={game.id}
              onClick={() => onSelectGame(game)}
              className="flex items-center gap-4 bg-steam-card p-3 rounded hover:bg-steam-hover transition-colors group cursor-pointer"
            >
              <div className="w-16 h-12 bg-steam-darker rounded overflow-hidden flex-shrink-0">
                {game.coverImage ? (
                  <img src={game.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-steam-text/30">
                    {showModsTab ? '🔧' : '🎮'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-steam-light truncate">{game.name}</h3>
                <p className="text-xs text-steam-text/60">
                  {game.platform?.toUpperCase() || 'Local'} · {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString('pt-BR') : 'Nunca jogado'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onLaunch(game)
                }}
                className="opacity-0 group-hover:opacity-100 flex items-center gap-2 bg-steam-green hover:bg-steam-green/80 text-steam-dark px-3 py-1.5 rounded text-sm font-semibold transition-all"
              >
                {showModsTab ? 'Abrir' : 'Jogar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
