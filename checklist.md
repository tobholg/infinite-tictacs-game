

# ✅ Infinite Tic-Tacs — Game Modes & Rules Checklist

## Implementation Notes
- Start with [NEXT] marked feature
- Change [NEXT] to [X] when complete
- Mark next feature as [NEXT]
- Game Modes define **how you win**
- Game Rules are **stackable modifiers** that can apply to any mode
- Each implementation should integrate with existing UI

---

## 🎮 Game Modes (Win Conditions)

* [x] **Classic Mode**
  Win with 3-in-a-row (or 4-in-a-row for 4-player). Standard infinite expansion.
* [x] **King of the Hill**
  Win by controlling the central region for a set number of turns.
* [x] **Territory Mode**
  Win by controlling the largest continuous region (area control).
* [x] **Chain Reaction Mode**
  Win by triggering automatic spread combos when placing near your own clusters.
* [x] **Team Mode (2v2)**
  Teams share symbols, alternate turns, coordinate strategy. First team to 3-in-a-row wins.
* [x] **Elimination Mode**
  Players knocked out when they have no valid moves remaining. Last player standing wins.
* \[SKIP] **Round Robin**
  Multi-match tournament with scoring across multiple games.
* [ ] **Hexagonal Grid Mode**
  Board uses hex cells with 6-directional win conditions.
* [ ] **Wraparound Mode**
  Opposite edges connect (torus). Win lines can loop across the board.
* [ ] **Obstacle Mode**
  Board starts with blocked cells. Win by navigating around choke points.

---

## ⚔️ Game Rules (Stackable Modifiers)

### Time & Pace
* [x] **Time Limit Rule**
  - 15 seconds = Speed Mode (implemented)
  - 5 seconds = Blitz Mode
  - No limit = Marathon Mode (default)
  - Configurable per-move timer

### Board Mechanics
* [x] **Gravity Rule**
  Pieces fall downward like Connect Four.
* [ ] **Surrounded Cell Deletion Rule**
  - If a piece is surrounded on all four sides, it disappears
  - Choosing a surrounded empty cell deletes all adjacent pieces
* [ ] **Collapse Rule**
  Outer board edges shrink inward every X turns.
* [ ] **Mirror Rule**
  Each move is mirrored across the board's axis (center, diagonal, etc.).
* [ ] **Decay Rule**
  Pieces fade and disappear after a set number of turns.
* [ ] **Void Rule**
  Random cells permanently disappear every few turns.
* [ ] **Black Hole Rule**
  Overloaded areas collapse, deleting themselves + neighbors.

### Power-Ups & Special Abilities
* [ ] **Power-Up Rule**
  Special cells occasionally spawn:
  - **Wildcard**: Counts for any player
  - **Bomb**: Destroys surrounding pieces
  - **Shield**: Protects one piece from removal
  - **Swap**: Switch positions of two symbols

---

## 🧠 AI & Practice Features

* [ ] **AI Opponent**
  Single-player vs. computer with difficulty levels.
* [ ] **Puzzle Mode**
  Pre-set challenge boards with specific win goals.
* [ ] **Training Mode**
  Hints, tutorials, and guided practice sessions.
* [ ] **Analysis Mode**
  Replay finished games, highlight mistakes, show alternate moves.

---

## 🛠️ Accessibility & Quality of Life

* [ ] **Colorblind Support**
  Alternative patterns and shapes for symbols.
* [ ] **Sound Effects**
  Audio cues for placement, wins, and expansions.
* [ ] **Move History**
  Step-through replay of all moves.
* [ ] **Statistics**
  Track wins, losses, territory size, expansion stats.
* [ ] **Save/Resume Games**
  Pause and continue long-term matches.

---

## 🎨 UI/UX Improvements

* [ ] **Game Mode Selector**
  Clean interface to choose one game mode.
* [ ] **Rule Modifier Toggles**
  Checkboxes/switches to enable multiple stackable rules.
* [ ] **Preset Combinations**
  Quick-select popular mode + rule combos (e.g., "Gravity + Territory").
* [ ] **Custom Game Creator**
  Save and name your own mode + rule combinations.

---

## 🔮 Future Advanced Modes

* [ ] **3D Mode**
  Layered boards stacked vertically (z-axis gameplay).
* [ ] **Relay Mode**
  Teams alternate controlling the same set of turns.

---

