# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4.1.2 application that currently implements a Tic-Tac-Toe game as the main feature. The application is configured to run as a client-only SPA (SSR is disabled).

## Development Commands

```bash
# Start development server (requires Node v20.19.0)
source ~/.nvm/nvm.sh && nvm use && npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```

## Architecture

### Application Structure
- **app/app.vue**: Main application entry point that renders the TicTacToe component
- **app/components/**: Contains Vue components
  - `TicTacToe.vue`: Main game component with game logic, state management, and UI
  - `icons/`: Reusable SVG icon components (XIcon.vue, OIcon.vue)

### Configuration
- **nuxt.config.ts**: SSR is disabled (`ssr: false`), running as client-side SPA
- **Node Version**: Uses Node v20.19.0 (specified in .nvmrc)

### Key Implementation Details
- The game uses Vue 3 Composition API with TypeScript
- Icon components are parameterized with props for size, color, and stroke width
- Game state is managed locally within the TicTacToe component using Vue refs
- Win detection checks 8 possible winning combinations

## Advanced Game Features Requirements

This is not a regular tic-tac-toe game. It includes the following advanced features:

### Multi-Player Support (Up to 4 Players)
- Support 2-4 players in a single game
- Player symbols:
  - Player 1: X (already implemented)
  - Player 2: O (already implemented)
  - Player 3: Square (to be implemented)
  - Player 4: Star (to be implemented)
- Players take turns in sequential order

### Dynamic Board Expansion
- The board can dynamically expand beyond the traditional 3x3 grid
- When a player places their mark on any outer edge cell of the current board, the board expands:
  - Placing on the top edge: adds a new row above
  - Placing on the bottom edge: adds a new row below
  - Placing on the left edge: adds a new column to the left
  - Placing on the right edge: adds a new column to the right
  - Placing on a corner: expands in both relevant directions
- This creates a potentially infinite playing field limited only by practical display constraints

### Win Conditions
- Win condition remains **3 in a row** (horizontal, vertical, or diagonal) regardless of board size
- With an expandable board and multiple players, win detection needs to:
  - Check for 3-in-a-row sequences dynamically across the entire expanded board
  - Handle wins for all 4 possible players
  - Scan all possible 3-cell combinations as the board grows