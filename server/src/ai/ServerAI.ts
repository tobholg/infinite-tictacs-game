// =============================================================================
// Server-Side AI for Online Multiplayer
// Heuristic-based AI that works without trained Q-learning models
// =============================================================================

import type {
  Board,
  CellValue,
  GameState,
  Player,
  PlayerSymbol,
  AIDifficulty,
} from '../../../shared/types/index.js'

// Difficulty settings: probability of making a random move
const DIFFICULTY_RANDOM_CHANCE: Record<AIDifficulty, number> = {
  easy: 0.5,    // 50% random moves
  medium: 0.2,  // 20% random moves
  hard: 0,      // Pure heuristic
}

// =============================================================================
// Board Utilities
// =============================================================================

function getBoardSize(board: Board): { rows: number; cols: number } {
  return { rows: board.length, cols: board[0]?.length || 0 }
}

function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
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
      if (board[newRow]![newCol] !== '') {
        return true
      }
    }
  }

  return false
}

function isEdgeCell(board: Board, row: number, col: number): boolean {
  const { rows, cols } = getBoardSize(board)
  return row === 0 || row === rows - 1 || col === 0 || col === cols - 1
}

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

function canExpandBoard(board: Board): boolean {
  const { rows, cols } = getBoardSize(board)
  // Check max size limit (20x20)
  if (rows >= 20 || cols >= 20) {
    return false
  }
  // On small boards (5x5 or less), always allow expansion
  if (rows <= 5 && cols <= 5) {
    return true
  }
  // Check fill ratio - must have at least 30% filled before expansion
  return getBoardFillRatio(board) >= 0.3
}

// =============================================================================
// Valid Moves
// =============================================================================

function getValidMoves(board: Board): { row: number; col: number }[] {
  const moves: { row: number; col: number }[] = []
  const { rows, cols } = getBoardSize(board)

  const hasAnyPiece = board.some(row => row.some(cell => cell !== ''))

  if (!hasAnyPiece) {
    const centerRow = Math.floor(rows / 2)
    const centerCol = Math.floor(cols / 2)
    return [{ row: centerRow, col: centerCol }]
  }

  const canExpand = canExpandBoard(board)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row]![col] === '' && isAdjacentToFilled(board, row, col)) {
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

// =============================================================================
// Board Expansion (for simulation)
// =============================================================================

function expandBoardIfNeeded(
  board: Board,
  row: number,
  col: number
): { board: Board; newRow: number; newCol: number } {
  let newBoard = cloneBoard(board)
  let newRow = row
  let newCol = col
  const { rows, cols } = getBoardSize(newBoard)

  if (!canExpandBoard(board)) {
    return { board: newBoard, newRow, newCol }
  }

  if (row === 0) {
    newBoard.unshift(Array(cols).fill('') as CellValue[])
    newRow = 1
  }

  if (row === rows - 1) {
    newBoard.push(Array(cols).fill('') as CellValue[])
  }

  if (col === 0) {
    newBoard = newBoard.map(r => ['', ...r] as CellValue[])
    newCol = 1
  }

  if (col === newBoard[0]!.length - 1) {
    newBoard = newBoard.map(r => [...r, ''] as CellValue[])
  }

  return { board: newBoard, newRow, newCol }
}

// =============================================================================
// Win Detection
// =============================================================================

function checkWinner(board: Board, winLength = 4): CellValue | null {
  const { rows, cols } = getBoardSize(board)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = board[row]![col]
      if (cell === '') continue

      // Check horizontal
      if (col <= cols - winLength) {
        let win = true
        for (let i = 1; i < winLength; i++) {
          if (board[row]![col + i] !== cell) { win = false; break }
        }
        if (win) return cell
      }

      // Check vertical
      if (row <= rows - winLength) {
        let win = true
        for (let i = 1; i < winLength; i++) {
          if (board[row + i]![col] !== cell) { win = false; break }
        }
        if (win) return cell
      }

      // Check diagonal (down-right)
      if (row <= rows - winLength && col <= cols - winLength) {
        let win = true
        for (let i = 1; i < winLength; i++) {
          if (board[row + i]![col + i] !== cell) { win = false; break }
        }
        if (win) return cell
      }

      // Check diagonal (down-left)
      if (row <= rows - winLength && col >= winLength - 1) {
        let win = true
        for (let i = 1; i < winLength; i++) {
          if (board[row + i]![col - i] !== cell) { win = false; break }
        }
        if (win) return cell
      }
    }
  }

  return null
}

// =============================================================================
// Threat Detection
// =============================================================================

interface ThreatResult {
  threat2: number  // 2-in-a-row with open end
  threat3: number  // 3-in-a-row (one from winning)
}

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

  // Count consecutive pieces forward
  let r = startRow, c = startCol
  while (r >= 0 && r < rows && c >= 0 && c < cols && board[r]![c] === player) {
    count++
    r += dRow
    c += dCol
  }
  // Check if end is open
  if (r >= 0 && r < rows && c >= 0 && c < cols && board[r]![c] === '') {
    openEnds++
  }

  // Check other direction
  r = startRow - dRow
  c = startCol - dCol
  while (r >= 0 && r < rows && c >= 0 && c < cols && board[r]![c] === player) {
    count++
    r -= dRow
    c -= dCol
  }
  // Check if other end is open
  if (r >= 0 && r < rows && c >= 0 && c < cols && board[r]![c] === '') {
    openEnds++
  }

  return { count, openEnds }
}

