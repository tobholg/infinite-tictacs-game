// =============================================================================
// Socket.IO Event Handlers
// =============================================================================

import type { Server, Socket } from 'socket.io'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  CreateRoomPayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  ReconnectPayload,
  StartRoundPayload,
  SubmitMovePayload,
  AddAIPayload,
  RemoveAIPayload,
} from '../../../shared/types/events.js'

import type { GameState, Player } from '../../../shared/types/index.js'

import { getServerAIMove, isAIPlayer, getAIDifficulty } from '../ai/ServerAI.js'

import {
  createInitialState,
  applyMove,
  getCurrentPlayer,
  handleTurnTimeout,
  startTurnTimer,
} from '../../../shared/engine/index.js'

import { RoomStore } from '../rooms/RoomStore.js'
import {
  joinRateLimiter,
  createRoomRateLimiter,
  moveRateLimiter,
  reconnectRateLimiter,
  actionRateLimiter,
  destroyAllRateLimiters,
} from '../utils/RateLimiter.js'

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

// Countdown duration in seconds
const COUNTDOWN_SECONDS = 3

// Turn timeout check interval (how often to check for expired turns)
const TIMEOUT_CHECK_INTERVAL_MS = 500

// Store the interval ID for cleanup
let timeoutCheckerId: NodeJS.Timeout | null = null

/**
 * Start the turn timeout checker
 */
export function startTimeoutChecker(io: TypedServer, roomStore: RoomStore): void {
  if (timeoutCheckerId) return // Already running

  timeoutCheckerId = setInterval(() => {
    checkForTimeouts(io, roomStore)
  }, TIMEOUT_CHECK_INTERVAL_MS)

  console.log('Turn timeout checker started')
}

/**
 * Stop the turn timeout checker and cleanup rate limiters
 */
export function stopTimeoutChecker(): void {
  if (timeoutCheckerId) {
    clearInterval(timeoutCheckerId)
    timeoutCheckerId = null
    console.log('Turn timeout checker stopped')
  }
  // Cleanup rate limiters on shutdown
  destroyAllRateLimiters()
}

/**
 * Helper to emit rate limit error
 */
function emitRateLimitError(socket: TypedSocket, action: string): void {
  socket.emit('room:error', {
    code: 'RATE_LIMITED',
    message: `Too many ${action} attempts. Please wait before trying again.`,
  })
}

/**
 * Check all active rooms for turn timeouts
 */
function checkForTimeouts(io: TypedServer, roomStore: RoomStore): void {
  const roomsWithTimers = roomStore.getRoomsWithActiveTimers()

  for (const roomCode of roomsWithTimers) {
    if (roomStore.isTurnTimedOut(roomCode)) {
      handleTurnTimedOut(io, roomStore, roomCode)
    }
  }
}

/**
 * Handle a turn timeout for a specific room
 */
function handleTurnTimedOut(io: TypedServer, roomStore: RoomStore, roomCode: string): void {
  const roomData = roomStore.getRoomData(roomCode)
  if (!roomData || !roomData.gameState) return

  // Get the player who timed out
  const timedOutPlayer = getCurrentPlayer(roomData.gameState)
  if (!timedOutPlayer) return

  // Apply timeout using the engine
  const newState = handleTurnTimeout(roomData.gameState)
  roomStore.setGameState(roomCode, newState)

  // Determine the action taken
  const activePlayers = roomData.players.filter((p) => !p.isSpectator)
  const action: 'skip' | 'forfeit' = activePlayers.length === 2 ? 'forfeit' : 'skip'

  // Calculate new turn deadline (if game continues)
  let turnDeadlineMs: number | undefined
  if (!newState.winner && !newState.isDraw && roomData.rules.timeLimit) {
    turnDeadlineMs = Date.now() + roomData.rules.timeLimit * 1000
    roomStore.setTurnDeadline(roomCode, turnDeadlineMs)
  } else {
    roomStore.setTurnDeadline(roomCode, null)
  }

  // Broadcast timeout event
  io.to(roomCode).emit('turn:timeout', {
    timedOutPlayerId: timedOutPlayer.id,
    timedOutPlayerName: timedOutPlayer.name,
    action,
    gameState: newState,
    serverTimeMs: Date.now(),
    turnDeadlineMs,
  })

  console.log(`Turn timeout in room ${roomCode}: ${timedOutPlayer.name} (${action})`)

  // If game ended due to forfeit, handle round end
  if (newState.winner) {
    handleRoundEnd(io, roomStore, roomCode, newState)
  }
}

