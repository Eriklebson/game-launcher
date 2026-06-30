import { useState, useEffect, useCallback } from 'react'
import { FiAward, FiX } from 'react-icons/fi'

export interface AchievementNotificationData {
  id: string
  name: string
  description: string
  icon?: string
  gameName: string
  timestamp: number
}

interface AchievementNotificationProps {
  achievement: AchievementNotificationData | null
  onDismiss: () => void
}

export default function AchievementNotification({ achievement, onDismiss }: AchievementNotificationProps) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (achievement) {
      setVisible(true)
      setExiting(false)

      const timer = setTimeout(() => {
        dismiss()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [achievement])

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 400)
  }, [onDismiss])

  if (!achievement || !visible) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] transition-all duration-400 ${
        exiting
          ? 'translate-x-[120%] opacity-0'
          : 'translate-x-0 opacity-100'
      }`}
    >
      <div className="w-80 bg-steam-darker/95 backdrop-blur-xl border border-steam-blue/30 rounded-xl shadow-2xl overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-steam-blue/20 to-transparent px-4 py-2.5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-steam-blue/20 flex items-center justify-center">
              <FiAward size={12} className="text-steam-blue" />
            </div>
            <span className="text-[11px] font-bold text-steam-blue uppercase tracking-wider">
              Conquista Desbloqueada!
            </span>
          </div>
          <button
            onClick={dismiss}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-steam-text-secondary/50 hover:text-steam-text transition-colors"
          >
            <FiX size={12} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex items-center gap-3">
          {/* Achievement icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-steam-blue/20 to-steam-blue/5 border border-steam-blue/20 flex items-center justify-center flex-shrink-0 shadow-lg">
            {achievement.icon ? (
              <img
                src={achievement.icon}
                alt=""
                className="w-10 h-10 rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <FiAward
              size={22}
              className={`text-steam-blue ${achievement.icon ? 'hidden' : ''}`}
            />
          </div>

          {/* Achievement info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-steam-light truncate leading-tight">
              {achievement.name}
            </p>
            <p className="text-[11px] text-steam-text-secondary/60 mt-0.5 truncate">
              {achievement.description}
            </p>
            <p className="text-[10px] text-steam-text-secondary/40 mt-1.5 font-medium">
              {achievement.gameName}
            </p>
          </div>
        </div>

        {/* Progress bar animation */}
        <div className="h-0.5 bg-steam-darker">
          <div className="h-full bg-steam-blue animate-shrink-width" />
        </div>
      </div>
    </div>
  )
}

// Utility: Get achievements seen from localStorage
export function getSeenAchievements(): Set<string> {
  try {
    const data = localStorage.getItem('seen_achievements')
    return data ? new Set(JSON.parse(data)) : new Set()
  } catch {
    return new Set()
  }
}

// Utility: Mark achievement as seen
export function markAchievementSeen(id: string): void {
  const seen = getSeenAchievements()
  seen.add(id)
  localStorage.setItem('seen_achievements', JSON.stringify([...seen]))
}

// Utility: Find new achievements (not seen before)
export function findNewAchievements(
  currentAchievements: { apiname: string; achieved: number; name: string; description: string; icon?: string }[],
  gameName: string
): AchievementNotificationData[] {
  const seen = getSeenAchievements()
  const newAchievements: AchievementNotificationData[] = []

  for (const ach of currentAchievements) {
    if (ach.achieved === 1 && !seen.has(ach.apiname)) {
      newAchievements.push({
        id: ach.apiname,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        gameName,
        timestamp: Date.now(),
      })
      markAchievementSeen(ach.apiname)
    }
  }

  return newAchievements
}
