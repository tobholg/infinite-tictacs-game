/**
 * Q-Learning AI for Tic-Tac-Toe with expanding board
 * Supports 2-10 players for multi-player training
 * Features: parallel simulation, localStorage persistence, difficulty levels
 */

import { ref, computed } from 'vue'

// Import shared types (avoid duplicate definitions)
// NOTE: Do NOT re-export these types here - it causes Nuxt auto-import warnings
// Consumers should import types directly from '../../shared/types/index'
import {
  PLAYER_SYMBOLS,
  type PlayerSymbol,
  type CellValue,
  type Board,
  type AIDifficulty,
} from '../../shared/types/index'

export interface QTableEntry {
  visits: number
  value: number
}

export interface TrainingStats {
  gamesPlayed: number
  winsByPlayer: Record<string, number>
  draws: number
  currentEpsilon: number
  qTableSize: number
}

export interface TrainingProgress {
  current: number
  total: number
  isRunning: boolean
}

export interface MultiModelProgress {
  isRunning: boolean
  currentPlayerCount: number
  completedModels: number
  totalModels: number
  gamesPerModel: number
  modelProgress: Record<number, { current: number; total: number }>
}

export interface ModelTrainingConfig {
  playerCount: number
  enabled: boolean
  gamesToTrain: number // How many games to train for this model
}

// AI-specific game state (simpler than shared GameState, used for training)
export interface AIGameState {
  board: Board
  currentPlayerIndex: number
  players: PlayerSymbol[]
  winner: CellValue | null
  isDraw: boolean
  moveHistory: { row: number; col: number; player: PlayerSymbol }[]
}

export interface TrainingConfig {
  learningRate: number
  discountFactor: number
  explorationRate: number
  explorationDecay: number
  minExploration: number
  playerCount: number
  parallelGames: number
}

export interface SavedModel {
  qTable: [string, QTableEntry][]
  stats: TrainingStats
  config: TrainingConfig
  savedAt: string
}

const DEFAULT_CONFIG: TrainingConfig = {
  learningRate: 0.3,
  discountFactor: 0.95,
  explorationRate: 1.0,
  explorationDecay: 0.9995,
  minExploration: 0.05,
  playerCount: 2,
  parallelGames: 20
}

// Difficulty settings: exploration rate during gameplay
const DIFFICULTY_EPSILON: Record<AIDifficulty, number> = {
  easy: 0.5,    // 50% random moves
  medium: 0.2,  // 20% random moves
  hard: 0       // Pure exploitation
}

// Board constraints for manageable AI state space
export const BOARD_CONSTRAINTS = {
  maxSize: 20,        // Maximum 20x20 grid
  minFillRatio: 0.3   // 30% must be filled before expansion allowed
} as const

// AI Enhancement: Reward shaping constants
const REWARD_SHAPING = {
  win: 1.0,
  loss: -1.0,
  draw: 0.1,
  // Intermediate rewards
  createThreat2: 0.15,      // Create 2-in-a-row with open end
  createThreat3: 0.35,      // Create 3-in-a-row (one step from win)
  blockThreat2: 0.10,       // Block opponent's 2-in-a-row
  blockThreat3: 0.30,       // Block opponent's 3-in-a-row (critical)
  centerControl: 0.05,      // Playing near center
  aimlessExpansion: -0.08,  // Expanding without creating threats
  connectivity: 0.03,       // Pieces adjacent to own pieces
} as const

// Local pattern window size (7x7 area around action)
const LOCAL_PATTERN_SIZE = 7
const LOCAL_PATTERN_RADIUS = Math.floor(LOCAL_PATTERN_SIZE / 2)

const STORAGE_KEY_PREFIX = 'tictactoe-ai-model-'

// ===== Threat Detection Types =====
interface ThreatInfo {
  count2: number      // 2-in-a-row with space to extend
  count3: number      // 3-in-a-row (one from winning)
  blockNeeded2: number // Opponent's 2-in-a-row we should block
  blockNeeded3: number // Opponent's 3-in-a-row we MUST block
}

interface PositionScore {
  threats: ThreatInfo
  centerDistance: number
  connectivity: number
  isExpansionMove: boolean
}

