# Infinite Tic-Tacs

A multiplayer Tic-Tac-Toe game with dynamic board expansion, supporting up to 10 players online.

## Features

- **Dynamic Board Expansion** - The board grows infinitely as players place pieces on edges
- **Online Multiplayer** - Create rooms and invite friends with a 6-letter code
- **Up to 10 Players** - Support for 2-10 players with unique symbols
- **AI Opponents** - Add bots with Easy, Medium, or Hard difficulty
- **Game Modes**:
  - **Classic** - Get 4 in a row to win, no time limit
  - **Speed Classic** - 5 seconds per turn for fast-paced gameplay
- **Spectator Mode** - Watch games without participating
- **Mobile Support** - Touch controls with pinch-to-zoom and tap-to-place

## Quick Start

### Requirements

- Node.js v20.19.0 (use `nvm use` if you have nvm installed)
- npm

### Running Locally

**1. Install dependencies:**

```bash
# Frontend
npm install

# Server
cd server && npm install
```

**2. Start both servers:**

Terminal 1 - Frontend (port 3001):
```bash
npm run dev
```

Terminal 2 - Multiplayer server (port 3002):
```bash
cd server && npm run dev
```

**3. Open http://localhost:3001 in your browser**

### Playing on Mobile / Cross-Device

To play across devices on the same network:

```bash
# Start frontend with network access
npm run dev -- --host

# Find your local IP
ipconfig getifaddr en0  # Mac
hostname -I | awk '{print $1}'  # Linux
```

Then open `http://<YOUR_IP>:3001` on your phone or other devices.

## How to Play

1. **Host Game** - Create a room and share the 6-letter code with friends
2. **Join Game** - Enter a room code to join an existing game
3. **Place Pieces** - Click/tap cells to place your symbol
4. **Win Condition** - Get 4 of your symbols in a row (horizontal, vertical, or diagonal)
5. **Board Expansion** - Placing on edge cells expands the board in that direction

### Mobile Controls

- **Tap** a cell to select it (highlighted in cyan)
- **Tap again** or **double-tap** to confirm placement
- **Pinch** to zoom in/out (0.5x - 3x)
- **Drag** to pan around when zoomed

## Project Structure

```
app/                    # Frontend (Nuxt/Vue)
├── pages/              # Nuxt pages (file-based routing)
│   ├── index.vue       # Home page with StartMenu
│   └── game/[roomCode].vue  # Online game room
├── components/         # Vue components
│   ├── StartMenu.vue   # Host/Join game selection
│   ├── OnlineLobby.vue # Room lobby
│   └── OnlineGameBoard.vue  # Game board
├── composables/        # Vue composables
│   ├── useOnlineGame.ts    # Online game state
│   └── useSocket.ts        # Socket.IO connection
└── assets/styles/      # Global styles

server/                 # Multiplayer Server (Socket.IO)
├── src/
│   ├── index.ts        # Server entry point
│   ├── rooms/          # Room management
│   └── socket/         # Socket event handlers
└── package.json

shared/                 # Shared code between frontend and server
├── types/              # TypeScript types
└── engine/             # Game logic (win detection, move validation)
```

## Development Commands

```bash
# Frontend
npm run dev          # Start dev server (port 3001)
npm run build        # Build for production
npm run preview      # Preview production build

# Server
cd server
npm run dev          # Start dev server (port 3002)
npm run build        # Compile TypeScript
```

## Tech Stack

- **Frontend**: Nuxt 4, Vue 3, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Animation**: Motion One (@motionone/vue)

## License

MIT