function detectThreats(
  board: Board,
  player: CellValue,
  winLength: number = 4
): ThreatResult {
  const { rows, cols } = getBoardSize(board)
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]
  let threat2 = 0
  let threat3 = 0
  const counted = new Set<string>()

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row]![col] !== player) continue

      for (const [dRow, dCol] of directions) {
        const key = `${row},${col},${dRow},${dCol}`
        if (counted.has(key)) continue

        const { count, openEnds } = countLinePattern(board, row, col, dRow!, dCol!, player, winLength)

        if (openEnds > 0) {
          if (count === winLength - 1) {
            threat3++
          } else if (count === winLength - 2 && openEnds >= 1) {
            threat2++
          }
        }

        // Mark this line as counted
        let r = row, c = col
        while (r >= 0 && r < rows && c >= 0 && c < cols && board[r]![c] === player) {
          counted.add(`${r},${c},${dRow},${dCol}`)
          r += dRow!
          c += dCol!
        }
      }
    }
  }

  return { threat2, threat3 }
}

// =============================================================================
// Move Heuristic Calculation
// =============================================================================

function calculateMoveHeuristic(
  board: Board,
  row: number,
  col: number,
  player: CellValue,
  allPlayerSymbols: PlayerSymbol[],
  winLength: number = 4
): number {
  // Simulate the move
  const testBoard = cloneBoard(board)
  const { board: expandedBoard, newRow, newCol } = expandBoardIfNeeded(testBoard, row, col)
  expandedBoard[newRow]![newCol] = player

  let score = 0

  // Check if this move wins (highest priority)
  if (checkWinner(expandedBoard, winLength) === player) {
    return 10000
  }

  // Check if this blocks an opponent's winning threat
  for (const opponent of allPlayerSymbols) {
    if (opponent === player) continue
    const oppThreatsBefore = detectThreats(board, opponent, winLength)
    const oppThreatsAfter = detectThreats(expandedBoard, opponent, winLength)
    if (oppThreatsBefore.threat3 > oppThreatsAfter.threat3) {
      score += 500 // Blocked a winning threat!
    }
    if (oppThreatsBefore.threat2 > oppThreatsAfter.threat2) {
      score += 20 // Blocked a developing threat
    }
  }

  // Reward creating threats
  const myThreatsBefore = detectThreats(board, player, winLength)
  const myThreatsAfter = detectThreats(expandedBoard, player, winLength)
  score += (myThreatsAfter.threat3 - myThreatsBefore.threat3) * 300
  score += (myThreatsAfter.threat2 - myThreatsBefore.threat2) * 100

  // Prefer center positions
  const { rows, cols } = getBoardSize(expandedBoard)
  const centerDist = Math.sqrt(
    Math.pow(newRow - rows / 2, 2) + Math.pow(newCol - cols / 2, 2)
  )
  score -= centerDist * 5

  // Penalize edge expansion without purpose
  const isEdge = newRow === 0 || newRow === rows - 1 || newCol === 0 || newCol === cols - 1
  if (isEdge && myThreatsAfter.threat2 <= myThreatsBefore.threat2 && myThreatsAfter.threat3 <= myThreatsBefore.threat3) {
    score -= 30
  }

  // Add small random factor to break ties
  score += Math.random() * 2

  return score
}

// =============================================================================
// Main AI Function
// =============================================================================

/**
 * Get AI move for online game
 * Uses heuristic-based decision making
 */
export function getServerAIMove(
  gameState: GameState,
  difficulty: AIDifficulty = 'medium'
): { row: number; col: number } {
  const board = gameState.board
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  if (!currentPlayer) {
    throw new Error('No current player')
  }

  const validMoves = getValidMoves(board)
  if (validMoves.length === 0) {
    throw new Error('No valid moves available')
  }

  const playerSymbol = currentPlayer.symbol
  const allPlayerSymbols = gameState.players.map(p => p.symbol)
  const winLength = gameState.rules.winLength

  // Apply difficulty-based randomness
  const randomChance = DIFFICULTY_RANDOM_CHANCE[difficulty]
  if (Math.random() < randomChance) {
    // Random move (but medium still uses some heuristics half the time)
    if (difficulty === 'medium' && Math.random() < 0.5) {
      return selectBestHeuristicMove(board, validMoves, playerSymbol, allPlayerSymbols, winLength)
    }
    return validMoves[Math.floor(Math.random() * validMoves.length)]!
  }

  // Use heuristic-based selection
  return selectBestHeuristicMove(board, validMoves, playerSymbol, allPlayerSymbols, winLength)
}

function selectBestHeuristicMove(
  board: Board,
  validMoves: { row: number; col: number }[],
  player: CellValue,
  allPlayerSymbols: PlayerSymbol[],
  winLength: number
): { row: number; col: number } {
  let bestMove = validMoves[0]!
  let bestScore = -Infinity

  for (const move of validMoves) {
    const score = calculateMoveHeuristic(board, move.row, move.col, player, allPlayerSymbols, winLength)
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

/**
 * Check if a player is an AI
 */
export function isAIPlayer(player: Player): boolean {
  return player.isAI === true
}

/**
 * Get AI difficulty for a player (defaults to medium)
 */
export function getAIDifficulty(player: Player): AIDifficulty {
  return player.aiDifficulty || 'medium'
}
