# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Infinite Tic-Tacs** is a Nuxt 4.1.2 application featuring an advanced Tic-Tac-Toe game with dynamic board expansion, multi-player support (up to 10 players), and multiple game modes. The application runs as a client-only SPA (SSR is disabled).

## Development Commands

```bash
# Start development server (requires Node v20.19.0, runs on port 3001)
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

```
app/
├── app.vue                    # Entry point - renders SnowEffect + TicTacToe
├── assets/styles/
│   └── design-system.css      # CSS variables, themes, and global styles
├── components/
│   ├── TicTacToe.vue          # Main game shell with start menu/game board transitions
│   ├── StartMenu.vue          # Game configuration (players, modes, rules, settings)
│   ├── GameBoard.vue          # Core game logic, board rendering, win detection
│   ├── CharacterPicker.vue    # Player symbol selection component
│   ├── GameModeCatalog.vue    # Browse available game mode presets
│   ├── GameModeSelector.vue   # Game mode selection UI
│   ├── GameModeParliament.vue # Parliament-specific mode component
│   ├── HolidayBackground.vue  # Christmas theme background image
│   ├── SnowEffect.vue         # Falling snow animation (Christmas theme)
│   ├── ProgressIndicator.vue  # Progress indicator component
│   └── icons/                 # SVG icon components
│       ├── XIcon.vue, OIcon.vue, SquareIcon.vue, StarIcon.vue
│       ├── TriangleIcon.vue, DiamondIcon.vue, CircleIcon.vue
│       ├── PlusIcon.vue, HeartIcon.vue, PentagonIcon.vue
│       └── RefreshIcon.vue, ExitIcon.vue, CloseIcon.vue, etc.
└── composables/
    └── useTheme.ts            # Theme management (auto/christmas/default)
```

### Configuration
- **nuxt.config.ts**: SSR disabled (`ssr: false`), dev server on port 3001
- **Node Version**: v20.19.0 (specified in .nvmrc)
- **Dependencies**: @motionone/vue for animations, Vue 3.5.21

### Key Implementation Details

#### Component Hierarchy
1. **app.vue** - Mounts SnowEffect and TicTacToe
2. **TicTacToe.vue** - Manages game state (started/not started), renders StartMenu or GameBoard
3. **StartMenu.vue** - Configures players, game modes, rules, visual settings
4. **GameBoard.vue** - Handles game logic, board expansion, win detection, move history

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
- Default: 3 in a row (horizontal, vertical, or diagonal)
- Configurable win length through game modes
- Win detection dynamically scans the entire expanded board

### Game Modes & Rules
- Multiple preset game modes with configurable rules
- Favorites system for quick access to preferred modes
- Visual settings: theme selection, "can't place" effects (dimmed cells, striped pattern, warning icon)
- Time limits configurable per game

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
