# Multiplayer Implementation Plan
## Infinite Tic-Tacs - Kahoot-Style Multiplayer

### Overview
Create a Kahoot-style experience where one host projects or screen-shares the board while dozens of players join from their own devices, submit moves/answers in real time, and watch a synchronized leaderboard. The plan below ties product goals to architecture decisions and breaks implementation into verifiable phases so we can ship a reliable multiplayer MVP, then iterate toward large sessions.

---

## Product Requirements

### Player & Host Flow
- **Host setup**: Host selects board options (size, win condition, powerups) and creates a session that yields a 6-character code + shareable link.
- **Join experience**: Players enter a nickname + code, see a lobby with current participants, latency indicator, and ready state.
- **Game loop**: Host starts rounds with a 3-second countdown. All devices receive synchronized state packets (board, timer, turn order). Players lock in moves before the timer expires; late moves are rejected with feedback.
- **Scoreboard**: After each round, everyone sees updated rankings, streak bonuses, and highlights similar to Kahoot.
- **Re-entry**: If someone disconnects, they can rejoin with the same code and token, resume their seat, and recover state (including score and turn order).
- **Host failover**: If the host drops, the room elects the next eligible player as host to keep the session alive.

### Constraints & Targets
- **Players per room**: MVP 20, stretch goal 50. Hard limit configurable server-side to protect resources.
- **Latency**: <200 ms average round-trip inside one region, <500 ms globally. Countdown events must not drift more than 300 ms between clients.
- **Security & fairness**: Throttle submissions (1 move per tick), validate server-side, ignore duplicates, and resist brute-force room-code guessing.
- **Observability**: Track per-room lifecycle, socket joins/leaves, move latency, and error rates for alerting.

---

## Architecture Decision Matrix
| Option | Dev Effort | Infra Cost | Scaling & Control | Notes |
| --- | --- | --- | --- | --- |
| **Socket.IO on Node** | Medium | Low (single Node + Redis) | High (custom logic, horizontal scaling) | Tight control over session logic, namespaces, security middleware; best fit for Kahoot-style orchestration. |
| Firebase Realtime DB | Low | Pay per sync | Medium | Fast to prototype but harder to enforce server trust + rate limits for complex game rules. |
| WebRTC + PeerJS | High | Low | Low-Medium | Host becomes single point of failure, NAT traversal pain, limited server authority. |
| Supabase Realtime | Medium | Medium | Medium | SQL backing nice, but still need server for authoritative logic and scaling WebSocket throughput. |

**Decision**: Proceed with Socket.IO + Node/Express + Redis (optional) for deterministic server authority, predictable costs, and flexibility to add analytics. Revisit managed services only if we lack ops bandwidth.

---

## Implementation Phases

### Phase 0: Alignment & Environment
- Finalize feature flags (multiplayer_beta) and environment variables (SOCKET_URL, ROOM_CODE_LENGTH, REDIS_URL).
- Sketch low-fidelity lobby/game/leaderboard screens so engineers and designers agree on UI states.
- Define acceptance tests for each journey (host, join late, reconnect) before writing code.

### Phase 1: Real-Time Backend Foundation
- **Project setup**: Bootstrap `infinite-tictacs-server` (Express + Socket.IO + TypeScript + vitest). Add ESLint/Prettier and Dockerfile for deployment.
- **RoomStore abstraction**: Start with in-memory Map; support pluggable Redis for persistence and host failover. Structure holds: metadata, settings, players, scores, event log, and timestamps.
- **Code generator**: Provide collision-resistant 6-char codes, track active codes, expire rooms when empty for >15 minutes.
- **Socket lifecycle**: Middleware for auth token (playerId), rate limits (moves/minute, join attempts), heartbeat/ping metrics, and automatic cleanup on disconnect.
- **Event contract**:
```ts
interface ClientToServerEvents {
  'create_room': (payload: { playerName: string; settings: GameSettings }) => void;
  'join_room': (payload: { roomCode: string; playerName: string; rejoinToken?: string }) => void;
  'start_round': () => void;
  'submit_move': (payload: PlayerMove) => void;
  'request_state': () => void;
  'leave_room': () => void;
  'restart_session': () => void;
}
interface ServerToClientEvents {
  'room_created': (payload: { roomCode: string; hostToken: string }) => void;
  'room_joined': (room: SerializedRoom);
  'lobby_updated': (payload: { players: PlayerSummary[]; hostId: string });
  'countdown_tick': (payload: { secondsRemaining: number; serverTime: number });
  'round_started': (payload: RoundState);
  'move_ack': (payload: { accepted: boolean; reason?: string });
  'board_update': (payload: BoardState);
  'scoreboard_update': (payload: Scoreboard);
  'host_transferred': (payload: { newHostId: string });
  'room_error': (payload: { code: string; message: string });
}
```
- **Host transfer**: Maintain host queue; on disconnect, promote next ready player and broadcast `host_transferred`.
- **Persistence hooks**: Append key events to Redis Streams (or file logs) for auditing and for replay on reconnect.

### Phase 2: Session & Kahoot-Like Mechanics
- **Lobby state machine**: `IDLE → COUNTDOWN → ROUND_ACTIVE → ROUND_RESULTS → COMPLETED`. Store in room metadata; state transitions validated server-side.
- **Countdown sync**: Server emits `countdown_tick` every second with authoritative timestamp; clients compute drift and adjust animations.
- **Round handling**:
  1. Host triggers `start_round` (disabled unless state `IDLE` or `ROUND_RESULTS`).
  2. Server composes `RoundState` with board snapshot, timers, and allowed actions, then broadcasts `round_started`.
  3. Players send `submit_move`; server validates (turn order, board vacancy, time window) and either updates board immediately or queues depending on mode.
  4. After timer or when round ends, server resolves winners, updates streaks/bonuses, and emits `scoreboard_update` + `ROUND_RESULTS` state.
