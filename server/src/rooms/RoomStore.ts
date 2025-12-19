// =============================================================================
// Room Store - In-memory room management
// =============================================================================

import { v4 as uuidv4 } from 'uuid'

import type {
  AIDifficulty,
  GameRules,
  GameState,
  Player,
  PlayerSymbol,
  RoomPhase,
  RoomState,
  PLAYER_SYMBOLS,
} from '../../../shared/types/index.js'

import { generateUniqueRoomCode } from './RoomCodeGenerator.js'
import { RoomStateMachine } from './RoomStateMachine.js'

// Default player symbols (in order)
const DEFAULT_SYMBOLS: PlayerSymbol[] = [
  'X',
  'O',
  'Square',
  'Star',
  'Triangle',
  'Diamond',
  'Circle',
  'Plus',
  'Heart',
  'Pentagon',
]

interface RoomData extends RoomState {
  stateMachine: RoomStateMachine
  hostToken: string // Secret token for host verification
  rejoinTokens: Map<string, string> // playerId -> rejoinToken
  socketIds: Map<string, string> // playerId -> socketId
  hostQueue: string[] // Ordered list of player IDs for host failover
  turnDeadline: number | null // Timestamp when current turn expires
}

/**
 * In-memory store for active game rooms
 */
export class RoomStore {
  private rooms: Map<string, RoomData> = new Map()
  private cleanupIntervalId: NodeJS.Timeout | null = null
  private readonly ttlMinutes: number

  constructor(ttlMinutes: number = 15) {
    this.ttlMinutes = ttlMinutes
  }

  // ---------------------------------------------------------------------------
  // Room Creation & Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Create a new room
   * @param hostSpectating - If true, host starts as a spectator (not participating in game)
   */
  createRoom(
    hostSocketId: string,
    hostName: string,
    rules: GameRules,
    hostSpectating: boolean = false
  ): { room: RoomState; hostToken: string; playerId: string; rejoinToken: string } {
    const code = generateUniqueRoomCode(new Set(this.rooms.keys()))
    const hostToken = uuidv4()
    const playerId = uuidv4()
    const rejoinToken = uuidv4()

    const hostPlayer: Player = {
      id: playerId,
      name: hostName,
      symbol: DEFAULT_SYMBOLS[0]!, // Host gets first symbol (placeholder if spectating)
      isAI: false,
      connected: true,
      hasSetName: true, // Host always has their name set when creating
      isSpectator: hostSpectating, // Host can start as spectator
    }

    // Only add to scoreboard and hostQueue if host is playing
    const scoreboard = hostSpectating ? {} : { [playerId]: 0 }
    const hostQueue = hostSpectating ? [] : [playerId]

    const room: RoomData = {
      code,
      hostId: playerId,
      phase: 'LOBBY',
      players: [hostPlayer],
      gameState: null,
      rules,
      scoreboard,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      stateMachine: new RoomStateMachine('LOBBY'),
      hostToken,
      rejoinTokens: new Map([[playerId, rejoinToken]]),
      socketIds: new Map([[playerId, hostSocketId]]),
      hostQueue,
      turnDeadline: null,
    }

    this.rooms.set(code, room)
    console.log(`Room created: ${code} by ${hostName}${hostSpectating ? ' (spectating)' : ''}`)

    return {
      room: this.toPublicRoomState(room),
      hostToken,
      playerId,
      rejoinToken,
    }
  }

