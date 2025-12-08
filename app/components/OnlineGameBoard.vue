<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Motion } from '@motionone/vue'
import { useOnlineGame } from '~/composables/useOnlineGame'

import type { Position, PlayerSymbol, Player } from '../../shared/types'

// Icon Components
import XIcon from './icons/XIcon.vue'
import OIcon from './icons/OIcon.vue'
import SquareIcon from './icons/SquareIcon.vue'
import StarIcon from './icons/StarIcon.vue'
import TriangleIcon from './icons/TriangleIcon.vue'
import DiamondIcon from './icons/DiamondIcon.vue'
import CircleIcon from './icons/CircleIcon.vue'
import PlusIcon from './icons/PlusIcon.vue'
import HeartIcon from './icons/HeartIcon.vue'
import PentagonIcon from './icons/PentagonIcon.vue'
import RefreshIcon from './icons/RefreshIcon.vue'
import ExitIcon from './icons/ExitIcon.vue'

const emit = defineEmits<{
  backToLobby: []
  backToMenu: []
}>()

// Online game state
const {
  gameState,
  players,
  myPlayer,
  currentPlayer,
  isMyTurn,
  isSpectator,
  turnTimeRemaining,
  pendingMove,
  error,
  lastTimeoutPlayerName,
  lastTimeoutAction,
  submitMove,
  leaveRoom,
} = useOnlineGame()

// Local UI state
const boardElement = ref<HTMLElement | null>(null)
const lastPlacedCell = ref<Position | null>(null)
const viewportWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1280)
const viewportHeight = ref<number>(typeof window !== 'undefined' ? window.innerHeight : 720)

const updateViewportSize = () => {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

// Dynamic cell size calculation based on board dimensions (matching GameBoard.vue)
const cellSize = computed(() => {
  const minCellSize = 40 // Minimum cell size in pixels
  const initialCellSize = 80 // Starting cell size for 3x3 board
  const gap = 8 // Gap between cells from CSS
  const padding = 32 // Board padding (var(--space-4) * 2)

  // Get viewport dimensions (accounting for padding and margins)
  const maxBoardWidth = Math.min(viewportWidth.value * 0.9, 720) // Match wrapper width constraint
  const maxBoardHeight = Math.max(viewportHeight.value - 280, minCellSize) // Account for header, info, players, action bar

  // Calculate board dimensions with initial cell size
  const boardWidth = boardSize.value.cols * initialCellSize + (boardSize.value.cols - 1) * gap + padding
  const boardHeight = boardSize.value.rows * initialCellSize + (boardSize.value.rows - 1) * gap + padding

  // Only shrink if board would exceed container
  let calculatedSize = initialCellSize

  if (boardWidth > maxBoardWidth || boardHeight > maxBoardHeight) {
    // Calculate the scale factor needed to fit
    const widthScale = maxBoardWidth / boardWidth
    const heightScale = maxBoardHeight / boardHeight
    const scaleFactor = Math.min(widthScale, heightScale)

    calculatedSize = Math.max(minCellSize, Math.floor(initialCellSize * scaleFactor))
  }

  return calculatedSize
})

// Animation constants
const livelySpringEasing = 'cubic-bezier(0.22, 1, 0.36, 1)'
const playerChipTransition = { duration: 0.55, easing: livelySpringEasing } as const

// Symbol components map
const symbolComponents: Record<string, any> = {
  X: XIcon,
  O: OIcon,
  Square: SquareIcon,
  Star: StarIcon,
  Triangle: TriangleIcon,
  Diamond: DiamondIcon,
  Circle: CircleIcon,
  Plus: PlusIcon,
  Heart: HeartIcon,
  Pentagon: PentagonIcon,
}

// Computed properties
const board = computed(() => gameState.value?.board || [])
const boardSize = computed(() => gameState.value?.boardSize || { rows: 3, cols: 3 })
const winner = computed(() => gameState.value?.winner || null)
const winningCells = computed(() => gameState.value?.winningCells || [])
const isDraw = computed(() => gameState.value?.isDraw || false)
const currentPlayerIndex = computed(() => gameState.value?.currentPlayerIndex || 0)
const gamePlayers = computed(() => gameState.value?.players || [])
const winLength = computed(() => gameState.value?.rules.winLength || 4)

const isGameOver = computed(() => winner.value !== null || isDraw.value)

const timerWarning = computed(() => {
  if (!turnTimeRemaining.value) return false
  return turnTimeRemaining.value <= 3
})

// Check if cell can be clicked
const canClickCell = (row: number, col: number): boolean => {
  if (isSpectator.value) return false // Spectators can't click cells
  if (isGameOver.value) return false
  if (!isMyTurn.value) return false
  if (board.value[row]?.[col] !== '') return false
  if (pendingMove.value) return false // Already submitted a move
  return isAdjacentToFilledCell(row, col)
}

// Adjacency check (simplified version for client-side validation)
const hasAnyMoves = computed(() => {
  return board.value.some(row => row.some(cell => cell !== ''))
})

function isAdjacentToFilledCell(row: number, col: number): boolean {
  // For first move, only center is valid
  if (!hasAnyMoves.value) {
    const centerRow = Math.floor(boardSize.value.rows / 2)
    const centerCol = Math.floor(boardSize.value.cols / 2)
    return row === centerRow && col === centerCol
  }

  // Check all 8 adjacent cells
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ]

  for (const [dr, dc] of directions) {
    const newRow = row + dr
    const newCol = col + dc
    if (
      newRow >= 0 && newRow < boardSize.value.rows &&
      newCol >= 0 && newCol < boardSize.value.cols &&
      board.value[newRow]?.[newCol] !== ''
    ) {
      return true
    }
  }

  return false
}

