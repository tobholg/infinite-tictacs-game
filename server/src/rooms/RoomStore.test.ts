import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RoomStore } from './RoomStore.js'
import type { GameRules } from '../../../shared/types/index.js'

describe('RoomStore', () => {
  let roomStore: RoomStore
  const defaultRules: GameRules = {
    winLength: 4,
    maxPlayers: 10,
    allowSpectators: true,
  }

  beforeEach(() => {
    roomStore = new RoomStore(15) // 15 min TTL
  })

  afterEach(() => {
    roomStore.stopCleanupInterval()
  })

  describe('createRoom', () => {
    it('should create a room with valid data', () => {
      const result = roomStore.createRoom('socket-123', 'HostPlayer', defaultRules)

      expect(result.room.code).toMatch(/^[A-Z0-9]{6}$/)
      expect(result.room.hostId).toBe(result.playerId)
      expect(result.room.phase).toBe('LOBBY')
      expect(result.room.players).toHaveLength(1)
      expect(result.room.players[0]?.name).toBe('HostPlayer')
      expect(result.room.players[0]?.symbol).toBe('X')
      expect(result.room.players[0]?.isAI).toBe(false)
      expect(result.hostToken).toBeDefined()
      expect(result.playerId).toBeDefined()
      expect(result.rejoinToken).toBeDefined()
    })

    it('should generate unique room codes', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 10; i++) {
        const result = roomStore.createRoom(`socket-${i}`, `Player${i}`, defaultRules)
        expect(codes.has(result.room.code)).toBe(false)
        codes.add(result.room.code)
      }
    })

    it('should initialize scoreboard with host', () => {
      const result = roomStore.createRoom('socket-123', 'HostPlayer', defaultRules)
      expect(result.room.scoreboard[result.playerId]).toBe(0)
    })
  })

  describe('getRoom / hasRoom', () => {
    it('should retrieve created room', () => {
      const result = roomStore.createRoom('socket-123', 'Host', defaultRules)
      const room = roomStore.getRoom(result.room.code)

      expect(room).toBeDefined()
      expect(room?.code).toBe(result.room.code)
    })

    it('should be case-insensitive', () => {
      const result = roomStore.createRoom('socket-123', 'Host', defaultRules)
      const lower = roomStore.getRoom(result.room.code.toLowerCase())
      const upper = roomStore.getRoom(result.room.code.toUpperCase())

      expect(lower).toBeDefined()
      expect(upper).toBeDefined()
      expect(lower?.code).toBe(upper?.code)
    })

    it('should return undefined for non-existent room', () => {
      expect(roomStore.getRoom('NOTACODE')).toBeUndefined()
    })

    it('hasRoom should return correct boolean', () => {
      const result = roomStore.createRoom('socket-123', 'Host', defaultRules)
      expect(roomStore.hasRoom(result.room.code)).toBe(true)
      expect(roomStore.hasRoom('NOTACODE')).toBe(false)
    })
  })

  describe('addPlayer', () => {
    let roomCode: string

    beforeEach(() => {
      const result = roomStore.createRoom('host-socket', 'Host', defaultRules)
      roomCode = result.room.code
    })

    it('should add player to room', () => {
      const result = roomStore.addPlayer(roomCode, 'Player2', 'socket-2')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.player.name).toBe('Player2')
        expect(result.player.symbol).toBe('O') // Second symbol
        expect(result.room.players).toHaveLength(2)
      }
    })

    it('should assign symbols in order', () => {
      const expectedSymbols = ['O', 'Square', 'Star', 'Triangle']
      for (let i = 0; i < 4; i++) {
        const result = roomStore.addPlayer(roomCode, `Player${i + 2}`, `socket-${i}`)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.player.symbol).toBe(expectedSymbols[i])
        }
      }
    })

    it('should reject when room is full', () => {
      const rulesWithLimit: GameRules = { ...defaultRules, maxPlayers: 2 }
      const newRoom = roomStore.createRoom('host', 'Host', rulesWithLimit)

      roomStore.addPlayer(newRoom.room.code, 'Player2', 'socket-2')
      const result = roomStore.addPlayer(newRoom.room.code, 'Player3', 'socket-3')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('ROOM_FULL')
      }
    })

    it('should reject for non-existent room', () => {
      const result = roomStore.addPlayer('BADCODE', 'Player', 'socket')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ROOM_NOT_FOUND')
      }
    })

    it('should allow joining as spectator', () => {
      const result = roomStore.addPlayer(roomCode, 'Spectator1', 'socket-spec', true)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.player.isSpectator).toBe(true)
      }
    })

    it('should reject spectator if not allowed', () => {
      const noSpecRules: GameRules = { ...defaultRules, allowSpectators: false }
      const noSpecRoom = roomStore.createRoom('host', 'Host', noSpecRules)

      const result = roomStore.addPlayer(noSpecRoom.room.code, 'Spectator', 'socket', true)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('SPECTATORS_NOT_ALLOWED')
      }
    })
  })

  describe('addAIPlayer', () => {
    let roomCode: string

    beforeEach(() => {
      const result = roomStore.createRoom('host-socket', 'Host', defaultRules)
      roomCode = result.room.code
    })

    it('should add AI player with correct properties', () => {
      const result = roomStore.addAIPlayer(roomCode, 'AI Bot', 'medium')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.player.name).toBe('AI Bot')
        expect(result.player.isAI).toBe(true)
        expect(result.player.aiDifficulty).toBe('medium')
        expect(result.player.connected).toBe(true)
      }
    })

    it('should assign correct symbol to AI', () => {
      const result = roomStore.addAIPlayer(roomCode, 'AI Bot', 'easy')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.player.symbol).toBe('O') // Second symbol after host's X
      }
    })

    it('should reject when room is full', () => {
      const rulesWithLimit: GameRules = { ...defaultRules, maxPlayers: 2 }
      const newRoom = roomStore.createRoom('host', 'Host', rulesWithLimit)

      roomStore.addAIPlayer(newRoom.room.code, 'AI1', 'easy')
      const result = roomStore.addAIPlayer(newRoom.room.code, 'AI2', 'easy')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ROOM_FULL')
      }
    })
  })

  describe('removeAIPlayer', () => {
    let roomCode: string
    let aiPlayerId: string

    beforeEach(() => {
      const room = roomStore.createRoom('host', 'Host', defaultRules)
      roomCode = room.room.code
      const aiResult = roomStore.addAIPlayer(roomCode, 'AI Bot', 'medium')
      if (aiResult.success) {
        aiPlayerId = aiResult.player.id
      }
    })

    it('should remove AI player', () => {
      const result = roomStore.removeAIPlayer(roomCode, aiPlayerId)

      expect(result.success).toBe(true)
      const room = roomStore.getRoom(roomCode)
      expect(room?.players).toHaveLength(1) // Only host remains
    })

    it('should reject removing non-AI player', () => {
      const room = roomStore.createRoom('host', 'Host', defaultRules)
      const hostId = room.playerId

      const result = roomStore.removeAIPlayer(room.room.code, hostId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_AN_AI_PLAYER')
      }
    })
  })

  describe('removePlayer', () => {
    let roomCode: string
    let hostId: string
    let player2Id: string

    beforeEach(() => {
      const room = roomStore.createRoom('host-socket', 'Host', defaultRules)
      roomCode = room.room.code
      hostId = room.playerId

      const p2 = roomStore.addPlayer(roomCode, 'Player2', 'socket-2')
      if (p2.success) {
        player2Id = p2.player.id
      }
    })

    it('should remove player from room', () => {
      roomStore.removePlayer(roomCode, player2Id)
      const room = roomStore.getRoom(roomCode)

      expect(room?.players).toHaveLength(1)
      expect(room?.players[0]?.id).toBe(hostId)
    })

    it('should delete room when last player leaves', () => {
      roomStore.removePlayer(roomCode, player2Id)
      roomStore.removePlayer(roomCode, hostId)

      expect(roomStore.hasRoom(roomCode)).toBe(false)
    })

    it('should transfer host when host leaves', () => {
      const result = roomStore.removePlayer(roomCode, hostId)

      expect(result.hostTransferred).toBe(true)
      expect(result.newHostId).toBe(player2Id)

      const room = roomStore.getRoom(roomCode)
      expect(room?.hostId).toBe(player2Id)
    })
  })

  describe('reconnectPlayer', () => {
    let roomCode: string
    let playerId: string
    let rejoinToken: string

    beforeEach(() => {
      const room = roomStore.createRoom('socket-1', 'Host', defaultRules)
      roomCode = room.room.code
      playerId = room.playerId
      rejoinToken = room.rejoinToken
    })

    it('should reconnect player with valid token', () => {
      roomStore.setPlayerDisconnected(roomCode, playerId)
      const result = roomStore.reconnectPlayer(roomCode, playerId, rejoinToken, 'new-socket')

      expect(result.success).toBe(true)
      if (result.success) {
        const player = result.room.players.find((p) => p.id === playerId)
        expect(player?.connected).toBe(true)
      }
    })

    it('should reject invalid token', () => {
      const result = roomStore.reconnectPlayer(roomCode, playerId, 'bad-token', 'socket')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_TOKEN')
      }
    })

    it('should reject for non-existent room', () => {
      const result = roomStore.reconnectPlayer('BADCODE', playerId, rejoinToken, 'socket')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ROOM_NOT_FOUND')
      }
    })
  })

  describe('host verification', () => {
    it('should verify host token correctly', () => {
      const room = roomStore.createRoom('socket', 'Host', defaultRules)

      expect(roomStore.verifyHostToken(room.room.code, room.hostToken)).toBe(true)
      expect(roomStore.verifyHostToken(room.room.code, 'bad-token')).toBe(false)
    })

    it('should identify host correctly', () => {
      const room = roomStore.createRoom('socket', 'Host', defaultRules)
      const p2 = roomStore.addPlayer(room.room.code, 'P2', 'socket-2')

      expect(roomStore.isHost(room.room.code, room.playerId)).toBe(true)
      if (p2.success) {
        expect(roomStore.isHost(room.room.code, p2.player.id)).toBe(false)
      }
    })
  })

  describe('spectator queries', () => {
    let roomCode: string

    beforeEach(() => {
      const room = roomStore.createRoom('host', 'Host', defaultRules)
      roomCode = room.room.code
      roomStore.addPlayer(roomCode, 'P2', 'socket-2')
      roomStore.addPlayer(roomCode, 'Spec1', 'socket-spec1', true)
      roomStore.addPlayer(roomCode, 'Spec2', 'socket-spec2', true)
    })

    it('should count active players correctly', () => {
      expect(roomStore.getActivePlayerCount(roomCode)).toBe(2) // Host + P2
    })

    it('should count spectators correctly', () => {
      expect(roomStore.getSpectatorCount(roomCode)).toBe(2)
    })

    it('should identify spectators', () => {
      const room = roomStore.getRoom(roomCode)
      const spec = room?.players.find((p) => p.name === 'Spec1')
      if (spec) {
        expect(roomStore.isSpectator(roomCode, spec.id)).toBe(true)
      }
    })
  })

  describe('turn timer', () => {
    let roomCode: string

    beforeEach(() => {
      const room = roomStore.createRoom('host', 'Host', defaultRules)
      roomCode = room.room.code
    })

    it('should set and get turn deadline', () => {
      const deadline = Date.now() + 30000
      roomStore.setTurnDeadline(roomCode, deadline)

      expect(roomStore.getTurnDeadline(roomCode)).toBe(deadline)
    })

    it('should detect timeout', () => {
      const pastDeadline = Date.now() - 1000
      roomStore.setTurnDeadline(roomCode, pastDeadline)

      expect(roomStore.isTurnTimedOut(roomCode)).toBe(true)
    })

    it('should not timeout before deadline', () => {
      const futureDeadline = Date.now() + 30000
      roomStore.setTurnDeadline(roomCode, futureDeadline)

      expect(roomStore.isTurnTimedOut(roomCode)).toBe(false)
    })
  })

  describe('cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should cleanup stale rooms', () => {
      const ttlMinutes = 1 // 1 minute TTL for faster testing
      const store = new RoomStore(ttlMinutes)

      store.createRoom('socket', 'Host', defaultRules)
      expect(store.getRoomCount()).toBe(1)

      // Advance time past TTL
      vi.advanceTimersByTime(2 * 60 * 1000) // 2 minutes

      // Trigger cleanup manually (or wait for interval)
      store.startCleanupInterval()
      vi.advanceTimersByTime(60 * 1000) // Trigger cleanup interval

      expect(store.getRoomCount()).toBe(0)
      store.stopCleanupInterval()
    })
  })

  describe('statistics', () => {
    it('should count rooms correctly', () => {
      expect(roomStore.getRoomCount()).toBe(0)

      roomStore.createRoom('s1', 'H1', defaultRules)
      expect(roomStore.getRoomCount()).toBe(1)

      roomStore.createRoom('s2', 'H2', defaultRules)
      expect(roomStore.getRoomCount()).toBe(2)
    })

    it('should count total players', () => {
      const r1 = roomStore.createRoom('s1', 'H1', defaultRules)
      roomStore.addPlayer(r1.room.code, 'P2', 's2')

      const r2 = roomStore.createRoom('s3', 'H2', defaultRules)
      roomStore.addPlayer(r2.room.code, 'P3', 's4')
      roomStore.addPlayer(r2.room.code, 'P4', 's5')

      expect(roomStore.getTotalPlayerCount()).toBe(5)
    })
  })
})
