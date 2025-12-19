// =============================================================================
// Online Game State Composable (Singleton)
// =============================================================================

import { ref, computed } from 'vue'
import { useSocket } from './useSocket'

import type {
  AIDifficulty,
  GameState,
  GameRules,
  Player,
  RoomState,
  RoomPhase,
  Position,
} from '../../shared/types'

import type {
  RoomCreatedPayload,
  RoomJoinedPayload,
  LobbyUpdatedPayload,
  CountdownTickPayload,
  RoundStartedPayload,
  GameStatePayload,
  MoveAckPayload,
  TurnTimeoutPayload,
  RoundResultsPayload,
  ScoreboardUpdatedPayload,
  HostTransferredPayload,
  RoomErrorPayload,
  ConnectionRestoredPayload,
  PlayerNameSetPayload,
  PlayerNameErrorPayload,
} from '../../shared/types/events'

// Local storage keys
const STORAGE_KEY_SESSION = 'infinite-tictacs-online-session'

interface StoredSession {
  roomCode: string
  playerId: string
  rejoinToken: string
  timestamp: number
}

// =============================================================================
// Module-level singleton state
// All calls to useOnlineGame() return the same refs, ensuring shared state
// across all components (TicTacToe, OnlineLobby, OnlineGameBoard, etc.)
// =============================================================================

// Room state
const roomCode = ref<string | null>(null)
const roomPhase = ref<RoomPhase>('LOBBY')
const players = ref<Player[]>([])
const hostId = ref<string | null>(null)
const rules = ref<GameRules | null>(null)
const scoreboard = ref<Record<string, number>>({})

// Player identity
const playerId = ref<string | null>(null)
const rejoinToken = ref<string | null>(null)
const hostToken = ref<string | null>(null)

// Game state
const gameState = ref<GameState | null>(null)
const serverTimeMs = ref<number>(Date.now())
const turnDeadlineMs = ref<number | null>(null)

// Round results
const lastRoundWinner = ref<string | null>(null)
const lastRoundWinnerId = ref<string | null>(null)
const lastRoundWinnerSymbol = ref<string | null>(null)
const lastRoundWinningCells = ref<Position[]>([])
const lastRoundIsDraw = ref(false)

// Turn timeout
const lastTimeoutPlayerId = ref<string | null>(null)
const lastTimeoutPlayerName = ref<string | null>(null)
const lastTimeoutAction = ref<'skip' | 'forfeit' | null>(null)

// Countdown
const countdownSeconds = ref<number>(0)
const isInCountdown = ref(false)

// Winner reveal phase (client-only subphase)
// When true, shows board with winning cells highlighted before transitioning to results
const isInWinReveal = ref(false)
let winRevealTimer: NodeJS.Timeout | null = null
const WIN_REVEAL_DURATION = 4000 // 4 seconds (within 3-5s spec)

// UI state
const error = ref<string | null>(null)
const isLoading = ref(false)
const pendingMove = ref<{ row: number; col: number } | null>(null)

// Name setup state (for players who joined with placeholder names)
const needsNameSetup = ref(false)
const nameSetupError = ref<string | null>(null)

// Initialization guard - prevents duplicate listener setup
let isInitialized = false

/**
 * Composable for managing online multiplayer game state (Singleton)
 * All components share the same state - when one component updates state,
 * all other components see the update immediately.
 */
