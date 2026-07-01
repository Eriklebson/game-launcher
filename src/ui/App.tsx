import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Library from './pages/Library'
import AddGame from './pages/AddGame'
import GameDetail from './pages/GameDetail'
import { findNewAchievements } from './components/AchievementNotification'
import { Game, ScannedGame } from '../types'

type Page = 'library' | 'mods' | 'add-game'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('library')
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  useEffect(() => {
    initGames()
  }, [])

  const initGames = async () => {
    try {
      const savedGames = await window.electronAPI.getGames()
      setGames(savedGames)

      setScanning(true)
      const scannedGames = await window.electronAPI.scanGames()
      const merged = mergeGames(savedGames, scannedGames)
      setGames(merged)
      await window.electronAPI.saveGames(merged)
    } catch (e) {
      console.error('Error initializing games:', e)
    } finally {
      setLoading(false)
      setScanning(false)
    }
  }

  const mergeGames = (saved: Game[], scanned: ScannedGame[]): Game[] => {
    const merged = [...saved]
    const existingPaths = new Set(saved.map(g => g.executablePath.toLowerCase()))

    for (const s of scanned) {
      if (!existingPaths.has(s.executablePath.toLowerCase())) {
        merged.push({
          id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: s.name,
          executablePath: s.executablePath,
          coverImage: s.coverImage,
          platform: s.platform,
          steamAppId: s.steamAppId,
        })
        existingPaths.add(s.executablePath.toLowerCase())
      }
    }

    return merged
  }

  const handleAddGame = async (game: Omit<Game, 'id'>) => {
    const newGame: Game = {
      ...game,
      id: Date.now().toString()
    }
    const updatedGames = [...games, newGame]
    setGames(updatedGames)
    await window.electronAPI.saveGames(updatedGames)
    setCurrentPage('library')
  }

  const handleDeleteGame = async (id: string) => {
    await window.electronAPI.deleteGame(id)
    setGames(prev => prev.filter(g => g.id !== id))
  }

  const handleLaunchGame = async (game: Game) => {
    await window.electronAPI.launchGame(game.id)
    // Refresh games to get updated playTime/lastPlayed from DB
    const freshGames = await window.electronAPI.getGames()
    setGames(freshGames)
    if (selectedGame?.id === game.id) {
      setSelectedGame(freshGames.find(g => g.id === game.id) || null)
    }
  }

  const handleChangePlatform = async (id: string, platform: Game['platform']) => {
    const updatedGames = games.map(g =>
      g.id === id ? { ...g, platform } : g
    )
    setGames(updatedGames)
    await window.electronAPI.saveGames(updatedGames)
  }

  const handleRescan = async () => {
    setScanning(true)
    try {
      const scannedGames = await window.electronAPI.scanGames()
      const merged = mergeGames(games, scannedGames)
      setGames(merged)
      await window.electronAPI.saveGames(merged)
    } finally {
      setScanning(false)
    }
  }

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game)
  }

  const handleBackToLibrary = () => {
    setSelectedGame(null)
  }

  const handleAchievementsLoaded = useCallback((gameName: string, achievements: { apiname: string; achieved: number; name: string; description: string; icon?: string }[]) => {
    const newAchievements = findNewAchievements(achievements, gameName)
    // Show system-level notification for each new achievement
    for (const ach of newAchievements) {
      window.electronAPI.showAchievementNotification({
        name: ach.name,
        description: ach.description,
        gameName: ach.gameName,
        icon: ach.icon,
      })
    }
  }, [])

  const handleTestNotification = useCallback(() => {
    window.electronAPI.showAchievementNotification({
      name: 'Primeira Conquista',
      description: 'Esta é uma notificação de teste do Game Launcher',
      gameName: 'Game Launcher',
    })
  }, [])

  const handleOpenMonitor = useCallback(() => {
    window.electronAPI.openMonitor()
  }, [])

  const filteredGames = currentPage === 'mods'
    ? games.filter(g => g.platform === 'mods')
    : games.filter(g => g.platform !== 'mods')

  const gameCount = games.filter(g => g.platform !== 'mods').length
  const modsCount = games.filter(g => g.platform === 'mods').length

  // If a game is selected, show the detail page
  if (selectedGame) {
    // Find the latest version of the game from state (in case lastPlayed was updated)
    const currentGame = games.find(g => g.id === selectedGame.id) || selectedGame
    return (
      <div className="h-full flex flex-col bg-steam-dark">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            currentPage={currentPage}
            onNavigate={(page) => {
              setSelectedGame(null)
              setCurrentPage(page)
            }}
            gameCount={gameCount}
            modsCount={modsCount}
            scanning={scanning}
            onRescan={handleRescan}
            onTestNotification={handleTestNotification}
            onOpenMonitor={handleOpenMonitor}
          />
          <main className="flex-1 overflow-hidden">
            <GameDetail
              game={currentGame}
              onBack={handleBackToLibrary}
              onLaunch={handleLaunchGame}
              onDelete={(id) => {
                handleDeleteGame(id)
                setSelectedGame(null)
              }}
              onAchievementsLoaded={handleAchievementsLoaded}
            />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-steam-dark">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          gameCount={gameCount}
          modsCount={modsCount}
          scanning={scanning}
          onRescan={handleRescan}
          onTestNotification={handleTestNotification}
          onOpenMonitor={handleOpenMonitor}
        />
        <main className="flex-1 overflow-auto">
          {(currentPage === 'library' || currentPage === 'mods') && (
            <Library
              games={filteredGames}
              loading={loading}
              scanning={scanning}
              onLaunch={handleLaunchGame}
              onDelete={handleDeleteGame}
              onChangePlatform={handleChangePlatform}
              onSelectGame={handleSelectGame}
              showModsTab={currentPage === 'mods'}
            />
          )}
          {currentPage === 'add-game' && (
            <AddGame onAdd={handleAddGame} onCancel={() => setCurrentPage('library')} />
          )}
        </main>
      </div>
    </div>
  )
}