/**
 * Set up all socket event handlers
 */
export function setupSocketHandlers(io: TypedServer, roomStore: RoomStore): void {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Initialize socket data
    socket.data = {
      playerId: '',
      roomCode: null,
      isHost: false,
      rejoinToken: '',
    }

    // ---------------------------------------------------------------------------
    // Room Management Events
    // ---------------------------------------------------------------------------

    socket.on('host:create_room', (data: CreateRoomPayload) => {
      handleCreateRoom(io, socket, roomStore, data)
    })

    socket.on('player:join_room', (data: JoinRoomPayload) => {
      handleJoinRoom(io, socket, roomStore, data)
    })

    socket.on('player:leave_room', (data: LeaveRoomPayload) => {
      handleLeaveRoom(io, socket, roomStore, data)
    })

    socket.on('player:reconnect', (data: ReconnectPayload) => {
      handleReconnect(io, socket, roomStore, data)
    })

    // ---------------------------------------------------------------------------
    // Game Control Events
    // ---------------------------------------------------------------------------

    socket.on('host:start_round', (data: StartRoundPayload) => {
      handleStartRound(io, socket, roomStore, data)
    })

    socket.on('host:add_ai', (data: AddAIPayload) => {
      handleAddAI(io, socket, roomStore, data)
    })

    socket.on('host:remove_ai', (data: RemoveAIPayload) => {
      handleRemoveAI(io, socket, roomStore, data)
    })

    socket.on('player:submit_move', (data: SubmitMovePayload) => {
      handleSubmitMove(io, socket, roomStore, data)
    })

    // ---------------------------------------------------------------------------
    // Disconnect Handler
    // ---------------------------------------------------------------------------

    socket.on('disconnect', () => {
      handleDisconnect(io, socket, roomStore)
    })
  })
}

// =============================================================================
// Handler Implementations
// =============================================================================

function handleCreateRoom(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: CreateRoomPayload
): void {
  // Rate limit check
  if (!createRoomRateLimiter.isAllowed(socket.id)) {
    emitRateLimitError(socket, 'room creation')
    return
  }

  const { hostName, rules, allowSpectators, maxPlayers } = data

  // Validate input
  if (!hostName || hostName.trim().length === 0) {
    socket.emit('room:error', { code: 'INVALID_NAME', message: 'Name is required' })
    return
  }

  // Create the room
  const result = roomStore.createRoom(socket.id, hostName.trim(), {
    ...rules,
    maxPlayers,
    allowSpectators,
  })

  // Join the socket room
  socket.join(result.room.code)

  // Update socket data
  socket.data.playerId = result.playerId
  socket.data.roomCode = result.room.code
  socket.data.isHost = true
  socket.data.rejoinToken = result.rejoinToken

  // Send response
  socket.emit('room:created', {
    roomCode: result.room.code,
    hostToken: result.hostToken,
    playerId: result.playerId,
    rejoinToken: result.rejoinToken,
    roomSnapshot: result.room,
  })

  console.log(`Room ${result.room.code} created by ${hostName}`)
}

function handleJoinRoom(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: JoinRoomPayload
): void {
  const { roomCode, name, playerId, rejoinToken, asSpectator } = data

  // Handle reconnection attempt
  if (playerId && rejoinToken) {
    handleReconnect(io, socket, roomStore, { roomCode, playerId, rejoinToken })
    return
  }

  // Rate limit check for join attempts
  if (!joinRateLimiter.isAllowed(socket.id)) {
    emitRateLimitError(socket, 'join')
    return
  }

  // Validate input
  if (!name || name.trim().length === 0) {
    socket.emit('room:error', { code: 'INVALID_NAME', message: 'Name is required' })
    return
  }

  if (!roomCode || roomCode.trim().length === 0) {
    socket.emit('room:error', { code: 'INVALID_ROOM_CODE', message: 'Room code is required' })
    return
  }

  // Try to add player (or spectator)
  const result = roomStore.addPlayer(roomCode.toUpperCase(), name.trim(), socket.id, asSpectator || false)

  if (!result.success) {
    socket.emit('room:error', {
      code: result.error as any,
      message: getErrorMessage(result.error),
    })
    return
  }

  // Join the socket room
  socket.join(roomCode.toUpperCase())

  // Update socket data
  socket.data.playerId = result.player.id
  socket.data.roomCode = roomCode.toUpperCase()
  socket.data.isHost = false
  socket.data.rejoinToken = result.rejoinToken

  // Send response to joiner
  socket.emit('room:joined', {
    roomSnapshot: result.room,
    yourPlayerId: result.player.id,
    rejoinToken: result.rejoinToken,
  })

  // Broadcast lobby update to all in room
  io.to(roomCode.toUpperCase()).emit('lobby:updated', {
    players: result.room.players,
    hostId: result.room.hostId,
    rules: result.room.rules,
    phase: result.room.phase,
  })

  const joinType = asSpectator ? 'spectator' : 'player'
  console.log(`${name} joined room ${roomCode} as ${joinType}`)
}

