// =============================================================================
// Shared Game Engine for Infinite Tic-Tacs
// Pure TypeScript functions - no Vue dependencies, JSON-serializable state
// =============================================================================

import type {
  Board,
  BoardOffset,
  BoardSize,
  CellValue,
  ExpandedEdges,
  GameRules,
  GameState,
  MoveError,
  MoveRecord,
  MoveResult,
  Player,
  PlayerSymbol,
  Position,
  DEFAULT_GAME_RULES,
} from '../types/index.js'

// -----------------------------------------------------------------------------
// State Creation
// -----------------------------------------------------------------------------

/**
 * Creates a new initial game state with a 3x3 board
 */
export function createInitialState(
  players: Player[],
  rules: GameRules = { winLength: 4, maxPlayers: 20, allowSpectators: true }
): GameState {
  return {
    board: [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ],
    boardSize: { rows: 3, cols: 3 },
    boardOffset: { row: 0, col: 0 },
    players,
    currentPlayerIndex: 0,
    winner: null,
    winningCells: [],
    isDraw: false,
    moveHistory: [],
    rules,
    turnStartTime: undefined,
    turnDeadline: undefined,
  }
}

// -----------------------------------------------------------------------------
// State Cloning (for immutability)
// -----------------------------------------------------------------------------

/**
 * Deep clones a game state for immutable operations
 */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map((row) => [...row]),
    boardSize: { ...state.boardSize },
    boardOffset: { ...state.boardOffset },
    players: state.players.map((p) => ({ ...p })),
    winningCells: state.winningCells.map((c) => ({ ...c })),
    moveHistory: state.moveHistory.map((m) => ({ ...m })),
    rules: { ...state.rules },
  }
}

// -----------------------------------------------------------------------------
// Board Queries
// -----------------------------------------------------------------------------

/**
 * Check if the board has any moves placed
 */
export function hasAnyMoves(state: GameState): boolean {
  return state.board.some((row) => row.some((cell) => cell !== ''))
}

/**
 * Get the center cell position of the board
 */
export function getCenterPosition(state: GameState): Position {
  return {
    row: Math.floor(state.boardSize.rows / 2),
    col: Math.floor(state.boardSize.cols / 2),
  }
}

/**
 * Check if a position is within board bounds
 */
export function isValidPosition(state: GameState, row: number, col: number): boolean {
  return row >= 0 && row < state.boardSize.rows && col >= 0 && col < state.boardSize.cols
}

/**
 * Check if a cell is on the edge of the board
 */
export function isEdgeCell(state: GameState, row: number, col: number): boolean {
  return (
    row === 0 ||
    row === state.boardSize.rows - 1 ||
    col === 0 ||
    col === state.boardSize.cols - 1
  )
}

/**
 * Check if a cell is the center cell (for first move validation)
 */
export function isCenterCell(state: GameState, row: number, col: number): boolean {
  const center = getCenterPosition(state)
  return row === center.row && col === center.col
}

/**
 * Check if a cell is adjacent to a filled cell (8-direction adjacency)
 * For the first move, only the center cell is valid
 */
export function isAdjacentToFilledCell(state: GameState, row: number, col: number): boolean {
  // For the first move, only allow the center cell
  if (!hasAnyMoves(state)) {
    return isCenterCell(state, row, col)
  }

  // Check all 8 adjacent cells (Moore neighborhood)
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]

  for (const [dr, dc] of directions) {
    const newRow = row + dr
    const newCol = col + dc
    if (
      isValidPosition(state, newRow, newCol) &&
      state.board[newRow]?.[newCol] !== ''
    ) {
      return true
    }
  }

  return false
}

/**
 * Get all valid move positions for the current state
 */
export function getValidMoves(state: GameState): Position[] {
  const validMoves: Position[] = []

  for (let row = 0; row < state.boardSize.rows; row++) {
    for (let col = 0; col < state.boardSize.cols; col++) {
      if (state.board[row]?.[col] === '' && isAdjacentToFilledCell(state, row, col)) {
        validMoves.push({ row, col })
      }
    }
  }

  return validMoves
}

// -----------------------------------------------------------------------------
// Board Expansion
// -----------------------------------------------------------------------------

/**
 * Determines which edges would expand if a piece is placed at the given position
 */
export function getExpansionEdges(state: GameState, row: number, col: number): ExpandedEdges {
  return {
    top: row === 0,
    bottom: row === state.boardSize.rows - 1,
    left: col === 0,
    right: col === state.boardSize.cols - 1,
  }
}

/**
 * Check if board needs expansion at the given position
 */
