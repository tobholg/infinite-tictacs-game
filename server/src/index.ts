// =============================================================================
// Infinite Tic-Tacs Multiplayer Server
// =============================================================================

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

const PORT = parseInt(process.env.PORT || '3011', 10)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3010'
const ROOM_IDLE_TTL_MINUTES = parseInt(process.env.ROOM_IDLE_TTL_MINUTES || '15', 10)

// Allow connections from localhost and local network IPs
const ALLOWED_ORIGINS = [
  CLIENT_URL,
  /^http:\/\/localhost:30\d{2}$/,        // Any localhost:30xx port
  /^http:\/\/192\.168\.\d+\.\d+:30\d{2}$/,  // Any 192.168.x.x:30xx
  /^http:\/\/10\.\d+\.\d+\.\d+:30\d{2}$/,   // Any 10.x.x.x:30xx
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

// AI stats endpoint - show Q-learning model info
app.get('/ai-stats', (_req, res) => {
  // Import dynamically to avoid circular deps
  import('./ai/QLearningServer.js').then(({ getAIStats }) => {
    res.json({
      models: getAIStats(),
      description: 'Q-learning models that improve from real player games'
    })
  }).catch(() => {
    res.json({ models: {}, error: 'AI module not loaded' })
  })
})

// -----------------------------------------------------------------------------
// Static File Serving (Production)
// -----------------------------------------------------------------------------

// In production, static files are copied to server/public
// In dev with tsx, __dirname is server/src, so ../public
// After build, __dirname is server/dist, so ../public
const staticPath = path.join(__dirname, '../public')
app.use(express.static(staticPath))

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes and socket.io
  if (req.path.startsWith('/health') || req.path.startsWith('/stats') || req.path.startsWith('/ai-stats') || req.path.startsWith('/socket.io')) {
    return next()
  }
  res.sendFile(path.join(staticPath, 'index.html'))
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

httpServer.listen(PORT, async () => {
  // Get AI stats for startup message
  let aiInfo = ''
  try {
    const { getAIStats } = await import('./ai/QLearningServer.js')
    const stats = getAIStats()
    const modelCount = Object.keys(stats).length
    const totalStates = Object.values(stats).reduce((sum, m) => sum + m.states, 0)
    aiInfo = `   🤖 AI: ${modelCount} models loaded, ${totalStates} learned states`
  } catch {
    aiInfo = '   🤖 AI: Learning from player games (starting fresh)'
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎮 Infinite Tic-Tacs Multiplayer Server                     ║
║                                                               ║
║   Server running on port ${PORT}                                ║
║   Accepting connections from: ${CLIENT_URL}            ║
║   Room TTL: ${ROOM_IDLE_TTL_MINUTES} minutes                                        ║
║                                                               ║
${aiInfo.padEnd(63)}║
║   AI learns from every game - gets smarter over time!         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown - save AI models before exit
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`)

  // Save AI models before shutting down
  try {
    const { saveAllModels } = await import('./ai/QLearningServer.js')
    saveAllModels()
    console.log('[Q-Learning] Models saved before shutdown')
  } catch (e) {
    console.log('[Q-Learning] Could not save models:', e)
  }

  roomStore.stopCleanupInterval()
  stopTimeoutChecker()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