function handleLeaveRoom(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: LeaveRoomPayload
): void {
  const { roomCode, playerId } = data

  const result = roomStore.removePlayer(roomCode, playerId)

  // Leave socket room
  socket.leave(roomCode.toUpperCase())

  // Reset socket data
  socket.data.playerId = ''
  socket.data.roomCode = null
  socket.data.isHost = false
  socket.data.rejoinToken = ''

  // Broadcast updates
  const room = roomStore.getRoom(roomCode)
  if (room) {
    if (result.hostTransferred && result.newHostId) {
      const newHost = room.players.find((p) => p.id === result.newHostId)
      io.to(roomCode.toUpperCase()).emit('host:transferred', {
        newHostId: result.newHostId,
        newHostName: newHost?.name || 'Unknown',
      })
    }

    io.to(roomCode.toUpperCase()).emit('lobby:updated', {
      players: room.players,
      hostId: room.hostId,
      rules: room.rules,
      phase: room.phase,
    })
  }
}

function handleReconnect(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: ReconnectPayload
): void {
  // Rate limit check for reconnection attempts
  if (!reconnectRateLimiter.isAllowed(socket.id)) {
    emitRateLimitError(socket, 'reconnection')
    return
  }

  const { roomCode, playerId, rejoinToken } = data

  const result = roomStore.reconnectPlayer(roomCode, playerId, rejoinToken, socket.id)

  if (!result.success) {
    socket.emit('room:error', {
      code: 'RECONNECT_FAILED',
      message: result.error || 'Failed to reconnect',
    })
    return
  }

  // Join the socket room
  socket.join(roomCode.toUpperCase())

  // Update socket data
  socket.data.playerId = playerId
  socket.data.roomCode = roomCode.toUpperCase()
  socket.data.isHost = roomStore.isHost(roomCode, playerId)
  socket.data.rejoinToken = rejoinToken

  // Send connection restored
  socket.emit('connection:restored', {
    roomSnapshot: result.room,
    gameState: result.room.gameState,
  })

  // Broadcast lobby update
  io.to(roomCode.toUpperCase()).emit('lobby:updated', {
    players: result.room.players,
    hostId: result.room.hostId,
    rules: result.room.rules,
    phase: result.room.phase,
  })

  console.log(`Player ${playerId} reconnected to room ${roomCode}`)
}

function handleAddAI(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: AddAIPayload
): void {
  // Rate limit check
  if (!actionRateLimiter.isAllowed(socket.id)) {
    emitRateLimitError(socket, 'action')
    return
  }

  const { roomCode, name, difficulty } = data

  // Verify host
  if (!roomStore.isHost(roomCode, socket.data.playerId)) {
    socket.emit('room:error', { code: 'NOT_HOST', message: 'Only the host can add AI players' })
    return
  }

  const result = roomStore.addAIPlayer(roomCode, name, difficulty)

  if (!result.success) {
    socket.emit('room:error', {
      code: result.error as any,
      message: getErrorMessage(result.error),
    })
    return
  }

  // Broadcast lobby update
  io.to(roomCode.toUpperCase()).emit('lobby:updated', {
    players: result.room.players,
    hostId: result.room.hostId,
    rules: result.room.rules,
    phase: result.room.phase,
  })

  console.log(`AI player ${name} (${difficulty}) added to room ${roomCode}`)
}