export function useOnlineGame() {
  const { isConnected, connectionError, connect, emit, on, off, cleanup } = useSocket()

  // ---------------------------------------------------------------------------
  // Computed Properties (must be inside function to be reactive)
  // ---------------------------------------------------------------------------

  const isHost = computed(() => playerId.value === hostId.value)

  const isSpectator = computed(() => {
    const player = players.value.find((p) => p.id === playerId.value)
    return player?.isSpectator === true
  })

  const isMyTurn = computed(() => {
    if (!gameState.value || !playerId.value) return false
    if (isSpectator.value) return false // Spectators never have a turn
    const currentPlayer = gameState.value.players[gameState.value.currentPlayerIndex]
    return currentPlayer?.id === playerId.value
  })

  const myPlayer = computed(() => {
    return players.value.find((p) => p.id === playerId.value) || null
  })

  const activePlayers = computed(() => {
    return players.value.filter((p) => !p.isSpectator)
  })

  const spectators = computed(() => {
    return players.value.filter((p) => p.isSpectator)
  })

  const currentPlayer = computed(() => {
    if (!gameState.value) return null
    return gameState.value.players[gameState.value.currentPlayerIndex] || null
  })

  const isInRoom = computed(() => roomCode.value !== null)

  const canStartGame = computed(() => {
    return isHost.value && activePlayers.value.length >= 2 && roomPhase.value === 'LOBBY'
  })

  const isGameActive = computed(() => {
    return roomPhase.value === 'ROUND_ACTIVE'
  })

  const isGameOver = computed(() => {
    return gameState.value?.winner !== null || gameState.value?.isDraw === true
  })

  // Check if current player is AI (server handles AI moves with 1-3s delay)
  const isCurrentPlayerAI = computed(() => {
    if (!currentPlayer.value) return false
    return currentPlayer.value.isAI === true
  })

  // AI is thinking when: game active, current player is AI, game not over
  const isAIThinking = computed(() => {
    return isGameActive.value && isCurrentPlayerAI.value && !isGameOver.value
  })

  // Check if the host is currently spectating
  const isHostSpectating = computed(() => {
    if (!hostId.value) return false
    const hostPlayer = players.value.find((p) => p.id === hostId.value)
    return hostPlayer?.isSpectator === true
  })

  // Check if host can rejoin as a player
  const canHostRejoin = computed(() => {
    if (!isHost.value || !isHostSpectating.value) return false
    // Can only rejoin during lobby phase
    if (roomPhase.value !== 'LOBBY') return false
    // Check if room is not full
    const maxPlayers = rules.value?.maxPlayers || 20
    return activePlayers.value.length < maxPlayers
  })

  // Time remaining for current turn
  const turnTimeRemaining = computed(() => {
    if (!turnDeadlineMs.value) return null
    const remaining = Math.max(0, turnDeadlineMs.value - Date.now())
    return Math.ceil(remaining / 1000)
  })

  // ---------------------------------------------------------------------------
  // Socket Event Handlers
  // ---------------------------------------------------------------------------

  function setupEventListeners(): void {
    on('room:created', handleRoomCreated)
    on('room:joined', handleRoomJoined)
    on('room:error', handleRoomError)
    on('lobby:updated', handleLobbyUpdated)
    on('host:transferred', handleHostTransferred)
    on('countdown:tick', handleCountdownTick)
    on('round:started', handleRoundStarted)
    on('game:state', handleGameState)
    on('move:ack', handleMoveAck)
    on('turn:timeout', handleTurnTimeout)
    on('round:results', handleRoundResults)
    on('scoreboard:updated', handleScoreboardUpdated)
    on('connection:restored', handleConnectionRestored)
    on('player:name_set', handlePlayerNameSet)
    on('player:name_error', handlePlayerNameError)
  }

  function removeEventListeners(): void {
    off('room:created')
    off('room:joined')
    off('room:error')
    off('lobby:updated')
    off('host:transferred')
    off('countdown:tick')
    off('round:started')
    off('game:state')
    off('move:ack')
    off('turn:timeout')
    off('round:results')
    off('scoreboard:updated')
    off('connection:restored')
    off('player:name_set')
    off('player:name_error')
  }

  function handleRoomCreated(data: RoomCreatedPayload): void {
    console.log('[OnlineGame] Room created:', data.roomCode)
    roomCode.value = data.roomCode
    playerId.value = data.playerId
    rejoinToken.value = data.rejoinToken
    hostToken.value = data.hostToken
    hostId.value = data.roomSnapshot.hostId
    players.value = data.roomSnapshot.players
    rules.value = data.roomSnapshot.rules
    scoreboard.value = data.roomSnapshot.scoreboard
    roomPhase.value = data.roomSnapshot.phase
    isLoading.value = false
    error.value = null

    saveSession()
  }

  function handleRoomJoined(data: RoomJoinedPayload): void {
    console.log('[OnlineGame] Joined room:', data.roomSnapshot.code)
    roomCode.value = data.roomSnapshot.code
    playerId.value = data.yourPlayerId
    rejoinToken.value = data.rejoinToken
    hostId.value = data.roomSnapshot.hostId
    players.value = data.roomSnapshot.players
    rules.value = data.roomSnapshot.rules
    scoreboard.value = data.roomSnapshot.scoreboard
    roomPhase.value = data.roomSnapshot.phase
    gameState.value = data.roomSnapshot.gameState
    isLoading.value = false
    error.value = null

    // Check if player needs to set their name (joined with placeholder)
    const myPlayerData = data.roomSnapshot.players.find((p) => p.id === data.yourPlayerId)
    if (myPlayerData && myPlayerData.hasSetName === false) {
      needsNameSetup.value = true
      nameSetupError.value = null
    }

    saveSession()
  }

  function handleRoomError(data: RoomErrorPayload): void {
    console.error('[OnlineGame] Room error:', data.code, data.message)
    error.value = data.message
    isLoading.value = false
  }

  function handleLobbyUpdated(data: LobbyUpdatedPayload): void {
    console.log('[OnlineGame] Lobby updated')
    players.value = data.players
    hostId.value = data.hostId
    rules.value = data.rules
    roomPhase.value = data.phase
  }

  function handleHostTransferred(data: HostTransferredPayload): void {
    console.log('[OnlineGame] Host transferred to:', data.newHostName)
    hostId.value = data.newHostId
  }

  function handleCountdownTick(data: CountdownTickPayload): void {
    countdownSeconds.value = data.secondsRemaining
    serverTimeMs.value = data.serverTimeMs
    isInCountdown.value = true
  }

  function handleRoundStarted(data: RoundStartedPayload): void {
    console.log('[OnlineGame] Round started')
    gameState.value = data.gameState
    serverTimeMs.value = data.serverTimeMs
    turnDeadlineMs.value = data.turnDeadlineMs || null
    roomPhase.value = 'ROUND_ACTIVE'
    isInCountdown.value = false
    countdownSeconds.value = 0

    // Clear previous round results
    lastRoundWinner.value = null
    lastRoundWinnerId.value = null
    lastRoundWinnerSymbol.value = null
    lastRoundWinningCells.value = []
    lastRoundIsDraw.value = false
  }

  function handleGameState(data: GameStatePayload): void {
    gameState.value = data.gameState
    serverTimeMs.value = data.serverTimeMs
    turnDeadlineMs.value = data.turnDeadlineMs || null
    pendingMove.value = null
  }

  function handleMoveAck(data: MoveAckPayload): void {
    if (!data.accepted) {
      console.warn('[OnlineGame] Move rejected:', data.reason)
      error.value = data.reason || 'Move rejected'
      pendingMove.value = null
    }
  }

  function handleTurnTimeout(data: TurnTimeoutPayload): void {
    console.log('[OnlineGame] Turn timeout:', data.timedOutPlayerName, data.action)

    // Update game state
    gameState.value = data.gameState
    serverTimeMs.value = data.serverTimeMs
    turnDeadlineMs.value = data.turnDeadlineMs || null

    // Store timeout info for UI feedback
    lastTimeoutPlayerId.value = data.timedOutPlayerId
    lastTimeoutPlayerName.value = data.timedOutPlayerName
    lastTimeoutAction.value = data.action

    // Clear pending move if it was the timed-out player
    if (playerId.value === data.timedOutPlayerId) {
      pendingMove.value = null
    }

    // Clear timeout info after a delay (for UI to show notification)
    setTimeout(() => {
      lastTimeoutPlayerId.value = null
      lastTimeoutPlayerName.value = null
      lastTimeoutAction.value = null
    }, 3000)
  }

  function handleRoundResults(data: RoundResultsPayload): void {
    console.log('[OnlineGame] Round results:', data)

    // Store round results
    lastRoundWinner.value = data.winner
    lastRoundWinnerId.value = data.winnerId
    lastRoundWinnerSymbol.value = data.winnerSymbol
    lastRoundWinningCells.value = data.winningCells
    lastRoundIsDraw.value = data.isDraw
    scoreboard.value = data.scoreboard

    // Start WIN_REVEAL phase (client-only subphase)
    // Keep showing the board with winning cells highlighted
    isInWinReveal.value = true

    // Clear any existing timer
    if (winRevealTimer) {
      clearTimeout(winRevealTimer)
    }

    // After reveal duration, transition to results
    winRevealTimer = setTimeout(() => {
      isInWinReveal.value = false
      roomPhase.value = 'ROUND_RESULTS'
    }, WIN_REVEAL_DURATION)
  }

  function handleScoreboardUpdated(data: ScoreboardUpdatedPayload): void {
    scoreboard.value = data.scoreboard
  }

  function handleConnectionRestored(data: ConnectionRestoredPayload): void {
    console.log('[OnlineGame] Connection restored')
    roomCode.value = data.roomSnapshot.code
    hostId.value = data.roomSnapshot.hostId
    players.value = data.roomSnapshot.players
    rules.value = data.roomSnapshot.rules
    scoreboard.value = data.roomSnapshot.scoreboard
    roomPhase.value = data.roomSnapshot.phase
    gameState.value = data.gameState
    error.value = null
  }

  function handlePlayerNameSet(data: PlayerNameSetPayload): void {
    console.log('[OnlineGame] Player name set:', data.name)
    needsNameSetup.value = false
    nameSetupError.value = null
  }

  function handlePlayerNameError(data: PlayerNameErrorPayload): void {
    console.log('[OnlineGame] Player name error:', data.code, data.message)
    nameSetupError.value = data.message
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Initialize connection and set up listeners
   * Uses a guard to prevent duplicate initialization across multiple components
   */
  function initialize(): void {
    if (isInitialized) {
      console.log('[OnlineGame] Already initialized, skipping')
      return
    }
    console.log('[OnlineGame] Initializing...')
    connect()
    setupEventListeners()
    isInitialized = true
  }

  /**
   * Create a new room as host
   * @param hostName - The host's display name
   * @param hostSpectating - If true, host starts as spectator (watching, not playing)
   * @param allowSpectators - If true, other players can join as spectators
   */
  async function createRoom(
    hostName: string,
    hostSpectating: boolean = false,
    allowSpectators: boolean = true
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    emit('host:create_room', {
      hostName,
      hostSpectating,
      allowSpectators,
      maxPlayers: 20,
      rules: {
        winLength: 4,
        maxPlayers: 20,
        allowSpectators,
      },
    })
  }

  /**
   * Join an existing room
   */
  async function joinRoom(code: string, playerName: string, asSpectator: boolean = false): Promise<void> {
    isLoading.value = true
    error.value = null

    emit('player:join_room', {
      roomCode: code.toUpperCase(),
      name: playerName,
      asSpectator,
    })
  }

  /**
   * Leave the current room
   */
  function leaveRoom(): void {
    if (!roomCode.value || !playerId.value) return

    emit('player:leave_room', {
      roomCode: roomCode.value,
      playerId: playerId.value,
    })

    resetState()
    clearSession()
  }

  /**
   * Start the game (host only)
   */
  function startGame(): void {
    if (!roomCode.value || !isHost.value) return

    emit('host:start_round', {
      roomCode: roomCode.value,
    })
  }

  /**
   * Submit a move
   */
  function submitMove(row: number, col: number): void {
    if (!roomCode.value || !playerId.value || !isMyTurn.value) return

    pendingMove.value = { row, col }
    error.value = null

    emit('player:submit_move', {
      roomCode: roomCode.value,
      playerId: playerId.value,
      row,
      col,
    })
  }

  /**
   * Add an AI player to the room (host only)
   */
  function addAI(name: string, difficulty: AIDifficulty = 'medium'): void {
    if (!roomCode.value || !isHost.value) return

    emit('host:add_ai', {
      roomCode: roomCode.value,
      name,
      difficulty,
    })
  }

  /**
   * Remove an AI player from the room (host only)
   */
  function removeAI(aiPlayerId: string): void {
    if (!roomCode.value || !isHost.value) return

    emit('host:remove_ai', {
      roomCode: roomCode.value,
      aiPlayerId,
    })
  }

  /**
   * Toggle host between playing and spectating (host only)
   */
  function toggleHostSpectate(becomeSpectator: boolean): void {
    if (!roomCode.value || !isHost.value) return

    emit('host:toggle_spectate', {
      roomCode: roomCode.value,
      becomeSpectator,
    })
  }

  /**
   * Update room rules (host only)
   */
  function updateRules(rulesUpdate: Partial<GameRules>): void {
    if (!roomCode.value || !isHost.value) return

    emit('host:update_rules', {
      roomCode: roomCode.value,
      rules: rulesUpdate,
    })
  }

  /**
   * Return to lobby from ROUND_RESULTS phase (host only)
   * Allows new players to join and host to configure before next game
   */
  function returnToLobby(): void {
    if (!roomCode.value || !isHost.value) return
    if (roomPhase.value !== 'ROUND_RESULTS' && roomPhase.value !== 'COMPLETED') return

    emit('host:return_to_lobby', {
      roomCode: roomCode.value,
    })
  }

  /**
   * Set the player's name (for players who joined with placeholder names)
   */
  function setPlayerName(name: string, asSpectator: boolean): void {
    if (!roomCode.value || !playerId.value) return

    nameSetupError.value = null

    emit('player:set_name', {
      roomCode: roomCode.value,
      playerId: playerId.value,
      name,
      asSpectator,
    })
  }

  /**
   * Dismiss the name setup popup (keep placeholder name)
   */
  function dismissNameSetup(): void {
    needsNameSetup.value = false
    nameSetupError.value = null
  }

  /**
   * Attempt to reconnect to a previous session
   */
  async function attemptReconnect(): Promise<boolean> {
    const session = loadSession()
    if (!session) return false

    // Check if session is still valid (within 30 minutes)
    if (Date.now() - session.timestamp > 30 * 60 * 1000) {
      clearSession()
      return false
    }

    isLoading.value = true

    emit('player:reconnect', {
      roomCode: session.roomCode,
      playerId: session.playerId,
      rejoinToken: session.rejoinToken,
    })

    // Wait for response (handled by event listeners)
    return true
  }

  // ---------------------------------------------------------------------------
  // Session Persistence
  // ---------------------------------------------------------------------------

  function saveSession(): void {
    if (!roomCode.value || !playerId.value || !rejoinToken.value) return

    const session: StoredSession = {
      roomCode: roomCode.value,
      playerId: playerId.value,
      rejoinToken: rejoinToken.value,
      timestamp: Date.now(),
    }

    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    } catch (e) {
      console.warn('[OnlineGame] Failed to save session:', e)
    }
  }

  function loadSession(): StoredSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SESSION)
      if (!data) return null
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }

  function clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION)
    } catch (e) {
      console.warn('[OnlineGame] Failed to clear session:', e)
    }
  }

  // ---------------------------------------------------------------------------
  // State Reset
  // ---------------------------------------------------------------------------

  function resetState(): void {
    roomCode.value = null
    roomPhase.value = 'LOBBY'
    players.value = []
    hostId.value = null
    rules.value = null
    scoreboard.value = {}
    playerId.value = null
    rejoinToken.value = null
    hostToken.value = null
    gameState.value = null
    turnDeadlineMs.value = null
    lastRoundWinner.value = null
    lastRoundWinnerId.value = null
    lastRoundWinnerSymbol.value = null
    lastRoundWinningCells.value = []
    lastRoundIsDraw.value = false
    lastTimeoutPlayerId.value = null
    lastTimeoutPlayerName.value = null
    lastTimeoutAction.value = null
    countdownSeconds.value = 0
    isInCountdown.value = false
    error.value = null
    isLoading.value = false
    pendingMove.value = null
    needsNameSetup.value = false
    nameSetupError.value = null
  }

  /**
   * Full cleanup - only call when leaving online mode entirely
   * Resets the initialization guard to allow re-initialization
   */
  function destroy(): void {
    if (!isInitialized) {
      console.log('[OnlineGame] Not initialized, skipping destroy')
      return
    }
    console.log('[OnlineGame] Destroying...')
    removeEventListeners()
    cleanup()
    resetState()
    isInitialized = false  // Allow re-initialization
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Connection state
    isConnected,
    connectionError,

    // Room state
    roomCode,
    roomPhase,
    players,
    activePlayers,
    spectators,
    hostId,
    rules,
    scoreboard,

    // Player identity
    playerId,
    myPlayer,
    isSpectator,

    // Game state
    gameState,
    currentPlayer,
    turnTimeRemaining,

    // Round results
    lastRoundWinner,
    lastRoundWinnerId,
    lastRoundWinnerSymbol,
    lastRoundWinningCells,
    lastRoundIsDraw,

    // Turn timeout
    lastTimeoutPlayerId,
    lastTimeoutPlayerName,
    lastTimeoutAction,

    // Countdown
    countdownSeconds,
    isInCountdown,
    isInWinReveal,

    // Computed
    isHost,
    isMyTurn,
    isInRoom,
    canStartGame,
    isGameActive,
    isGameOver,
    isCurrentPlayerAI,
    isAIThinking,
    isHostSpectating,
    canHostRejoin,

    // UI state
    error,
    isLoading,
    pendingMove,

    // Name setup state
    needsNameSetup,
    nameSetupError,

    // Actions
    initialize,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitMove,
    addAI,
    removeAI,
    toggleHostSpectate,
    updateRules,
    returnToLobby,
    setPlayerName,
    dismissNameSetup,
    attemptReconnect,
    destroy,
  }
}