- **Move validation**: Use deterministic engine shared with existing local mode to prevent divergence. Persist `moveHistory` for later review.
- **Rejoin flow**: When `join_room` includes `rejoinToken`, fetch stored seat and state; respond with `room_joined` plus `resumeHint` (current state, timer offset).
- **Spectator path**: Flag players as `isSpectator` when room full; they receive board/score updates but cannot submit moves.

### Phase 3: Frontend & UX
- **Socket composable**: Expand `useSocket`/`useMultiplayer` to expose room status, countdown, scoreboard, connection health, and host-only actions. Include auto-reconnect with exponential backoff and queued intents for offline-to-online transitions.
- **UI states**:
  - **Start Menu**: Host/Join toggle, name entry, session settings summary.
  - **Lobby**: Player list, readiness indicator, host controls, shareable code & link, troubleshooting tips.
  - **Countdown overlay**: Sync animation referencing server time, fallback to textual timer when drift >150 ms.
  - **Round view**: Board, move controls, indicator when input locked, latency badge.
  - **Scoreboard**: Animated rank changes, highlight streaks, CTA to continue or restart.
  - **Error & reconnect modals**: Show reasons from `room_error`, allow retry/resume.
- **State management**: Represent game flow as a discriminated union or finite state machine to guarantee UI coverage for each backend state. Derive derived props (isHost, canSubmit) instead of duplicating logic.
- **Accessibility & mobile**: Large tap targets, color-blind safe palette, orientation locks for host display.
- **Analytics hooks**: Emit events (create_room, start_round, round_complete) to existing analytics service for later tuning.

### Phase 4: Testing & Quality
- **Automated server tests**: Unit-test RoomManager, move validator, and host transfer logic. Use Socket.IO test harness to simulate multi-client flows (join -> start -> submit -> disconnect -> rejoin).
- **Frontend component tests**: Validate lobby/board components render correct states based on mocked composable data. Snapshot scoreboard transitions.
- **Integration harness**: Script using `vitest` or `jest` + `socket.io-client` to spin multiple clients and assert timeline events and scoreboard correctness.
- **Chaos & soak**: CLI tool to simulate 25 rooms × 20 players for 10 minutes, injecting disconnects, high latency (tc/netem), and duplicate submissions to ensure stability.
- **Manual scenarios**: QA checklist for host drop, network blip, late join after round start, spectators, and mobile rotation.

### Phase 5: Operations & Deployment
- **Deployment**: Containerize server, deploy to Railway/Fly with sticky sessions disabled (Socket.IO uses Engine.IO + Redis adapter for scale). Configure environment secrets and rolling deploy strategy.
- **Monitoring**: Ship structured logs (roomCode, event, duration). Expose Prometheus metrics: active_rooms, active_players, avg_move_latency, failed_submissions, redis_queue_depth.
- **Alerting**: Threshold-based alerts when error rate >2% for 5 minutes or move latency >400 ms p95.
- **Feature flag rollout**: Gate multiplayer UI by `multiplayer_beta` to allow canary release. Provide override query param for testers.
- **Support tooling**: Admin endpoint or CLI to list rooms, force close, or transfer host manually for support incidents.

---

## Testing Strategy (Detailed)
1. **Unit**: Deterministic tests for code generator collisions, countdown scheduler accuracy, and scoreboard calculations (streak, tie-breakers).
2. **Contract**: JSON schema tests to guarantee server/client payload compatibility—run in CI when either side changes types.
3. **Latency simulation**: Use `toxiproxy` or `comcast` to inject +200 ms latency and packet loss to validate countdown drift corrections.
4. **Load & soak**: Artillery/k6 scripts hitting create/join/start/end flows. Success metrics: CPU <70%, memory stable, <1% failed sockets during 10-minute soak.
5. **Security**: Fuzz room-code entry, brute-force detection, rate-limit verification, and ensure private rooms cannot be joined without code.

---

## Operations & Resources
- **Docs & references**: Socket.IO v4 guide, Nuxt 3 WebSocket recipe, Redis Streams for event sourcing, Render/Fly WebSocket deployment notes.
- **Runbooks**: Document procedures for scaling horizontally, invalidating rooms stuck in LIMBO state, and restoring service after Redis failure.
- **Telemetry dashboard**: Grafana panels for top rooms, connection churn, countdown drift, and reconnect success rate to inform UX tweaks.

---

## Next Steps
1. Lock product requirement doc and UI wireframes with stakeholders.
2. Scaffold backend repo, CI, and minimal `create_room`/`join_room` flow.
3. Integrate socket composable in Nuxt app behind feature flag; build lobby UI shell.
4. Implement countdown + round state transitions end-to-end.
5. Harden reconnect + host transfer, then execute automated + manual test suites.
6. Deploy to staging, run pilot with internal testers, gather metrics, and iterate.

---

## Open Questions
1. Should we support matchmaking (auto-join public rooms) or only private codes for MVP?
2. Do we need authentication/accounts or are nicknames sufficient for now?
3. How long should finished rooms persist for analytics/replays, and where do we store them?
4. Are there premium settings (custom colors, audio cues) that require future-proofing in the API?
5. What is the expectation for mobile bandwidth/offline—should we queue moves offline for a short grace period?

This roadmap keeps the Kahoot-style experience front-and-center while giving engineering a concrete, testable plan from backend foundations through launch operations.
