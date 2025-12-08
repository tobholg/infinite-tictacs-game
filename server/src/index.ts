// =============================================================================
// Infinite Tic-Tacs Multiplayer Server
// =============================================================================

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../shared/types/events.js'

import { RoomStore } from './rooms/RoomStore.js'
import { setupSocketHandlers, startTimeoutChecker, stopTimeoutChecker } from './socket/handlers.js'

// -----------------------------------------------------------------------------
// Environment Configuration
// -----------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '3002', 10)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001'
const ROOM_IDLE_TTL_MINUTES = parseInt(process.env.ROOM_IDLE_TTL_MINUTES || '15', 10)

// Allow connections from localhost and local network IPs
const ALLOWED_ORIGINS = [
  CLIENT_URL,
  'http://192.168.137.146:3001',
  /^http:\/\/192\.168\.\d+\.\d+:3001$/,  // Any 192.168.x.x:3001
  /^http:\/\/10\.\d+\.\d+\.\d+:3001$/,   // Any 10.x.x.x:3001
]

// -----------------------------------------------------------------------------
// Express & Socket.IO Setup
// -----------------------------------------------------------------------------

const app = express()
const httpServer = createServer(app)

// Configure CORS
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
)

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Stats endpoint
app.get('/stats', (_req, res) => {
  res.json({
    activeRooms: roomStore.getRoomCount(),
    totalPlayers: roomStore.getTotalPlayerCount(),
    uptime: process.uptime(),
  })
})

// Create Socket.IO server with typed events
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Connection settings
  pingTimeout: 60000,
  pingInterval: 25000,
})

// -----------------------------------------------------------------------------
// Room Store & Handlers
// -----------------------------------------------------------------------------

const roomStore = new RoomStore(ROOM_IDLE_TTL_MINUTES)

// Start room cleanup job
roomStore.startCleanupInterval()

// Set up socket event handlers
setupSocketHandlers(io, roomStore)

// Start turn timeout checker
startTimeoutChecker(io, roomStore)

// -----------------------------------------------------------------------------
// Start Server
// -----------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎮 Infinite Tic-Tacs Multiplayer Server                     ║
║                                                               ║
║   Server running on port ${PORT}                                ║
║   Accepting connections from: ${CLIENT_URL}            ║
║   Room TTL: ${ROOM_IDLE_TTL_MINUTES} minutes                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  roomStore.stopCleanupInterval()
  stopTimeoutChecker()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  roomStore.stopCleanupInterval()
  stopTimeoutChecker()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
