import { useState, useEffect } from 'react'
import { FiGrid, FiPlus, FiRefreshCw, FiTool, FiMenu, FiX } from 'react-icons/fi'

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
  const [version, setVersion] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    window.electronAPI.getStats().then(stats => setVersion(stats.version))
  }, [])

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setCollapsed(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const menuItems: { page: Page; icon: React.ReactNode; label: string; count?: number }[] = [
    { page: 'library', icon: <FiGrid size={18} />, label: 'Biblioteca', count: gameCount },
    { page: 'mods', icon: <FiTool size={18} />, label: 'Mods', count: modsCount },
    { page: 'add-game', icon: <FiPlus size={18} />, label: 'Adicionar Jogo' },
  ]

  const handleNavigate = (page: Page) => {
    onNavigate(page)
    if (isMobile) setCollapsed(true)
  }

  if (collapsed) {
    return (
      <>
        {/* Hamburger button when collapsed */}
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-10 left-2 z-50 w-9 h-9 bg-steam-darker/90 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center text-steam-text-secondary hover:text-steam-blue hover:bg-steam-card transition-all shadow-lg md:hidden"
        >
          <FiMenu size={16} />
        </button>

        {/* Mobile overlay */}
        {isMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setCollapsed(true)}
          />
        )}
      </>
    )
  }

  return (
    <>
      {/* Mobile close button */}
      {isMobile && (
        <button
          onClick={() => setCollapsed(true)}
          className="fixed top-10 left-[220px] z-50 w-9 h-9 bg-steam-darker/90 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center text-steam-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shadow-lg md:hidden"
        >
          <FiX size={16} />
        </button>
      )}

      <aside className={`
        ${isMobile ? 'fixed left-0 top-9 bottom-0 z-40' : 'relative'}
        w-[220px] bg-steam-darker/95 backdrop-blur-md flex flex-col border-r border-white/5 transition-all duration-300
      `}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-steam-blue/10 flex items-center justify-center">
              <span className="text-lg">🎮</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-steam-light leading-tight">Game</h1>
              <h1 className="text-sm font-bold text-steam-blue leading-tight">Launcher</h1>
            </div>
          </div>
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-md hover:bg-white/5 text-steam-text-secondary/40 hover:text-steam-text-secondary transition-colors"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2">
          <p className="px-3 mb-2 text-[10px] font-semibold text-steam-text-secondary/50 uppercase tracking-wider">
            Navegação
          </p>
          {menuItems.map((item) => (
            <button
              key={item.page}
              onClick={() => handleNavigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 ${
                currentPage === item.page
                  ? 'bg-steam-blue/15 text-steam-blue shadow-sm'
                  : 'text-steam-text-secondary hover:bg-white/5 hover:text-steam-text'
              }`}
            >
              <span className={`transition-transform duration-200 ${currentPage === item.page ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[13px] font-medium flex-1 text-left">{item.label}</span>
              {item.count !== undefined && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                  currentPage === item.page
                    ? 'bg-steam-blue/20 text-steam-blue'
                    : 'bg-white/5 text-steam-text-secondary/60'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 space-y-2">
          <button
            onClick={onRescan}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-steam-card/80 hover:bg-steam-card-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm text-steam-text-secondary hover:text-steam-text transition-all duration-200"
          >
            <FiRefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Escaneando...' : 'Varrer Jogos'}
          </button>
          {version && (
            <p className="text-center text-[10px] text-steam-text-secondary/40 font-mono">
              v{version}
            </p>
          )}
        </div>
      </aside>

      {/* Desktop expand button when collapsed */}
      {collapsed && !isMobile && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden md:flex fixed left-2 top-10 z-50 w-9 h-9 bg-steam-darker/90 backdrop-blur-md border border-white/10 rounded-lg items-center justify-center text-steam-text-secondary hover:text-steam-blue hover:bg-steam-card transition-all shadow-lg"
        >
          <FiMenu size={16} />
        </button>
      )}
    </>
  )
}
