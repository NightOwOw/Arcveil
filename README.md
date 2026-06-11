# ArcVeil

**Your story arc. Your world unveiled.**

ArcVeil is a local-first desktop application for creative writers and world-builders. It brings together every tool you need — relationship maps, character profiles, a writing editor, fantasy map generation, story structure, and AI-like companions — into a single offline-capable workspace.

![ArcVeil Screenshot](screenshots/01-lauch.png)

---

## Features

### Relationship Map Canvas
Visual node-based graph for mapping the connections in your story world. Supports six node types (Character, Location, Faction, Event, Media, Item) with nine edge styles for relationship types.

### Deep Character Profiles
Seven-section character sheets covering Basic Info, Appearance, Powers, Voice, Arc, Interview, and Chemistry. Build characters with depth and track how they evolve.

### Writing Hub
A rich text editor with document management, entity linking, inline annotations, writing sprints, and version history. Export to PDF, HTML, or plain text.

### Fantasy Map Generator
Procedural world maps with Voronoi regions, river generation, customizable coastlines, and city pins — all driven by a seeded RNG so your map is reproducible.

### Story Structure Tools
Timeline, scene kanban, arc management, beats checker with popular story frameworks (Save the Cat, Hero's Journey, etc.), and pacing analysis.

### World Building Suite
Locations, Factions, Bestiary, Items, a World Calendar, and a Culture Builder — everything for building a living, consistent world.

### Companion System
Two interactive companions (Ciona and Somvora) rendered as VRM 3D models. An awareness engine reads your project state and writing session to offer contextual reactions and nudges.

### Overlay System
Floating HUD, edge panel, quick-summon dialog, and system tray integration — keep ArcVeil accessible without leaving your current window.

### Theme Engine
11 built-in themes (ArcVeil, Light, Sakura, Starlight, Noir, Forest, Sapphire, Ember, Crystal, Dusk, Opal) plus a full CSS custom property editor for complete personalization.

### Local-First & Private
All project data lives in `.arcveil` files on your machine. No account required, no cloud sync, no analytics.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm

### Installation

```bash
git clone https://github.com/your-username/arcveil.git
cd arcveil
npm install
```

### Run in Development

```bash
npm run dev
```

### Run Normally

```bash
npm start
```

---

## Building

Build for the current platform:

```bash
npm run build
```

Platform-specific builds:

```bash
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

Build and publish a release to GitHub:

```bash
npm run dist
```

---

## Project Structure

```
arcveil/
├── main.js                  # Electron main process
├── preload.js               # IPC context bridge
├── index.html               # Main app UI
├── companion.html           # Companion window
├── hud.html / summon.html   # Overlay windows
│
├── src/
│   ├── state.js             # Central state, EventBus, undo/redo
│   ├── storage.js           # Save/load .arcveil project files
│   ├── router.js            # View routing and toolbar bindings
│   ├── updater.js           # Auto-update via electron-updater
│   ├── canvas/              # Pan/zoom graph canvas
│   ├── character/           # Character profile sections
│   ├── companion/           # Companion system and VRM loader
│   ├── world/               # Map generator, lore, world data
│   ├── story/               # Timeline, scenes, arcs
│   ├── writing/             # Editor, exporter, sprint timer
│   ├── ui/                  # Sidebar, panels, modals, themes
│   ├── settings/            # Settings UI and theme engine
│   └── overlay/             # Hotkeys, tray, clipboard bridge
│
├── styles/                  # CSS stylesheets
├── assets/                  # Icons, VRM models, sounds, ambience
└── scripts/
    └── gen-icon.mjs         # Icon generation utility
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 42 |
| UI | Vanilla JavaScript + ES Modules |
| Graph / Map | Custom SVG canvas |
| 3D Companions | VRM models via Three.js |
| Packaging | electron-builder (NSIS / DMG / AppImage) |
| Auto-update | electron-updater via GitHub Releases |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New project |
| `Ctrl+O` | Open project |
| `Ctrl+S` | Save project |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `N` | Add character node (on canvas) |
| Global hotkey | Toggle companion / HUD / quick summon |

---

## Project File Format

Projects are saved as `.arcveil` files — JSON documents containing the full project state: nodes, character profiles, world data, story structure, writing documents, and settings. All data is human-readable and stays on your machine.

---

## Roadmap

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## License

MIT — see [LICENSE](LICENSE) for details.
