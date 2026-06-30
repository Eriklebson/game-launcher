# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 30-06-2026

### Adicionado
- Scanner automático de jogos (Steam, Epic, Xbox, GOG, pastas comuns)
- Biblioteca de jogos com visualização em grid e lista
- Busca por nome e filtro por plataforma
- Badge de plataforma com dropdown para reatribuição manual
- Página de detalhe do jogo estilo Steam:
  - Hero banner com imagem de header
  - Carousel de screenshots (via Steam Store API)
  - Descrição do jogo com "Ler mais"
  - Requisitos do sistema (colapsável)
  - Sidebar com informações, sessões recentes e link para Steam Store
- Sistema de play time tracking por sessão
- Banco de dados SQLite via sql.js (WASM puro)
- Mods & Tools separados na sidebar
- Capas via Steam Store API (gratuita, sem autenticação)
- Nomes reais dos jogos Xbox (leitura de AppxManifest.xml)
- Stellar Blade: parser de save binário para conquistas
  - 25 trophy flags mapeados para conquistas Steam
  - Endings, quests e New Game Plus count
- Documentação completa do sistema (HTML estilizado + Markdown)
- Barra de título customizada (frameless)
- Tema escuro estilo Steam (#1b2838, #a4d007, #66c0f4)
