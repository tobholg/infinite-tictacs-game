# role.md — Post-Multiplayer Enhancements (Animations, AI Cue, Rematch UX)
**Project:** Infinite Tic-Tacs  
**Scope:** ONLY the new changes listed below.  
**Assumption:** Multiplayer + online/local modes already exist and work.  
**Audience:** Code-seeing AI implementing the enhancements.  
**Core rule:** Implement **ONE chapter at a time**. If a chapter depends on another, finish dependency first. After each chapter, run tests, then update checkmarks.

---

## Status legend
- [ ] todo
- [~] ongoing
- [x] finished
- [!] blocked (state why)

---

## Non-negotiable constraints
- **Expansion animation settings are ONLINE-ONLY.**
  - Local mode must NOT get expansion animation options or logic.
- **Online expansion animation default = Option A (Tabletop slide-out).**
  - Options B and C must be selectable in Online “Show Settings”.
- **AI delay cue applies to BOTH local and online modes.**
  - AI waits 1–3s + chip pulse + “…” bubble.
- **Rematch visual feedback applies to ONLINE only.**
- **Do NOT add Framer Motion.**
  - Use existing Motion One (`@motionone/vue`) and/or CSS transitions.

---

## Chapter N1 — AI Delay + Thinking Cue (Local + Online)
**Goal:** AI waits randomly 1–3 seconds before moving, while showing a soft board-game “thinking” cue.

**Dependencies:** None.

### Tasks
- [x] **Online (server):**
  - update AI delay range to **1000–3000ms** random before executing AI move.
- [x] **Local (client):**
  - add the same random delay **1000–3000ms** before placing AI move.
- [x] **Thinking cue (both boards):**
  - [x] compute `isAIThinking` when the **current player is AI** and AI move not yet applied.
  - [x] pulse the AI player chip gently (low amplitude, board-game feel).
  - [x] show small **"…" bubble** near the AI chip while thinking.
- [x] Stop cue instantly on:
  - [x] AI move applied
  - [x] game ends (win/draw/timeout)
  - [x] game reset / leave room

### Tests (must pass)
- [ ] Manual online: watch 10 AI turns → delay is random 1–3s, never instant.
- [ ] Manual local: watch 10 AI turns → delay is random 1–3s.
- [ ] Manual both: chip pulse + "…" appears only during AI delay and disappears after move.

**Status**
- Chapter N1: [x]

---

## Chapter N2 — Rematch / New Game Visual Feedback (Online)
**Goal:** Host gets immediate visual response when starting next round.

**Dependencies:** None.

### Tasks
- [x] In `OnlineResults.vue` (host controls):
  - add local UI state `isStartingNextRound`.
- [x] On host click "Play Again / Rematch / New Game":
  - [x] set `isStartingNextRound = true` immediately.
  - [x] disable the button to prevent double starts.
  - [x] apply pressed/inset style.
  - [x] change label to **"Resetting…"**.
- [x] Optional micro-state:
  - [x] keep "Resetting…" visible for ~0.5–1s before countdown overlay begins.
- [x] Reset `isStartingNextRound` when COUNTDOWN phase starts.

### Tests (must pass)
- [ ] Manual online (host): button instantly changes to pressed "Resetting…" and disables.
- [ ] Manual online: no double countdowns from repeated clicks.
- [ ] Manual online (non-host): clear transition into existing countdown overlay.

**Status**
- Chapter N2: [x]

---

## Chapter N3 — Separate Online vs Local “Show Settings” Popups
**Goal:** Online settings becomes its own popup so online-only options don’t leak into local.

**Dependencies:** None.

### Tasks
- [x] Split current shared settings into:
  - [x] `LocalSettingsPopup.vue` (keep existing local settings unchanged - kept as SettingsModal.vue).
  - [x] `OnlineSettingsPopup.vue` (new).
- [x] Wire:
  - [x] Local mode "Show Settings" → LocalSettingsPopup.
  - [x] Online host setup/lobby "Show Settings" → OnlineSettingsPopup.
- [x] Ensure online settings persistence is **online-scoped only** (room-scoped or localStorage),
  and never affects local settings.

