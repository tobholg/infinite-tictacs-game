

# ✅ Infinite Tic-Tacs — Unified Game Modes Checklist

## Implementation Notes
- Start with [NEXT] marked feature
- Change [NEXT] to [X] when complete
- Mark next feature as [NEXT]
- Each mode should integrate with existing UI
- Maintain backward compatibility with classic mode


## 🎮 Core Game Modes

* [x] **Classic Mode**
  Standard infinite expansion Tic-Tac-Toe starting from a 3×3 grid.
* [x] **Speed Mode**
  15-second move timer for fast-paced matches.
* \[skip] **Blitz Mode**
  5-second turns — ultra-fast reflex-based mode.
* \[future] **Marathon Mode**
  No time limits, with save/resume for long-term games.

---

## 🧩 Special Rule Modes

* [x] **Gravity Mode**
  Pieces fall downward like Connect Four.
* [x] **King of the Hill**
  Controlling the central region for a set number of turns wins the game.
* \[NEXT] **Territory Mode**
  Win by controlling the largest continuous region (area control win condition).
* [ ] **Chain Reaction Mode**
  Placing or winning triggers adjacent same-symbol pieces to disappear.
* [ ] **Surrounded Cell Deletion**
  If a piece is surrounded on all four sides, it disappears.
* [ ] **Empty Cell Trigger Deletion**
  Choosing a surrounded empty cell deletes all adjacent pieces.
* [ ] **Collapse Mode**
  Outer board edges shrink inward every X turns.
* [ ] **Mirror Mode**
  Every move is mirrored across an axis (center, diagonal, etc.).
* [ ] **Decay Mode**
  Symbols fade and disappear after X turns.

---

## 👥 Multiplayer Variants

* [ ] **Team Mode**
  2v2 setup with shared symbols and alternating turns.
* [ ] **Elimination Mode**
  Last player with valid moves survives and wins.
* [ ] **Round Robin**
  Multi-round tournament structure.
* [ ] **Relay Mode**
  Teams alternate controlling the same set of turns.

---

## 🗺️ Board Variations

* [ ] **Hexagonal Grid**
  6-directional adjacency and win conditions.
* [ ] **3D Mode**
  Layered boards stacked vertically (z-axis gameplay).
* [ ] **Wraparound (Torus Mode)**
  Opposite edges connect (left → right, top → bottom).
* [ ] **Obstacle Mode**
  Pre-placed immovable blocks scattered on the board.
* [ ] **Void Mode**
  Random cells permanently disappear every few turns.
* [ ] **Black Hole Mode**
  Overloaded areas collapse, deleting themselves + neighbors.

---

## 💥 Power-up Modes

* [ ] **Power Pieces**
  Unique symbols with special effects (e.g., immune, multiplier).
* [ ] **Bomb Mode**
  Special moves destroy surrounding pieces.
* [ ] **Shield Mode**
  Protects one piece from being removed.
* [ ] **Swap Mode**
  Switch positions of two symbols.
* [ ] **Wildcard Mode**
  Random cells act as wildcards counting for any player.

---

## 🧠 AI & Practice Modes

* [ ] **AI Opponent**
  Single-player vs. computer with difficulty levels.
* [ ] **Puzzle Mode**
  Pre-set challenge boards with specific win goals.
* [ ] **Training Mode**
  Hints, tutorials, and guided practice sessions.
* [ ] **Analysis Mode**
  Replay finished games, highlight mistakes, and show alternate moves.

---

## 🛠️ Accessibility & QoL

* [ ] **Colorblind Support**
  Alternative patterns and shapes for symbols.
* [ ] **Sound Effects**
  Add audio cues for placement, wins, and expansions.
* [ ] **Move History**
  Step-through replay of all moves.
* [ ] **Statistics**
  Track wins, losses, territory size, and expansion stats.

---

## ⚡ Crazy Mix Modes

* [ ] **Gravity + Black Hole**
  Falling pieces with sudden collapses.
* [ ] **Decay + Territory**
  Constantly shifting board control.
* [ ] **Capture + Mirror**
  Flanking mechanics with mirrored chaos.

---

