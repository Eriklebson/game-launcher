<div align="center">

# 🎮 Game Launcher

**Seu Steam pessoal — organize, descubra e jogue seus jogos favoritos.**

[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WASM-003B57?logo=sqlite)](https://sql.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| 🔍 **Scanner Automático** | Detecta jogos do Steam, Epic, Xbox, GOG e pastas comuns |
| 🎨 **Biblioteca Visual** | Grid ou lista com capas, busca e filtros por plataforma |
| ⏱️ **Play Time Tracking** | Registra tempo de jogo por sessão automaticamente |
| 🖼️ **Detalhe do Jogo** | Screenshots, descrição, requisitos do sistema (via Steam Store API) |
| 🏆 **Conquistas** | Sistema de conquistas via Steam API + parser Stellar Blade |
| 🎵 **Som de Conquistas** | Notificação sonora estilo Steam (Web Audio API) |
| 📊 **Monitor de Hardware** | CPU, GPU, RAM, Temperaturas e FPS em tempo real |
| ⚡ **FPS Monitor** | Intel PresentMon 2.5.1 — kill-read-restart cycle, sem necessidade de admin/UAC |
| 🌡️ **Temperatura CPU** | LibreHardwareMonitorLib.dll — leitura direta via PowerShell (AMD/Intel/NVIDIA) |
| 🛠️ **Mods & Tools** | Aba separada para ferramentas de modding |
| 🎯 **Badge de Plataforma** | Identifica Steam, Epic, Xbox, GOG com cores específicas |
| 📦 **100% Offline** | Banco de dados SQLite local, sem dependência de nuvem |

---

## 🚀 Instalação

### Pré-requisitos
- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/) 9+
- Windows 10/11

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/Eriklebson/game-launcher.git
cd game-launcher

# 2. Instale as dependências
npm install

# 3. Inicie o desenvolvimento
npm run dev
```

### Build do Instalador

```bash
# Build completo (frontend + electron + instalador NSIS)
npm run electron:build
```

O instalador será gerado em `release/Game Launcher Setup.exe`.

---

## 📁 Estrutura do Projeto

```
game-launcher/
├── src/
│   ├── electron/              # Main process (Node.js)
│   │   ├── main.ts            # Entry point, janela, IPC, DB
│   │   ├── preload.ts         # Context bridge
│   │   ├── database.ts        # SQLite CRUD
│   │   ├── fpsMonitor.ts      # FPS monitor via PresentMon (kill-read-restart cycle)
│   │   ├── monitor.html       # Monitor de Hardware (janela separada)
│   │   ├── notification.html  # Notificação de conquistas
│   │   └── gameScanner.ts     # Scanner multi-plataforma
│   ├── ui/                    # Renderer process (React)
│   │   ├── App.tsx            # Roteamento principal
│   │   ├── components/        # Componentes reutilizáveis
│   │   └── pages/             # Páginas da aplicação
│   └── types/                 # Interfaces TypeScript
├── tools/                     # Binários externos
│   ├── PresentMon-2.5.1-x64.exe
│   ├── LibreHardwareMonitor/  # DLL para leitura de sensores (CPU/GPU temp)
│   └── read-temp.ps1          # Script PowerShell para leitura de temperatura
├── scripts/                   # Scripts de build
├── docs/                      # Documentação
└── package.json
```

---

## 🛠️ Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia modo desenvolvimento (Vite + Electron) |
| `npm run build` | Build completo (frontend + electron) |
| `npm run electron:build` | Build + instalador NSIS (.exe) |

---

## 🗄️ Banco de Dados

SQLite via sql.js (WebAssembly puro, sem módulos nativos).

### Tabelas

- **games** — Jogos da biblioteca (nome, plataforma, capa, tempo de jogo)
- **achievements** — Conquistas salvas por jogo
- **play_sessions** — Histórico de sessões de jogo

Localização: `%APPDATA%\game-launcher\game-launcher.db`

---

## 🎯 Scanner de Jogos

| Plataforma | Método de Detecção |
|------------|-------------------|
| **Steam** | `libraryfolders.vdf` → `appmanifest_*.acf` |
| **Epic** | `Manifests/*.item` (JSON) |
| **GOG** | Scan de diretórios `GOG Games\` |
| **Xbox** | PowerShell `Get-AppxPackage` + `AppxManifest.xml` |
| **Pastas Comuns** | `C:\Games`, `D:\Games`, etc. |

Capas buscadas via **Steam Store API** (gratuita, sem autenticação).

---

## 📋 Versão

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0.3 | 01/07/2026 | Temperatura CPU via LibreHardwareMonitorLib (AMD/Intel), fix FPS ETW session leak, elevação UAC opcional |
| 1.0.2 | 01/07/2026 | Monitor de Hardware (CPU/GPU/RAM/FPS) via Intel PresentMon sem UAC |
| 1.0.1 | 30/06/2026 | Notificações de conquistas estilo Steam (sistema operacional) |
| 1.0.0 | 30/06/2026 | Release inicial |

Ver [CHANGELOG.md](CHANGELOG.md) para histórico completo.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👤 Autor

**Eriklebson** — [GitHub](https://github.com/Eriklebson)
