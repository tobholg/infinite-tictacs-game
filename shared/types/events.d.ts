import type { AIDifficulty, GameState, GameRules, Player, Position, RoomPhase, RoomState } from './index';
export interface ClientToServerEvents {
    'host:create_room': (data: CreateRoomPayload) => void;
    'player:join_room': (data: JoinRoomPayload) => void;
    'player:leave_room': (data: LeaveRoomPayload) => void;
    'player:reconnect': (data: ReconnectPayload) => void;
    'player:request_state': (data: RequestStatePayload) => void;
    'host:start_round': (data: StartRoundPayload) => void;
    'host:kick_player': (data: KickPlayerPayload) => void;
    'host:update_rules': (data: UpdateRulesPayload) => void;
    'host:add_ai': (data: AddAIPayload) => void;
    'host:remove_ai': (data: RemoveAIPayload) => void;
    'host:toggle_spectate': (data: ToggleHostSpectatePayload) => void;
    'player:submit_move': (data: SubmitMovePayload) => void;
}
export interface ServerToClientEvents {
    'room:created': (data: RoomCreatedPayload) => void;
    'room:joined': (data: RoomJoinedPayload) => void;
    'room:error': (data: RoomErrorPayload) => void;
    'lobby:updated': (data: LobbyUpdatedPayload) => void;
    'host:transferred': (data: HostTransferredPayload) => void;
    'player:kicked': (data: PlayerKickedPayload) => void;
    'countdown:tick': (data: CountdownTickPayload) => void;
    'round:started': (data: RoundStartedPayload) => void;
    'game:state': (data: GameStatePayload) => void;
    'move:ack': (data: MoveAckPayload) => void;
    'turn:timeout': (data: TurnTimeoutPayload) => void;
    'round:results': (data: RoundResultsPayload) => void;
    'scoreboard:updated': (data: ScoreboardUpdatedPayload) => void;
    'connection:restored': (data: ConnectionRestoredPayload) => void;
}
export interface CreateRoomPayload {
    hostName: string;
    rules: GameRules;
    allowSpectators: boolean;
    maxPlayers: number;
}
export interface JoinRoomPayload {
    roomCode: string;
    name: string;
    playerId?: string;
    rejoinToken?: string;
    asSpectator?: boolean;
}
export interface LeaveRoomPayload {
    roomCode: string;
    playerId: string;
}
export interface ReconnectPayload {
    roomCode: string;
    playerId: string;
    rejoinToken: string;
}
export interface RequestStatePayload {
    roomCode: string;
    playerId: string;
}
export interface StartRoundPayload {
    roomCode: string;
}
export interface KickPlayerPayload {
    roomCode: string;
    targetPlayerId: string;
}
export interface UpdateRulesPayload {
    roomCode: string;
    rules: Partial<GameRules>;
}
export interface SubmitMovePayload {
    roomCode: string;
    playerId: string;
    row: number;
    col: number;
}
export interface AddAIPayload {
    roomCode: string;
    name: string;
    difficulty: AIDifficulty;
}
export interface RemoveAIPayload {
    roomCode: string;
    aiPlayerId: string;
}
export interface ToggleHostSpectatePayload {
    roomCode: string;
    becomeSpectator: boolean;
}
export interface RoomCreatedPayload {
    roomCode: string;
    hostToken: string;
    playerId: string;
    rejoinToken: string;
    roomSnapshot: RoomState;
}
export interface RoomJoinedPayload {
    roomSnapshot: RoomState;
    yourPlayerId: string;
    rejoinToken: string;
}
export interface RoomErrorPayload {
    code: RoomErrorCode;
    message: string;
}
export type RoomErrorCode = 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'GAME_IN_PROGRESS' | 'INVALID_NAME' | 'INVALID_ROOM_CODE' | 'NOT_HOST' | 'INVALID_MOVE' | 'NOT_YOUR_TURN' | 'RECONNECT_FAILED' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
export interface LobbyUpdatedPayload {
    players: Player[];
    hostId: string;
    rules: GameRules;
    phase: RoomPhase;
}
export interface HostTransferredPayload {
    newHostId: string;
    newHostName: string;
}
export interface PlayerKickedPayload {
    playerId: string;
    playerName: string;
    reason?: string;
}
export interface CountdownTickPayload {
    secondsRemaining: number;
    serverTimeMs: number;
}
export interface RoundStartedPayload {
    gameState: GameState;
    serverTimeMs: number;
    turnDeadlineMs?: number;
}
export interface GameStatePayload {
    gameState: GameState;
    serverTimeMs: number;
    turnDeadlineMs?: number;
}
export interface MoveAckPayload {
    accepted: boolean;
    reason?: string;
}
export interface TurnTimeoutPayload {
    timedOutPlayerId: string;
    timedOutPlayerName: string;
    action: 'skip' | 'forfeit';
    gameState: GameState;
    serverTimeMs: number;
    turnDeadlineMs?: number;
}
export interface RoundResultsPayload {
    winner: string | null;
    winnerId: string | null;
    winnerSymbol: string | null;
    winningCells: Position[];
    isDraw: boolean;
    scoreboard: Record<string, number>;
}
export interface ScoreboardUpdatedPayload {
    scoreboard: Record<string, number>;
}
export interface ConnectionRestoredPayload {
    roomSnapshot: RoomState;
    gameState: GameState | null;
}
export interface InterServerEvents {
    ping: () => void;
}
export interface SocketData {
    playerId: string;
    roomCode: string | null;
    isHost: boolean;
    rejoinToken: string;
}
//# sourceMappingURL=events.d.ts.map