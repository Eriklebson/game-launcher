import { FiMinus, FiSquare, FiX } from 'react-icons/fi'

export default function TitleBar() {
  return (
    <div className="titlebar h-8 bg-steam-darker flex items-center justify-between select-none">
      <div className="flex items-center px-3 gap-2">
        <span className="text-steam-blue font-semibold text-sm">🎮 Game Launcher</span>
      </div>
      <div className="flex h-full">
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <FiMinus className="text-steam-text text-xs" />
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <FiSquare className="text-steam-text text-xs" />
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors"
        >
          <FiX className="text-steam-text text-xs" />
        </button>
      </div>
    </div>
  )
}