function isWinningCell(row: number, col: number): boolean {
  return winningCells.value.some(cell => cell.row === row && cell.col === col)
}

function isPendingCell(row: number, col: number): boolean {
  return pendingMove.value?.row === row && pendingMove.value?.col === col
}

// Handle cell click
function handleCellClick(row: number, col: number) {
  if (!canClickCell(row, col)) return

  // Track for animation
  lastPlacedCell.value = { row, col }

  // Submit move to server
  submitMove(row, col)

  // Scroll to placed cell
  scrollToCell(row, col)
}

// Scroll to center of board
async function scrollToCenter() {
  await nextTick()
  if (!boardElement.value) return

  const scrollLeft = (boardElement.value.scrollWidth - boardElement.value.clientWidth) / 2
  const scrollTop = (boardElement.value.scrollHeight - boardElement.value.clientHeight) / 2
  boardElement.value.scrollTo({ left: scrollLeft, top: scrollTop })
}

// Auto-scroll to a cell
async function scrollToCell(row: number, col: number) {
  await nextTick()
  if (!boardElement.value) return

  const piecePixelX = col * (cellSize.value + 8)
  const piecePixelY = row * (cellSize.value + 8)

  const centerX = piecePixelX - (boardElement.value.clientWidth / 2) + (cellSize.value / 2)
  const centerY = piecePixelY - (boardElement.value.clientHeight / 2) + (cellSize.value / 2)

  boardElement.value.scrollTo({
    left: Math.max(0, centerX),
    top: Math.max(0, centerY),
    behavior: 'smooth'
  })
}

// Player chip animation
function getPlayerChipAnimation(playerSymbol: PlayerSymbol, playerIndex: number) {
  const isWinner = winner.value === playerSymbol
  const isActive = currentPlayerIndex.value === playerIndex && !winner.value

  return {
    opacity: 1,
    y: isWinner ? -10 : isActive ? -6 : 0,
    scale: isWinner ? 1.08 : isActive ? 1.03 : 1,
    boxShadow: isWinner
      ? '0 14px 32px rgba(250, 204, 21, 0.42)'
      : isActive
        ? '0 10px 24px rgba(79, 70, 229, 0.32)'
        : '0 4px 12px rgba(15, 23, 42, 0.14)'
  }
}

