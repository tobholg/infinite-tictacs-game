# role.md — Multiplayer Implementation Role & Safety Plan
**Project:** Infinite Tic-Tacs (Expanding-board Tic Tac Toe)  
**Feature:** Kahoot-style Online Multiplayer + preserve Local mode  
**Audience:** Code-seeing AI implementing the feature  
**Core rule:** Implement ONE chapter at a time, run tests, make sure it passes, then mark status before moving on.

---

## Status legend
- [ ] todo
- [~] ongoing
- [x] finished
- [!] blocked (state why)

---

## Non-negotiable safety requirements
The multiplayer implementation **must not introduce vulnerabilities** or fairness issues.

### Security / Abuse protection
- Never trust client state. **Server is authoritative**.
- Validate all inputs server-side:
  - room code
  - nickname length/charset
  - move coordinates
  - player id / token
- Rate limit:
  - join attempts per IP/socket
  - moves per player per turn
  - reconnect spam
- Prevent room-code brute forcing:
  - short cooldown after failed joins
  - randomized 6-char codes
- Avoid leaking sensitive info:
  - do not send IPs, internal IDs, stack traces to clients
  - send friendly error codes/messages only

### Fairness / Anti-cheat
- Server enforces:
  - adjacency rule / first-center rule
  - edge expansion before placement
  - correct turn order
  - timer deadlines
- Client only sends "intent" (row/col), never the new board.
- Reject invalid moves with explicit reasons.

### Reliability
- Handle disconnects gracefully.
- Reconnect restores seat using token.
- Host failover keeps session alive.
- Rooms auto-cleanup when empty/inactive.

### Code quality
- Shared rules extracted into pure engine.
- No duplication of game logic between client and server.
- All network payload types defined centrally.

---

## Implementation flow rules
1. **Before coding a chapter**
   - Read the chapter goal, tasks, dependencies.
   - If dependencies are unfinished, set chapter to [!] blocked.
2. **During coding**
   - Mark chapter/task as [~] ongoing.
   - Make only the changes needed for that chapter.
3. **After coding**
   - Run the chapter tests.
   - If tests pass, mark tasks [x] finished.
   - If tests fail, fix before moving on.
4. **Never implement two independent chapters in one pass.**
5. **If a chapter depends on another, complete dependency first.**

---

## Chapter 0 — Baseline + Feature Flags
**Goal:** Multiplayer can be enabled/disabled safely, local mode must keep working.

**Tasks**
- [x] Add env/feature flags:
  - `MULTIPLAYER_ENABLED`
  - `SOCKET_URL`
  - `ROOM_CODE_LENGTH` (default 6)
  - `ROOM_MAX_PLAYERS` (default 20)
  - `ROOM_IDLE_TTL_MINUTES` (default 15)
- [x] Add a top-level mode switch in UI:
  - Local play (unchanged behavior)
  - Online play (placeholder until later chapters)
- [x] Ensure local gameplay still runs without any server present.

**Tests (must pass)**
- [x] Manual: run app with multiplayer disabled → local game works exactly as before.
- [x] Manual: enable multiplayer flag → UI shows online option (even if not functional yet).

**Status**
- Chapter 0: [x]

---

## Chapter 1 — Shared Deterministic Game Engine
**Goal:** Single source of truth for rules used by server (and optionally client).

**Dependencies:** Chapter 0 finished.

**Tasks**
- [x] Create `shared/gameEngine.ts` (pure TS, no Vue/DOM).
- [x] Port/implement these functions from `GameBoard.vue`:
  - `createInitialState(players, rules)`
  - `isAdjacentToFilledCell(state,row,col)`
    - first move center-only
    - 8-direction adjacency after first move
  - `isEdgeCell(state,row,col)`
  - `expandBoard(state,row,col)`
    - MUST match current shifting and `boardOffset` logic
    - MUST shift moveHistory coordinates correctly when expanding top/left
  - `checkWinner(state)` winLength=4
  - `applyMove(state, playerId, row, col)`:
    - validate legality
    - expand if edge BEFORE placement
    - place symbol
    - update history
    - check win/draw
    - advance currentPlayerIndex
    - return `{ ok, state, errorCode? }`