function handleRemoveAI(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: RemoveAIPayload
): void {
  // Rate limit check
  if (!actionRateLimiter.isAllowed(socket.id)) {
    emitRateLimitError(socket, 'action')
    return
  }

  const { roomCode, aiPlayerId } = data

  // Verify host
  if (!roomStore.isHost(roomCode, socket.data.playerId)) {
    socket.emit('room:error', { code: 'NOT_HOST', message: 'Only the host can remove AI players' })
    return
  }

  const result = roomStore.removeAIPlayer(roomCode, aiPlayerId)

  if (!result.success) {
    socket.emit('room:error', {
      code: result.error as any,
      message: getErrorMessage(result.error!),
    })
    return
  }

  // Broadcast lobby update
  const room = roomStore.getRoom(roomCode)
  if (room) {
    io.to(roomCode.toUpperCase()).emit('lobby:updated', {
      players: room.players,
      hostId: room.hostId,
      rules: room.rules,
      phase: room.phase,
    })
  }

  console.log(`AI player ${aiPlayerId} removed from room ${roomCode}`)
}

function handleStartRound(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: StartRoundPayload
): void {
  const { roomCode } = data

  // Verify host
  if (!roomStore.isHost(roomCode, socket.data.playerId)) {
    socket.emit('room:error', { code: 'NOT_HOST', message: 'Only the host can start the game' })
    return
  }

  const room = roomStore.getRoom(roomCode)
  if (!room) {
    socket.emit('room:error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' })
    return
  }

  // Count only active players (not spectators)
  const activePlayers = room.players.filter((p) => !p.isSpectator)
  if (activePlayers.length < 2) {
    socket.emit('room:error', { code: 'NOT_ENOUGH_PLAYERS' as any, message: 'Need at least 2 players (not counting spectators)' })
    return
  }

  // Transition to countdown
  const canStart = roomStore.updatePhase(roomCode, 'COUNTDOWN')
  if (!canStart) {
    socket.emit('room:error', { code: 'INVALID_PHASE' as any, message: 'Cannot start game from current phase' })
    return
  }

  // Start countdown
  let countdown = COUNTDOWN_SECONDS
  const countdownInterval = setInterval(() => {
    io.to(roomCode.toUpperCase()).emit('countdown:tick', {
      secondsRemaining: countdown,
      serverTimeMs: Date.now(),
    })

    countdown--

    if (countdown < 0) {
      clearInterval(countdownInterval)
      startGame(io, roomStore, roomCode)
    }
  }, 1000)

  // Emit initial countdown
  io.to(roomCode.toUpperCase()).emit('countdown:tick', {
    secondsRemaining: countdown,
    serverTimeMs: Date.now(),
  })
}

function startGame(io: TypedServer, roomStore: RoomStore, roomCode: string): void {
  const room = roomStore.getRoom(roomCode)
  if (!room) return

  // Transition to round active
  roomStore.updatePhase(roomCode, 'ROUND_ACTIVE')

  // Create initial game state - only include active players (not spectators)
  const activePlayers: Player[] = room.players
    .filter((p) => !p.isSpectator)
    .map((p) => ({
      ...p,
      connected: true,
    }))

  let gameState = createInitialState(activePlayers, room.rules)

  // Set up turn timer if time limit is configured
  let turnDeadlineMs: number | undefined
  if (room.rules.timeLimit) {
    gameState = startTurnTimer(gameState, room.rules.timeLimit)
    turnDeadlineMs = gameState.turnDeadline
    roomStore.setTurnDeadline(roomCode, turnDeadlineMs!)
  }

  roomStore.setGameState(roomCode, gameState)

  // Broadcast game start
  io.to(roomCode.toUpperCase()).emit('round:started', {
    gameState,
    serverTimeMs: Date.now(),
    turnDeadlineMs,
  })

  console.log(`Game started in room ${roomCode}`)

  // Check if first player is AI and trigger AI move
  processAITurnIfNeeded(io, roomStore, roomCode)
}

// AI thinking delay range (in ms)
const AI_THINKING_DELAY_MIN = 500
const AI_THINKING_DELAY_MAX = 1500

/**
 * Check if current player is AI and process their turn
 */
