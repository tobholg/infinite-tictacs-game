import type { ExpandedEdges, GameRules, GameState, MoveResult, Player, PlayerSymbol, Position } from '../types';
/**
 * Creates a new initial game state with a 3x3 board
 */
export declare function createInitialState(players: Player[], rules?: GameRules): GameState;
/**
 * Deep clones a game state for immutable operations
 */
export declare function cloneState(state: GameState): GameState;
/**
 * Check if the board has any moves placed
 */
export declare function hasAnyMoves(state: GameState): boolean;
/**
 * Get the center cell position of the board
 */
export declare function getCenterPosition(state: GameState): Position;
/**
 * Check if a position is within board bounds
 */
export declare function isValidPosition(state: GameState, row: number, col: number): boolean;
/**
 * Check if a cell is on the edge of the board
 */
export declare function isEdgeCell(state: GameState, row: number, col: number): boolean;
/**
 * Check if a cell is the center cell (for first move validation)
 */
export declare function isCenterCell(state: GameState, row: number, col: number): boolean;
/**
 * Check if a cell is adjacent to a filled cell (8-direction adjacency)
 * For the first move, only the center cell is valid
 */
export declare function isAdjacentToFilledCell(state: GameState, row: number, col: number): boolean;
/**
 * Get all valid move positions for the current state
 */
export declare function getValidMoves(state: GameState): Position[];
/**
 * Determines which edges would expand if a piece is placed at the given position
 */
export declare function getExpansionEdges(state: GameState, row: number, col: number): ExpandedEdges;
/**
 * Check if board needs expansion at the given position
 */
export declare function shouldExpandBoard(state: GameState, row: number, col: number): boolean;
/**
 * Expands the board based on the position of the last move
 * Returns a new state with expanded board and updated coordinates
 */
export declare function expandBoard(state: GameState, row: number, col: number): {
    state: GameState;
    expandedEdges: ExpandedEdges;
};
/**
 * Check for a winner on the board
 * Returns the winning symbol and winning cells if found
 */
export declare function checkWinner(state: GameState): {
    winner: PlayerSymbol | null;
    winningCells: Position[];
};
/**
 * Check if the game is a draw (board full with no winner)
 */
export declare function checkDraw(state: GameState): boolean;
/**
 * Get the current player
 */
export declare function getCurrentPlayer(state: GameState): Player | undefined;
/**
 * Find a player by ID
 */
export declare function getPlayerById(state: GameState, playerId: string): Player | undefined;
/**
 * Find a player's index by ID
 */
export declare function getPlayerIndexById(state: GameState, playerId: string): number;
/**
 * Advance to the next player's turn
 */
export declare function advanceTurn(state: GameState): GameState;
/**
 * Validates and applies a move to the game state
 * Returns a new state (immutable) with the move applied
 */
export declare function applyMove(state: GameState, playerId: string, row: number, col: number): MoveResult;
/**
 * Start or reset the turn timer
 */
export declare function startTurnTimer(state: GameState, timeLimit: number): GameState;
/**
 * Clear the turn timer
 */
export declare function clearTurnTimer(state: GameState): GameState;
/**
 * Check if the turn timer has expired
 */
export declare function isTurnTimerExpired(state: GameState): boolean;
/**
 * Handle turn timeout (skip turn or declare winner based on player count)
 */
export declare function handleTurnTimeout(state: GameState): GameState;
/**
 * Reset the game state for a new round (keeps players and rules)
 */
export declare function resetGame(state: GameState): GameState;
//# sourceMappingURL=index.d.ts.map