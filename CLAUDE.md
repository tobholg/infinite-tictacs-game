# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Infinite Tic-Tacs** is a Nuxt 4.1.2 application featuring an advanced Tic-Tac-Toe game with dynamic board expansion, multi-player support (up to 10 players), and multiple game modes. The application runs as a client-only SPA (SSR is disabled).

## Development Commands

```bash
# Start both frontend AND server together (recommended)
npm run dev:all

# Start both with network access (for phone testing)
npm run dev:all:host

# Start frontend only (requires Node v20.19.0, runs on port 3001)
source ~/.nvm/nvm.sh && nvm use && npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```

### Server Commands

```bash
cd server

# Start dev server (port 3002)
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Build TypeScript
npm run build
```

## Quick Start: Running the Full Game

The game has two parts:
1. **Frontend** (Nuxt app) - runs on port 3001
2. **Multiplayer Server** (Socket.IO) - runs on port 3002

### Local Development (Computer Only)

**Terminal 1 - Start the frontend:**
```bash
cd /path/to/infinite-tictacs-game
source ~/.nvm/nvm.sh && nvm use && npm run dev
```

**Terminal 2 - Start the multiplayer server:**
```bash
cd /path/to/infinite-tictacs-game/server
npm run dev
```

Then open http://localhost:3001 in your browser.

### Testing on Phone (Cross-Play)

To test on your phone or enable cross-play between devices:

**Terminal 1 - Start frontend with network access:**
```bash
cd /path/to/infinite-tictacs-game
source ~/.nvm/nvm.sh && nvm use && npm run dev -- --host
```

**Terminal 2 - Start multiplayer server:**
```bash
cd /path/to/infinite-tictacs-game/server
npm run dev
```

**Find your local IP:**
```bash
# Mac
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr IPv4
```

**On your phone:**
1. Connect to the same WiFi network as your computer
2. Open browser and go to: `http://<YOUR_IP>:3001`
   - Example: `http://192.168.1.100:3001`

**Cross-play setup:**
1. Computer: Open `http://localhost:3001` → Create Online Game → Create Room
2. Phone: Open `http://<YOUR_IP>:3001` → Create Online Game → Join Room (enter code)

### Mobile Touch Controls

On mobile devices:
- **Tap** a cell to select it (cyan highlight)
- **Tap selected cell** or **double-tap** to place piece
- **Pinch** to zoom in/out (0.5x - 3x)
- **Drag** to pan around when zoomed

## Architecture

### Application Structure

```
app/                           # Frontend (Nuxt/Vue)
├── app.vue                    # Entry point - renders SnowEffect + TicTacToe
├── assets/styles/
│   └── design-system.css      # CSS variables, themes, and global styles
├── components/
│   ├── TicTacToe.vue          # Main game shell with start menu/game board transitions
│   ├── StartMenu.vue          # Game configuration (players, modes, rules, settings)
│   ├── GameBoard.vue          # Core game logic, board rendering, win detection
│   ├── OnlineGameBoard.vue    # Online multiplayer game board
│   ├── OnlineLobby.vue        # Online game lobby and room management
│   ├── PlayerTurnBar.vue      # Minimalistic player turn indicator
│   ├── CharacterPicker.vue    # Player symbol selection component
│   ├── GameModeCatalog.vue    # Browse available game mode presets
│   ├── GameModeSelector.vue   # Game mode selection UI
│   ├── HolidayBackground.vue  # Christmas theme background image
│   ├── SnowEffect.vue         # Falling snow animation (Christmas theme)
│   └── icons/                 # SVG icon components
└── composables/
    ├── useTheme.ts            # Theme management (auto/christmas/default)
    ├── useSocket.ts           # Socket.IO connection management
    ├── useOnlineGame.ts       # Online game state management
    └── useTouchBoard.ts       # Mobile touch gestures (pinch-zoom, tap-to-place)

server/                        # Multiplayer Server (Socket.IO)
├── src/
│   ├── index.ts               # Server entry point (Express + Socket.IO)
│   ├── ai/
│   │   ├── ServerAI.ts        # Server-side AI opponent logic
│   │   └── QLearningServer.ts # Q-Learning AI implementation
│   ├── rooms/
│   │   ├── RoomStore.ts       # Room management and storage
│   │   ├── RoomStateMachine.ts # Room state transitions
│   │   └── RoomCodeGenerator.ts # 6-letter room code generation
│   ├── socket/
│   │   └── handlers.ts        # Socket event handlers
│   └── utils/
│       └── RateLimiter.ts     # Rate limiting for socket events
└── package.json               # Server dependencies

shared/                        # Shared Types
├── types/
│   ├── index.ts               # Game types (Player, Board, etc.)
│   └── events.ts              # Socket.IO event types
└── engine/
    └── index.ts               # Shared game logic (move validation, win detection)
```