function processAITurnIfNeeded(
  io: TypedServer,
  roomStore: RoomStore,
  roomCode: string
): void {
  const roomData = roomStore.getRoomData(roomCode)
  if (!roomData || !roomData.gameState) return

  // Check if game is still active
  if (roomData.gameState.winner || roomData.gameState.isDraw) return

  // Get current player
  const currentPlayer = getCurrentPlayer(roomData.gameState)
  if (!currentPlayer || !isAIPlayer(currentPlayer)) return

  // AI's turn! Calculate move after a small delay to feel natural
  const thinkingDelay = AI_THINKING_DELAY_MIN + Math.random() * (AI_THINKING_DELAY_MAX - AI_THINKING_DELAY_MIN)

  setTimeout(() => {
    executeAIMove(io, roomStore, roomCode, currentPlayer)
  }, thinkingDelay)
}

/**
 * Execute an AI player's move
 */
function executeAIMove(
  io: TypedServer,
  roomStore: RoomStore,
  roomCode: string,
  aiPlayer: Player
): void {
  const roomData = roomStore.getRoomData(roomCode)
  if (!roomData || !roomData.gameState) return

  // Double-check it's still the AI's turn (in case of race conditions)
  const currentPlayer = getCurrentPlayer(roomData.gameState)
  if (!currentPlayer || currentPlayer.id !== aiPlayer.id) return

  // Check if game is still active
  if (roomData.gameState.winner || roomData.gameState.isDraw) return

  try {
    // Get AI move
    const difficulty = getAIDifficulty(aiPlayer)
    const move = getServerAIMove(roomData.gameState, difficulty)

    // Apply the move
    const result = applyMove(roomData.gameState, aiPlayer.id, move.row, move.col)

    if (!result.ok) {
      console.error(`AI move failed for ${aiPlayer.name}: ${result.error}`)
      return
    }

    // Update game state with new turn timer if applicable
    let finalState = result.state
    let turnDeadlineMs: number | undefined

    if (!finalState.winner && !finalState.isDraw && roomData.rules.timeLimit) {
      finalState = startTurnTimer(finalState, roomData.rules.timeLimit)
      turnDeadlineMs = finalState.turnDeadline
      roomStore.setTurnDeadline(roomCode, turnDeadlineMs!)
    } else {
      roomStore.setTurnDeadline(roomCode, null)
    }

    // Update stored game state
    roomStore.setGameState(roomCode, finalState)

    // Broadcast new game state
    io.to(roomCode.toUpperCase()).emit('game:state', {
      gameState: finalState,
      serverTimeMs: Date.now(),
      turnDeadlineMs,
    })

    console.log(`AI ${aiPlayer.name} moved to (${move.row}, ${move.col}) in room ${roomCode}`)

    // Check if game ended
    if (finalState.winner || finalState.isDraw) {
      handleRoundEnd(io, roomStore, roomCode, finalState)
    } else {
      // Check if next player is also AI
      processAITurnIfNeeded(io, roomStore, roomCode)
    }
  } catch (error) {
    console.error(`AI move error for ${aiPlayer.name}:`, error)
  }
}

function handleSubmitMove(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore,
  data: SubmitMovePayload
): void {
  const { roomCode, playerId, row, col } = data

  // Rate limit check for move submissions (per player)
  const moveRateLimitKey = `move:${playerId}`
  if (!moveRateLimiter.isAllowed(moveRateLimitKey)) {
    socket.emit('move:ack', { accepted: false, reason: 'Too many moves. Slow down!' })
    return
  }

  const roomData = roomStore.getRoomData(roomCode)
  if (!roomData) {
    socket.emit('move:ack', { accepted: false, reason: 'Room not found' })
    return
  }

  // Spectators cannot submit moves
  if (roomStore.isSpectator(roomCode, playerId)) {
    socket.emit('move:ack', { accepted: false, reason: 'Spectators cannot make moves' })
    return
  }

  if (!roomData.stateMachine.canSubmitMove()) {
    socket.emit('move:ack', { accepted: false, reason: 'Not in playing phase' })
    return
  }

  if (!roomData.gameState) {
    socket.emit('move:ack', { accepted: false, reason: 'Game not started' })
    return
  }

  // Apply the move using the shared engine
  const result = applyMove(roomData.gameState, playerId, row, col)

  if (!result.ok) {
    socket.emit('move:ack', { accepted: false, reason: result.error || 'Invalid move' })
    return
  }

  // Update game state with new turn timer if applicable
  let finalState = result.state
  let turnDeadlineMs: number | undefined

  // If game continues and there's a time limit, start new turn timer
  if (!finalState.winner && !finalState.isDraw && roomData.rules.timeLimit) {
    finalState = startTurnTimer(finalState, roomData.rules.timeLimit)
    turnDeadlineMs = finalState.turnDeadline
    roomStore.setTurnDeadline(roomCode, turnDeadlineMs!)
  } else {
    // Game ended or no time limit - clear deadline
    roomStore.setTurnDeadline(roomCode, null)
  }

  // Update stored game state
  roomStore.setGameState(roomCode, finalState)

  // Acknowledge move
  socket.emit('move:ack', { accepted: true })

  // Broadcast new game state
  io.to(roomCode.toUpperCase()).emit('game:state', {
    gameState: finalState,
    serverTimeMs: Date.now(),
    turnDeadlineMs,
  })

  // Check if game ended
  if (finalState.winner || finalState.isDraw) {
    handleRoundEnd(io, roomStore, roomCode, finalState)
  } else {
    // Check if next player is AI and trigger their turn
    processAITurnIfNeeded(io, roomStore, roomCode)
  }
}