// Get cell CSS classes
function getCellClasses(row: number, col: number, value: string) {
  const isJustPlaced = lastPlacedCell.value?.row === row && lastPlacedCell.value?.col === col
  return {
    filled: value !== '',
    winning: isWinningCell(row, col),
    pending: isPendingCell(row, col),
    clickable: canClickCell(row, col),
    'my-turn': isMyTurn.value && !value,
    'just-placed': isJustPlaced,
  }
}

// Get symbol component for a cell value
function getSymbolComponent(value: string) {
  return symbolComponents[value] || null
}

// Get motion animation state for a cell
function getCellMotionState(row: number, col: number, cell: string) {
  const isJustPlaced = lastPlacedCell.value?.row === row && lastPlacedCell.value?.col === col

  if (isJustPlaced && cell) {
    return { opacity: 1, scale: 1 }
  }

  if (isWinningCell(row, col)) {
    return { opacity: 1, scale: 1.05 }
  }

  return { opacity: 1, scale: 1 }
}

// Handle leaving
function handleLeave() {
  leaveRoom()
  emit('backToMenu')
}

// Auto-scroll to center on mount and setup resize listener
onMounted(async () => {
  // Setup viewport resize listener
  if (typeof window !== 'undefined') {
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize, { passive: true })
  }

  // Scroll to center
  await scrollToCenter()
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportSize)
  }
})

// Watch for game state changes and auto-scroll to latest move
watch(() => gameState.value?.moveHistory?.[0], (latestMove) => {
  if (latestMove) {
    scrollToCell(latestMove.row, latestMove.col)
    lastPlacedCell.value = { row: latestMove.row, col: latestMove.col }

    // Clear after animation
    setTimeout(() => {
      if (lastPlacedCell.value?.row === latestMove.row && lastPlacedCell.value?.col === latestMove.col) {
        lastPlacedCell.value = null
      }
    }, 900)
  }
})
</script>

