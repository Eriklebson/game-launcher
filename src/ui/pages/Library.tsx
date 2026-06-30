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
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-steam-blue/10 flex items-center justify-center">
            <span className="text-3xl animate-pulse-soft">{showModsTab ? '🔧' : '🎮'}</span>
          </div>
          <div className="text-steam-text-secondary text-sm font-medium">Carregando biblioteca...</div>
          <div className="mt-3 flex justify-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-steam-blue animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-steam-blue animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-steam-blue animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-3 sm:p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-steam-light tracking-tight">
              {showModsTab ? 'Mods & Ferramentas' : 'Biblioteca'}
            </h1>
            <p className="text-xs sm:text-sm text-steam-text-secondary mt-0.5">
              {filteredGames.length} {filteredGames.length === 1 ? 'item' : 'itens'}
              {search && ` · Buscando "${search}"`}
            </p>
          </div>
          {scanning && (
            <div className="flex items-center gap-2 bg-steam-blue/10 text-steam-blue px-3 py-1.5 rounded-full text-xs font-medium">
              <div className="w-3 h-3 border-2 border-steam-blue border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Escaneando...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-steam-text-secondary/40" size={16} />
            <input
              type="text"
              placeholder={`Buscar ${showModsTab ? 'mods' : 'jogos'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-steam-card/80 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-steam-text placeholder-steam-text-secondary/40 focus:outline-none focus:border-steam-blue/30 focus:bg-steam-card w-full sm:w-56 transition-all"
            />
          </div>
          {/* View mode */}
          <div className="flex bg-steam-card/50 rounded-lg p-0.5 border border-white/5 flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-steam-blue/15 text-steam-blue'
                  : 'text-steam-text-secondary hover:text-steam-text'
              }`}
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-steam-blue/15 text-steam-blue'
                  : 'text-steam-text-secondary hover:text-steam-text'
              }`}
            >
              <FiList size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredGames.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-steam-card/50 flex items-center justify-center mb-4">
            <span className="text-4xl opacity-40">{showModsTab ? '🔧' : '🎮'}</span>
          </div>
          <p className="text-base sm:text-lg font-medium text-steam-text-secondary">
            {showModsTab ? 'Nenhum mod encontrado' : 'Nenhum jogo encontrado'}
          </p>
          {!showModsTab && (
            <p className="text-xs sm:text-sm text-steam-text-secondary/60 mt-2 text-center px-4">
              Clique em "Varrer Jogos" ou "Adicionar Jogo" para começar
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredGames.map((game, index) => (
            <div
              key={game.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <GameCard
                game={game}
                onLaunch={onLaunch}
                onDelete={onDelete}
                onChangePlatform={onChangePlatform}
                onSelectGame={onSelectGame}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredGames.map((game, index) => (
            <div
              key={game.id}
              onClick={() => onSelectGame(game)}
              style={{ animationDelay: `${index * 20}ms` }}
              className="flex items-center gap-3 sm:gap-4 bg-steam-card/60 hover:bg-steam-card-hover p-2.5 sm:p-3 rounded-xl transition-all duration-200 group cursor-pointer animate-fade-in border border-white/[0.02] hover:border-white/5"
            >
              <div className="w-12 h-9 sm:w-14 sm:h-10 bg-steam-darker rounded-lg overflow-hidden flex-shrink-0 shadow-inner">
                {game.coverImage ? (
                  <img src={game.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-steam-text-secondary/30 text-base sm:text-lg">
                    {showModsTab ? '🔧' : '🎮'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-steam-light truncate text-xs sm:text-sm">{game.name}</h3>
                <p className="text-[10px] sm:text-[11px] text-steam-text-secondary/60 mt-0.5">
                  {game.platform?.toUpperCase() || 'LOCAL'} · {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString('pt-BR') : 'Nunca jogado'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onLaunch(game)
                }}
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-steam-green hover:bg-steam-green/90 text-steam-dark px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-glow-green flex-shrink-0"
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
