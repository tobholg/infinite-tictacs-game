## Updated Multiplayer Implementation Checklist (AI-ready)

### Phase 0 — Modes & config

* [x] Keep **two modes** in UI and logic:

  * [x] **Local mode** = current behavior, no socket, fully offline.
  * [x] **Online Kahoot mode** = new flow.
* [x] Add feature flag/envs:

  * [x] `MULTIPLAYER_ENABLED`
  * [x] `SOCKET_URL`
  * [x] `ROOM_CODE_LENGTH` (default 6)
  * [x] `ROOM_MAX_PLAYERS` (default 20, allow config)
  * [x] `ROOM_IDLE_TTL_MINUTES` (default 15)

---

### Phase 1 — Shared deterministic game engine

* [x] Create pure TS engine module usable by server (and optionally client):

  * [x] `createInitialState(players, rules)`
  * [x] `isAdjacentToFilledCell(state,row,col)`
    *first move center-only + 8-direction adjacency*
  * [x] `isEdgeCell(state,row,col)`
  * [x] `expandBoard(state,row,col)`
    *must match shifting + offset rules from GameBoard.vue*
  * [x] `checkWinner(state)` with winLength=4
  * [x] `applyMove(state, playerId, row, col)`:

    * validate legality
    * expand on edge BEFORE placement
    * place symbol
    * update moveHistory
    * check winner/draw
    * advance turn
    * return `{ ok, state, error? }`
* [x] Ensure state is JSON-serializable and includes:

  * [x] board, boardSize, boardOffset
  * [x] currentPlayerIndex
  * [x] winner, winningCells
  * [x] moveHistory (or enough for UI effects)
  * [x] timer fields (`timeLeft`, `turnDeadline`, etc.)

---

### Phase 2 — Realtime server foundation (Socket.IO)

* [x] Add separate Node/TS Socket.IO server.
* [x] Implement RoomStore:

  * [x] start with in-memory Map
  * [x] schema:

    * [x] `code`, `hostId`, `status`
    * [x] `players[]` `{id,name,symbol,isAI,aiDifficulty,connected,isSpectator?}`
    * [x] `rules` `{winLength:4,timeLimit?,playerCount,...}`
    * [x] `state` (engine state)
    * [x] `phase` (state machine below)
    * [x] `createdAt`, `lastActivityAt`
* [x] Collision-safe room code generator.
* [x] Cleanup job:

  * [x] delete room if empty OR inactive > TTL

---

### Phase 3 — Event contract (final)

**Client → Server**

* [x] `host:create_room` `{ hostName, rules, allowSpectators, maxPlayers }`
* [x] `player:join_room` `{ roomCode, name, playerId?, rejoinToken? }`
* [x] `host:start_round` (or `host:start_game`)
* [x] `player:submit_move` `{ roomCode, playerId, row, col }`
* [x] `player:leave_room`
* [ ] `player:request_state`
* [x] `player:reconnect` `{ roomCode, playerId, rejoinToken }`

**Server → Client**

* [x] `room:created` `{ roomCode, hostToken, roomSnapshot }`
* [x] `room:joined` `{ roomSnapshot, yourPlayerId, rejoinToken }`
* [x] `lobby:updated` `{ players, hostId, rules, status }`
* [x] `countdown:tick` `{ secondsRemaining, serverTimeMs }`
* [x] `round:started` `{ gameState, serverTimeMs, turnDeadlineMs }`
* [x] `move:ack` `{ accepted, reason? }`
* [x] `game:state` `{ gameState }`
* [x] `round:results` `{ winner, winningCells, isDraw, scoreboard }`
* [x] `scoreboard:updated` `{ scoreboard }`
* [x] `host:transferred` `{ newHostId }`
* [x] `room:error` `{ code, message }`

---

### Phase 4 — Lobby state machine (Kahoot pacing)

* [x] Implement server-side phase machine:

  * [x] `LOBBY`
  * [x] `COUNTDOWN`
  * [x] `ROUND_ACTIVE`
  * [x] `ROUND_RESULTS`
  * [x] `COMPLETED`
* [x] Only host can transition phases.
* [x] Server validates legal transitions.

---

### Phase 5 — Countdown & timer authority

* [x] When host starts round:

  * [x] server enters `COUNTDOWN`
  * [x] emits `countdown:tick` each second with serverTime
  * [x] after countdown → `ROUND_ACTIVE`
* [x] During `ROUND_ACTIVE`:

  * [x] server tracks turn timer / deadline
  * [x] emits time left in `game:state` or `countdown:tick`
* [x] On timeout:

  * [x] 2 players → other player wins
  * [x] 3+ players → skip turn
  * [x] server applies via engine and broadcasts