export function shouldExpandBoard(state: GameState, row: number, col: number): boolean {
  const edges = getExpansionEdges(state, row, col)
  return edges.top || edges.bottom || edges.left || edges.right
}

/**
 * Expands the board based on the position of the last move
 * Returns a new state with expanded board and updated coordinates
 */
export function expandBoard(
  state: GameState,
  row: number,
  col: number
): { state: GameState; expandedEdges: ExpandedEdges } {
  const newState = cloneState(state)
  const expandedEdges = getExpansionEdges(state, row, col)

  // Expand top (add row at index 0)
  if (expandedEdges.top) {
    newState.board.unshift(Array(newState.boardSize.cols).fill('') as CellValue[])
    newState.boardSize.rows++
    newState.boardOffset.row++
    // Update move history: all rows shift down by 1
    newState.moveHistory.forEach((move) => move.row++)
  }

  // Expand bottom (add row at end)
  if (expandedEdges.bottom) {
    newState.board.push(Array(newState.boardSize.cols).fill('') as CellValue[])
    newState.boardSize.rows++
  }

  // Expand left (add column at index 0 for each row)
  if (expandedEdges.left) {
    for (let i = 0; i < newState.board.length; i++) {
      const currentRow = newState.board[i]
      if (currentRow) {
        newState.board[i] = ['', ...currentRow] as CellValue[]
      }
    }
    newState.boardSize.cols++
    newState.boardOffset.col++
    // Update move history: all columns shift right by 1
    newState.moveHistory.forEach((move) => move.col++)
  }

  // Expand right (add column at end for each row)
  if (expandedEdges.right) {
    for (let i = 0; i < newState.board.length; i++) {
      const currentRow = newState.board[i]
      if (currentRow) {
        newState.board[i] = [...currentRow, ''] as CellValue[]
      }
    }
    newState.boardSize.cols++
  }

  return { state: newState, expandedEdges }
}

// -----------------------------------------------------------------------------
// Win Detection
// -----------------------------------------------------------------------------

/**
 * Check for a winner on the board
 * Returns the winning symbol and winning cells if found
 */
export function checkWinner(state: GameState): {
  winner: PlayerSymbol | null
  winningCells: Position[]
} {
  const { rows, cols } = state.boardSize
  const len = state.rules.winLength

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = state.board[row]?.[col]
      if (!cell) continue

      // Check horizontal
      if (col <= cols - len) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (state.board[row]?.[col + i] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          return {
            winner: cell as PlayerSymbol,
            winningCells: Array.from({ length: len }, (_, i) => ({ row, col: col + i })),
          }
        }
      }

      // Check vertical
      if (row <= rows - len) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (state.board[row + i]?.[col] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          return {
            winner: cell as PlayerSymbol,
            winningCells: Array.from({ length: len }, (_, i) => ({ row: row + i, col })),
          }
        }
      }

      // Check diagonal (top-left to bottom-right)
      if (row <= rows - len && col <= cols - len) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (state.board[row + i]?.[col + i] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          return {
            winner: cell as PlayerSymbol,
            winningCells: Array.from({ length: len }, (_, i) => ({
              row: row + i,
              col: col + i,
            })),
          }
        }
      }

      // Check diagonal (top-right to bottom-left)
      if (row <= rows - len && col >= len - 1) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (state.board[row + i]?.[col - i] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          return {
            winner: cell as PlayerSymbol,
            winningCells: Array.from({ length: len }, (_, i) => ({
              row: row + i,
              col: col - i,
            })),
          }
        }
      }
    }
  }

  return { winner: null, winningCells: [] }
}

/**
 * Check if the game is a draw (board full with no winner)
 */
export function checkDraw(state: GameState): boolean {
  // A draw only occurs if there's no winner and no valid moves left
  // In an infinite board game, this is unlikely but possible if the board
  // is somehow constrained
  if (state.winner) return false

  // Check if there are any valid moves remaining
  const validMoves = getValidMoves(state)
  return validMoves.length === 0
}

// -----------------------------------------------------------------------------
// Player Management
// -----------------------------------------------------------------------------

/**
 * Get the current player
 */
export function getCurrentPlayer(state: GameState): Player | undefined {
  return state.players[state.currentPlayerIndex]
}

/**
 * Find a player by ID
 */
export function getPlayerById(state: GameState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId)
}

/**
 * Find a player's index by ID
 */
export function getPlayerIndexById(state: GameState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId)
}

/**
 * Advance to the next player's turn
 */
export function advanceTurn(state: GameState): GameState {
  const newState = cloneState(state)
  newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length
  return newState
}

// -----------------------------------------------------------------------------
// Move Application (Main Entry Point)
// -----------------------------------------------------------------------------