  /**
   * Get a room by code
   */
  getRoom(code: string): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return undefined
    return this.toPublicRoomState(room)
  }

  /**
   * Get internal room data (for server use only)
   */
  getRoomData(code: string): RoomData | undefined {
    return this.rooms.get(code.toUpperCase())
  }

  /**
   * Check if a room exists
   */
  hasRoom(code: string): boolean {
    return this.rooms.has(code.toUpperCase())
  }

  /**
   * Delete a room
   */
  deleteRoom(code: string): boolean {
    const deleted = this.rooms.delete(code.toUpperCase())
    if (deleted) {
      console.log(`Room deleted: ${code}`)
    }
    return deleted
  }

  // ---------------------------------------------------------------------------
  // Player Management
  // ---------------------------------------------------------------------------

  /**
   * Add a player to a room
   * If name is empty or '__PLACEHOLDER__', generates a placeholder name like "Player N"
   */
  addPlayer(
    code: string,
    name: string,
    socketId: string,
    asSpectator: boolean = false
  ):
    | { success: true; player: Player; rejoinToken: string; room: RoomState }
    | { success: false; error: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    // Count active (non-spectator) players
    const activePlayers = room.players.filter((p) => !p.isSpectator)
    const spectators = room.players.filter((p) => p.isSpectator)

    // Determine if we need a placeholder name
    const trimmedName = name?.trim() || ''
    const needsPlaceholder = !trimmedName || trimmedName === '__PLACEHOLDER__'

    // If joining as spectator
    if (asSpectator) {
      if (!room.rules.allowSpectators) {
        return { success: false, error: 'SPECTATORS_NOT_ALLOWED' }
      }

      const playerId = uuidv4()
      const rejoinToken = uuidv4()

      // Generate placeholder name for spectator if needed
      const spectatorName = needsPlaceholder
        ? `Spectator ${spectators.length + 1}`
        : trimmedName

      const spectator: Player = {
        id: playerId,
        name: spectatorName,
        symbol: 'X', // Spectators don't need a real symbol, just a placeholder
        isAI: false,
        connected: true,
        isSpectator: true,
        hasSetName: !needsPlaceholder,
      }

      room.players.push(spectator)
      room.rejoinTokens.set(playerId, rejoinToken)
      room.socketIds.set(playerId, socketId)
      room.lastActivityAt = Date.now()

      console.log(`Spectator joined: ${spectatorName} (${playerId}) -> Room ${code}`)

      return {
        success: true,
        player: spectator,
        rejoinToken,
        room: this.toPublicRoomState(room),
      }
    }

    // Regular player joining
    if (!room.stateMachine.canJoin()) {
      // If game in progress but spectators allowed, suggest spectating
      if (room.rules.allowSpectators) {
        return { success: false, error: 'GAME_IN_PROGRESS_SPECTATE_AVAILABLE' }
      }
      return { success: false, error: 'GAME_IN_PROGRESS' }
    }

    if (activePlayers.length >= room.rules.maxPlayers) {
      // If room is full but spectators are allowed, suggest spectating
      if (room.rules.allowSpectators) {
        return { success: false, error: 'ROOM_FULL_SPECTATE_AVAILABLE' }
      }
      return { success: false, error: 'ROOM_FULL' }
    }

    // Assign next available symbol (only from active players)
    const usedSymbols = new Set(activePlayers.map((p) => p.symbol))
    const availableSymbol = DEFAULT_SYMBOLS.find((s) => !usedSymbols.has(s))
    if (!availableSymbol) {
      return { success: false, error: 'ROOM_FULL' }
    }

    const playerId = uuidv4()
    const rejoinToken = uuidv4()

    // Generate placeholder name for player if needed
    const playerName = needsPlaceholder
      ? `Player ${activePlayers.length + 1}`
      : trimmedName

    const player: Player = {
      id: playerId,
      name: playerName,
      symbol: availableSymbol,
      isAI: false,
      connected: true,
      isSpectator: false,
      hasSetName: !needsPlaceholder,
    }

    room.players.push(player)
    room.scoreboard[playerId] = 0
    room.rejoinTokens.set(playerId, rejoinToken)
    room.socketIds.set(playerId, socketId)
    room.hostQueue.push(playerId)
    room.lastActivityAt = Date.now()

    console.log(`Player joined: ${playerName} (${playerId}) -> Room ${code}`)

    return {
      success: true,
      player,
      rejoinToken,
      room: this.toPublicRoomState(room),
    }
  }

  /**
   * Add an AI player to a room (host only)
   */
  addAIPlayer(
    code: string,
    name: string,
    difficulty: AIDifficulty
  ):
    | { success: true; player: Player; room: RoomState }
    | { success: false; error: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    // Can only add AI in lobby phase
    if (!room.stateMachine.canJoin()) {
      return { success: false, error: 'GAME_IN_PROGRESS' }
    }

    // Count active (non-spectator) players
    const activePlayers = room.players.filter((p) => !p.isSpectator)

    if (activePlayers.length >= room.rules.maxPlayers) {
      return { success: false, error: 'ROOM_FULL' }
    }

    // Assign next available symbol
    const usedSymbols = new Set(activePlayers.map((p) => p.symbol))
    const availableSymbol = DEFAULT_SYMBOLS.find((s) => !usedSymbols.has(s))
    if (!availableSymbol) {
      return { success: false, error: 'ROOM_FULL' }
    }

    const playerId = uuidv4()

    const aiPlayer: Player = {
      id: playerId,
      name,
      symbol: availableSymbol,
      isAI: true,
      aiDifficulty: difficulty,
      connected: true, // AI is always "connected"
      isSpectator: false,
    }

    room.players.push(aiPlayer)
    room.scoreboard[playerId] = 0
    // AI players don't need rejoin tokens or socket IDs
    room.lastActivityAt = Date.now()

    console.log(`AI player added: ${name} (${difficulty}) -> Room ${code}`)

    return {
      success: true,
      player: aiPlayer,
      room: this.toPublicRoomState(room),
    }
  }

  /**
   * Remove an AI player from a room
   */
  removeAIPlayer(code: string, aiPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    const playerIndex = room.players.findIndex((p) => p.id === aiPlayerId)
    if (playerIndex === -1) {
      return { success: false, error: 'PLAYER_NOT_FOUND' }
    }

    const player = room.players[playerIndex]
    if (!player?.isAI) {
      return { success: false, error: 'NOT_AN_AI_PLAYER' }
    }

    // Can only remove AI in lobby phase
    if (!room.stateMachine.canJoin()) {
      return { success: false, error: 'GAME_IN_PROGRESS' }
    }

    room.players.splice(playerIndex, 1)
    delete room.scoreboard[aiPlayerId]
    room.lastActivityAt = Date.now()

    console.log(`AI player removed: ${aiPlayerId} <- Room ${code}`)

    return { success: true }
  }

  /**
   * Remove a player from a room
   * @returns The new host ID if host was transferred, null otherwise
   */
  removePlayer(code: string, playerId: string): { hostTransferred: boolean; newHostId?: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { hostTransferred: false }
    }

    const playerIndex = room.players.findIndex((p) => p.id === playerId)
    if (playerIndex === -1) {
      return { hostTransferred: false }
    }

    room.players.splice(playerIndex, 1)
    room.rejoinTokens.delete(playerId)
    room.socketIds.delete(playerId)
    room.hostQueue = room.hostQueue.filter((id) => id !== playerId)
    room.lastActivityAt = Date.now()

    console.log(`Player left: ${playerId} <- Room ${code}`)

    // Delete room if empty
    if (room.players.length === 0) {
      this.deleteRoom(code)
      return { hostTransferred: false }
    }

    // Transfer host if needed
    if (room.hostId === playerId && room.hostQueue.length > 0) {
      const newHostId = room.hostQueue[0]!
      room.hostId = newHostId
      console.log(`Host transferred to: ${newHostId}`)
      return { hostTransferred: true, newHostId }
    }

    return { hostTransferred: false }
  }

  /**
   * Mark a player as disconnected
   */
  setPlayerDisconnected(code: string, playerId: string): void {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return

    const player = room.players.find((p) => p.id === playerId)
    if (player) {
      player.connected = false
      room.socketIds.delete(playerId)
      room.lastActivityAt = Date.now()
    }
  }

  /**
   * Reconnect a player
   */
  reconnectPlayer(
    code: string,
    playerId: string,
    rejoinToken: string,
    newSocketId: string
  ): { success: true; room: RoomState } | { success: false; error: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    const storedToken = room.rejoinTokens.get(playerId)
    if (!storedToken || storedToken !== rejoinToken) {
      return { success: false, error: 'INVALID_TOKEN' }
    }

    const player = room.players.find((p) => p.id === playerId)
    if (!player) {
      return { success: false, error: 'PLAYER_NOT_FOUND' }
    }

    player.connected = true
    room.socketIds.set(playerId, newSocketId)
    room.lastActivityAt = Date.now()

    console.log(`Player reconnected: ${playerId} -> Room ${code}`)

    return { success: true, room: this.toPublicRoomState(room) }
  }

  /**
   * Set a player's name (for players who joined with placeholder names)
   * Validates that the name is not already taken in the room (case-insensitive)
   */
  setPlayerName(
    code: string,
    playerId: string,
    name: string,
    becomeSpectator: boolean
  ):
    | { success: true; player: Player; room: RoomState }
    | { success: false; error: 'ROOM_NOT_FOUND' | 'PLAYER_NOT_FOUND' | 'INVALID_NAME' | 'DUPLICATE_NAME' | 'ROOM_FULL' | 'GAME_IN_PROGRESS' | 'SPECTATORS_NOT_ALLOWED' } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    const player = room.players.find((p) => p.id === playerId)
    if (!player) {
      return { success: false, error: 'PLAYER_NOT_FOUND' }
    }

    // Validate name is not empty
    const trimmedName = name?.trim() || ''
    if (!trimmedName || trimmedName.length === 0) {
      return { success: false, error: 'INVALID_NAME' }
    }

    // Check for duplicate names (case-insensitive, excluding current player)
    const nameLower = trimmedName.toLowerCase()
    const isDuplicate = room.players.some(
      (p) => p.id !== playerId && p.name.toLowerCase() === nameLower
    )
    if (isDuplicate) {
      return { success: false, error: 'DUPLICATE_NAME' }
    }

    // Handle spectator conversion if requested
    if (becomeSpectator && !player.isSpectator) {
      // Check if spectators are allowed
      if (!room.rules.allowSpectators) {
        return { success: false, error: 'SPECTATORS_NOT_ALLOWED' }
      }
      // Player wants to become a spectator
      player.isSpectator = true
      // Remove from host queue if present
      room.hostQueue = room.hostQueue.filter((id) => id !== playerId)
      // Remove from scoreboard
      delete room.scoreboard[playerId]
      console.log(`Player ${trimmedName} switched to spectator in room ${code}`)
    } else if (!becomeSpectator && player.isSpectator) {
      // Spectator wants to become a player
      // Check if room is not full
      const activePlayers = room.players.filter((p) => !p.isSpectator)
      if (activePlayers.length >= room.rules.maxPlayers) {
        return { success: false, error: 'ROOM_FULL' }
      }

      // Can only become player during lobby phase
      if (!room.stateMachine.canJoin()) {
        return { success: false, error: 'GAME_IN_PROGRESS' }
      }

      // Assign a new symbol
      const usedSymbols = new Set(activePlayers.map((p) => p.symbol))
      const availableSymbol = DEFAULT_SYMBOLS.find((s) => !usedSymbols.has(s))
      if (!availableSymbol) {
        return { success: false, error: 'ROOM_FULL' }
      }

      player.isSpectator = false
      player.symbol = availableSymbol
      // Add to host queue
      room.hostQueue.push(playerId)
      // Add to scoreboard
      room.scoreboard[playerId] = 0
      console.log(`Spectator ${trimmedName} switched to player in room ${code}`)
    }

    // Update player name and mark as having set name
    player.name = trimmedName
    player.hasSetName = true
    room.lastActivityAt = Date.now()

    console.log(`Player name set: ${playerId} -> ${trimmedName} in room ${code}`)

    return {
      success: true,
      player,
      room: this.toPublicRoomState(room),
    }
  }

  /**
   * Get socket ID for a player
   */
  getSocketId(code: string, playerId: string): string | undefined {
    const room = this.rooms.get(code.toUpperCase())
    return room?.socketIds.get(playerId)
  }

  /**
   * Get all socket IDs in a room
   */
  getRoomSocketIds(code: string): string[] {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return []
    return Array.from(room.socketIds.values())
  }

  // ---------------------------------------------------------------------------
  // Game State Management
  // ---------------------------------------------------------------------------

  /**
   * Update the game state
   */
  setGameState(code: string, state: GameState): void {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return

    room.gameState = state
    room.lastActivityAt = Date.now()
  }

  /**
   * Update room phase
   */
  updatePhase(code: string, phase: RoomPhase): boolean {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return false

    const success = room.stateMachine.transition(phase)
    if (success) {
      room.phase = phase
      room.lastActivityAt = Date.now()
    }
    return success
  }

  /**
   * Update scoreboard
   */
  updateScoreboard(code: string, playerId: string, points: number): void {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return

    room.scoreboard[playerId] = (room.scoreboard[playerId] || 0) + points
    room.lastActivityAt = Date.now()
  }

  /**
   * Verify host token
   */
  verifyHostToken(code: string, token: string): boolean {
    const room = this.rooms.get(code.toUpperCase())
    return room?.hostToken === token
  }

  /**
   * Check if a player is the host
   */
  isHost(code: string, playerId: string): boolean {
    const room = this.rooms.get(code.toUpperCase())
    return room?.hostId === playerId
  }

  /**
   * Check if a player is a spectator
   */
  isSpectator(code: string, playerId: string): boolean {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return false
    const player = room.players.find((p) => p.id === playerId)
    return player?.isSpectator === true
  }

  /**
   * Get active (non-spectator) player count
   */
  getActivePlayerCount(code: string): number {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return 0
    return room.players.filter((p) => !p.isSpectator).length
  }

  /**
   * Get spectator count
   */
  getSpectatorCount(code: string): number {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return 0
    return room.players.filter((p) => p.isSpectator).length
  }

  /**
   * Toggle host between playing and spectating
   * Host can switch to spectator mode or back to playing
   */
  toggleHostSpectate(
    code: string,
    hostPlayerId: string,
    becomeSpectator: boolean
  ): { success: true; room: RoomState } | { success: false; error: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    // Verify this is the host
    if (room.hostId !== hostPlayerId) {
      return { success: false, error: 'NOT_HOST' }
    }

    const hostPlayer = room.players.find((p) => p.id === hostPlayerId)
    if (!hostPlayer) {
      return { success: false, error: 'PLAYER_NOT_FOUND' }
    }

    // Already in desired state
    if (hostPlayer.isSpectator === becomeSpectator) {
      return { success: true, room: this.toPublicRoomState(room) }
    }

    if (becomeSpectator) {
      // Host wants to become a spectator
      hostPlayer.isSpectator = true
      // Remove from host queue (but keep as host for room control)
      room.hostQueue = room.hostQueue.filter((id) => id !== hostPlayerId)
      // Remove from scoreboard when spectating
      delete room.scoreboard[hostPlayerId]
      console.log(`Host ${hostPlayer.name} is now spectating in room ${code}`)
    } else {
      // Host wants to rejoin as a player
      // Check if room is not full
      const activePlayers = room.players.filter((p) => !p.isSpectator)
      if (activePlayers.length >= room.rules.maxPlayers) {
        return { success: false, error: 'ROOM_FULL' }
      }

      // Can only rejoin during lobby phase
      if (!room.stateMachine.canJoin()) {
        return { success: false, error: 'GAME_IN_PROGRESS' }
      }

      // Assign a new symbol
      const usedSymbols = new Set(activePlayers.map((p) => p.symbol))
      const availableSymbol = DEFAULT_SYMBOLS.find((s) => !usedSymbols.has(s))
      if (!availableSymbol) {
        return { success: false, error: 'ROOM_FULL' }
      }

      hostPlayer.isSpectator = false
      hostPlayer.symbol = availableSymbol
      // Re-add to host queue at the front
      room.hostQueue.unshift(hostPlayerId)
      // Re-add to scoreboard
      room.scoreboard[hostPlayerId] = 0
      console.log(`Host ${hostPlayer.name} rejoined as player in room ${code}`)
    }

    room.lastActivityAt = Date.now()
    return { success: true, room: this.toPublicRoomState(room) }
  }

  /**
   * Return to lobby from ROUND_RESULTS phase
   * Resets game state but keeps players and scoreboard
   */
  returnToLobby(code: string): { success: true; room: RoomState } | { success: false; error: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    // Can only return to lobby from ROUND_RESULTS or COMPLETED
    if (room.phase !== 'ROUND_RESULTS' && room.phase !== 'COMPLETED') {
      return { success: false, error: 'INVALID_PHASE' }
    }

    // Transition to LOBBY
    const success = room.stateMachine.transition('LOBBY')
    if (!success) {
      return { success: false, error: 'TRANSITION_FAILED' }
    }

    room.phase = 'LOBBY'
    room.gameState = null  // Clear game state
    room.turnDeadline = null  // Clear any turn deadline
    room.lastActivityAt = Date.now()

    console.log(`Room ${code} returned to lobby`)

    return {
      success: true,
      room: this.toPublicRoomState(room),
    }
  }

  /**
   * Update room rules (host only)
   * Note: allowSpectators is IMMUTABLE - it can only be set at room creation
   */
  updateRules(
    code: string,
    rulesUpdate: Partial<GameRules>
  ): { success: true; room: RoomState } | { success: false; error: string } {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' }
    }

    // Can only update rules during lobby phase
    if (!room.stateMachine.canJoin()) {
      return { success: false, error: 'GAME_IN_PROGRESS' }
    }

    // allowSpectators is immutable after room creation - strip it from the update
    const { allowSpectators, ...safeRulesUpdate } = rulesUpdate

    // Apply rules update (without allowSpectators)
    room.rules = { ...room.rules, ...safeRulesUpdate }
    room.lastActivityAt = Date.now()

    console.log(`Rules updated in room ${code}:`, safeRulesUpdate)

    return {
      success: true,
      room: this.toPublicRoomState(room),
    }
  }

  // ---------------------------------------------------------------------------
  // Turn Timer Management
  // ---------------------------------------------------------------------------

  /**
   * Set the turn deadline for a room
   */
  setTurnDeadline(code: string, deadline: number | null): void {
    const room = this.rooms.get(code.toUpperCase())
    if (!room) return
    room.turnDeadline = deadline
    room.lastActivityAt = Date.now()
  }

  /**
   * Get the turn deadline for a room
   */
  getTurnDeadline(code: string): number | null {
    const room = this.rooms.get(code.toUpperCase())
    return room?.turnDeadline ?? null
  }

  /**
   * Check if turn has timed out
   */
  isTurnTimedOut(code: string): boolean {
    const room = this.rooms.get(code.toUpperCase())
    if (!room || !room.turnDeadline) return false
    return Date.now() > room.turnDeadline
  }

  /**
   * Get all rooms that are in active play with time limits
   */
  getRoomsWithActiveTimers(): string[] {
    const roomCodes: string[] = []
    for (const [code, room] of this.rooms) {
      if (
        room.phase === 'ROUND_ACTIVE' &&
        room.rules.timeLimit &&
        room.turnDeadline
      ) {
        roomCodes.push(code)
      }
    }
    return roomCodes
  }

  // ---------------------------------------------------------------------------
  // Room Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get total number of rooms
   */
  getRoomCount(): number {
    return this.rooms.size
  }

  /**
   * Get total number of players across all rooms
   */
  getTotalPlayerCount(): number {
    let count = 0
    for (const room of this.rooms.values()) {
      count += room.players.length
    }
    return count
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Start the cleanup interval
   */
  startCleanupInterval(): void {
    // Run every minute
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupStaleRooms()
    }, 60 * 1000)
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
  }

  /**
   * Remove rooms that have been idle too long
   */
  private cleanupStaleRooms(): void {
    const now = Date.now()
    const ttlMs = this.ttlMinutes * 60 * 1000

    for (const [code, room] of this.rooms) {
      const idleTime = now - room.lastActivityAt
      if (idleTime > ttlMs) {
        console.log(`Cleaning up stale room: ${code} (idle for ${Math.round(idleTime / 60000)} minutes)`)
        this.rooms.delete(code)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Convert internal room data to public room state
   */
  private toPublicRoomState(room: RoomData): RoomState {
    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      players: room.players,
      gameState: room.gameState,
      rules: room.rules,
      scoreboard: room.scoreboard,
      createdAt: room.createdAt,
      lastActivityAt: room.lastActivityAt,
    }
  }
}
