/**
 * Server-Side Q-Learning AI
 * - Loads pre-trained models from JSON files
 * - Learns from real player games
 * - Auto-saves improved models
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

import type { GameState, PlayerSymbol, Player } from '../../../shared/types/index.js'

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Types
// =============================================================================

interface QTableEntry {
  [action: string]: number
}

interface ModelStats {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  gamesDraw: number
  totalMoves: number
  qTableSize: number
  onlineGamesLearned: number  // Track games learned from real players
}

interface SavedModel {
  qTable: Record<string, QTableEntry>
  stats: ModelStats
  config: QLearningConfig
  savedAt: string
  version: string
}

interface QLearningConfig {
  learningRate: number      // How much new info overrides old (0-1)
  discountFactor: number    // Importance of future rewards (0-1)
  explorationRate: number   // Chance of random move during training (0-1)
  playerCount: number
}

interface GameRecord {
  moves: Array<{
    state: string
    action: string
    playerIndex: number
    symbol: PlayerSymbol
  }>
  winner: PlayerSymbol | null
  playerCount: number
  timestamp: number
}

// =============================================================================
// Constants
// =============================================================================

const MODELS_DIR = path.join(__dirname, '../../models/tictactoe-ai')
const DEFAULT_CONFIG: QLearningConfig = {
  learningRate: 0.3,
  discountFactor: 0.95,
  explorationRate: 0.1,  // Low for production (mostly use learned knowledge)
  playerCount: 2
}

const PLAYER_SYMBOLS: PlayerSymbol[] = ['X', 'O', 'Square', 'Star', 'Triangle', 'Diamond', 'Circle', 'Plus', 'Heart', 'Pentagon']

// Auto-save interval (save after this many games learned)
const AUTO_SAVE_INTERVAL = 10

// =============================================================================
// Q-Learning Engine Class
// =============================================================================

class QLearningEngine {
  private qTables: Map<number, Map<string, QTableEntry>> = new Map()  // Per player count
  private stats: Map<number, ModelStats> = new Map()
  private configs: Map<number, QLearningConfig> = new Map()
  private pendingGames: GameRecord[] = []
  private gamesLearnedSinceLastSave: number = 0

  constructor() {
    this.ensureModelsDir()
    this.loadAllModels()
  }

  // ===========================================================================
  // File System
  // ===========================================================================

  private ensureModelsDir(): void {
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true })
      console.log(`[Q-Learning] Created models directory: ${MODELS_DIR}`)
    }
  }

  private getModelPath(playerCount: number): string {
    return path.join(MODELS_DIR, `qlearning-${playerCount}p.json`)
  }

  private findModelFile(playerCount: number): string | null {
    try {
      const files = fs.readdirSync(MODELS_DIR)
      // Match pattern: qlearning-{n}p-{games}games.json
      const pattern = new RegExp(`^qlearning-${playerCount}p-\\d+games\\.json$`)
      const match = files.find(f => pattern.test(f))
      return match ? path.join(MODELS_DIR, match) : null
    } catch {
      return null
    }
  }

  private getEffectivePlayerCount(playerCount: number): number {
    return Math.min(Math.max(playerCount, 2), 10)
  }

  private extractGamesFromFilename(filename: string): number {
    const match = filename.match(/(\d+)games\.json$/)
    return match ? parseInt(match[1], 10) : 0
  }

  private loadAllModels(): void {
    console.log('[Q-Learning] Loading models...')

    // Try to load models for 2-10 players
    for (let pc = 2; pc <= 10; pc++) {
      this.loadModel(pc)
    }
  }

  private loadModel(playerCount: number): boolean {
    // First try new format: qlearning-{n}p-{games}games.json
    let modelPath = this.findModelFile(playerCount)

    // Fall back to old format: qlearning-{n}p.json
    if (!modelPath) {
      const oldPath = this.getModelPath(playerCount)
      if (fs.existsSync(oldPath)) {
        modelPath = oldPath
      }
    }

    if (!modelPath) {
      // Initialize empty model
      this.qTables.set(playerCount, new Map())
      this.stats.set(playerCount, {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
        totalMoves: 0,
        qTableSize: 0,
        onlineGamesLearned: 0
      })
      this.configs.set(playerCount, { ...DEFAULT_CONFIG, playerCount })
      console.log(`[Q-Learning] ⚠️ No model found for ${playerCount}p, starting fresh`)
      return false
    }

    try {
      const data = fs.readFileSync(modelPath, 'utf-8')
      const model = JSON.parse(data)
      const qTable = new Map<string, QTableEntry>()

      // Detect format: array = new format, object = old format
      if (Array.isArray(model.qTable)) {
        // New format: [["state::action", { value, visits }], ...]
        for (const entry of model.qTable) {
          const [key, valueObj] = entry
          // Key format: "state::action" - split by last "::"
          const lastSeparator = key.lastIndexOf('::')
          if (lastSeparator === -1) continue

          const state = key.substring(0, lastSeparator)
          const action = key.substring(lastSeparator + 2)
          const value = typeof valueObj === 'object' ? valueObj.value : valueObj

          if (!qTable.has(state)) {
            qTable.set(state, {})
          }
          qTable.get(state)![action] = value
        }

        // Extract games count from filename for stats
        const gamesCount = this.extractGamesFromFilename(modelPath)

        this.qTables.set(playerCount, qTable)
        this.stats.set(playerCount, {
          gamesPlayed: gamesCount,
          gamesWon: 0,
          gamesLost: 0,
          gamesDraw: 0,
          totalMoves: 0,
          qTableSize: qTable.size,
          onlineGamesLearned: 0
        })
        this.configs.set(playerCount, { ...DEFAULT_CONFIG, playerCount })

        console.log(`[Q-Learning] ✅ Loaded ${playerCount}p model (new format): ${gamesCount} games, ${qTable.size} states`)
      } else {
        // Old format: { state: { action: value } }
        for (const [state, actions] of Object.entries(model.qTable)) {
          qTable.set(state, actions as QTableEntry)
        }

        this.qTables.set(playerCount, qTable)
        this.stats.set(playerCount, model.stats || {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          gamesDraw: 0,
          totalMoves: 0,
          qTableSize: qTable.size,
          onlineGamesLearned: 0
        })
        this.configs.set(playerCount, model.config || { ...DEFAULT_CONFIG, playerCount })

        console.log(`[Q-Learning] ✅ Loaded ${playerCount}p model: ${model.stats?.gamesPlayed || 0} games, ${qTable.size} states`)
      }

      return true
    } catch (e) {
      console.error(`[Q-Learning] ❌ Failed to load ${playerCount}p model:`, e)

      // Initialize empty model on error
      this.qTables.set(playerCount, new Map())
      this.stats.set(playerCount, {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
        totalMoves: 0,
        qTableSize: 0,
        onlineGamesLearned: 0
      })
      this.configs.set(playerCount, { ...DEFAULT_CONFIG, playerCount })
      return false
    }
  }

  saveModel(playerCount: number): boolean {
    const qTable = this.qTables.get(playerCount)
    const stats = this.stats.get(playerCount)
    const config = this.configs.get(playerCount)

    if (!qTable || !stats || !config) {
      console.error(`[Q-Learning] No model data for ${playerCount}p`)
      return false
    }

    // Convert Map to plain object for JSON (efficient nested format)
    const qTableObj: Record<string, QTableEntry> = {}
    for (const [state, actions] of qTable.entries()) {
      qTableObj[state] = actions
    }

    // Calculate total games for filename
    const totalGames = stats.gamesPlayed + stats.onlineGamesLearned

    const model: SavedModel = {
      qTable: qTableObj,
      stats: { ...stats, qTableSize: qTable.size },
      config,
      savedAt: new Date().toISOString(),
      version: '2.0-server'
    }

    try {
      // New filename with game count
      const newModelPath = path.join(MODELS_DIR, `qlearning-${playerCount}p-${totalGames}games.json`)

      // Find old file - only delete if our data has more states (actual knowledge)
      const oldModelPath = this.findModelFile(playerCount)
      if (oldModelPath && oldModelPath !== newModelPath && fs.existsSync(oldModelPath)) {
        // Compare file sizes - larger file = more data
        const oldFileSize = fs.statSync(oldModelPath).size
        const newDataSize = JSON.stringify(model).length

        if (newDataSize >= oldFileSize) {
          fs.unlinkSync(oldModelPath)
          console.log(`[Q-Learning] Removed old model file: ${path.basename(oldModelPath)} (${oldFileSize} bytes < ${newDataSize} bytes)`)
        } else {
          console.log(`[Q-Learning] Keeping existing model file (${oldFileSize} bytes > ${newDataSize} bytes in memory)`)
          return true // Don't overwrite with less data
        }
      }

      fs.writeFileSync(newModelPath, JSON.stringify(model), 'utf-8')
      console.log(`[Q-Learning] ✅ Saved ${playerCount}p model: ${totalGames} games, ${qTable.size} states (${stats.onlineGamesLearned} learned online)`)
      return true
    } catch (e) {
      console.error(`[Q-Learning] ❌ Failed to save ${playerCount}p model:`, e)
      return false
    }
  }

  // ===========================================================================
  // State Encoding
  // ===========================================================================

  private encodeState(board: string[][], currentPlayerIndex: number, playerCount: number): string {
    // Normalize the board relative to current player
    const symbols = PLAYER_SYMBOLS.slice(0, playerCount)
    const currentSymbol = symbols[currentPlayerIndex]

    // Create a view where current player is always 'X' perspective
    const normalizedBoard = board.map(row =>
      row.map(cell => {
        if (cell === '') return '.'
        if (cell === currentSymbol) return 'M'  // Me
        return 'O'  // Opponent (simplified - treats all opponents the same)
      }).join('')
    ).join('|')

    return `${playerCount}p:${normalizedBoard}`
  }

  private encodeAction(row: number, col: number): string {
    return `${row},${col}`
  }

  private decodeAction(action: string): { row: number; col: number } {
    const [row, col] = action.split(',').map(Number)
    return { row, col }
  }

  // ===========================================================================
  // Q-Learning Core
  // ===========================================================================

  private getQValue(playerCount: number, state: string, action: string): number {
    const qTable = this.qTables.get(playerCount)
    if (!qTable) return 0

    const stateActions = qTable.get(state)
    if (!stateActions) return 0

    return stateActions[action] ?? 0
  }

  private setQValue(playerCount: number, state: string, action: string, value: number): void {
    let qTable = this.qTables.get(playerCount)
    if (!qTable) {
      qTable = new Map()
      this.qTables.set(playerCount, qTable)
    }

    let stateActions = qTable.get(state)
    if (!stateActions) {
      stateActions = {}
      qTable.set(state, stateActions)
    }

    stateActions[action] = value
  }

  private getValidActions(board: string[][]): string[] {
    const actions: string[] = []

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] === '' && this.isAdjacentToFilled(board, row, col)) {
          actions.push(this.encodeAction(row, col))
        }
      }
    }

    return actions
  }

  private isAdjacentToFilled(board: string[][], row: number, col: number): boolean {
    // First move: only center is valid
    const hasAnyPiece = board.some(r => r.some(c => c !== ''))
    if (!hasAnyPiece) {
      const centerRow = Math.floor(board.length / 2)
      const centerCol = Math.floor(board[0].length / 2)
      return row === centerRow && col === centerCol
    }

    // Check all 8 adjacent cells
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
          if (board[nr][nc] !== '') return true
        }
      }
    }

    return false
  }

  // ===========================================================================
  // AI Move Selection
  // ===========================================================================

  getBestMove(gameState: GameState): { row: number; col: number } | null {
    const { board, currentPlayerIndex, players } = gameState
    const rawPlayerCount = players.length
    // Cap at 10 players - use 10p model for games with more players
    const playerCount = this.getEffectivePlayerCount(rawPlayerCount)

    const state = this.encodeState(board, currentPlayerIndex, rawPlayerCount)
    const validActions = this.getValidActions(board)

    if (validActions.length === 0) return null

    const config = this.configs.get(playerCount) || DEFAULT_CONFIG

    // Small chance of exploration (random move) to discover new strategies
    if (Math.random() < config.explorationRate) {
      const randomAction = validActions[Math.floor(Math.random() * validActions.length)]
      return this.decodeAction(randomAction)
    }

    // Find action with highest Q-value
    let bestAction = validActions[0]
    let bestValue = this.getQValue(playerCount, state, validActions[0])

    for (const action of validActions) {
      const value = this.getQValue(playerCount, state, action)
      if (value > bestValue) {
        bestValue = value
        bestAction = action
      }
    }

    // If no learned values, pick randomly
    if (bestValue === 0) {
      bestAction = validActions[Math.floor(Math.random() * validActions.length)]
    }

    return this.decodeAction(bestAction)
  }

  // ===========================================================================
  // Learning from Games
  // ===========================================================================

  recordGameMove(
    board: string[][],
    row: number,
    col: number,
    currentPlayerIndex: number,
    symbol: PlayerSymbol,
    rawPlayerCount: number
  ): void {
    // Cap at 10 players for model lookup
    const playerCount = this.getEffectivePlayerCount(rawPlayerCount)

    // Find or create current game record (use effective playerCount)
    let gameRecord = this.pendingGames.find(g =>
      g.playerCount === playerCount &&
      Date.now() - g.timestamp < 30 * 60 * 1000  // Within 30 minutes
    )

    if (!gameRecord) {
      gameRecord = {
        moves: [],
        winner: null,
        playerCount,
        timestamp: Date.now()
      }
      this.pendingGames.push(gameRecord)
    }

    const state = this.encodeState(board, currentPlayerIndex, rawPlayerCount)
    const action = this.encodeAction(row, col)

    gameRecord.moves.push({
      state,
      action,
      playerIndex: currentPlayerIndex,
      symbol
    })

    gameRecord.timestamp = Date.now()  // Keep alive
  }

  learnFromCompletedGame(
    rawPlayerCount: number,
    winner: PlayerSymbol | null,
    finalBoard: string[][]
  ): void {
    // Cap at 10 players for model lookup
    const playerCount = this.getEffectivePlayerCount(rawPlayerCount)

    // Find the game record
    const gameIndex = this.pendingGames.findIndex(g => g.playerCount === playerCount)
    if (gameIndex === -1) {
      console.log('[Q-Learning] No game record found to learn from')
      return
    }

    const gameRecord = this.pendingGames.splice(gameIndex, 1)[0]
    gameRecord.winner = winner

    if (gameRecord.moves.length === 0) {
      console.log('[Q-Learning] Empty game record, skipping')
      return
    }

    const config = this.configs.get(playerCount) || DEFAULT_CONFIG
    const stats = this.stats.get(playerCount)
    if (!stats) return

    console.log(`[Q-Learning] Learning from game: ${gameRecord.moves.length} moves, winner: ${winner || 'draw'}`)

    // Process moves in reverse order (temporal difference learning)
    const moves = gameRecord.moves

    for (let i = moves.length - 1; i >= 0; i--) {
      const move = moves[i]
      const { state, action, symbol } = move

      // Calculate reward
      let reward = 0
      if (winner === null) {
        reward = 0.3  // Draw is okay
      } else if (winner === symbol) {
        reward = 1.0  // Win!
      } else {
        reward = -0.8  // Loss
      }

      // Decay reward based on how far from end of game
      const distanceFromEnd = moves.length - 1 - i
      const decayedReward = reward * Math.pow(config.discountFactor, distanceFromEnd)

      // Q-learning update
      const currentQ = this.getQValue(playerCount, state, action)
      const newQ = currentQ + config.learningRate * (decayedReward - currentQ)

      this.setQValue(playerCount, state, action, newQ)
    }

    // Update stats
    stats.onlineGamesLearned++
    stats.totalMoves += gameRecord.moves.length
    stats.qTableSize = this.qTables.get(playerCount)?.size || 0

    if (winner) {
      // We learned from the winner's perspective
      stats.gamesPlayed++
    }

    this.gamesLearnedSinceLastSave++

    console.log(`[Q-Learning] ✅ Learned from game #${stats.onlineGamesLearned}, Q-table now has ${stats.qTableSize} states`)

    // Auto-save periodically
    if (this.gamesLearnedSinceLastSave >= AUTO_SAVE_INTERVAL) {
      this.saveModel(playerCount)
      this.gamesLearnedSinceLastSave = 0
    }
  }

  // ===========================================================================
  // Stats & Info
  // ===========================================================================

  getStats(playerCount: number): ModelStats | null {
    return this.stats.get(playerCount) || null
  }

  hasModel(playerCount: number): boolean {
    const qTable = this.qTables.get(playerCount)
    return qTable !== undefined && qTable.size > 0
  }

  getModelInfo(): Record<number, { states: number; gamesLearned: number }> {
    const info: Record<number, { states: number; gamesLearned: number }> = {}

    for (let pc = 2; pc <= 10; pc++) {
      const qTable = this.qTables.get(pc)
      const stats = this.stats.get(pc)
      if (qTable && stats) {
        info[pc] = {
          states: qTable.size,
          gamesLearned: stats.onlineGamesLearned
        }
      }
    }

    return info
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const qLearningEngine = new QLearningEngine()

// =============================================================================
// Public API
// =============================================================================

export function getQLearningMove(gameState: GameState): { row: number; col: number } | null {
  return qLearningEngine.getBestMove(gameState)
}

export function recordMove(
  board: string[][],
  row: number,
  col: number,
  currentPlayerIndex: number,
  symbol: PlayerSymbol,
  playerCount: number
): void {
  qLearningEngine.recordGameMove(board, row, col, currentPlayerIndex, symbol, playerCount)
}

export function learnFromGame(
  playerCount: number,
  winner: PlayerSymbol | null,
  finalBoard: string[][]
): void {
  qLearningEngine.learnFromCompletedGame(playerCount, winner, finalBoard)
}

export function saveAllModels(): void {
  for (let pc = 2; pc <= 10; pc++) {
    if (qLearningEngine.hasModel(pc)) {
      qLearningEngine.saveModel(pc)
    }
  }
}

export function getAIStats(): Record<number, { states: number; gamesLearned: number }> {
  return qLearningEngine.getModelInfo()
}
