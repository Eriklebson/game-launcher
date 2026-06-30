# Game Launcher - Documentação Completa do Sistema

## Índice
1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Arquivos](#3-estrutura-de-arquivos)
4. [Arquitetura](#4-arquitetura)
5. [Banco de Dados](#5-banco-de-dados)
6. [Electron (Main Process)](#6-electron-main-process)
7. [Frontend (Renderer Process)](#7-frontend-renderer-process)
8. [Scanner de Jogos](#8-scanner-de-jogos)
9. [Stellar Blade Parser](#9-stellar-blade-parser)
10. [Build e Deploy](#10-build-e-deploy)
11. [Guia de Manutenção](#11-guia-de-manutenção)

---

## 1. Visão Geral

**Game Launcher** é um aplicativo desktop pessoal estilo Steam que:
- Escaneia automaticamente o PC em busca de jogos (Steam, Epic, Xbox, GOG, pastas comuns)
- Organiza jogos em biblioteca com visualização em grid/lista
- Busca capas e informações via Steam Store API
- Detecta ferramentas de modding e separa em aba dedicada
- Rastreia tempo de jogo por sessão
- Exibe detalhes do jogo estilo Steam (screenshots, descrição, requisitos)
- Parseia save do Stellar Blade para extrair conquistas sem Steam API

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Desktop | Electron 33 |
| Frontend | React 19 + TypeScript |
| Build | Vite 6 + esbuild |
| Estilo | Tailwind CSS 3 |
| Banco de Dados | SQLite via sql.js (WASM puro, sem módulos nativos) |
| Ícones | react-icons (Fi icons) |

### Dependências de Produção
- `react`, `react-dom` — UI
- `react-icons` — Ícones
- `sql.js` — SQLite (WASM)
- `framer-motion` — Animações (disponível, uso futuro)

### Dependências de Desenvolvimento
- `electron`, `electron-builder` — Desktop
- `vite`, `@vitejs/plugin-react` — Build do frontend
- `esbuild` — Build do Electron (main/preload)
- `tailwindcss`, `postcss`, `autoprefixer` — CSS
- `typescript` — Tipagem
- `concurrently` — Rodar Vite + Electron simultaneamente

---

## 3. Estrutura de Arquivos

```
C:\laragon\www\appJogos\
├── package.json                    # Scripts, dependências, config electron-builder
├── tsconfig.json                   # Config TypeScript
├── vite.config.ts                  # Config Vite (frontend)
├── tailwind.config.js              # Config Tailwind
├── postcss.config.js               # Config PostCSS
├── AGENTS.md                       # Instruções para AI agents
├── public/
│   └── icon.ico                    # Ícone do app
├── scripts/
│   ├── build-electron.js           # esbuild main.ts + preload.ts → dist-electron/
│   └── wait-and-launch.js          # Auto-build electron antes de dev mode
├── src/
│   ├── electron/                   # Main process (Node.js)
│   │   ├── main.ts                 # Entry point: janela, IPC, DB init, play tracking
│   │   ├── preload.ts              # Context bridge: expõe API ao renderer
│   │   ├── database.ts             # SQLite CRUD (sql.js)
│   │   ├── gameScanner.ts          # Scanner multi-plataforma
│   │   └── stellarBladeParser.ts   # Parser binário do save (READ ONLY)
│   ├── ui/                         # Renderer process (React)
│   │   ├── App.tsx                 # Roteamento, state management
│   │   ├── index.css               # Tailwind CSS + tema Steam
│   │   ├── components/
│   │   │   ├── TitleBar.tsx        # Barra de título customizada (frameless)
│   │   │   ├── Sidebar.tsx         # Menu lateral com contadores
│   │   │   ├── GameCard.tsx        # Card de jogo com dropdown de plataforma
│   │   │   └── StellarBladeAchievements.tsx  # Conquistas do Stellar Blade
│   │   └── pages/
│   │       ├── Library.tsx         # Biblioteca (grid/lista, busca)
│   │       ├── GameDetail.tsx      # Detalhe do jogo (Steam-like)
│   │       └── AddGame.tsx         # Adicionar jogo manualmente
│   ├── types/
│   │   └── index.ts                # Interfaces TypeScript
│   └── main.ts                     # Entry point do renderer (Vite)
├── dist/                           # Build do frontend (Vite)
├── dist-electron/                  # Build do Electron (esbuild)
├── docs/
│   ├── SISTEMA-COMPLETO.md         # Este arquivo
│   ├── stellar-blade-save-format.md
│   ├── stellar-blade-parser.md
│   └── SISTEMA-RESUMO.txt
└── release/                        # Installer NSIS (.exe)
```

---

## 4. Arquitetura

### Fluxo de Dados
```
┌─────────────────────────────────────────────────┐
│                  Electron Main                   │
│  main.ts → database.ts → gameScanner.ts         │
│           → stellarBladeParser.ts                │
│                                                  │
│  IPC Handlers:                                   │
│  get-games, save-games, delete-game              │
│  scan-games, launch-game                         │
│  get-cached-achievements, get-play-sessions      │
│  get-stats, get-steam-store-info                 │
│  has-stellar-blade-save, parse-stellar-blade-save│
│  window-minimize, window-maximize, window-close  │
└───────────────┬─────────────────────────────────┘
                │ contextBridge (preload.ts)
┌───────────────▼─────────────────────────────────┐
│              React Frontend                      │
│  App.tsx → Sidebar → Library/GameDetail/AddGame  │
│  StellarBladeAchievements.tsx                    │
│                                                  │
│  window.electronAPI.* (exposto via preload)       │
└─────────────────────────────────────────────────┘
```

### Comunicação Electron ↔ Frontend
- **Main → Renderer**: Via `ipcMain.handle()` (request/response)
- **Renderer → Main**: Via `window.electronAPI.*` → `ipcRenderer.invoke()`
- **Preload**: `contextBridge.exposeInMainWorld()` expõe API segura

---

## 5. Banco de Dados

### Localização
`%APPDATA%\game-launcher\game-launcher.db`

### Tabelas

#### `games`
```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  executable_path TEXT NOT NULL,
  cover_image TEXT,
  platform TEXT NOT NULL DEFAULT 'other',  -- steam|epic|xbox|gog|mods|other
  last_played TEXT,
  play_time INTEGER NOT NULL DEFAULT 0,    -- minutos
  last_session_start TEXT,                  -- ISO timestamp ou NULL
  steam_app_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `achievements`
```sql
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  apiname TEXT NOT NULL,
  achieved INTEGER NOT NULL DEFAULT 0,
  unlocktime INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  icongray TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id, apiname)
);
```

#### `play_sessions`
```sql
CREATE TABLE play_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

### Funções do database.ts
| Função | Descrição |
|--------|-----------|
| `initDatabase(path)` | Cria/abre DB, cria tabelas, habilita WAL |
| `getGames()` | Lista todos os jogos (ORDER BY name) |
| `getGame(id)` | Busca jogo por ID |
| `upsertGame(game)` | Insert ou update (ON CONFLICT) |
| `deleteGame(id)` | Deleta jogo + achievements + sessions (CASCADE) |
| `updateGamePlayTime(id, time, start)` | Atualiza play_time e last_session_start |
| `recordPlaySession(id, start, duration)` | Insere sessão de jogo |
| `getPlaySessions(id)` | Lista sessões (ORDER BY start_time DESC) |
| `saveAchievements(gameId, achievements)` | Salva conquistas (DELETE + INSERT) |
| `getAchievements(gameId)` | Lista conquistas (achieved DESC, name ASC) |
| `getTotalPlayTime()` | Soma total de play_time |
| `getGameCount()` | Contagem por plataforma |
| `close()` | Salva e fecha DB |

---

## 6. Electron (Main Process)

### main.ts
- **Janela**: 1400x900, frameless, `webSecurity: false` (para imagens `file://`)
- **Dev/Prod**: Detecta via `fs.existsSync(distPath)`
- **before-quit**: Finaliza sessões de jogo em andamento
- **IPC Handlers**: Ver seção 4 (Arquitetura)

### preload.ts
Expõe ao renderer via `window.electronAPI`:
```typescript
getGames, saveGames, deleteGame, scanGames, selectExe, selectImage,
launchGame, minimizeWindow, maximizeWindow, closeWindow,
getCachedAchievements, getPlaySessions, getStats, getSteamStoreInfo,
hasStellarBladeSave, parseStellarBladeSave
```

---

## 7. Frontend (Renderer Process)

### App.tsx
- **State**: `games[]`, `selectedGame`, `currentPage`, `loading`, `scanning`
- **Init**: Carrega jogos do DB → escaneia → merge → salva
- **mergeGames**: Junta jogos salvos com escaneados (dedup por executablePath)
- **Page type**: `'library' | 'mods' | 'add-game'`
- **GameDetail**: Aberto quando `selectedGame` não é null

### Componentes

#### Sidebar.tsx
- Menu lateral com: Biblioteca (contagem), Mods (contagem), Adicionar Jogo
- Botão "Varrer Jogos" com estado de scanning

#### GameCard.tsx
- Card clicável com: capa, nome, badge de plataforma (dropdown), data último jogo
- Hover overlay com ações: Jogar, Detalhes, Deletar (fora da área de imagem para não cortar)
- Dropdown de plataforma: permite reatribuir manualmente
- Overflow visível no card para que os botões hover não sejam cortados

#### AchievementNotification.tsx
- Popup estilo Steam que aparece no canto inferior direito
- Animação de slide-in da direita com barra de progresso
- Auto-dismiss após 5 segundos
- Armazena conquistas vistas no localStorage para detectar novas
- Funções utilitárias: `getSeenAchievements`, `markAchievementSeen`, `findNewAchievements`

#### StellarBladeAchievements.tsx
- Detecta save do Stellar Blade automaticamente
- Exibe 25 trophy flags com status (completo/incompleto)
- Progress bar, endings, NG+ count
- Botão "Atualizar" para recarregar save

#### GameDetail.tsx
- **Hero Banner**: Imagem de header + gradiente + capa + título + gêneros + botão Jogar
- **Screenshots**: Carousel com thumbnails (via Steam Store API)
- **Descrição**: Texto com "Ler mais"
- **Conquistas**: Grid com progress bar (lido do DB)
- **Stellar Blade**: Se AppID 3489700, exibe componente específico
- **Requisitos do Sistema**: Colapsável (via Steam Store API)
- **Sidebar**: Info do jogo, sessões recentes, recursos, DLC, link Steam Store
- **Ações**: Jogar, Remover

### Páginas

#### Library.tsx
- Modo grid (cards) e lista (tabela)
- Busca por nome
- Filtro por plataforma
- Ordenação: nome, último jogo

#### AddGame.tsx
- Formulário manual: nome, executável (file picker), imagem (file picker), plataforma

---

## 7.1 Design Responsivo

### Breakpoints (Tailwind v3)
| Prefixo | Largura | Uso |
|---------|---------|-----|
| `sm:` | 640px+ | Celulares grandes |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Desktops pequenos |
| `xl:` | 1280px+ | Desktops |
| `2xl:` | 1536px+ | Telas grandes |

### Sidebar (Sidebar.tsx)
- **Desktop (>768px)**: Visível permanentemente, largura 220px
- **Mobile (<768px)**: Auto-colapsa, botão hamburger fixo no topo
- Overlay escuro quando aberta no mobile
- Botão X para fechar

### Library (Library.tsx)
- **Grid**: `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`
- Header: empilha verticalmente em mobile (`flex-col sm:flex-row`)
- Search: largura total em mobile, fixa em desktop (`w-full sm:w-56`)
- Spacing: `p-3 sm:p-4 md:p-6`

### GameCard (GameCard.tsx)
- **Hover overlay**: Fora da área de imagem (evita corte por `overflow-hidden`)
- Botões menores em mobile: `text-[10px] sm:text-xs`, `px-2 py-1.5 sm:px-3 sm:py-2`
- Badge de plataforma: `text-[10px] sm:text-[11px]`
- Card inteiro: `overflow-visible` para permitir que hover overlay transborde

### GameDetail (GameDetail.tsx)
- **Hero banner**: `h-56 sm:h-64 md:h-80`
- **Capa**: Oculta em `sm:hidden`, visível a partir de `md`
- **Título**: `text-xl sm:text-2xl md:text-4xl`
- **Botão Jogar**: `px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5`
- **Grid conteúdo**: `grid-cols-1 lg:grid-cols-3` (sidebar empilha em mobile)
- **Screenshots thumbnails**: `w-20 h-14 sm:w-28 sm:h-18 md:w-32 md:h-20`
- **Conquistas**: `grid-cols-1` (sempre vertical para melhor leitura)

### TitleBar (TitleBar.tsx)
- Altura: `h-8 sm:h-9`
- Botões de janela: `w-9 sm:w-11`
- Título: `text-[10px] sm:text-xs`

### StellarBladeAchievements (StellarBladeAchievements.tsx)
- Todos os elementos com tamanhos responsivos (`text-[10px] sm:text-xs`)
- Padding e gaps escalonados

### AddGame (AddGame.tsx)
- Formulário: padding `p-3 sm:p-4 md:p-6`
- Inputs: `py-2 sm:py-2.5 text-sm`
- Botões: `text-xs sm:text-sm`

### CSS Customizado (global.css)
- Animações: `fadeIn`, `slideIn`, `pulse-soft`, `shimmer`
- Efeitos: `glass`, `glow-blue`, `glow-green`
- Scrollbar styling
- Focus visível com outline azul

---

## 8. Scanner de Jogos

### gameScanner.ts

#### Fontes de Jogos

| Plataforma | Método de Detecção | Cobertura |
|------------|-------------------|-----------|
| **Steam** | `libraryfolders.vdf` → `appmanifest_*.acf` | Todas as libraries |
| **Epic** | `Manifests/*.item` (JSON) | ProgramData + LocalAppData |
| **GOG** | Scan de diretórios `GOG Games\` | C:, D:, E:, F: |
| **Xbox/MS Store** | PowerShell `Get-AppxPackage` | Todos os packages |
| **Pastas Comuns** | `C:\Games`, `D:\Games`, etc. | Subpastas até depth 3 |

#### Fluxo do Scanner
1. `scanAllGames()` executa todas as fontes em paralelo
2. Cada fonte retorna `ScannedGame[]`
3. Merge com dedup por `executablePath`
4. Retorna lista final

#### Busca de Capa (Steam Store API)
```
searchSteamStore(gameName) → { coverImage, steamAppId }
```
- API: `store.steampowered.com/api/storesearch/` (gratuita, sem auth)
- Cache em memória para evitar chamadas duplicadas
- Retorna header.jpg + AppID

#### Filtros

**XBOX_EXCLUDE** (Set de ~170 nomes exatos):
- Apps Microsoft (Calculator, Photos, etc.)
- Social (Teams, Discord, WhatsApp)
- Streaming (Spotify, Netflix)
- Hardware (NVIDIA, Realtek)
- Runtimes/Frameworks

**SKIP_EXE_NAMES** (Set):
- uninstall, setup, install, update, config, settings, etc.

**SKIP_DIRS** (Set):
- redist, vcredist, directx, .git, node_modules, etc.

#### Nomes de Xbox
`getXboxDisplayName()` lê `AppxManifest.xml`:
1. `<Properties><DisplayName>` (prioridade)
2. `<uap:DisplayName>`
3. `<mp:DisplayName>`
4. `<DisplayName>` (fallback)
5. Package name com `_` → espaço (último recurso)

#### Capa de Xbox
`getXboxLocalCover()` procura:
1. `StoreLogo.png`
2. `Logo.png`
3. `LargeLogo.png`
4. `Square150x150Logo.png`
5. `Assets/*.png` (qualquer uma não-small)

#### Modding Tools
`isModTool()` verifica se o nome contém chaves de `MODS_MAP`:
LOOT, CurseForge, Vortex, Mod Organizer, Creation Kit, etc.

---

## 9. Stellar Blade Parser

### stellarBladeParser.ts
**IMPORTANTE**: Este módulo APENAS LE o save. NUNCA modifica.

#### Localização do Save
```
%LOCALAPPDATA%\SB\Saved\SaveGames\{steamId}\StellarBladeSave00.sav
```

#### Formato
- Engine: UE4 (Release 4.26)
- Header: "EVAS"
- Tamanho: ~10 MB
- Steam ID: FString no final do arquivo (offset ~10.052.362)

#### Estrutura UE4
```
[NomeASCII\0] [TipoASCII\0] [Size(4B LE)] [ArrayIndex(4B LE)] [Valor...]
```

| Tipo | Offset do Valor | Tamanho |
|------|----------------|---------|
| BoolProperty | nome + 21 | 1 byte |
| UInt32Property | nome + 23 | 4 bytes |

#### Trophy Flags (25)
Mapeados para conquistas Steam:
- `Trophy_Activate_FirstCamp` → Camp Preparation
- `Trophy_KillCharacter_Brute` → Brute
- `Trophy_CompleteLevel_AltesLabor` → Altess Levoire
- `Trophy_CharKill_AssassinationSkills` → Silent Executioner
- `Trophy_JustEvade` → Battlefield Martial Artist
- `Trophy_JustParry` → Agile Gladiator
- (e mais 19...)

#### Dados Extraídos
- 25 Trophy flags (bCompleted + ProgressValue)
- Quest completions (`Complete_Quest_*`)
- Endings (KillElder, KillLily, SaveLily)
- New Game Plus count

#### API
```typescript
hasStellarBladeSave(): boolean
parseStellarBladeSave(): StellarBladeSaveData | null
```

---

## 10. Build e Deploy

### Comandos
```bash
npm run dev           # Dev mode (Vite + Electron)
npm run build         # Build completo (Vite + esbuild)
npm run electron:build # Build + pacote NSIS (.exe)
```

### Processo de Build

#### 1. Frontend (Vite)
```bash
vite build → dist/
```
- React + TypeScript → bundle JS + CSS
- Output: `dist/index.html`, `dist/assets/`

#### 2. Electron (esbuild)
```bash
node scripts/build-electron.js
```
- `src/electron/main.ts` → `dist-electron/main.js` (CJS)
- `src/electron/preload.ts` → `dist-electron/preload.js` (CJS)
- Copia `sql-wasm.wasm` para `dist-electron/`
- Formato CJS (CommonJS) para compatibilidade com Electron

#### 3. Pacote (electron-builder)
```bash
electron-builder --win --config
```
- Output: `release/Game Launcher Setup 1.0.0.exe`
- NSIS installer (não one-click)
- Inclui `dist/` e `dist-electron/`

### scripts/build-electron.js
1. Bundla `main.ts` e `preload.ts` com esbuild (CJS, platform: node)
2. Copia `node_modules/sql.js/dist/sql-wasm.wasm` → `dist-electron/`

### scripts/wait-and-launch.js
1. Auto-build electron files (inclui wasm)
2. Espera Vite server ficar pronto (polling HTTP)
3. Inicia Electron

### Detalhes Importantes
- `webSecurity: false` no Electron para imagens `file://` (capas locais)
- `sql-wasm.wasm` DEVE estar no mesmo diretório que `main.js`
- Electron cache errors no Windows são inofensivos (GPU cache)

---

## 11. Guia de Manutenção

### Adicionar nova plataforma de scanner
1. Criar função `scanNovaPlataforma()` em `gameScanner.ts`
2. Retornar `ScannedGame[]`
3. Adicionar em `scanAllGames()` com `Promise.all`
4. Adicionar caso em `getGameCount()` em `database.ts`
5. Adicionar cor/label em `GameCard.tsx` e `GameDetail.tsx`

### Adicionar novo IPC handler
1. Adicionar handler em `main.ts` com `ipcMain.handle('nome', ...)`
2. Adicionar método em `preload.ts` com `ipcRenderer.invoke('nome', ...)`
3. Adicionar tipo em `ElectronAPI` em `types/index.ts`
4. Usar no frontend via `window.electronAPI.nome()`

### Modificar banco de dados
1. Editar schema em `database.ts` (função `initDatabase`)
2. Adicionar funções CRUD em `database.ts`
3. Adicionar IPC handler em `main.ts` se necessário
4. **CUIDADO**: Usar `ALTER TABLE` para migrations (não DROP + CREATE)

### Adicionar nova conquista (Stellar Blade)
1. Adicionar trophy flag em `TROPHY_MAP` em `stellarBladeParser.ts`
2. Mapear para nome da conquista Steam
3. O componente `StellarBladeAchievements.tsx` exibe automaticamente

### Troubleshooting
| Problema | Solução |
|----------|---------|
| `sql-wasm.wasm not found` | Rodar `npm run build` (copia wasm) |
| Xbox games showing package names | Verificar `getXboxDisplayName()` e AppxManifest.xml |
| Capa não aparece | Verificar se `webSecurity: false` está configurado |
| GPU cache errors | Inofensivos no Windows, ignorar |
| `Port 5173 already in use` | Matar processo Vite anterior ou usar porta diferente |

---

## Dados do Usuário

- **Steam ID**: 76561197960285355
- **Stellar Blade Save**: `C:\Users\erikl\AppData\Local\SB\Saved\SaveGames\76561197960285355\`
- **Stellar Blade AppID**: 3489700

---

*Documentação gerada em 30/06/2026*