- [x] Define serializable `GameState` and `RoomRules` types.

**Tests (must pass)**
- [x] Unit (new): engine parity tests:
  - first move only center
  - adjacency enforcement
  - edge expansions shift coords correctly
  - win detection length 4
  - turn rotation for 2–10 players
- [x] Manual parity check:
  - run same move sequence in local mode (old logic) and engine → identical board + winner.

**Status**
- Chapter 1: [x]

---

## Chapter 2 — Realtime Server Foundation (Socket.IO)
**Goal:** Running authoritative multiplayer server with rooms and snapshots.

**Dependencies:** Chapter 1 finished.

**Tasks**
- [x] Create separate Node/TS server (e.g., `/multiplayer-server`).
- [x] Add Socket.IO server and basic Express/http setup.
- [x] Implement RoomStore:
  - `rooms: Map<roomCode, Room>`
- [x] Room schema includes:
  - `code`, `hostId`, `status`, `phase`
  - `players[]` `{id,name,symbol,isAI,aiDifficulty,connected,isSpectator?}`
  - `rules`
  - `state` (engine state)
  - timestamps for cleanup
- [x] Add collision-safe room code generator.
- [x] Add room cleanup timer (TTL, empty room removal).
- [x] Add safe input validation helpers (nickname, code format).

**Tests (must pass)**
- [x] Unit: room code collision test.
- [x] Unit: room cleanup deletes inactive rooms.
- [x] Manual: start server → create empty room programmatically → room exists.

**Status**
- Chapter 2: [x]

---

## Chapter 3 — Event Contract + Lobby Features
**Goal:** Kahoot-style lobby working end-to-end.

**Dependencies:** Chapter 2 finished.

**Tasks**
- [x] Implement events:
  - `host:create_room`
  - `player:join_room`
  - `room:snapshot`
  - `lobby:updated`
  - `room:error`
- [x] Validate:
  - max players
  - lobby only joinable in LOBBY phase
  - nickname sanitation
- [x] Return `playerId` + `rejoinToken` on join.

**Tests (must pass)**
- [x] Integration: 1 host creates room, 3 players join, all receive lobby updates.
- [x] Integration: joining invalid code rejects safely, rate limit kicks after N tries.
- [x] Manual: lobby UI shows correct list and host controls.

**Status**
- Chapter 3: [x]

---

## Chapter 4 — Phase Machine + Countdown Sync
**Goal:** Kahoot pacing: host starts round → synced countdown → round begins.

**Dependencies:** Chapter 3 finished.

**Tasks**
- [x] Implement server phase machine:
  - `LOBBY → COUNTDOWN → ROUND_ACTIVE → ROUND_RESULTS → COMPLETED`
- [x] Implement `host:start_round` / `host:start_game`.
- [x] Countdown:
  - server emits `countdown:tick {secondsRemaining, serverTimeMs}`
  - clients render countdown using server time
- [x] When countdown ends:
  - init engine state
  - move to ROUND_ACTIVE
  - broadcast `round:started` + `game:state`

**Tests (must pass)**
- [x] Integration: countdown ticks at correct intervals, no early/late transition.
- [x] Manual: two clients display same countdown within reasonable drift.

**Status**
- Chapter 4: [x]

---

## Chapter 5 — Move Submission + Server Authority
**Goal:** Players can play online with full rule enforcement.

**Dependencies:** Chapter 4 finished.

**Tasks**
- [x] Implement `player:submit_move`.
- [x] Server uses engine `applyMove`.
- [x] Broadcast `game:state` after accepted move.
- [x] Emit `move:ack` or `game:error` for rejected move.
- [x] Enforce:
  - correct phase
  - correct turn player
  - adjacency + center-first
  - edge expansion before placement
  - empty cell

**Tests (must pass)**
- [x] Integration: two clients make legal moves → both stay synced.
- [x] Integration: illegal moves rejected (out of turn, non-adjacent, occupied).
- [x] Manual: expanding edge shifts board identically for all clients.

