// =============================================================================
// Shared Types for Infinite Tic-Tacs Multiplayer
// =============================================================================

// -----------------------------------------------------------------------------
// Player Symbols & Cell Values
// -----------------------------------------------------------------------------

export const PLAYER_SYMBOLS = [
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
] as const

export type PlayerSymbol = (typeof PLAYER_SYMBOLS)[number]
export type CellValue = '' | PlayerSymbol

// -----------------------------------------------------------------------------
// Board Types
// -----------------------------------------------------------------------------

export type Board = CellValue[][]

export interface Position {
  row: number
  col: number
}

export interface BoardSize {
  rows: number
  cols: number
}

export interface BoardOffset {
  row: number
  col: number
}

// -----------------------------------------------------------------------------
// Player Types
// -----------------------------------------------------------------------------

export type AIDifficulty = 'easy' | 'medium' | 'hard'

export interface Player {
  id: string
  name: string
  symbol: PlayerSymbol
  isAI: boolean
  aiDifficulty?: AIDifficulty
  teamId?: number
  connected?: boolean
  isSpectator?: boolean
  hasSetName?: boolean // Track if player confirmed their name (false = using placeholder)
}

// Local player type (used in StartMenu, doesn't have id)
export interface LocalPlayer {
  name: string
  symbol: PlayerSymbol
  active: boolean
  teamId?: number
  isAI?: boolean
  aiDifficulty?: AIDifficulty
}

// -----------------------------------------------------------------------------
// Move Types
// -----------------------------------------------------------------------------

export interface MoveRecord {
  playerId: string
  row: number
  col: number
  moveNumber: number
  symbol: PlayerSymbol
  timestamp: number
}

// -----------------------------------------------------------------------------
// Game Rules
// -----------------------------------------------------------------------------

export interface GameRules {
  winLength: number // Default: 4
  timeLimit?: number // Seconds per turn (undefined = no limit)
  maxPlayers: number // Default: 20
  allowSpectators: boolean
}

export const DEFAULT_GAME_RULES: GameRules = {
  winLength: 4,
  timeLimit: undefined,
  maxPlayers: 20,
  allowSpectators: true,
}

// -----------------------------------------------------------------------------
// Game State
// -----------------------------------------------------------------------------

export interface GameState {
  board: Board
  boardSize: BoardSize
  boardOffset: BoardOffset
  players: Player[]
  currentPlayerIndex: number
  winner: PlayerSymbol | null
  winningCells: Position[]
  isDraw: boolean
  moveHistory: MoveRecord[]
  rules: GameRules
  // Timer fields for online sync
  turnStartTime?: number
  turnDeadline?: number
}

// -----------------------------------------------------------------------------
// Move Result (returned by game engine)
// -----------------------------------------------------------------------------

export interface ExpandedEdges {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

export interface MoveResult {
  ok: boolean
  state: GameState
  error?: MoveError
  expandedEdges?: ExpandedEdges
}

export type MoveError =
  | 'NOT_YOUR_TURN'
  | 'GAME_OVER'
  | 'CELL_OCCUPIED'
  | 'NOT_ADJACENT'
  | 'INVALID_POSITION'
  | 'PLAYER_NOT_FOUND'

// -----------------------------------------------------------------------------
// Room Types (Online Multiplayer)
// -----------------------------------------------------------------------------

export type RoomPhase =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'ROUND_ACTIVE'
  | 'ROUND_RESULTS'
  | 'COMPLETED'

export interface RoomState {
  code: string
  hostId: string
  phase: RoomPhase
  players: Player[]
  gameState: GameState | null
  rules: GameRules
  scoreboard: Record<string, number>
  createdAt: number
  lastActivityAt: number
}

// -----------------------------------------------------------------------------
// Visual Effects (Local UI)
// -----------------------------------------------------------------------------

export interface CantPlaceEffects {
  dimmedCells: boolean
  stripedPattern: boolean
  warningIcon: boolean
}

// -----------------------------------------------------------------------------
// Game Settings (used when starting a game)
// -----------------------------------------------------------------------------

export interface GameSettings {
  players: LocalPlayer[]
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
  cantPlaceEffects?: CantPlaceEffects
}

// -----------------------------------------------------------------------------
// Online Game Settings (used when creating a room)
// -----------------------------------------------------------------------------

export interface OnlineGameSettings {
  hostName: string
  rules: GameRules
  allowSpectators: boolean
  maxPlayers: number
}