<template>
  <div class="online-game-board-wrapper">
    <!-- Spectator Banner -->
    <div v-if="isSpectator" class="spectator-banner">
      <span class="spectator-icon">&#128065;</span>
      <span>Spectating - Watch only mode</span>
    </div>

    <!-- Error Display -->
    <Motion
      v-if="error"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      class="error-banner"
    >
      {{ error }}
    </Motion>

    <!-- Timeout Notification -->
    <Motion
      v-if="lastTimeoutPlayerName"
      :initial="{ opacity: 0, y: -10, scale: 0.95 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :exit="{ opacity: 0, y: -10 }"
      class="timeout-banner"
    >
      <span class="timeout-icon">&#9203;</span>
      <span v-if="lastTimeoutAction === 'skip'">
        {{ lastTimeoutPlayerName }}'s turn was skipped (time ran out)
      </span>
      <span v-else>
        {{ lastTimeoutPlayerName }} ran out of time - game over!
      </span>
    </Motion>

    <!-- Players Strip -->
    <div class="players-strip-wrapper">
      <div class="players-strip">
        <Motion
          v-for="(player, index) in gamePlayers"
          :key="player.id"
          tag="div"
          class="player-chip"
          :class="{
            active: currentPlayerIndex === index && !winner,
            winner: winner === player.symbol,
            'is-me': player.id === myPlayer?.id
          }"
          :data-symbol="player.symbol.toLowerCase()"
          :initial="{ opacity: 0, y: 12, scale: 0.92 }"
          :animate="getPlayerChipAnimation(player.symbol, index)"
          :transition="playerChipTransition"
        >
          <span class="player-symbol">
            <component :is="getSymbolComponent(player.symbol)" :size="26" :stroke-width="4" />
          </span>
          <span class="player-name">{{ player.name }}</span>
          <div v-if="currentPlayerIndex === index && !winner" class="turn-indicator">
            <span class="turn-indicator-dot"></span>
            <div v-if="turnTimeRemaining" class="timer-display" :class="{ warning: timerWarning }">
              <span class="timer-text">{{ turnTimeRemaining }}s</span>
            </div>
          </div>
          <span v-if="winner === player.symbol" class="status-tag">Winner</span>
          <span v-if="player.id === myPlayer?.id" class="you-tag">You</span>
        </Motion>
      </div>
    </div>

    <!-- Board Info -->
    <div class="board-info-row">
      <span>Board: {{ boardSize.rows }} × {{ boardSize.cols }}</span>
      <span>Win: {{ winLength }} in a row</span>
      <span v-if="isMyTurn && !isGameOver && !isSpectator" class="your-turn-indicator">Your Turn!</span>
    </div>

    <!-- Game Board -->
    <div class="board-container">
      <!-- Results Overlay -->
      <Motion
        v-if="isGameOver"
        class="game-info-overlay"
        :initial="{ opacity: 0, scale: 0.9, y: 24 }"
        :animate="{ opacity: 1, scale: 1, y: 0 }"
        :transition="{ duration: 0.55, easing: livelySpringEasing }"
      >
        <div v-if="winner" class="game-result victory">
          <span class="victory-text">
            {{ gamePlayers.find(p => p.symbol === winner)?.name }} wins!
            <br />
            {{ winLength }} in a row
          </span>
        </div>
        <div v-else class="game-result draw">
          <span class="draw-text">It's a Draw!</span>
        </div>
        <div class="game-end-actions">
          <Motion
            tag="button"
            @click="handleLeave"
            class="action-button secondary"
            :transition="{ duration: 0.25, easing: livelySpringEasing }"
          >
            <ExitIcon class="button-icon" :size="18" />
            <span>Leave Game</span>
          </Motion>
        </div>
      </Motion>

      <!-- Board Grid -->
      <div
        ref="boardElement"
        class="board"
        :style="{
          '--cell-size': `${cellSize}px`,
          '--grid-cols': boardSize.cols,
          gridTemplateColumns: `repeat(${boardSize.cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${boardSize.rows}, ${cellSize}px)`
        }"
      >
        <template v-for="(row, rowIndex) in board" :key="`row-${rowIndex}`">
          <Motion
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            tag="button"
            class="cell"
            :class="getCellClasses(rowIndex, colIndex, cell)"
            :data-symbol="cell ? cell.toLowerCase() : undefined"
            :disabled="!canClickCell(rowIndex, colIndex)"
            @click="handleCellClick(rowIndex, colIndex)"
            :initial="{ opacity: 1, scale: 1 }"
            :animate="getCellMotionState(rowIndex, colIndex, cell)"
            :transition="{ duration: 0.3, easing: livelySpringEasing }"
          >
            <component
              v-if="cell"
              :is="getSymbolComponent(cell)"
              :size="cellSize * 0.6"
              :stroke-width="4"
              class="cell-icon"
            />
            <span v-else-if="isPendingCell(rowIndex, colIndex)" class="pending-indicator">...</span>
          </Motion>
        </template>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="leave-btn" @click="handleLeave">
        <ExitIcon :size="18" />
        Leave Game
      </button>
    </div>
  </div>
</template>

<style scoped>
.online-game-board-wrapper {
  width: min(720px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  overflow: visible;
  position: relative;
  z-index: 1;
  padding: var(--space-4);
  margin: 0 auto;
}

/* Spectator Banner */
.spectator-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
}

.spectator-icon {
  font-size: 1.1em;
}

/* Error Banner */
.error-banner {
  padding: var(--space-3) var(--space-4);
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: #fca5a5;
  font-size: var(--text-sm);
  text-align: center;
}

/* Timeout Banner */
.timeout-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(234, 88, 12, 0.15));
  border: 1px solid rgba(251, 146, 60, 0.4);
  border-radius: var(--radius-md);
  color: #fdba74;
  font-size: var(--text-sm);
  font-weight: 500;
  animation: timeoutPulse 2s ease-in-out;
}

.timeout-icon {
  font-size: 1.2em;
}

@keyframes timeoutPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Players Strip */
.players-strip-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: calc(var(--space-3) + 14px) var(--space-2);
  overflow: visible;
}

