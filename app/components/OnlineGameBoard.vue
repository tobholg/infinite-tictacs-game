<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Motion } from '@motionone/vue'
import { useOnlineGame } from '~/composables/useOnlineGame'
import { useOnlineSettings } from '~/composables/useOnlineSettings'
import { useSound } from '~/composables/useSound'

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
import AlertIcon from './icons/AlertIcon.vue'

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
  isAIThinking,
  isInWinReveal,
  lastRoundWinningCells,
  submitMove,
  leaveRoom,
} = useOnlineGame()

// Local UI state
const boardElement = ref<HTMLElement | null>(null)
const lastPlacedCell = ref<Position | null>(null)
const viewportWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1280)
const viewportHeight = ref<number>(typeof window !== 'undefined' ? window.innerHeight : 720)

// Online settings (expansion animation and blocked cell effects)
const { expansionAnimationMode, cantPlaceEffects } = useOnlineSettings()

// Sound effects
const { play: playSound } = useSound()

// Expansion tracking
interface ExpandedEdges {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

const prevBoardSize = ref<{ rows: number; cols: number } | null>(null)
const prevBoardOffset = ref<{ row: number; col: number } | null>(null)
const expandedEdges = ref<ExpandedEdges>({ top: false, bottom: false, left: false, right: false })
const isAnimatingExpansion = ref(false)
const expansionAnimationTimer = ref<NodeJS.Timeout | null>(null)

// Animation duration for expansion effects (400-800ms as per spec)
const EXPANSION_ANIMATION_DURATION = 600 // ms

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
const boardOffset = computed(() => gameState.value?.boardOffset || { row: 0, col: 0 })
const winner = computed(() => gameState.value?.winner || null)
const winningCells = computed(() => gameState.value?.winningCells || [])
const isDraw = computed(() => gameState.value?.isDraw || false)
const currentPlayerIndex = computed(() => gameState.value?.currentPlayerIndex || 0)
const gamePlayers = computed(() => gameState.value?.players || [])
const winLength = computed(() => gameState.value?.rules.winLength || 4)

const isGameOver = computed(() => winner.value !== null || isDraw.value)

// During WIN_REVEAL, board is read-only and showing winner spotlight
const isInRevealPhase = computed(() => isInWinReveal.value)

// Use lastRoundWinningCells during reveal, otherwise use gameState winningCells
const revealWinningCells = computed(() => {
  if (isInRevealPhase.value && lastRoundWinningCells.value.length > 0) {
    return lastRoundWinningCells.value
  }
  return winningCells.value
})

const timerWarning = computed(() => {
  if (!turnTimeRemaining.value) return false
  return turnTimeRemaining.value <= 3
})

// Check if cell can be clicked
const canClickCell = (row: number, col: number): boolean => {
  if (isSpectator.value) return false // Spectators can't click cells
  if (isGameOver.value) return false
  if (isInRevealPhase.value) return false // Board is read-only during winner reveal
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
  // Use revealWinningCells during WIN_REVEAL phase, otherwise use gameState winningCells
  return revealWinningCells.value.some(cell => cell.row === row && cell.col === col)
}

// Get the index of this cell in the winning line (for sequential animation)
function getWinningCellIndex(row: number, col: number): number {
  return revealWinningCells.value.findIndex(cell => cell.row === row && cell.col === col)
}

// Check if a cell is part of a newly expanded edge
function getExpansionEdge(row: number, col: number): 'top' | 'bottom' | 'left' | 'right' | null {
  if (!isAnimatingExpansion.value) return null

  const currentSize = boardSize.value

  // Check if this is a newly added cell from expansion
  if (expandedEdges.value.top && row === 0) return 'top'
  if (expandedEdges.value.bottom && row === currentSize.rows - 1) return 'bottom'
  if (expandedEdges.value.left && col === 0) return 'left'
  if (expandedEdges.value.right && col === currentSize.cols - 1) return 'right'

  return null
}

// Get animation stagger delay for a cell based on its position
function getExpansionAnimationDelay(row: number, col: number): string {
  const edge = getExpansionEdge(row, col)
  if (!edge) return '0ms'

  let index = 0
  const currentSize = boardSize.value

  switch (edge) {
    case 'top':
    case 'bottom':
      index = col
      break
    case 'left':
    case 'right':
      index = row
      break
  }

  // Stagger delay: 30ms per cell for subtle wave effect
  return `${index * 30}ms`
}

function isPendingCell(row: number, col: number): boolean {
  return pendingMove.value?.row === row && pendingMove.value?.col === col
}

// Handle cell click
function handleCellClick(row: number, col: number) {
  if (!canClickCell(row, col)) {
    // Play invalid move sound if clicking a blocked cell
    if (board.value[row]?.[col] === '' && !isAdjacentToFilledCell(row, col)) {
      playSound('invalidMove')
    }
    return
  }

  // Play piece placed sound
  playSound('piecePlaced')

  // Track for animation using LOGICAL coordinates (stable across expansion)
  lastPlacedCell.value = {
    row: boardOffset.value.row + row,
    col: boardOffset.value.col + col
  }

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

// Check if cell is blocked (not adjacent to any filled cell)
function isBlockedCell(row: number, col: number): boolean {
  if (board.value[row]?.[col] !== '') return false // Already filled
  if (winner.value || isDraw.value) return false // Game over
  return !isAdjacentToFilledCell(row, col)
}

// Get cell CSS classes
function getCellClasses(row: number, col: number, value: string) {
  // Compare using LOGICAL coordinates (offset + view index) for stable animation targeting
  const logicalRow = boardOffset.value.row + row
  const logicalCol = boardOffset.value.col + col
  const isJustPlaced = lastPlacedCell.value?.row === logicalRow && lastPlacedCell.value?.col === logicalCol
  const expansionEdge = getExpansionEdge(row, col)
  const isWinner = isWinningCell(row, col)
  const winIndex = isWinner ? getWinningCellIndex(row, col) : -1
  const isEmpty = value === ''
  const gameOver = winner.value || isDraw.value
  const blocked = isBlockedCell(row, col)

  return {
    filled: value !== '',
    winning: isWinner,
    pending: isPendingCell(row, col),
    clickable: canClickCell(row, col),
    'my-turn': isMyTurn.value && !value,
    'just-placed': isJustPlaced,
    // Expansion animation classes
    'expansion-new': expansionEdge !== null,
    [`expansion-${expansionEdge}`]: expansionEdge !== null,
    [`expansion-mode-${expansionAnimationMode.value}`]: expansionEdge !== null,
    // Sequential spotlight animation during WIN_REVEAL
    'win-reveal-spotlight': isInRevealPhase.value && isWinner,
    [`spotlight-delay-${winIndex}`]: isInRevealPhase.value && isWinner && winIndex >= 0,
    // Blocked cell appearance (cant-place effects)
    'disabled': (value !== '' || gameOver) && cantPlaceEffects.value.dimmedCells,
    'disabled-patterned': isEmpty && gameOver && cantPlaceEffects.value.stripedPattern,
    'not-playable': blocked && cantPlaceEffects.value.dimmedCells,
    'not-playable-patterned': blocked && cantPlaceEffects.value.stripedPattern,
  }
}

// Check if warning icon should be shown for a cell
function shouldShowWarningIcon(row: number, col: number, value: string): boolean {
  return cantPlaceEffects.value.warningIcon &&
    value === '' &&
    isBlockedCell(row, col) &&
    !winner.value &&
    !isDraw.value
}

// Get symbol component for a cell value
function getSymbolComponent(value: string) {
  return symbolComponents[value] || null
}

// Get motion animation state for a cell
function getCellMotionState(row: number, col: number, cell: string) {
  // Use LOGICAL coordinates for stable comparison across expansion
  const logicalRow = boardOffset.value.row + row
  const logicalCol = boardOffset.value.col + col
  const isJustPlaced = lastPlacedCell.value?.row === logicalRow && lastPlacedCell.value?.col === logicalCol

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
  // Clear expansion animation timer
  if (expansionAnimationTimer.value) {
    clearTimeout(expansionAnimationTimer.value)
  }
})

// Watch for board size/offset changes to detect expansion
watch(
  () => ({
    size: gameState.value?.boardSize,
    offset: gameState.value?.boardOffset,
  }),
  (newState, oldState) => {
    if (!newState.size || !newState.offset) return

    // Initialize previous values if not set
    if (!prevBoardSize.value || !prevBoardOffset.value) {
      prevBoardSize.value = { ...newState.size }
      prevBoardOffset.value = { ...newState.offset }
      return
    }

    // Detect which edges expanded
    // When top/left expands, offset INCREASES (we prepend and shift logical origin)
    // When bottom/right expands, offset stays same but size increases
    const newEdges: ExpandedEdges = {
      top: newState.offset.row > prevBoardOffset.value.row,
      bottom: newState.size.rows > prevBoardSize.value.rows && newState.offset.row <= prevBoardOffset.value.row,
      left: newState.offset.col > prevBoardOffset.value.col,
      right: newState.size.cols > prevBoardSize.value.cols && newState.offset.col <= prevBoardOffset.value.col,
    }

    const hasExpansion = newEdges.top || newEdges.bottom || newEdges.left || newEdges.right

    if (hasExpansion) {
      // NOTE: lastPlacedCell uses LOGICAL coordinates now, so no adjustment needed
      // when board expands - the logical coords stay stable

      // Play board expansion sound
      playSound('boardExpand')

      // Set expanded edges for animation
      expandedEdges.value = newEdges
      isAnimatingExpansion.value = true

      // Clear previous timer
      if (expansionAnimationTimer.value) {
        clearTimeout(expansionAnimationTimer.value)
      }

      // Clear expansion flags after animation
      expansionAnimationTimer.value = setTimeout(() => {
        expandedEdges.value = { top: false, bottom: false, left: false, right: false }
        isAnimatingExpansion.value = false
      }, EXPANSION_ANIMATION_DURATION)
    }

    // Update previous values
    prevBoardSize.value = { ...newState.size }
    prevBoardOffset.value = { ...newState.offset }
  },
  { deep: true }
)

// Watch for WIN_REVEAL phase to play sequential spotlight sounds
watch(isInWinReveal, (inReveal) => {
  if (inReveal && lastRoundWinningCells.value.length > 0) {
    // Play sequential winReveal sounds for each winning cell
    lastRoundWinningCells.value.forEach((_, index) => {
      setTimeout(() => {
        playSound('winReveal')
      }, index * 300) // Match the spotlight-delay timing
    })
  }
})

// Watch for turn changes to play sound
watch(
  () => gameState.value?.currentPlayerIndex,
  (newIndex, oldIndex) => {
    // Only play if turn actually changed (not on initial load)
    if (oldIndex !== undefined && newIndex !== oldIndex && !isGameOver.value) {
      playSound('turnChange')
    }
  }
)

// Watch for game state changes and auto-scroll to latest move
watch(() => gameState.value?.moveHistory?.[0], (latestMove) => {
  if (latestMove) {
    scrollToCell(latestMove.row, latestMove.col)
    // Convert to LOGICAL coordinates for stable animation targeting
    const logicalRow = boardOffset.value.row + latestMove.row
    const logicalCol = boardOffset.value.col + latestMove.col
    lastPlacedCell.value = { row: logicalRow, col: logicalCol }

    // Clear after animation
    setTimeout(() => {
      if (lastPlacedCell.value?.row === logicalRow && lastPlacedCell.value?.col === logicalCol) {
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
            'is-me': player.id === myPlayer?.id,
            'ai-thinking': isAIThinking && currentPlayerIndex === index && player.isAI
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
          <!-- AI Thinking Bubble -->
          <span v-if="isAIThinking && currentPlayerIndex === index && player.isAI" class="ai-thinking-bubble">...</span>
          <div v-if="currentPlayerIndex === index && !winner && !(isAIThinking && player.isAI)" class="turn-indicator">
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
      <!-- NOTE: Results overlay removed - WIN_REVEAL phase shows winning animation,
           then transitions to OnlineResults.vue for winner display and actions -->

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
        <template v-for="(row, rowIndex) in board" :key="`row-${boardOffset.row + rowIndex}`">
          <Motion
            v-for="(cell, colIndex) in row"
            :key="`cell-${boardOffset.row + rowIndex}-${boardOffset.col + colIndex}`"
            tag="button"
            class="cell"
            :class="getCellClasses(rowIndex, colIndex, cell)"
            :style="{ '--expansion-delay': getExpansionAnimationDelay(rowIndex, colIndex) }"
            :data-symbol="cell ? cell.toLowerCase() : undefined"
            :disabled="!canClickCell(rowIndex, colIndex)"
            @click="handleCellClick(rowIndex, colIndex)"
            :initial="{ opacity: 1, scale: 1 }"
            :animate="getCellMotionState(rowIndex, colIndex, cell)"
            :transition="{ duration: 0.3, easing: livelySpringEasing }"
          >
            <!-- Warning icon for blocked cells -->
            <div v-if="shouldShowWarningIcon(rowIndex, colIndex, cell)" class="not-playable-indicator" title="Not playable - Place moves adjacent to existing pieces">
              <AlertIcon :size="16" color="rgba(251, 191, 36, 0.7)" :stroke-width="2" />
            </div>
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

/* AI Thinking State - gentle board-game feel pulse */
.player-chip.ai-thinking {
  border-color: rgba(139, 92, 246, 0.6);
  background: rgba(139, 92, 246, 0.15);
  animation: aiThinkingPulse 1.5s ease-in-out infinite;
}

@keyframes aiThinkingPulse {
  0%, 100% {
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.25);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.35);
    transform: scale(1.02);
  }
}

/* AI Thinking Bubble */
.ai-thinking-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 600;
  color: #c4b5fd;
  letter-spacing: 2px;
  animation: thinkingBubblePulse 1s ease-in-out infinite;
}

@keyframes thinkingBubblePulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
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

/* ============================================================================
   WIN_REVEAL Sequential Spotlight Animation
   Cells flash one-by-one along the winning line, then hold all highlighted
   ============================================================================ */

.cell.win-reveal-spotlight {
  /* Override regular winning animation */
  animation: none;
  /* Start with base winning state, spotlight animation will enhance */
  background: rgba(34, 197, 94, 0.15);
  border-color: var(--color-success);
}

/* Sequential spotlight with staggered delays (0-3 for 4 cells) */
.cell.win-reveal-spotlight.spotlight-delay-0 {
  animation: spotlightFlash 3s ease-out forwards;
  animation-delay: 0ms;
}
.cell.win-reveal-spotlight.spotlight-delay-1 {
  animation: spotlightFlash 3s ease-out forwards;
  animation-delay: 300ms;
}
.cell.win-reveal-spotlight.spotlight-delay-2 {
  animation: spotlightFlash 3s ease-out forwards;
  animation-delay: 600ms;
}
.cell.win-reveal-spotlight.spotlight-delay-3 {
  animation: spotlightFlash 3s ease-out forwards;
  animation-delay: 900ms;
}

@keyframes spotlightFlash {
  0% {
    background: rgba(34, 197, 94, 0.15);
    border-color: var(--color-success);
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
    transform: scale(1);
  }
  /* Flash in - dramatic highlight */
  10% {
    background: rgba(250, 204, 21, 0.4);
    border-color: #fcd34d;
    box-shadow: 0 0 40px rgba(250, 204, 21, 0.6), 0 0 60px rgba(250, 204, 21, 0.3);
    transform: scale(1.12);
  }
  /* Settle back slightly but stay bright */
  25% {
    background: rgba(250, 204, 21, 0.25);
    border-color: #fcd34d;
    box-shadow: 0 0 25px rgba(250, 204, 21, 0.4);
    transform: scale(1.05);
  }
  /* Hold highlighted state */
  100% {
    background: rgba(34, 197, 94, 0.25);
    border-color: var(--color-success);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2);
    transform: scale(1.03);
  }
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

/* ============================================================================
   Blocked Cell Styles (Cant-Place Effects)
   ============================================================================ */

/* Disabled cells - lower opacity */
.cell.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Disabled cells with striped pattern */
.cell.disabled-patterned {
  cursor: not-allowed;
  background:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 5px,
      rgba(71, 85, 105, 0.3) 5px,
      rgba(71, 85, 105, 0.3) 10px
    );
}

/* Not playable cells (not adjacent to filled) - dimmed */
.cell.not-playable {
  background: rgba(10, 15, 30, 0.65);
  opacity: 0.6;
  cursor: not-allowed;
  border-color: rgba(71, 85, 105, 0.25);
}

/* Not playable cells with striped pattern */
.cell.not-playable-patterned {
  background:
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.3),
      rgba(0, 0, 0, 0.3) 5px,
      rgba(71, 85, 105, 0.3) 5px,
      rgba(71, 85, 105, 0.3) 10px
    );
  cursor: not-allowed;
  border-color: rgba(71, 85, 105, 0.25);
}

/* Prevent hover effects on blocked cells */
.cell.not-playable:hover,
.cell.not-playable-patterned:hover {
  transform: none;
  border-color: rgba(71, 85, 105, 0.25);
}

/* Warning indicator for blocked cells */
.not-playable-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  pointer-events: auto;
  cursor: help;
  padding: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ============================================================================
   Expansion Animations (Online Only)
   Option A: Slide Out (default) - new rows/cols slide in from edges
   Option B: Pop In - new tiles pop in with gentle settle
   Option C: Stretch Settle - board stretches and settles
   ============================================================================ */

/* Base styles for new expansion cells */
.cell.expansion-new {
  animation-delay: var(--expansion-delay, 0ms);
  animation-fill-mode: both;
}

/* --------------------------------------------------------------------------
   Option A: Slide Out (Default)
   New rows slide down/up, new columns slide left/right with fade
   -------------------------------------------------------------------------- */
.cell.expansion-mode-A_slideOut.expansion-top {
  animation: slideFromTop 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.cell.expansion-mode-A_slideOut.expansion-bottom {
  animation: slideFromBottom 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.cell.expansion-mode-A_slideOut.expansion-left {
  animation: slideFromLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.cell.expansion-mode-A_slideOut.expansion-right {
  animation: slideFromRight 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideFromTop {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideFromBottom {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideFromLeft {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideFromRight {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

/* --------------------------------------------------------------------------
   Option B: Pop In Tiles
   New tiles scale from 0.85 to 1.0 with gentle overshoot settle
   -------------------------------------------------------------------------- */
.cell.expansion-mode-B_popInTiles.expansion-new {
  animation: popInTile 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popInTile {
  0% {
    transform: scale(0.85);
    opacity: 0;
  }
  60% {
    transform: scale(1.03);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* --------------------------------------------------------------------------
   Option C: Stretch + Settle
   Cells fade in with subtle scale, board stretches via container animation
   -------------------------------------------------------------------------- */
.cell.expansion-mode-C_stretchSettle.expansion-new {
  animation: stretchFadeIn 0.5s ease-out;
}

@keyframes stretchFadeIn {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Board stretch animation for Option C */
.board:has(.expansion-mode-C_stretchSettle.expansion-new) {
  animation: boardStretch 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes boardStretch {
  0% { transform: scale(1); }
  30% { transform: scale(1.03); }
  100% { transform: scale(1); }
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