### Tests (must pass)
- [ ] Manual local: settings popup looks and behaves exactly as before.
- [ ] Manual online: settings popup opens the new online version.
- [ ] Manual: changing online settings does not change local settings.

**Status**
- Chapter N3: [x]

---

## Chapter N4 — Online Board Expansion Animations A/B/C
**Goal:** Add three expansion animation styles to OnlineGameBoard.
- **Default online:** Option A — “Tabletop slide-out”
- Options B/C selectable in OnlineSettingsPopup.

**Dependencies:** Chapter N3 finished.

### Tasks
- [x] Add online setting `expansionAnimationMode` with values:
  - [x] `A_slideOut` (**DEFAULT**)
  - [x] `B_popInTiles`
  - [x] `C_stretchSettle`
- [x] Add selector UI to **OnlineSettingsPopup only**.
- [x] In `OnlineGameBoard.vue`:
  - [x] store `prevBoardSize` and `prevBoardOffset`.
  - [x] on each `gameState` update, compute `expandedEdges` by comparing prev vs new.
  - [x] mark newly inserted rows/cols/tiles for a short animation window (400–800ms).
- [x] Implement Motion One / CSS animations:
  - [x] **A Slide-out (default):**
    - new top row slides down + fades in
    - new bottom row slides up + fades in
    - new left col slides right + fades in
    - new right col slides left + fades in
  - [x] **B Pop-in tiles:**
    - new tiles scale 0.85 → 1.0 with gentle settle
    - slight stagger per tile
  - [x] **C Stretch + settle:**
    - board container scales 1.0 → 1.03 → 1.0
    - new tiles fade in during stretch
- [x] Clear expansion flags after animation completes.
- [x] Ensure expansion animation does not break:
  - [x] scroll-to-last-move
  - [x] input gating (no extra clicks)
  - [x] winning cell styling

### Tests (must pass)
- [ ] Manual online default: edge expansion plays A slide-out on all clients.
- [ ] Manual online: switching to B/C in settings changes next expansion behavior.
- [ ] Manual online: corner expansion animates both directions correctly.
- [ ] Manual online: no layout jank; scroll-to-latest still works.

**Status**
- Chapter N4: [x]

---

## Chapter N5 — Winner Reveal Hold + Winning Line Animation (Online)
**Goal:** After win, keep board visible 3–5s and spotlight the winning 4 cells before showing OnlineResults.

**Dependencies:** None strict. Recommended after N4.

### Tasks
- [x] Add client-side subphase `WIN_REVEAL` (client-only; server unchanged).
- [x] On receiving `round:results`:
  - [x] store `winningCells`.
  - [x] switch to `WIN_REVEAL`.
  - [x] disable all board input.
  - [x] start a 3–5s timer.
- [x] During `WIN_REVEAL`:
  - [x] keep `OnlineGameBoard.vue` rendered (read-only).
  - [x] apply **Sequential Spotlight** on winning cells:
    - cells flash one-by-one along the line
    - then hold all four highlighted briefly
- [x] After timer ends:
  - [x] transition to `OnlineResults.vue` as before.
- [x] Ensure this hold does not block rematch flow.

### Tests (must pass)
- [ ] Manual online: win occurs → board stays visible ~3–5s.
- [ ] Manual online: all clients see sequential winning-line spotlight.
- [ ] Manual online: auto-transition to OnlineResults after reveal.
- [ ] Manual online: no moves possible during reveal.

**Status**
- Chapter N5: [x]

---

## Final acceptance criteria (Enhancements)
- [ ] **AI delay** is random 1–3s in both local + online.
- [ ] **AI thinking cue** (chip pulse + “…”) shows only during AI delay in both modes.
- [ ] **Rematch button** gives instant pressed “Resetting…” feedback online.
- [ ] **Online vs Local settings** are separate popups.
- [ ] **Online settings** includes expansion selector A/B/C.
- [ ] **Default online expansion** uses Option A slide-out.
- [ ] **Winner reveal** holds board 3–5s and spotlights winning line before results.
- [ ] Local mode unchanged except AI delay/cue.

---