.players-strip {
  --chip-glow-space: 32px;
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  overflow-y: visible;
  padding: calc(var(--space-2) + 14px) var(--chip-glow-space);
  width: 100%;
  justify-content: center;
  scroll-padding-inline: var(--chip-glow-space);
  scrollbar-gutter: stable both-edges;
  overflow: visible;
  z-index: 1;
}

.players-strip::before,
.players-strip::after {
  content: '';
  flex: 0 0 var(--chip-glow-space);
}

.player-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
  flex: 0 0 auto;
  position: relative;
  transition: border var(--transition-base), transform var(--transition-base), opacity var(--transition-base);
}

.player-chip[data-symbol="x"] {
  border-color: rgba(33, 150, 243, 0.55);
  background: rgba(33, 150, 243, 0.18);
}
.player-chip[data-symbol="o"] {
  border-color: rgba(244, 67, 54, 0.55);
  background: rgba(244, 67, 54, 0.18);
}
.player-chip[data-symbol="square"] {
  border-color: rgba(156, 39, 176, 0.55);
  background: rgba(156, 39, 176, 0.18);
}
.player-chip[data-symbol="star"] {
  border-color: rgba(255, 152, 0, 0.55);
  background: rgba(255, 152, 0, 0.18);
}
.player-chip[data-symbol="triangle"] {
  border-color: rgba(76, 175, 80, 0.55);
  background: rgba(76, 175, 80, 0.18);
}
.player-chip[data-symbol="diamond"] {
  border-color: rgba(0, 188, 212, 0.55);
  background: rgba(0, 188, 212, 0.18);
}
.player-chip[data-symbol="circle"] {
  border-color: rgba(255, 235, 59, 0.6);
  background: rgba(255, 235, 59, 0.25);
  color: #1f2937;
}
.player-chip[data-symbol="plus"] {
  border-color: rgba(233, 30, 99, 0.55);
  background: rgba(233, 30, 99, 0.18);
}
.player-chip[data-symbol="heart"] {
  border-color: rgba(255, 87, 34, 0.55);
  background: rgba(255, 87, 34, 0.18);
}
.player-chip[data-symbol="pentagon"] {
  border-color: rgba(121, 85, 72, 0.55);
  background: rgba(121, 85, 72, 0.2);
}

.player-chip.active {
  border-color: var(--neon-cyan);
  background: rgba(0, 217, 255, 0.12);
  box-shadow: 0 10px 24px rgba(0, 217, 255, 0.28);
  animation: playerChipPulse 2s ease-in-out infinite;
}

.player-chip.winner {
  border-color: rgba(34, 197, 94, 0.6);
  background: rgba(34, 197, 94, 0.12);
}

.player-chip.is-me {
  box-shadow: 0 0 0 2px var(--color-primary);
}

@keyframes playerChipPulse {
  0%, 100% {
    box-shadow: 0 10px 24px rgba(0, 217, 255, 0.28);
  }
  50% {
    box-shadow: 0 14px 32px rgba(0, 217, 255, 0.38);
  }
}

