import { FiMinus, FiSquare, FiX } from 'react-icons/fi'

export default function TitleBar() {
  return (
    <div className="titlebar h-8 sm:h-9 bg-steam-darkest/90 backdrop-blur-sm flex items-center justify-between select-none border-b border-white/5">
      <div className="flex items-center px-3 sm:px-4 gap-2 sm:gap-2.5">
        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-steam-blue/10 flex items-center justify-center">
          <span className="text-[10px] sm:text-xs">🎮</span>
        </div>
        <span className="text-steam-text-secondary font-medium text-[10px] sm:text-xs tracking-wide">Game Launcher</span>
      </div>
      <div className="flex h-full">
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-9 sm:w-11 h-full flex items-center justify-center hover:bg-white/5 transition-colors group"
        >
          <FiMinus className="text-steam-text-secondary/60 group-hover:text-steam-text text-[10px] sm:text-xs" />
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-9 sm:w-11 h-full flex items-center justify-center hover:bg-white/5 transition-colors group"
        >
          <FiSquare className="text-steam-text-secondary/60 group-hover:text-steam-text text-[9px] sm:text-[10px]" />
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-9 sm:w-11 h-full flex items-center justify-center hover:bg-red-500/80 transition-colors group"
        >
          <FiX className="text-steam-text-secondary/60 group-hover:text-white text-[10px] sm:text-xs" />
        </button>
      </div>
    </div>
  )
}