* [x] Prevent client drift by using server timestamps.

---

### Phase 6 — Move submission rules (online)

* [x] Server enforces:

  * [x] game not over
  * [x] correct phase (`ROUND_ACTIVE`)
  * [x] 1 accepted move per turn
  * [x] correct player's turn
  * [x] empty cell
  * [x] adjacency / first center rule
  * [x] edge expansion before placement
* [x] Reject late moves after deadline.
* [x] Throttle:

  * [x] join attempts per IP/socket (5 per 30s, 60s block)
  * [x] move spam per player (30 per 10s)
  * [x] room creation (3 per 60s, 120s block)
  * [x] reconnection attempts (10 per 60s, 30s block)
  * [x] misc actions like add/remove AI (20 per 30s)

---

### Phase 7 — Scoreboard & round results (Kahoot style)

Your local game doesn't score, so online mode adds scoring.

* [x] Define scoreboard model:

  * [x] `score[playerId]`
  * [ ] optional `streaks`, `fastMoveBonus`, etc.
* [x] At round end:

  * [x] compute winner/draw
  * [x] update scores
  * [x] broadcast `round:results` + `scoreboard:updated`
* [x] Host can start next round:

  * [x] reset board state (engine) but keep scores

*(If you don't want rounds yet, still keep scoreboard hooks for later.)*

---

### Phase 8 — Server-side AI turns

* [x] Allow AI players in online lobbies.
* [x] If next player is AI on server:

  * [x] call AI module to get move
  * [x] apply via engine
  * [x] broadcast state
* [x] Add small thinking delay (500-1500ms).

---

### Phase 9 — Client integration (without breaking local mode)

* [x] Add Online entry screens:

  * [x] Host: create room + show PIN + live lobby list
  * [x] Player: join by PIN + name
* [x] Online GameBoard:

  * [x] renders from `game:state` only
  * [x] clicking cell emits `player:submit_move`
  * [x] no local `makeMove` in online mode
* [x] Local GameBoard stays unchanged.

---

### Phase 10 — Reconnect + host failover

* [x] Client stores `playerId` + `rejoinToken`.
* [x] On reconnect:

  * [x] emit `player:reconnect`
  * [x] server restores seat + sends current snapshots
* [x] Host failover:

  * [x] server maintains host queue
  * [x] if host disconnects → promote next eligible player
  * [x] broadcast `host:transferred`

---

### Phase 11 — Spectators + capacity

* [x] If room is full:

  * [x] allow join as spectator if enabled
  * [x] spectators receive state/score updates
  * [x] spectators cannot submit moves
* [x] Server enforces max players.

---

### Phase 12 — Testing essentials

* [x] Server unit tests for:

  * [x] room code collisions
  * [x] applyMove legality parity with local rules
  * [x] expansion shifting correctness
  * [x] host transfer
  * [x] RateLimiter sliding window and blocking
  * [x] Turn timeout behavior (2p vs 3+p)
* [ ] Socket integration test harness:

  * [ ] simulate 5–20 clients joining, playing, reconnecting
* [ ] Simple soak script (optional):

  * [ ] multiple rooms, random moves, random disconnects

---

## Done-definition

* [x] Local mode identical to today.
* [x] Host creates lobby and gets PIN.
* [x] Players join from other devices via PIN.
* [x] Countdown/round pacing works and is synced.
* [x] Infinite board rules behave identically online.
* [x] Server rejects illegal/late moves.
* [x] Everyone sees same board instantly.
* [x] Scores update after rounds.
* [x] AI works online.
* [x] Reconnect restores players.
* [x] Host failover keeps room alive.
* [x] Room cleanup prevents leaks.

---

## What's Ready vs. Remaining

### Ready to Play:
- Local/Online mode selection in UI
- Create room & get PIN
- Join room with PIN
- Countdown before game starts
- Real-time gameplay with server-authoritative state
- Board expansion works online
- Win detection & round results
- Scoreboard tracking
- Multi-round support
- Host failover
- Reconnection with tokens
- Spectator mode (join as spectator to watch games)
- Turn timeout handling (skip turn with 3+ players, forfeit with 2 players)
- **Server-side AI players** (hosts can add/remove AI bots with easy/medium/hard difficulty)
- **Rate limiting** (prevents spam on joins, moves, room creation, reconnects, actions)

### Remaining (Future Enhancements):
- Full test suite (Phase 12)

---

## How to Run

```bash
# Install dependencies
npm install
npm run server:install

# Run both client and server
npm run dev:all

# Or separately:
# Terminal 1: npm run dev (client on :3001)
# Terminal 2: npm run server:dev (server on :3002)
```
