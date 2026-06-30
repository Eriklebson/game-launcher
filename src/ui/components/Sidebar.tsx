import { FiGrid, FiPlus, FiRefreshCw, FiTool } from 'react-icons/fi'

type Page = 'library' | 'mods' | 'add-game'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  gameCount: number
  modsCount: number
  scanning: boolean
  onRescan: () => void
}

export default function Sidebar({ currentPage, onNavigate, gameCount, modsCount, scanning, onRescan }: SidebarProps) {
  const menuItems: { page: Page; icon: React.ReactNode; label: string; count?: number }[] = [
    { page: 'library', icon: <FiGrid size={20} />, label: 'Biblioteca', count: gameCount },
    { page: 'mods', icon: <FiTool size={20} />, label: 'Mods', count: modsCount },
    { page: 'add-game', icon: <FiPlus size={20} />, label: 'Adicionar Jogo' },
  ]

  return (
    <aside className="w-56 bg-steam-darker flex flex-col border-r border-white/5">
      <nav className="flex-1 py-4">
        {menuItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
              currentPage === item.page
                ? 'bg-steam-blue/20 text-steam-blue border-l-2 border-steam-blue'
                : 'text-steam-text hover:bg-white/5 border-l-2 border-transparent'
            }`}
          >
            {item.icon}
            <span className="text-sm flex-1 text-left">{item.label}</span>
            {item.count !== undefined && (
              <span className="text-xs text-steam-text/40">{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={onRescan}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-steam-card hover:bg-steam-hover disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-steam-text transition-colors"
        >
          <FiRefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Escaneando...' : 'Varrer Jogos'}
        </button>
      </div>
    </aside>
  )
}