function handleRoundEnd(
  io: TypedServer,
  roomStore: RoomStore,
  roomCode: string,
  gameState: import('../../../shared/types/index.js').GameState
): void {
  // Transition to results phase
  roomStore.updatePhase(roomCode, 'ROUND_RESULTS')

  // Update scoreboard
  if (gameState.winner) {
    const winner = gameState.players.find((p) => p.symbol === gameState.winner)
    if (winner) {
      roomStore.updateScoreboard(roomCode, winner.id, 1)
    }
  }

  const room = roomStore.getRoom(roomCode)
  if (!room) return

  const winnerPlayer = gameState.winner
    ? gameState.players.find((p) => p.symbol === gameState.winner)
    : null

  // Broadcast results
  io.to(roomCode.toUpperCase()).emit('round:results', {
    winner: winnerPlayer?.name || null,
    winnerId: winnerPlayer?.id || null,
    winnerSymbol: gameState.winner,
    winningCells: gameState.winningCells,
    isDraw: gameState.isDraw,
    scoreboard: room.scoreboard,
  })

  // Broadcast updated scoreboard
  io.to(roomCode.toUpperCase()).emit('scoreboard:updated', {
    scoreboard: room.scoreboard,
  })

  console.log(`Round ended in room ${roomCode}. Winner: ${winnerPlayer?.name || 'Draw'}`)
}

function handleDisconnect(
  io: TypedServer,
  socket: TypedSocket,
  roomStore: RoomStore
): void {
  console.log(`Client disconnected: ${socket.id}`)

  const { playerId, roomCode } = socket.data

  if (!roomCode || !playerId) {
    return
  }

  // Mark player as disconnected (don't remove immediately - allow reconnect)
  roomStore.setPlayerDisconnected(roomCode, playerId)

  // Broadcast lobby update
  const room = roomStore.getRoom(roomCode)
  if (room) {
    io.to(roomCode).emit('lobby:updated', {
      players: room.players,
      hostId: room.hostId,
      rules: room.rules,
      phase: room.phase,
    })
  }

  // TODO: Set a timeout to remove player completely if they don't reconnect
}

// =============================================================================
// Utility Functions
// =============================================================================

function getErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    ROOM_NOT_FOUND: 'Room not found. Check the code and try again.',
    ROOM_FULL: 'This room is full.',
    ROOM_FULL_SPECTATE_AVAILABLE: 'Room is full. You can join as a spectator instead.',
    GAME_IN_PROGRESS: 'Game is already in progress.',
    GAME_IN_PROGRESS_SPECTATE_AVAILABLE: 'Game is in progress. You can join as a spectator to watch.',
    SPECTATORS_NOT_ALLOWED: 'This room does not allow spectators.',
    INVALID_NAME: 'Please enter a valid name.',
    INVALID_ROOM_CODE: 'Please enter a valid room code.',
    NOT_HOST: 'Only the host can perform this action.',
    INVALID_TOKEN: 'Reconnection failed. Invalid token.',
    PLAYER_NOT_FOUND: 'Player not found in room.',
  }

  return messages[error] || 'An error occurred.'
}
