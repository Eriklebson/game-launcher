import { useState } from 'react'
import { FiFolder, FiImage, FiCheck, FiX } from 'react-icons/fi'
import { Game } from '../../types'

interface AddGameProps {
  onAdd: (game: Omit<Game, 'id'>) => void
  onCancel: () => void
}

export default function AddGame({ onAdd, onCancel }: AddGameProps) {
  const [name, setName] = useState('')
  const [executablePath, setExecutablePath] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [platform, setPlatform] = useState<Game['platform']>('other')

  const handleSelectExe = async () => {
    const path = await window.electronAPI.selectExe()
    if (path) {
      setExecutablePath(path)
      if (!name) {
        const fileName = path.split(/[/\\]/).pop()?.replace(/\.exe$/i, '') || ''
        setName(fileName)
      }
    }
  }

  const handleSelectImage = async () => {
    const path = await window.electronAPI.selectImage()
    if (path) {
      setCoverImage(path)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !executablePath) return

    onAdd({
      name,
      executablePath,
      coverImage: coverImage || undefined,
      platform
    })
  }

  const platforms = [
    { value: 'steam' as const, label: 'Steam' },
    { value: 'epic' as const, label: 'Epic Games' },
    { value: 'xbox' as const, label: 'Xbox' },
    { value: 'gog' as const, label: 'GOG' },
    { value: 'other' as const, label: 'Outro' },
  ]

  return (
    <div className="h-full p-3 sm:p-4 md:p-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-steam-light mb-4 sm:mb-6">Adicionar Jogo</h1>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-steam-text mb-1.5 sm:mb-2">
              Nome do Jogo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Valorant, PointBlank..."
              className="w-full bg-steam-darker border border-white/10 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-steam-text placeholder-steam-text/40 focus:outline-none focus:border-steam-blue/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-steam-text mb-1.5 sm:mb-2">
              Executável *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={executablePath}
                onChange={(e) => setExecutablePath(e.target.value)}
                placeholder="Caminho do executável..."
                className="flex-1 bg-steam-darker border border-white/10 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-steam-text placeholder-steam-text/40 focus:outline-none focus:border-steam-blue/50 min-w-0"
                required
              />
              <button
                type="button"
                onClick={handleSelectExe}
                className="flex items-center gap-1.5 sm:gap-2 bg-steam-card hover:bg-steam-hover px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors text-steam-text text-xs sm:text-sm flex-shrink-0"
              >
                <FiFolder size={16} />
                <span className="hidden sm:inline">Procurar</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-steam-text mb-1.5 sm:mb-2">
              Plataforma
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {platforms.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                    platform === p.value
                      ? 'bg-steam-blue text-steam-dark font-semibold'
                      : 'bg-steam-darker text-steam-text hover:bg-steam-card'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-steam-text mb-1.5 sm:mb-2">
              Imagem da Capa (opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="Caminho da imagem ou URL..."
                className="flex-1 bg-steam-darker border border-white/10 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-steam-text placeholder-steam-text/40 focus:outline-none focus:border-steam-blue/50 min-w-0"
              />
              <button
                type="button"
                onClick={handleSelectImage}
                className="flex items-center gap-1.5 sm:gap-2 bg-steam-card hover:bg-steam-hover px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors text-steam-text text-xs sm:text-sm flex-shrink-0"
              >
                <FiImage size={16} />
                <span className="hidden sm:inline">Procurar</span>
              </button>
            </div>
            {coverImage && (
              <div className="mt-3">
                <img
                  src={coverImage}
                  alt="Preview"
                  className="w-28 h-18 sm:w-32 sm:h-20 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={!name || !executablePath}
              className="flex items-center gap-1.5 sm:gap-2 bg-steam-green hover:bg-steam-green/80 disabled:bg-steam-text/20 disabled:cursor-not-allowed text-steam-dark px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-colors text-xs sm:text-sm"
            >
              <FiCheck size={16} />
              Adicionar Jogo
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 sm:gap-2 bg-steam-card hover:bg-steam-hover text-steam-text px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-colors text-xs sm:text-sm"
            >
              <FiX size={16} />
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