/**
 * Validates and applies a move to the game state
 * Returns a new state (immutable) with the move applied
 */
export function applyMove(
  state: GameState,
  playerId: string,
  row: number,
  col: number
): MoveResult {
  // 1. Validate player exists and it's their turn
  const playerIndex = getPlayerIndexById(state, playerId)
  if (playerIndex === -1) {
    return { ok: false, state, error: 'PLAYER_NOT_FOUND' }
  }

  if (playerIndex !== state.currentPlayerIndex) {
    return { ok: false, state, error: 'NOT_YOUR_TURN' }
  }

  // 2. Validate game not over
  if (state.winner || state.isDraw) {
    return { ok: false, state, error: 'GAME_OVER' }
  }

  // 3. Validate position is valid
  if (!isValidPosition(state, row, col)) {
    return { ok: false, state, error: 'INVALID_POSITION' }
  }

  // 4. Validate cell is empty
  if (state.board[row]?.[col] !== '') {
    return { ok: false, state, error: 'CELL_OCCUPIED' }
  }

  // 5. Validate adjacency (or first move center)
  if (!isAdjacentToFilledCell(state, row, col)) {
    return { ok: false, state, error: 'NOT_ADJACENT' }
  }

  // 6. Clone state for immutability
  let newState = cloneState(state)
  const player = newState.players[playerIndex]
  if (!player) {
    return { ok: false, state, error: 'PLAYER_NOT_FOUND' }
  }

  // 7. Place the piece BEFORE expansion (like the original)
  const boardRow = newState.board[row]
  if (!boardRow) {
    return { ok: false, state, error: 'INVALID_POSITION' }
  }
  boardRow[col] = player.symbol

  // 8. Handle board expansion if on edge
  let expandedEdges: ExpandedEdges = { top: false, bottom: false, left: false, right: false }
  let finalRow = row
  let finalCol = col

  if (shouldExpandBoard(state, row, col)) {
    const expansion = expandBoard(newState, row, col)
    newState = expansion.state
    expandedEdges = expansion.expandedEdges

    // Adjust coordinates after expansion (piece was already placed, so it shifted)
    if (expandedEdges.top) finalRow++
    if (expandedEdges.left) finalCol++
  }

  // 9. Record the move in history
  const moveRecord: MoveRecord = {
    playerId,
    row: finalRow,
    col: finalCol,
    moveNumber: newState.moveHistory.length + 1,
    symbol: player.symbol,
    timestamp: Date.now(),
  }
  newState.moveHistory.unshift(moveRecord)

  // 10. Check for winner
  const winResult = checkWinner(newState)
  newState.winner = winResult.winner
  newState.winningCells = winResult.winningCells

  // 11. Check for draw
  newState.isDraw = !newState.winner && checkDraw(newState)

  // 12. Advance turn if game continues
  if (!newState.winner && !newState.isDraw) {
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length
  }

  return { ok: true, state: newState, expandedEdges }
}

// -----------------------------------------------------------------------------
// Timer Management
// -----------------------------------------------------------------------------

/**
 * Start or reset the turn timer
 */
export function startTurnTimer(state: GameState, timeLimit: number): GameState {
  const newState = cloneState(state)
  newState.turnStartTime = Date.now()
  newState.turnDeadline = Date.now() + timeLimit * 1000
  return newState
}

/**
 * Clear the turn timer
 */
export function clearTurnTimer(state: GameState): GameState {
  const newState = cloneState(state)
  newState.turnStartTime = undefined
  newState.turnDeadline = undefined
  return newState
}

/**
 * Check if the turn timer has expired
 */
export function isTurnTimerExpired(state: GameState): boolean {
  if (!state.turnDeadline) return false
  return Date.now() > state.turnDeadline
}

/**
 * Handle turn timeout (skip turn or declare winner based on player count)
 */
export function handleTurnTimeout(state: GameState): GameState {
  const newState = cloneState(state)

  if (newState.players.length === 2) {
    // 2 players: other player wins
    const otherPlayerIndex = (newState.currentPlayerIndex + 1) % 2
    const winner = newState.players[otherPlayerIndex]
    if (winner) {
      newState.winner = winner.symbol
    }
  } else {
    // 3+ players: skip turn
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length
  }

  // Clear timer
  newState.turnStartTime = undefined
  newState.turnDeadline = undefined

  return newState
}

// -----------------------------------------------------------------------------
// Game Reset
// -----------------------------------------------------------------------------

/**
 * Reset the game state for a new round (keeps players and rules)
 */
export function resetGame(state: GameState): GameState {
  return createInitialState(state.players, state.rules)
}