export function useQLearning(initialConfig: Partial<TrainingConfig> = {}) {
  const config = ref<TrainingConfig>({ ...DEFAULT_CONFIG, ...initialConfig })

  // Q-table: maps state+action to value (per player perspective)
  const qTable = ref<Map<string, QTableEntry>>(new Map())

  // Training statistics
  const stats = ref<TrainingStats>({
    gamesPlayed: 0,
    winsByPlayer: {},
    draws: 0,
    currentEpsilon: config.value.explorationRate,
    qTableSize: 0
  })

  // Training progress
  const progress = ref<TrainingProgress>({
    current: 0,
    total: 0,
    isRunning: false
  })

  // Multi-model training progress
  const multiModelProgress = ref<MultiModelProgress>({
    isRunning: false,
    currentPlayerCount: 0,
    completedModels: 0,
    totalModels: 0,
    gamesPerModel: 0,
    modelProgress: {}
  })

  // Current game state for visualization
  const currentGame = ref<AIGameState>(createInitialGameState())

  // Training control
  const isTraining = ref(false)
  const trainingSpeed = ref(50)

  // ===== localStorage Model Management =====

  function getStorageKey(playerCount: number): string {
    return `${STORAGE_KEY_PREFIX}${playerCount}p`
  }

  function saveModelToStorage(): void {
    if (typeof window === 'undefined') return
    const key = getStorageKey(config.value.playerCount)
    const model: SavedModel = {
      qTable: Array.from(qTable.value.entries()),
      stats: stats.value,
      config: config.value,
      savedAt: new Date().toISOString()
    }
    try {
      const jsonStr = JSON.stringify(model)
      localStorage.setItem(key, jsonStr)
      console.log(`[Q-Learning] Saved ${config.value.playerCount}p model: ${stats.value.gamesPlayed} games, ${qTable.value.size} states, ${(jsonStr.length / 1024).toFixed(1)}KB`)
    } catch (e) {
      console.error('Failed to save model to localStorage:', e)
      // Check if it's a quota exceeded error
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error('[Q-Learning] localStorage quota exceeded! Model too large to save.')
      }
    }
  }

  function loadModelFromStorage(playerCount?: number): boolean {
    if (typeof window === 'undefined') return false
    const count = playerCount ?? config.value.playerCount
    const key = getStorageKey(count)
    try {
      const data = localStorage.getItem(key)
      if (!data) {
        console.log(`[Q-Learning] No saved model found for ${count}p`)
        return false
      }
      const model: SavedModel = JSON.parse(data)
      qTable.value = new Map(model.qTable)
      stats.value = { ...stats.value, ...model.stats }
      config.value = { ...config.value, ...model.config }
      stats.value.qTableSize = qTable.value.size
      console.log(`[Q-Learning] Loaded ${count}p model: ${stats.value.gamesPlayed} games, ${qTable.value.size} states`)
      return true
    } catch (e) {
      console.error('Failed to load model from localStorage:', e)
      return false
    }
  }

  function hasStoredModel(playerCount: number): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(getStorageKey(playerCount)) !== null
  }

  function getStoredModelInfo(playerCount: number): { gamesPlayed: number; savedAt: string } | null {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(getStorageKey(playerCount))
      if (!data) return null
      const model: SavedModel = JSON.parse(data)
      return { gamesPlayed: model.stats.gamesPlayed, savedAt: model.savedAt }
    } catch {
      return null
    }
  }

  function deleteStoredModel(playerCount: number): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(getStorageKey(playerCount))
  }

  // ===== Configuration =====

  function setPlayerCount(count: number) {
    const newCount = Math.max(2, Math.min(10, count))
    if (newCount === config.value.playerCount) return

    // Save current model before switching
    if (stats.value.gamesPlayed > 0) {
      saveModelToStorage()
    }

    config.value.playerCount = newCount

    // Try to load existing model for new player count
    if (!loadModelFromStorage(newCount)) {
      resetTraining(false) // Don't save, we just tried to load
    }

    currentGame.value = createInitialGameState()
  }

  function setParallelGames(count: number) {
    config.value.parallelGames = Math.max(1, Math.min(50, count))
  }

  function getActivePlayers(): PlayerSymbol[] {
    return PLAYER_SYMBOLS.slice(0, config.value.playerCount)
  }

  // ===== Board Utilities =====

  function createEmptyBoard(size = 3): Board {
    return Array(size).fill(null).map(() => Array(size).fill(''))
  }

  function createInitialGameState(): AIGameState {
    const players = getActivePlayers()
    return {
      board: createEmptyBoard(),
      currentPlayerIndex: 0,
      players,
      winner: null,
      isDraw: false,
      moveHistory: []
    }
  }

  function cloneBoard(board: Board): Board {
    return board.map(row => [...row])
  }

  function getBoardSize(board: Board): { rows: number; cols: number } {
    return { rows: board.length, cols: board[0]?.length || 0 }
  }

  // ===== Threat Detection System =====

  /**
   * Count consecutive pieces in a line, checking for threats
   * Returns: { count, openEnds } where openEnds is 0, 1, or 2
   */
  function countLinePattern(
    board: Board,
    startRow: number,
    startCol: number,
    dRow: number,
    dCol: number,
    player: CellValue,
    winLength: number = 4
  ): { count: number; openEnds: number } {
    const { rows, cols } = getBoardSize(board)
    let count = 0
    let openEnds = 0

    // Count consecutive pieces
    let r = startRow, c = startCol
    while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === player) {
      count++
      r += dRow
      c += dCol
    }
    // Check if end is open
    if (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === '') {
      openEnds++
    }

    // Check other direction
    r = startRow - dRow
    c = startCol - dCol
    while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === player) {
      count++
      r -= dRow
      c -= dCol
    }
    // Check if other end is open
    if (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === '') {
      openEnds++
    }

    return { count, openEnds }
  }

  /**
   * Detect threats for a specific player on the board
   */
  function detectThreats(
    board: Board,
    player: CellValue,
    winLength: number = 4
  ): { threat2: number; threat3: number } {
    const { rows, cols } = getBoardSize(board)
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] // horizontal, vertical, diagonals
    let threat2 = 0
    let threat3 = 0
    const counted = new Set<string>()

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (board[row][col] !== player) continue

        for (const [dRow, dCol] of directions) {
          const key = `${row},${col},${dRow},${dCol}`
          if (counted.has(key)) continue

          const { count, openEnds } = countLinePattern(board, row, col, dRow, dCol, player, winLength)

          // Only count threats that can potentially win (have open ends)
          if (openEnds > 0) {
            if (count === winLength - 1) {
              threat3++ // One away from winning!
            } else if (count === winLength - 2 && openEnds >= 1) {
              threat2++ // Two away, but can extend
            }
          }

          // Mark this line as counted
          let r = row, c = col
          while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === player) {
            counted.add(`${r},${c},${dRow},${dCol}`)
            r += dRow
            c += dCol
          }
        }
      }
    }

    return { threat2, threat3 }
  }

  /**
   * Evaluate a position for a player - returns heuristic score
   */
  function evaluatePosition(
    board: Board,
    row: number,
    col: number,
    player: CellValue,
    players: PlayerSymbol[],
    winLength: number = 4
  ): PositionScore {
    const { rows, cols } = getBoardSize(board)

    // Detect threats created by this player
    const myThreats = detectThreats(board, player, winLength)

    // Detect opponent threats
    let blockNeeded2 = 0
    let blockNeeded3 = 0
    for (const opponent of players) {
      if (opponent === player) continue
      const oppThreats = detectThreats(board, opponent, winLength)
      blockNeeded2 += oppThreats.threat2
      blockNeeded3 += oppThreats.threat3
    }

    // Calculate center distance (lower is better)
    const centerRow = rows / 2
    const centerCol = cols / 2
    const centerDistance = Math.sqrt(
      Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
    ) / Math.max(rows, cols) // Normalize to 0-1

    // Calculate connectivity (how many own pieces are adjacent)
    let connectivity = 0
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]]
    for (const [dr, dc] of directions) {
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === player) {
        connectivity++
      }
    }

    // Check if this is an expansion move
    const isExpansionMove = row === 0 || row === rows - 1 || col === 0 || col === cols - 1

    return {
      threats: {
        count2: myThreats.threat2,
        count3: myThreats.threat3,
        blockNeeded2,
        blockNeeded3
      },
      centerDistance,
      connectivity,
      isExpansionMove
    }
  }

  /**
   * Calculate intermediate reward based on position evaluation
   */
  function calculateIntermediateReward(
    boardBefore: Board,
    boardAfter: Board,
    row: number,
    col: number,
    player: CellValue,
    players: PlayerSymbol[],
    winLength: number = 4
  ): number {
    let reward = 0

    // Get position score after move
    const posAfter = evaluatePosition(boardAfter, row, col, player, players, winLength)

    // Get threats before the move to calculate delta
    const threatsBefore = detectThreats(boardBefore, player, winLength)

    // Reward for creating new threats
    const newThreat2 = posAfter.threats.count2 - threatsBefore.threat2
    const newThreat3 = posAfter.threats.count3 - threatsBefore.threat3

    if (newThreat3 > 0) {
      reward += REWARD_SHAPING.createThreat3 * newThreat3
    }
    if (newThreat2 > 0) {
      reward += REWARD_SHAPING.createThreat2 * newThreat2
    }

    // Check if we blocked opponent threats
    for (const opponent of players) {
      if (opponent === player) continue
      const oppThreatsBefore = detectThreats(boardBefore, opponent, winLength)
      const oppThreatsAfter = detectThreats(boardAfter, opponent, winLength)

      const blocked3 = oppThreatsBefore.threat3 - oppThreatsAfter.threat3
      const blocked2 = oppThreatsBefore.threat2 - oppThreatsAfter.threat2

      if (blocked3 > 0) {
        reward += REWARD_SHAPING.blockThreat3 * blocked3
      }
      if (blocked2 > 0) {
        reward += REWARD_SHAPING.blockThreat2 * blocked2
      }
    }

    // Reward center control (inverse of distance)
    reward += REWARD_SHAPING.centerControl * (1 - posAfter.centerDistance)

    // Reward connectivity
    reward += REWARD_SHAPING.connectivity * posAfter.connectivity

    // Penalize aimless expansion (expansion without creating threats)
    if (posAfter.isExpansionMove && newThreat2 <= 0 && newThreat3 <= 0) {
      reward += REWARD_SHAPING.aimlessExpansion
    }

    return reward
  }

  // ===== Local Pattern Recognition =====

  /**
   * Extract a local window around a position for state encoding
   * This dramatically reduces state space while keeping relevant info
   */
  function extractLocalPattern(
    board: Board,
    row: number,
    col: number,
    playerIndex: number,
    players: PlayerSymbol[]
  ): string {
    const { rows, cols } = getBoardSize(board)
    const currentPlayer = players[playerIndex]
    const playerCount = players.length
    const pattern: string[] = []

    for (let dr = -LOCAL_PATTERN_RADIUS; dr <= LOCAL_PATTERN_RADIUS; dr++) {
      let rowPattern = ''
      for (let dc = -LOCAL_PATTERN_RADIUS; dc <= LOCAL_PATTERN_RADIUS; dc++) {
        const r = row + dr
        const c = col + dc

        if (r < 0 || r >= rows || c < 0 || c >= cols) {
          rowPattern += '#' // Out of bounds
        } else {
          const cell = board[r][c]
          if (cell === '') {
            rowPattern += '.'
          } else if (cell === currentPlayer) {
            rowPattern += 'M' // Me
          } else {
            // Encode opponent by relative turn order
            const otherIndex = players.indexOf(cell as PlayerSymbol)
            const relativeIndex = (otherIndex - playerIndex + playerCount) % playerCount
            rowPattern += String(relativeIndex % 10) // Keep single digit
          }
        }
      }
      pattern.push(rowPattern)
    }

    return pattern.join('|')
  }

  /**
   * Enhanced state encoding: combines local pattern with threat summary
   */
  function encodeEnhancedState(
    board: Board,
    row: number,
    col: number,
    playerIndex: number,
    players: PlayerSymbol[],
    winLength: number = 4
  ): string {
    const localPattern = extractLocalPattern(board, row, col, playerIndex, players)
    const player = players[playerIndex]

    // Add threat summary to state (makes AI aware of game situation)
    const myThreats = detectThreats(board, player, winLength)
    let maxOppThreat3 = 0
    for (const opp of players) {
      if (opp === player) continue
      const oppThreats = detectThreats(board, opp, winLength)
      maxOppThreat3 = Math.max(maxOppThreat3, oppThreats.threat3)
    }

    // Encode: playerCount:localPattern:myThreat3:oppThreat3
    const threatSummary = `T${myThreats.threat3}O${maxOppThreat3}`
    return `${players.length}:${localPattern}:${threatSummary}`
  }

  // ===== State Encoding =====

  /**
   * Encode board state from a player's perspective
   * Normalizes: current player = 'M' (me), others = '1', '2', etc. by turn order
   */
  function encodeBoardState(board: Board, playerIndex: number, players: PlayerSymbol[]): string {
    const playerCount = players.length
    const currentPlayer = players[playerIndex]

    const normalized = board.map(row =>
      row.map(cell => {
        if (cell === '') return '.'
        if (cell === currentPlayer) return 'M' // Me
        // Others numbered by relative turn order
        const otherIndex = players.indexOf(cell as PlayerSymbol)
        const relativeIndex = (otherIndex - playerIndex + playerCount) % playerCount
        return String(relativeIndex)
      }).join('')
    ).join('|')

    return `${playerCount}:${normalized}`
  }

  function encodeAction(row: number, col: number): string {
    return `${row},${col}`
  }

  function getQKey(state: string, action: string): string {
    return `${state}::${action}`
  }

  // ===== Q-Table Operations =====

  function getQValue(state: string, action: string): number {
    const entry = qTable.value.get(getQKey(state, action))
    return entry?.value || 0
  }

  function setQValue(state: string, action: string, value: number): void {
    const key = getQKey(state, action)
    const entry = qTable.value.get(key)
    if (entry) {
      entry.value = value
      entry.visits++
    } else {
      qTable.value.set(key, { value, visits: 1 })
    }
    stats.value.qTableSize = qTable.value.size
  }

  // ===== Move Logic =====

  // Calculate the fill ratio of the board (filled cells / total cells)
  function getBoardFillRatio(board: Board): number {
    const { rows, cols } = getBoardSize(board)
    const totalCells = rows * cols
    if (totalCells === 0) return 0
    let filledCells = 0
    for (const row of board) {
      for (const cell of row) {
        if (cell !== '') filledCells++
      }
    }
    return filledCells / totalCells
  }

  // Check if a cell is on the edge of the board
  function isEdgeCell(board: Board, row: number, col: number): boolean {
    const { rows, cols } = getBoardSize(board)
    return row === 0 || row === rows - 1 || col === 0 || col === cols - 1
  }

  // Check if the board can expand (respects max size and fill ratio constraints)
  function canExpandBoard(board: Board): boolean {
    const { rows, cols } = getBoardSize(board)
    // Check max size limit
    if (rows >= BOARD_CONSTRAINTS.maxSize || cols >= BOARD_CONSTRAINTS.maxSize) {
      return false
    }
    // On small boards (5x5 or less), always allow expansion
    // This prevents the game from getting stuck when all adjacent cells are edges
    if (rows <= 5 && cols <= 5) {
      return true
    }
    // Check fill ratio - must have at least 30% filled before expansion
    return getBoardFillRatio(board) >= BOARD_CONSTRAINTS.minFillRatio
  }

  function getValidMoves(board: Board): { row: number; col: number }[] {
    const moves: { row: number; col: number }[] = []
    const { rows, cols } = getBoardSize(board)

    const hasAnyPiece = board.some(row => row.some(cell => cell !== ''))

    if (!hasAnyPiece) {
      const centerRow = Math.floor(rows / 2)
      const centerCol = Math.floor(cols / 2)
      return [{ row: centerRow, col: centerCol }]
    }

    // Check if board can expand (for edge cell filtering)
    const canExpand = canExpandBoard(board)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (board[row][col] === '' && isAdjacentToFilled(board, row, col)) {
          // If this is an edge cell and expansion is not allowed, skip it
          if (isEdgeCell(board, row, col) && !canExpand) {
            continue
          }
          moves.push({ row, col })
        }
      }
    }

    return moves
  }

  function isAdjacentToFilled(board: Board, row: number, col: number): boolean {
    const { rows, cols } = getBoardSize(board)
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]

    for (const [dr, dc] of directions) {
      const newRow = row + dr
      const newCol = col + dc
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
        if (board[newRow][newCol] !== '') {
          return true
        }
      }
    }

    return false
  }

  function expandBoardIfNeeded(board: Board, row: number, col: number): { board: Board; newRow: number; newCol: number } {
    let newBoard = cloneBoard(board)
    let newRow = row
    let newCol = col
    const { rows, cols } = getBoardSize(newBoard)

    // Check if expansion is allowed before expanding
    if (!canExpandBoard(board)) {
      return { board: newBoard, newRow, newCol }
    }

    if (row === 0) {
      newBoard.unshift(Array(cols).fill(''))
      newRow = 1
    }

    if (row === rows - 1) {
      newBoard.push(Array(cols).fill(''))
    }

    if (col === 0) {
      newBoard = newBoard.map(r => ['', ...r])
      newCol = 1
    }

    if (col === newBoard[0].length - 1) {
      newBoard = newBoard.map(r => [...r, ''])
    }

    return { board: newBoard, newRow, newCol }
  }

  // ===== Win Detection =====

  function checkWinner(board: Board, winLength = 4): CellValue | null {
    const { rows, cols } = getBoardSize(board)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = board[row][col]
        if (cell === '') continue

        // Check horizontal
        if (col <= cols - winLength) {
          let win = true
          for (let i = 1; i < winLength; i++) {
            if (board[row][col + i] !== cell) { win = false; break }
          }
          if (win) return cell
        }

        // Check vertical
        if (row <= rows - winLength) {
          let win = true
          for (let i = 1; i < winLength; i++) {
            if (board[row + i][col] !== cell) { win = false; break }
          }
          if (win) return cell
        }

        // Check diagonal (down-right)
        if (row <= rows - winLength && col <= cols - winLength) {
          let win = true
          for (let i = 1; i < winLength; i++) {
            if (board[row + i][col + i] !== cell) { win = false; break }
          }
          if (win) return cell
        }

        // Check diagonal (down-left)
        if (row <= rows - winLength && col >= winLength - 1) {
          let win = true
          for (let i = 1; i < winLength; i++) {
            if (board[row + i][col - i] !== cell) { win = false; break }
          }
          if (win) return cell
        }
      }
    }

    return null
  }

  function checkDraw(board: Board): boolean {
    return getValidMoves(board).length === 0
  }

  // ===== AI Decision Making =====

  function chooseAction(
    board: Board,
    playerIndex: number,
    players: PlayerSymbol[],
    explore = true
  ): { row: number; col: number } {
    const validMoves = getValidMoves(board)
    if (validMoves.length === 0) {
      throw new Error('No valid moves available')
    }

    // Exploration: random move
    if (explore && Math.random() < stats.value.currentEpsilon) {
      return validMoves[Math.floor(Math.random() * validMoves.length)]
    }

    // Exploitation: best known move
    const state = encodeBoardState(board, playerIndex, players)
    let bestMove = validMoves[0]
    let bestValue = -Infinity

    for (const move of validMoves) {
      const action = encodeAction(move.row, move.col)
      const value = getQValue(state, action)
      if (value > bestValue) {
        bestValue = value
        bestMove = move
      }
    }

    return bestMove
  }

  // ===== Training =====

  interface MoveRecord {
    state: string           // Enhanced state encoding (local pattern + threat summary)
    action: string
    playerIndex: number
    player: PlayerSymbol
    intermediateReward: number  // Reward shaping bonus for this move
    row: number                 // Move coordinates for heuristic calculation
    col: number
  }

  /**
   * Enhanced Q-value update with reward shaping and prioritized learning
   */
  function updateQValues(
    moveHistory: MoveRecord[],
    winner: CellValue | null,
    players: PlayerSymbol[]
  ): void {
    // Base rewards for game outcome
    const getBaseReward = (player: PlayerSymbol): number => {
      if (winner === null) return REWARD_SHAPING.draw
      if (winner === player) return REWARD_SHAPING.win
      return REWARD_SHAPING.loss
    }

    // Prioritization factor: winning games get stronger updates
    const priorityFactor = winner !== null ? 1.5 : 1.0

    // Update Q-values backwards through the game
    for (let i = moveHistory.length - 1; i >= 0; i--) {
      const record = moveHistory[i]
      const { state, action, player, intermediateReward } = record

      // Combined reward: base outcome + intermediate shaping bonus
      const baseReward = getBaseReward(player)
      const totalReward = baseReward + intermediateReward

      // Get max Q-value from this player's next move
      let nextMaxQ = 0
      const playerCount = players.length
      for (let j = i + playerCount; j < moveHistory.length; j += playerCount) {
        const nextEntry = moveHistory[j]
        if (nextEntry && nextEntry.player === player) {
          nextMaxQ = getQValue(nextEntry.state, nextEntry.action)
          break
        }
      }

      // Q-learning update with priority factor
      const currentQ = getQValue(state, action)
      const effectiveLearningRate = config.value.learningRate * priorityFactor
      const newQ = currentQ + effectiveLearningRate * (
        totalReward + config.value.discountFactor * nextMaxQ - currentQ
      )

      setQValue(state, action, newQ)
    }
  }

  async function playOneGame(visualize = true): Promise<CellValue | null> {
    // Reset game state
    currentGame.value = createInitialGameState()
    const players = currentGame.value.players

    const qMoveHistory: MoveRecord[] = []
    let moveCount = 0
    const maxMoves = 100 // More moves for multiplayer

    while (!currentGame.value.winner && !currentGame.value.isDraw && moveCount < maxMoves) {
      const playerIndex = currentGame.value.currentPlayerIndex
      const player = players[playerIndex]

      // Choose action
      const move = chooseAction(currentGame.value.board, playerIndex, players)
      const action = encodeAction(move.row, move.col)

      // Use enhanced state encoding (local pattern + threat summary)
      const state = encodeEnhancedState(
        currentGame.value.board,
        move.row,
        move.col,
        playerIndex,
        players
      )

      // Store board before move for reward calculation
      const boardBefore = cloneBoard(currentGame.value.board)

      // Expand board if needed
      const { board: expandedBoard, newRow, newCol } = expandBoardIfNeeded(
        currentGame.value.board,
        move.row,
        move.col
      )

      // Make move
      expandedBoard[newRow][newCol] = player
      currentGame.value.board = expandedBoard
      currentGame.value.moveHistory.push({ row: newRow, col: newCol, player })

      // Calculate intermediate reward (threat creation, blocking, etc.)
      const intermediateReward = calculateIntermediateReward(
        boardBefore,
        expandedBoard,
        newRow,
        newCol,
        player,
        players
      )

      // Record for Q-learning with enhanced info
      qMoveHistory.push({
        state,
        action,
        playerIndex,
        player,
        intermediateReward,
        row: newRow,
        col: newCol
      })

      // Check for winner
      const winner = checkWinner(expandedBoard)
      if (winner) {
        currentGame.value.winner = winner
        break
      }

      // Check for draw
      if (checkDraw(expandedBoard)) {
        currentGame.value.isDraw = true
        break
      }

      // Next player
      currentGame.value.currentPlayerIndex = (playerIndex + 1) % players.length
      moveCount++

      // Visualization delay
      if (visualize && trainingSpeed.value > 0) {
        await new Promise(resolve => setTimeout(resolve, trainingSpeed.value))
      }
    }

    // Update Q-values based on game outcome
    updateQValues(qMoveHistory, currentGame.value.winner, players)

    // Update stats
    stats.value.gamesPlayed++
    if (currentGame.value.winner) {
      const winnerSymbol = currentGame.value.winner as string
      stats.value.winsByPlayer[winnerSymbol] = (stats.value.winsByPlayer[winnerSymbol] || 0) + 1
    } else {
      stats.value.draws++
    }

    // Decay exploration rate
    stats.value.currentEpsilon = Math.max(
      config.value.minExploration,
      stats.value.currentEpsilon * config.value.explorationDecay
    )

    return currentGame.value.winner
  }

  /**
   * Play a single game without visualization (for parallel training)
   * Returns the game result for batch Q-value updates
   * Uses enhanced state encoding and reward shaping
   */
  function playOneGameSync(): { winner: CellValue | null; moveHistory: MoveRecord[] } {
    const players = getActivePlayers()
    let board = createEmptyBoard()
    let currentPlayerIndex = 0
    const moveHistory: MoveRecord[] = []
    let moveCount = 0
    const maxMoves = 100
    let winner: CellValue | null = null

    while (moveCount < maxMoves) {
      const player = players[currentPlayerIndex]

      const validMoves = getValidMoves(board)
      if (validMoves.length === 0) break

      // Choose action with exploration + heuristic guidance
      let move: { row: number; col: number }
      if (Math.random() < stats.value.currentEpsilon) {
        // Exploration: weighted random (prefer moves that create threats)
        if (Math.random() < 0.3) {
          // Pure random
          move = validMoves[Math.floor(Math.random() * validMoves.length)]
        } else {
          // Heuristic-guided exploration
          move = selectHeuristicMove(board, validMoves, player, players)
        }
      } else {
        // Exploitation: use Q-values with enhanced state
        let bestMove = validMoves[0]
        let bestValue = -Infinity
        for (const m of validMoves) {
          const state = encodeEnhancedState(board, m.row, m.col, currentPlayerIndex, players)
          const action = encodeAction(m.row, m.col)
          const qValue = getQValue(state, action)

          // Add heuristic bonus to Q-value for tie-breaking
          const heuristicBonus = calculateMoveHeuristic(board, m.row, m.col, player, players) * 0.1
          const combinedValue = qValue + heuristicBonus

          if (combinedValue > bestValue) {
            bestValue = combinedValue
            bestMove = m
          }
        }
        move = bestMove
      }

      // Use enhanced state encoding
      const state = encodeEnhancedState(board, move.row, move.col, currentPlayerIndex, players)
      const action = encodeAction(move.row, move.col)

      // Store board before move for reward calculation
      const boardBefore = cloneBoard(board)

      // Expand and place
      const { board: expandedBoard, newRow, newCol } = expandBoardIfNeeded(board, move.row, move.col)
      expandedBoard[newRow][newCol] = player
      board = expandedBoard

      // Calculate intermediate reward
      const intermediateReward = calculateIntermediateReward(
        boardBefore,
        board,
        newRow,
        newCol,
        player,
        players
      )

      // Record with enhanced info
      moveHistory.push({
        state,
        action,
        playerIndex: currentPlayerIndex,
        player,
        intermediateReward,
        row: newRow,
        col: newCol
      })

      // Check winner
      winner = checkWinner(board)
      if (winner) break

      // Check draw
      if (getValidMoves(board).length === 0) break

      currentPlayerIndex = (currentPlayerIndex + 1) % players.length
      moveCount++
    }

    return { winner, moveHistory }
  }

  /**
   * Select a move using heuristics (for guided exploration)
   */
  function selectHeuristicMove(
    board: Board,
    validMoves: { row: number; col: number }[],
    player: CellValue,
    players: PlayerSymbol[]
  ): { row: number; col: number } {
    let bestMove = validMoves[0]
    let bestScore = -Infinity

    for (const move of validMoves) {
      const score = calculateMoveHeuristic(board, move.row, move.col, player, players)
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    }

    return bestMove
  }

  /**
   * Calculate heuristic score for a potential move
   */
  function calculateMoveHeuristic(
    board: Board,
    row: number,
    col: number,
    player: CellValue,
    players: PlayerSymbol[]
  ): number {
    // Simulate the move
    const testBoard = cloneBoard(board)
    const { board: expandedBoard, newRow, newCol } = expandBoardIfNeeded(testBoard, row, col)
    expandedBoard[newRow][newCol] = player

    let score = 0

    // Check if this move wins
    if (checkWinner(expandedBoard) === player) {
      return 1000 // Winning move!
    }

    // Check if this blocks an opponent's winning threat
    for (const opponent of players) {
      if (opponent === player) continue
      const oppThreatsBefore = detectThreats(board, opponent)
      const oppThreatsAfter = detectThreats(expandedBoard, opponent)
      if (oppThreatsBefore.threat3 > oppThreatsAfter.threat3) {
        score += 50 // Blocked a winning threat!
      }
    }

    // Reward creating threats
    const myThreatsBefore = detectThreats(board, player)
    const myThreatsAfter = detectThreats(expandedBoard, player)
    score += (myThreatsAfter.threat3 - myThreatsBefore.threat3) * 30
    score += (myThreatsAfter.threat2 - myThreatsBefore.threat2) * 10

    // Prefer center positions
    const { rows, cols } = getBoardSize(expandedBoard)
    const centerDist = Math.sqrt(
      Math.pow(newRow - rows / 2, 2) + Math.pow(newCol - cols / 2, 2)
    )
    score -= centerDist * 2

    // Penalize edge expansion without purpose
    const isEdge = newRow === 0 || newRow === rows - 1 || newCol === 0 || newCol === cols - 1
    if (isEdge && myThreatsAfter.threat2 <= myThreatsBefore.threat2) {
      score -= 15
    }

    return score
  }

  async function startTraining(totalGames = 10000): Promise<void> {
    isTraining.value = true
    progress.value = { current: 0, total: totalGames, isRunning: true }

    const batchSize = config.value.parallelGames
    const visualize = trainingSpeed.value > 0

    for (let i = 0; i < totalGames && isTraining.value; i += batchSize) {
      const gamesToPlay = Math.min(batchSize, totalGames - i)

      if (visualize && gamesToPlay === 1) {
        // Single game with visualization
        await playOneGame(true)
      } else {
        // Parallel batch without visualization
        const results: { winner: CellValue | null; moveHistory: MoveRecord[] }[] = []

        for (let j = 0; j < gamesToPlay; j++) {
          results.push(playOneGameSync())
        }

        // Update Q-values and stats for all games
        const players = getActivePlayers()
        for (const result of results) {
          updateQValues(result.moveHistory, result.winner, players)

          stats.value.gamesPlayed++
          if (result.winner) {
            const winnerSymbol = result.winner as string
            stats.value.winsByPlayer[winnerSymbol] = (stats.value.winsByPlayer[winnerSymbol] || 0) + 1
          } else {
            stats.value.draws++
          }
        }

        // Decay exploration rate once per batch
        stats.value.currentEpsilon = Math.max(
          config.value.minExploration,
          stats.value.currentEpsilon * Math.pow(config.value.explorationDecay, gamesToPlay)
        )

        // Update one visualization game periodically
        if (visualize && i % (batchSize * 10) === 0) {
          await playOneGame(true)
        }
      }

      // Update progress
      progress.value.current = Math.min(i + gamesToPlay, totalGames)

      // Auto-save every 10000 games
      if (stats.value.gamesPlayed % 10000 === 0) {
        saveModelToStorage()
      }

      // Allow UI updates
      await new Promise(resolve => setTimeout(resolve, 1))
    }

    // Save final model
    saveModelToStorage()

    isTraining.value = false
    progress.value.isRunning = false
  }

  function stopTraining(): void {
    isTraining.value = false
    progress.value.isRunning = false
    multiModelProgress.value.isRunning = false
    // Save progress when stopping
    if (stats.value.gamesPlayed > 0) {
      saveModelToStorage()
    }
  }

  /**
   * Train all models (2-10 players) with specified games per model
   */
  async function startTrainingAllModels(gamesPerModel = 10000, minPlayers = 2, maxPlayers = 10): Promise<void> {
    const playerCounts = Array.from({ length: maxPlayers - minPlayers + 1 }, (_, i) => minPlayers + i)

    multiModelProgress.value = {
      isRunning: true,
      currentPlayerCount: minPlayers,
      completedModels: 0,
      totalModels: playerCounts.length,
      gamesPerModel,
      modelProgress: Object.fromEntries(playerCounts.map(pc => [pc, { current: 0, total: gamesPerModel }]))
    }

    isTraining.value = true

    // Visualization settings
    const visualize = trainingSpeed.value > 0
    const visualizationInterval = 100 // Show a visualization game every 100 games

    for (const playerCount of playerCounts) {
      if (!multiModelProgress.value.isRunning) break

      // Switch to this player count (loads existing model if any)
      setPlayerCount(playerCount)
      multiModelProgress.value.currentPlayerCount = playerCount

      // Reset progress for this model
      progress.value = { current: 0, total: gamesPerModel, isRunning: true }

      const batchSize = config.value.parallelGames
      let gamesSinceVisualization = 0

      for (let i = 0; i < gamesPerModel && multiModelProgress.value.isRunning; i += batchSize) {
        const gamesToPlay = Math.min(batchSize, gamesPerModel - i)

        // Periodically show a visualization game
        if (visualize && gamesSinceVisualization >= visualizationInterval) {
          await playOneGame(true)
          gamesSinceVisualization = 0
        }

        // Run batch of games
        const results: { winner: CellValue | null; moveHistory: MoveRecord[] }[] = []
        for (let j = 0; j < gamesToPlay; j++) {
          results.push(playOneGameSync())
        }

        // Update Q-values
        const players = getActivePlayers()
        for (const result of results) {
          updateQValues(result.moveHistory, result.winner, players)
          stats.value.gamesPlayed++
          if (result.winner) {
            stats.value.winsByPlayer[result.winner as string] = (stats.value.winsByPlayer[result.winner as string] || 0) + 1
          } else {
            stats.value.draws++
          }
        }

        gamesSinceVisualization += gamesToPlay

        // Decay epsilon
        stats.value.currentEpsilon = Math.max(
          config.value.minExploration,
          stats.value.currentEpsilon * Math.pow(config.value.explorationDecay, gamesToPlay)
        )

        // Update progress
        const currentProgress = Math.min(i + gamesToPlay, gamesPerModel)
        progress.value.current = currentProgress
        multiModelProgress.value.modelProgress[playerCount] = { current: currentProgress, total: gamesPerModel }

        // Auto-save periodically
        if (stats.value.gamesPlayed % 10000 === 0) {
          saveModelToStorage()
        }

        // Allow UI updates
        await new Promise(resolve => setTimeout(resolve, 1))
      }

      // Save this model after completing training for this player count
      saveModelToStorage()
      console.log(`Model ${playerCount}p saved with ${stats.value.gamesPlayed} games`)

      multiModelProgress.value.completedModels++
    }

    isTraining.value = false
    progress.value.isRunning = false
    multiModelProgress.value.isRunning = false
  }

  function stopAllTraining(): void {
    multiModelProgress.value.isRunning = false
    stopTraining()
  }

  /**
   * Train selected models with custom game counts per model
   */
  async function startCustomMultiModelTraining(modelConfigs: ModelTrainingConfig[]): Promise<void> {
    const enabledModels = modelConfigs.filter(m => m.enabled && m.gamesToTrain > 0)
    if (enabledModels.length === 0) return

    const totalGames = enabledModels.reduce((sum, m) => sum + m.gamesToTrain, 0)
    const avgGamesPerModel = Math.ceil(totalGames / enabledModels.length)

    multiModelProgress.value = {
      isRunning: true,
      currentPlayerCount: enabledModels[0]!.playerCount,
      completedModels: 0,
      totalModels: enabledModels.length,
      gamesPerModel: avgGamesPerModel, // Approximation for progress display
      modelProgress: Object.fromEntries(enabledModels.map(m => [m.playerCount, { current: 0, total: m.gamesToTrain }]))
    }

    isTraining.value = true

    const visualize = trainingSpeed.value > 0
    const visualizationInterval = 100

    for (const modelConfig of enabledModels) {
      if (!multiModelProgress.value.isRunning) break

      const { playerCount, gamesToTrain } = modelConfig

      // Switch to this player count (loads existing model if any)
      setPlayerCount(playerCount)
      multiModelProgress.value.currentPlayerCount = playerCount

      // Reset progress for this model
      progress.value = { current: 0, total: gamesToTrain, isRunning: true }

      const batchSize = config.value.parallelGames
      let gamesSinceVisualization = 0

      for (let i = 0; i < gamesToTrain && multiModelProgress.value.isRunning; i += batchSize) {
        const gamesToPlay = Math.min(batchSize, gamesToTrain - i)

        // Periodically show a visualization game
        if (visualize && gamesSinceVisualization >= visualizationInterval) {
          await playOneGame(true)
          gamesSinceVisualization = 0
        }

        // Run batch of games
        const results: { winner: CellValue | null; moveHistory: MoveRecord[] }[] = []
        for (let j = 0; j < gamesToPlay; j++) {
          results.push(playOneGameSync())
        }

        // Update Q-values
        const players = getActivePlayers()
        for (const result of results) {
          updateQValues(result.moveHistory, result.winner, players)
          stats.value.gamesPlayed++
          if (result.winner) {
            stats.value.winsByPlayer[result.winner as string] = (stats.value.winsByPlayer[result.winner as string] || 0) + 1
          } else {
            stats.value.draws++
          }
        }

        gamesSinceVisualization += gamesToPlay

        // Decay epsilon
        stats.value.currentEpsilon = Math.max(
          config.value.minExploration,
          stats.value.currentEpsilon * Math.pow(config.value.explorationDecay, gamesToPlay)
        )

        // Update progress
        const currentProgress = Math.min(i + gamesToPlay, gamesToTrain)
        progress.value.current = currentProgress
        multiModelProgress.value.modelProgress[playerCount] = { current: currentProgress, total: gamesToTrain }

        // Auto-save periodically
        if (stats.value.gamesPlayed % 10000 === 0) {
          saveModelToStorage()
        }

        // Allow UI updates
        await new Promise(resolve => setTimeout(resolve, 1))
      }

      // Save this model after completing training
      saveModelToStorage()
      console.log(`Model ${playerCount}p saved with ${stats.value.gamesPlayed} games`)

      multiModelProgress.value.completedModels++
    }

    isTraining.value = false
    progress.value.isRunning = false
    multiModelProgress.value.isRunning = false
  }

  // ===== Model Export/Import =====

  function exportModel(): string {
    const data = {
      qTable: Array.from(qTable.value.entries()),
      stats: stats.value,
      config: config.value
    }
    return JSON.stringify(data)
  }

  function importModel(json: string): void {
    try {
      const data = JSON.parse(json)
      qTable.value = new Map(data.qTable)
      stats.value = { ...stats.value, ...data.stats }
      config.value = { ...config.value, ...data.config }
      stats.value.qTableSize = qTable.value.size

      // Save imported model to localStorage so it's available in games
      saveModelToStorage()
      console.log(`Model imported and saved for ${config.value.playerCount} players (${stats.value.qTableSize} states)`)
    } catch (e) {
      console.error('Failed to import model:', e)
    }
  }

  function resetTraining(save = true): void {
    if (save && stats.value.gamesPlayed > 0) {
      saveModelToStorage()
    }
    qTable.value.clear()
    stats.value = {
      gamesPlayed: 0,
      winsByPlayer: {},
      draws: 0,
      currentEpsilon: config.value.explorationRate,
      qTableSize: 0
    }
    progress.value = { current: 0, total: 0, isRunning: false }
    currentGame.value = createInitialGameState()
  }

  // ===== Play Against Human =====

  /**
   * Get AI move for a given board state with difficulty setting
   * @param board Current board state
   * @param playerIndex Which player the AI is (0-indexed)
   * @param players Array of player symbols in the game
   * @param difficulty AI difficulty level
   */
  function getAIMove(
    board: Board,
    playerIndex: number,
    players: PlayerSymbol[],
    difficulty: AIDifficulty = 'hard'
  ): { row: number; col: number } {
    const validMoves = getValidMoves(board)
    if (validMoves.length === 0) {
      throw new Error('No valid moves available')
    }

    const player = players[playerIndex]

    // Apply difficulty-based randomness
    const epsilon = DIFFICULTY_EPSILON[difficulty]
    if (Math.random() < epsilon) {
      // Even random moves use some heuristics in medium difficulty
      if (difficulty === 'medium' && Math.random() < 0.5) {
        return selectHeuristicMove(board, validMoves, player, players)
      }
      return validMoves[Math.floor(Math.random() * validMoves.length)]
    }

    // First, check for immediate winning moves or must-block moves
    const urgentMove = findUrgentMove(board, validMoves, player, players)
    if (urgentMove) {
      return urgentMove
    }

    // Best known move from Q-table with enhanced state + heuristic bonus
    let bestMove = validMoves[0]
    let bestValue = -Infinity

    for (const move of validMoves) {
      // Use enhanced state encoding
      const state = encodeEnhancedState(board, move.row, move.col, playerIndex, players)
      const action = encodeAction(move.row, move.col)
      const qValue = getQValue(state, action)

      // Add heuristic score for better decision making
      const heuristicScore = calculateMoveHeuristic(board, move.row, move.col, player, players)

      // Combine Q-value and heuristic (Q-value weighted more for trained AI)
      const combinedValue = qValue + (heuristicScore * 0.15)

      if (combinedValue > bestValue) {
        bestValue = combinedValue
        bestMove = move
      }
    }

    return bestMove
  }

  /**
   * Find urgent moves: winning moves or must-block moves
   */
  function findUrgentMove(
    board: Board,
    validMoves: { row: number; col: number }[],
    player: CellValue,
    players: PlayerSymbol[]
  ): { row: number; col: number } | null {
    // First priority: winning move
    for (const move of validMoves) {
      const testBoard = cloneBoard(board)
      const { board: expandedBoard, newRow, newCol } = expandBoardIfNeeded(testBoard, move.row, move.col)
      expandedBoard[newRow][newCol] = player
      if (checkWinner(expandedBoard) === player) {
        return move // Take the win!
      }
    }

    // Second priority: block opponent's winning move
    for (const opponent of players) {
      if (opponent === player) continue
      const oppThreats = detectThreats(board, opponent)
      if (oppThreats.threat3 > 0) {
        // Opponent has a 3-in-a-row threat, find the blocking move
        for (const move of validMoves) {
          const testBoard = cloneBoard(board)
          const { board: expandedBoard, newRow, newCol } = expandBoardIfNeeded(testBoard, move.row, move.col)
          expandedBoard[newRow][newCol] = player
          const oppThreatsAfter = detectThreats(expandedBoard, opponent)
          if (oppThreatsAfter.threat3 < oppThreats.threat3) {
            return move // Block the threat!
          }
        }
      }
    }

    return null // No urgent move needed
  }

  /**
   * Check if a trained model exists for the given player count
   */
  function isModelTrained(playerCount: number): boolean {
    const info = getStoredModelInfo(playerCount)
    return info !== null && info.gamesPlayed >= 1000
  }

  // ===== Computed Stats =====

  const winRates = computed(() => {
    const total = stats.value.gamesPlayed || 1
    const players = getActivePlayers()
    const rates: Record<string, string> = {}

    for (const player of players) {
      const wins = stats.value.winsByPlayer[player] || 0
      rates[player] = (wins / total * 100).toFixed(1)
    }

    rates.draw = (stats.value.draws / total * 100).toFixed(1)
    return rates
  })

  const playerCount = computed(() => config.value.playerCount)

  // Try to load existing model on init
  if (typeof window !== 'undefined') {
    loadModelFromStorage()
  }

  return {
    // State
    qTable,
    stats,
    currentGame,
    isTraining,
    trainingSpeed,
    winRates,
    playerCount,
    config,
    progress,

    // Actions
    startTraining,
    stopTraining,
    startTrainingAllModels,
    startCustomMultiModelTraining,
    stopAllTraining,
    playOneGame,
    resetTraining,
    setPlayerCount,
    setParallelGames,
    getAIMove,
    getActivePlayers,
    multiModelProgress,

    // Model Storage
    saveModelToStorage,
    loadModelFromStorage,
    hasStoredModel,
    getStoredModelInfo,
    deleteStoredModel,
    isModelTrained,

    // Import/Export (file)
    exportModel,
    importModel,

    // Utilities
    getValidMoves,
    checkWinner,
    createEmptyBoard,
    PLAYER_SYMBOLS,
    DIFFICULTY_EPSILON,

    // Board constraints
    getBoardFillRatio,
    canExpandBoard,
    isEdgeCell
  }
}