.player-symbol {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.player-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.turn-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.turn-indicator-dot {
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.timer-display {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.timer-display.warning {
  color: var(--color-error);
  animation: pulse 0.5s infinite;
}

.status-tag {
  padding: var(--space-1) var(--space-2);
  background: rgba(250, 204, 21, 0.2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  color: #fcd34d;
}

.you-tag {
  padding: var(--space-1) var(--space-2);
  background: rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  color: #a5b4fc;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Board Info */
.board-info-row {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.your-turn-indicator {
  color: var(--color-primary);
  font-weight: 600;
  animation: pulse 1s infinite;
}

/* Board Container */
.board-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Board Grid */
.board {
  display: grid;
  gap: 8px;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: none;
  box-shadow:
    inset 0 0 18px rgba(0, 217, 255, 0.12),
    0 0 26px rgba(0, 217, 255, 0.26),
    0 0 46px rgba(0, 217, 255, 0.2);
  overflow: auto;
  max-height: 70vh;
  position: relative;
}

/* Grid glow effect overlay */
.board::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent calc(100% / var(--grid-cols) - 1px),
                    rgba(0, 217, 255, 0.2) calc(100% / var(--grid-cols)),
                    rgba(0, 217, 255, 0.2) calc(100% / var(--grid-cols) + 1px),
                    transparent calc(100% / var(--grid-cols) + 2px));
  filter: blur(2px);
  opacity: 0.3;
  animation: gridPulse 3s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}

@keyframes gridPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

/* Cell Styles */
.cell {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(26, 29, 53, 0.6);
  border: 2px solid rgba(0, 217, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
  cursor: default;
}

.cell.clickable {
  cursor: pointer;
}

.cell.clickable:hover {
  border-color: var(--neon-cyan);
  background: rgba(0, 217, 255, 0.05);
  box-shadow:
    0 0 15px rgba(0, 217, 255, 0.3),
    inset 0 0 15px rgba(0, 217, 255, 0.1);
  transform: scale(1.05);
}

.cell.my-turn.clickable:hover {
  transform: scale(1.08);
}

/* Filled cell styles with neon glow per symbol */
.cell.filled[data-symbol="x"] {
  background: rgba(0, 217, 255, 0.1);
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-x);
}
.cell.filled[data-symbol="o"] {
  background: rgba(255, 51, 102, 0.1);
  border-color: var(--neon-pink);
  box-shadow: var(--glow-o);
}
.cell.filled[data-symbol="square"] {
  background: rgba(168, 85, 247, 0.1);
  border-color: var(--neon-purple);
  box-shadow: var(--glow-square);
}
.cell.filled[data-symbol="star"] {
  background: rgba(255, 184, 0, 0.1);
  border-color: var(--neon-orange);
  box-shadow: var(--glow-star);
}
.cell.filled[data-symbol="triangle"] {
  background: rgba(0, 255, 159, 0.1);
  border-color: var(--neon-green);
  box-shadow: var(--glow-triangle);
}
.cell.filled[data-symbol="diamond"] {
  background: rgba(33, 150, 243, 0.1);
  border-color: var(--neon-blue);
  box-shadow: var(--glow-diamond);
}
.cell.filled[data-symbol="circle"] {
  background: rgba(255, 235, 59, 0.1);
  border-color: var(--neon-yellow);
  box-shadow: var(--glow-circle);
}
.cell.filled[data-symbol="plus"] {
  background: rgba(244, 67, 54, 0.1);
  border-color: var(--neon-red);
  box-shadow: var(--glow-plus);
}
.cell.filled[data-symbol="heart"] {
  background: rgba(0, 188, 212, 0.1);
  border-color: var(--neon-teal);
  box-shadow: var(--glow-heart);
}
.cell.filled[data-symbol="pentagon"] {
  background: rgba(205, 220, 57, 0.1);
  border-color: var(--neon-lime);
  box-shadow: var(--glow-pentagon);
}

.cell.winning {
  background: rgba(34, 197, 94, 0.15);
  border-color: var(--color-success);
  animation: winPulse 1s infinite;
}

.cell.pending {
  background: rgba(99, 102, 241, 0.1);
  border-style: dashed;
}

/* Only animate the cell that was just placed */
.cell.just-placed {
  animation: cellAppear 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
}

@keyframes cellAppear {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes winPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
  50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.5); }
}

.cell-icon {
  display: grid;
  place-items: center;
  transition: transform 0.3s ease;
}

.pending-indicator {
  font-size: var(--text-xl);
  color: var(--color-text-muted);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Results Overlay */
.game-info-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 10;
  gap: var(--space-6);
}

.game-result {
  text-align: center;
}

.victory-text {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: #fcd34d;
  text-shadow: 0 0 30px rgba(250, 204, 21, 0.5);
}

.draw-text {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.game-end-actions {
  display: flex;
  gap: var(--space-4);
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button.secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.action-button:hover {
  transform: translateY(-2px);
}

/* Action Bar */
.action-bar {
  display: flex;
  justify-content: center;
  padding: var(--space-3);
}

.leave-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.leave-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-error);
  color: var(--color-error);
}
</style>