**Status**
- Chapter 5: [x]

---

## Chapter 6 — Authoritative Turn Timer
**Goal:** Online timers match local rules and are cheat-proof.

**Dependencies:** Chapter 5 finished.

**Tasks**
- [x] Server tracks turn deadline / timeLeft.
- [x] Server emits timer updates in `game:state` or `countdown:tick`.
- [x] On timeout:
  - if 2 players → other player wins
  - if 3+ players → skip turn
- [x] Stop timers on game over.

**Tests (must pass)**
- [x] Integration: timeout triggers correct outcome for 2p and 3p rooms.
- [x] Manual: timer display stays synced across devices.

**Status**
- Chapter 6: [x]

---

## Chapter 7 — Scoreboard + Round Results
**Goal:** Kahoot-style results screen and cumulative scores.

**Dependencies:** Chapter 6 finished.

**Tasks**
- [x] Define scoreboard model:
  - `scores[playerId]`
  - optional streak/bonus (simple at MVP)
- [x] On round end:
  - update scores
  - broadcast `round:results` + `scoreboard:updated`
- [x] Host can start next round; keep scores, reset board.

**Tests (must pass)**
- [x] Integration: play to win → results + scores broadcast.
- [x] Manual: scoreboard UI updates for all players.

**Status**
- Chapter 7: [x]

---

## Chapter 8 — Server-side AI Players
**Goal:** AI works in online sessions reliably.

**Dependencies:** Chapter 5 finished. (Timers/scoreboard optional.)

**Tasks**
- [x] Import AI module server-side.
- [x] If next player is AI:
  - compute move
  - apply via engine
  - broadcast state
- [x] Add thinking delay.

**Tests (must pass)**
- [x] Integration: room with 1 AI + humans completes turns correctly.
- [x] Manual: AI moves follow adjacency + expansion rules.

**Status**
- Chapter 8: [x]

---

## Chapter 9 — Reconnect + Host Failover
**Goal:** Sessions survive disconnects.

**Dependencies:** Chapter 3 finished.

**Tasks**
- [x] Client stores `playerId` + `rejoinToken`.
- [x] On reconnect:
  - emit `player:reconnect`
  - restore seat
  - send latest snapshots
- [x] Host failover:
  - if host disconnects → promote next eligible player
  - broadcast `host:transferred`

**Tests (must pass)**
- [x] Integration: disconnect/reconnect restores same player.
- [x] Integration: host disconnect → new host assigned, game continues.
- [x] Manual: reconnect UI is smooth.

**Status**
- Chapter 9: [x]

---

## Chapter 10 — Spectators + Capacity Control
**Goal:** Extra joiners can watch but not play.

**Dependencies:** Chapter 3 finished.

**Tasks**
- [x] If room full and spectators allowed:
  - join as spectator
  - receive state + scores
  - cannot submit moves
- [x] Enforce max players server-side.

**Tests (must pass)**
- [x] Integration: spectator receives updates, move submissions rejected.
- [x] Manual: UI labels spectator clearly.

**Status**
- Chapter 10: [x]

---

## Final acceptance criteria
All must be true before declaring feature complete:

- [x] Local mode unchanged and works offline.
- [x] Host creates lobby and gets PIN.
- [x] Players join by PIN from other devices.
- [x] Countdown sync works.
- [x] Infinite expanding-board rules identical online/local.
- [x] Server rejects illegal/late moves safely.
- [x] Everyone sees same board instantly.
- [x] Timers fair and server-authoritative.
- [x] Scoreboard updates after rounds.
- [x] AI works online.
- [x] Reconnect restores seats.
- [x] Host failover keeps room alive.
- [x] Rooms auto-cleanup.

---

## Notes for the implementing AI
- When uncertain about parity with local rules, **prefer matching existing GameBoard.vue behavior**.
- Avoid new complexity unless the chapter demands it.
- Keep server payloads small but complete enough to reconstruct UI.
- If a task risks breaking local mode, stop and fix before continuing.

