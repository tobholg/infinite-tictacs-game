export declare const PLAYER_SYMBOLS: readonly ["X", "O", "Square", "Star", "Triangle", "Diamond", "Circle", "Plus", "Heart", "Pentagon"];
export type PlayerSymbol = (typeof PLAYER_SYMBOLS)[number];
export type CellValue = '' | PlayerSymbol;
export type Board = CellValue[][];
export interface Position {
    row: number;
    col: number;
}
export interface BoardSize {
    rows: number;
    cols: number;
}
export interface BoardOffset {
    row: number;
    col: number;
}
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export interface Player {
    id: string;
    name: string;
    symbol: PlayerSymbol;
    isAI: boolean;
    aiDifficulty?: AIDifficulty;
    teamId?: number;
    connected?: boolean;
    isSpectator?: boolean;
}
export interface LocalPlayer {
    name: string;
    symbol: PlayerSymbol;
    active: boolean;
    teamId?: number;
    isAI?: boolean;
    aiDifficulty?: AIDifficulty;
}
export interface MoveRecord {
    playerId: string;
    row: number;
    col: number;
    moveNumber: number;
    symbol: PlayerSymbol;
    timestamp: number;
}
export interface GameRules {
    winLength: number;
    timeLimit?: number | null;
    maxPlayers: number;
    allowSpectators: boolean;
}
export declare const DEFAULT_GAME_RULES: GameRules;
export interface GameState {
    board: Board;
    boardSize: BoardSize;
    boardOffset: BoardOffset;
    players: Player[];
    currentPlayerIndex: number;
    winner: PlayerSymbol | null;
    winningCells: Position[];
    isDraw: boolean;
    moveHistory: MoveRecord[];
    rules: GameRules;
    turnStartTime?: number;
    turnDeadline?: number;
}
export interface ExpandedEdges {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
}
export interface MoveResult {
    ok: boolean;
    state: GameState;
    error?: MoveError;
    expandedEdges?: ExpandedEdges;
}
export type MoveError = 'NOT_YOUR_TURN' | 'GAME_OVER' | 'CELL_OCCUPIED' | 'NOT_ADJACENT' | 'INVALID_POSITION' | 'PLAYER_NOT_FOUND';
export type RoomPhase = 'LOBBY' | 'COUNTDOWN' | 'ROUND_ACTIVE' | 'ROUND_RESULTS' | 'COMPLETED';
export interface RoomState {
    code: string;
    hostId: string;
    phase: RoomPhase;
    players: Player[];
    gameState: GameState | null;
    rules: GameRules;
    scoreboard: Record<string, number>;
    createdAt: number;
    lastActivityAt: number;
}
export interface CantPlaceEffects {
    dimmedCells: boolean;
    stripedPattern: boolean;
    warningIcon: boolean;
}
export interface GameSettings {
    players: LocalPlayer[];
    gameMode: 'classic';
    rules: string[];
    timeLimit?: number | null;
    cantPlaceEffects?: CantPlaceEffects;
}
export interface OnlineGameSettings {
    hostName: string;
    rules: GameRules;
    allowSpectators: boolean;
    maxPlayers: number;
}
//# sourceMappingURL=index.d.ts.map