### Configuration
- **nuxt.config.ts**: SSR disabled (`ssr: false`), dev server on port 3001
- **Node Version**: v20.19.0 (specified in .nvmrc)
- **Dependencies**: @motionone/vue for animations, Vue 3.5.21

### Key Implementation Details

#### Component Hierarchy
1. **app.vue** - Mounts SnowEffect and TicTacToe
2. **TicTacToe.vue** - Manages game state (started/not started), renders StartMenu or GameBoard/OnlineLobby
3. **StartMenu.vue** - Online game setup: Host/Join selection, host name, role (Play/Spectate), allow spectators
4. **OnlineLobby.vue** - Room lobby: player list, game mode selection (host only), character picker, start game
5. **OnlineGameBoard.vue** - Online multiplayer game board with real-time sync
6. **GameBoard.vue** - Handles local game logic, board expansion, win detection, move history

#### Online Game Flow
1. **StartMenu**: Host enters name, chooses role (Play/Spectate), toggles Allow Spectators → Creates room
2. **OnlineLobby**: Players join via 6-letter code, pick characters. Host selects game mode (Classic/Speed Classic) and clicks Apply
3. **OnlineGameBoard**: Game in progress with real-time move sync

**Key constraints:**
- Host Role and Allow Spectators are **locked after room creation** (set in StartMenu)
- Game Mode can be changed in lobby by host until game starts

#### Theme System
- **useTheme composable** - Manages theme preference with localStorage persistence
- Three modes: `auto` (uses December detection), `christmas`, `default`
- CSS variables defined in `design-system.css` under `[data-theme="christmas"]`
- Christmas theme includes: HolidayBackground (bg image) + SnowEffect (falling snow)

#### Animations
- Uses `@motionone/vue` Motion component for page transitions
- Smooth enter/exit animations between StartMenu and GameBoard
- Example usage:
```vue
<Motion
  :initial="{ opacity: 0, y: 20, scale: 0.95 }"
  :animate="{ opacity: 1, y: 0, scale: 1 }"
  :exit="{ opacity: 0, y: -20, scale: 0.95 }"
  :transition="{ duration: 0.4, easing: 'ease-out' }"
>
```

## Game Features

### Multi-Player Support (Up to 10 Players)
- Support 2-10 players in a single game
- 10 unique player symbols: X, O, Square, Star, Triangle, Diamond, Circle, Plus, Heart, Pentagon
- Players take turns in sequential order
- Team mode available with shared symbols

### Dynamic Board Expansion
- The board dynamically expands beyond the traditional 3x3 grid
- Placing on any outer edge cell expands the board in that direction:
  - Top edge → adds row above
  - Bottom edge → adds row below
  - Left edge → adds column to the left
  - Right edge → adds column to the right
  - Corner → expands in both directions
- Creates a potentially infinite playing field

### Win Conditions
- Default: 4 in a row (horizontal, vertical, or diagonal)
- Configurable win length through game modes
- Win detection dynamically scans the entire expanded board

### Game Modes
Two built-in modes:
- **Classic**: Get 4 in a row to win, no time limit
- **Speed Classic**: Get 4 in a row to win, 5 seconds per turn

Host selects mode in the lobby before starting the game.

### Visual Effects for Invalid Moves
Three configurable effects for cells where players cannot place:
- **Dimmed Cells**: Reduces opacity of unavailable cells
- **Striped Pattern**: Adds diagonal stripe overlay (empty cells only)
- **Warning Icon**: Shows alert indicator

## Styling Guidelines

### CSS Custom Properties
All colors and spacing use CSS custom properties from `design-system.css`:
- Colors: `--color-bg`, `--color-surface`, `--color-text-primary`, etc.
- Spacing: `--space-1` through `--space-8`
- Typography: `--text-xs` through `--text-5xl`

### Theme-Specific Styles
Christmas theme overrides are in `design-system.css` lines 612-668:
```css
[data-theme="christmas"] {
  --color-bg: #120810;
  --color-surface: #2A1518;
  /* ... red/green tinted colors */
}
```
