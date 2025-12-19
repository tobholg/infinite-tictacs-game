<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Motion } from '@motionone/vue'
import { useOnlineGame } from '~/composables/useOnlineGame'
import { useOnlineSettings } from '~/composables/useOnlineSettings'
import { useSound } from '~/composables/useSound'

import type { Position, PlayerSymbol, Player } from '../../shared/types'
import PlayerTurnBar from './PlayerTurnBar.vue'
import { useTouchBoard } from '~/composables/useTouchBoard'

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

// Handle cell click (from mouse or keyboard, not touch)
function handleCellClick(row: number, col: number) {
  // Ignore synthetic click events that fire after touch on mobile
  // These occur ~300ms after touch events and would bypass double-tap logic
  if (Date.now() - lastTouchTime.value < 500) {
    return
  }

  if (!canClickCell(row, col)) {
    // Play invalid move sound if clicking a blocked cell
    if (board.value[row]?.[col] === '' && !isAdjacentToFilledCell(row, col)) {
      playSound('invalidMove')
    }
    return
  }

  // Clear touch selection when placing
  clearSelection()

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

// Touch Board Support
const {
  zoomLevel,
  panOffset,
  selectedCell,
  isPanning,
  lastTouchTime,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  isSelectedCell,
  clearSelection,
  getBoardTransform
} = useTouchBoard({
  onPlaceRequest: (row: number, col: number) => {
    handleCellClickFromTouch(row, col)
  },
  boardElement,
  cellSize
})

// Separate handler for touch-initiated clicks (bypasses synthetic click check)
function handleCellClickFromTouch(row: number, col: number) {
  if (!canClickCell(row, col)) {
    if (board.value[row]?.[col] === '' && !isAdjacentToFilledCell(row, col)) {
      playSound('invalidMove')
    }
    return
  }

  clearSelection()
  playSound('piecePlaced')

  lastPlacedCell.value = {
    row: boardOffset.value.row + row,
    col: boardOffset.value.col + col
  }

  submitMove(row, col)
  scrollToCell(row, col)
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
    'cell-selected': isSelectedCell(row, col),
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

// Touch event handlers for non-passive listeners
const touchMoveHandler = (e: TouchEvent) => handleTouchMove(e)
const touchStartHandler = (e: TouchEvent) => handleTouchStart(e)
const touchEndHandler = (e: TouchEvent) => handleTouchEnd(e)

// Auto-scroll to center on mount and setup resize listener
onMounted(async () => {
  // Setup viewport resize listener
  if (typeof window !== 'undefined') {
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize, { passive: true })
  }

  // Setup touch event listeners with passive: false to allow preventDefault
  // This is required for proper pinch-zoom handling on mobile
  if (boardElement.value) {
    boardElement.value.addEventListener('touchstart', touchStartHandler, { passive: false })
    boardElement.value.addEventListener('touchmove', touchMoveHandler, { passive: false })
    boardElement.value.addEventListener('touchend', touchEndHandler, { passive: true })
  }

  // Scroll to center
  await scrollToCenter()
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportSize)
  }

  // Remove touch event listeners
  if (boardElement.value) {
    boardElement.value.removeEventListener('touchstart', touchStartHandler)
    boardElement.value.removeEventListener('touchmove', touchMoveHandler)
    boardElement.value.removeEventListener('touchend', touchEndHandler)
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
  <div class="w-full max-w-[720px] flex flex-col items-center gap-3 overflow-visible relative z-[1] p-4 mx-auto">
    <!-- Spectator Banner -->
    <div v-if="isSpectator" class="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-br from-[rgba(99,102,241,0.15)] to-[rgba(139,92,246,0.15)] border border-dashed border-primary rounded-md text-text-secondary text-sm font-medium">
      <span class="text-[1.1em]">&#128065;</span>
      <span>Spectating - Watch only mode</span>
    </div>

    <!-- Error Display -->
    <Motion
      v-if="error"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      class="py-3 px-4 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-md text-[#fca5a5] text-sm text-center"
    >
      {{ error }}
    </Motion>

    <!-- Timeout Notification -->
    <Motion
      v-if="lastTimeoutPlayerName"
      :initial="{ opacity: 0, y: -10, scale: 0.95 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :exit="{ opacity: 0, y: -10 }"
      class="timeout-banner flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-br from-[rgba(251,146,60,0.15)] to-[rgba(234,88,12,0.15)] border border-[rgba(251,146,60,0.4)] rounded-md text-[#fdba74] text-sm font-medium"
    >
      <span class="text-[1.2em]">&#9203;</span>
      <span v-if="lastTimeoutAction === 'skip'">
        {{ lastTimeoutPlayerName }}'s turn was skipped (time ran out)
      </span>
      <span v-else>
        {{ lastTimeoutPlayerName }} ran out of time - game over!
      </span>
    </Motion>

    <!-- Minimalistic Player Turn Bar -->
    <PlayerTurnBar
      :players="gamePlayers"
      :current-player-index="currentPlayerIndex"
      :winner="winner"
      :is-a-i-thinking="isAIThinking"
      :time-left="turnTimeRemaining"
      :show-timer="!!turnTimeRemaining"
    />

    <!-- Board Info -->
    <div class="w-full max-w-[640px] flex flex-wrap justify-center gap-3 text-xs text-text-secondary">
      <span>Board: {{ boardSize.rows }} × {{ boardSize.cols }}</span>
      <span>Win: {{ winLength }} in a row</span>
      <span v-if="isMyTurn && !isGameOver && !isSpectator" class="text-primary font-semibold animate-pulse">Your Turn!</span>
    </div>

    <!-- Game Board -->
    <div class="relative w-full flex justify-center">
      <!-- NOTE: Results overlay removed - WIN_REVEAL phase shows winning animation,
           then transitions to OnlineResults.vue for winner display and actions -->

      <!-- Board Viewport - handles overflow/scrolling -->
      <div class="board-viewport relative w-full max-w-full max-h-[70vh] overflow-auto flex justify-center items-center rounded-lg touch-none">
        <!-- Board Grid - handles transforms (zoom/pan) -->
        <div
          ref="boardElement"
          class="board grid gap-2 bg-bg rounded-lg p-4 border-none relative origin-center select-none transition-transform duration-100 ease-out"
          :class="{ 'is-panning': isPanning }"
          :style="{
            '--cell-size': `${cellSize}px`,
            '--grid-cols': boardSize.cols,
            gridTemplateColumns: `repeat(${boardSize.cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${boardSize.rows}, ${cellSize}px)`,
            boxShadow: 'inset 0 0 18px rgba(0, 217, 255, 0.12), 0 0 26px rgba(0, 217, 255, 0.26), 0 0 46px rgba(0, 217, 255, 0.2)',
            ...getBoardTransform()
          }"
        >
        <template v-for="(row, rowIndex) in board" :key="`row-${boardOffset.row + rowIndex}`">
          <Motion
            v-for="(cell, colIndex) in row"
            :key="`cell-${boardOffset.row + rowIndex}-${boardOffset.col + colIndex}`"
            tag="button"
            class="cell relative aspect-square grid place-items-center rounded-xl bg-[rgba(26,29,53,0.6)] border-2 border-[rgba(0,217,255,0.2)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-visible cursor-default"
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
            <div v-if="shouldShowWarningIcon(rowIndex, colIndex, cell)" class="absolute top-1.5 right-1.5 z-[3] pointer-events-auto cursor-help p-[3px] rounded-full bg-[rgba(0,0,0,0.4)] flex items-center justify-center" title="Not playable - Place moves adjacent to existing pieces">
              <AlertIcon :size="16" color="rgba(251, 191, 36, 0.7)" :stroke-width="2" />
            </div>
            <component
              v-if="cell"
              :is="getSymbolComponent(cell)"
              :size="cellSize * 0.6"
              :stroke-width="4"
              class="grid place-items-center transition-transform duration-300 ease-out"
            />
            <span v-else-if="isPendingCell(rowIndex, colIndex)" class="pending-indicator text-xl text-text-muted">...</span>
          </Motion>
        </template>
      </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="flex justify-center p-3">
      <button class="flex items-center gap-2 py-2 px-4 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-[rgba(239,68,68,0.1)] hover:border-critical hover:text-critical" @click="handleLeave">
        <ExitIcon :size="18" />
        Leave Game
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Touch scrolling support */
.board-viewport {
  -webkit-overflow-scrolling: touch;
}

/* Board panning state */
.board.is-panning {
  cursor: grabbing;
  transition: none;
}

/* Grid glow effect overlay - requires pseudo-element */
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

/* Cell interactive states */
.cell.clickable {
  cursor: pointer;
}

.cell.clickable:hover {
  border-color: var(--neon-cyan);
  background: rgba(0, 217, 255, 0.05);
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.3), inset 0 0 15px rgba(0, 217, 255, 0.1);
  transform: scale(1.05);
}

.cell.my-turn.clickable:hover {
  transform: scale(1.08);
}

/* Selected cell (touch) */
.cell.cell-selected {
  border-color: var(--neon-cyan);
  background: rgba(0, 217, 255, 0.08);
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4), inset 0 0 10px rgba(0, 217, 255, 0.1);
  transform: scale(1.05);
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

/* Winning cell animation */
.cell.winning {
  background: rgba(34, 197, 94, 0.15);
  border-color: var(--color-success);
  animation: winPulse 1s infinite;
}

@keyframes winPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
  50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.5); }
}

/* WIN_REVEAL Sequential Spotlight Animation */
.cell.win-reveal-spotlight {
  animation: none;
  background: rgba(34, 197, 94, 0.15);
  border-color: var(--color-success);
}

.cell.win-reveal-spotlight.spotlight-delay-0 { animation: spotlightFlash 3s ease-out forwards; animation-delay: 0ms; }
.cell.win-reveal-spotlight.spotlight-delay-1 { animation: spotlightFlash 3s ease-out forwards; animation-delay: 300ms; }
.cell.win-reveal-spotlight.spotlight-delay-2 { animation: spotlightFlash 3s ease-out forwards; animation-delay: 600ms; }
.cell.win-reveal-spotlight.spotlight-delay-3 { animation: spotlightFlash 3s ease-out forwards; animation-delay: 900ms; }

@keyframes spotlightFlash {
  0% { background: rgba(34, 197, 94, 0.15); border-color: var(--color-success); box-shadow: 0 0 10px rgba(34, 197, 94, 0.2); transform: scale(1); }
  10% { background: rgba(250, 204, 21, 0.4); border-color: #fcd34d; box-shadow: 0 0 40px rgba(250, 204, 21, 0.6), 0 0 60px rgba(250, 204, 21, 0.3); transform: scale(1.12); }
  25% { background: rgba(250, 204, 21, 0.25); border-color: #fcd34d; box-shadow: 0 0 25px rgba(250, 204, 21, 0.4); transform: scale(1.05); }
  100% { background: rgba(34, 197, 94, 0.25); border-color: var(--color-success); box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2); transform: scale(1.03); }
}

/* Pending cell */
.cell.pending {
  background: rgba(99, 102, 241, 0.1);
  border-style: dashed;
}

/* Just placed animation */
.cell.just-placed {
  animation: cellAppear 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
}

@keyframes cellAppear {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}

/* Blocked Cell Styles */
.cell.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cell.disabled-patterned {
  cursor: not-allowed;
  background: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(71, 85, 105, 0.3) 5px, rgba(71, 85, 105, 0.3) 10px);
}

.cell.not-playable {
  background: rgba(10, 15, 30, 0.65);
  opacity: 0.6;
  cursor: not-allowed;
  border-color: rgba(71, 85, 105, 0.25);
}

.cell.not-playable-patterned {
  background: repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3) 5px, rgba(71, 85, 105, 0.3) 5px, rgba(71, 85, 105, 0.3) 10px);
  cursor: not-allowed;
  border-color: rgba(71, 85, 105, 0.25);
}

.cell.not-playable:hover,
.cell.not-playable-patterned:hover {
  transform: none;
  border-color: rgba(71, 85, 105, 0.25);
}

/* Expansion Animations */
.cell.expansion-new {
  animation-delay: var(--expansion-delay, 0ms);
  animation-fill-mode: both;
}

.cell.expansion-mode-A_slideOut.expansion-top { animation: slideFromTop 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.cell.expansion-mode-A_slideOut.expansion-bottom { animation: slideFromBottom 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.cell.expansion-mode-A_slideOut.expansion-left { animation: slideFromLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.cell.expansion-mode-A_slideOut.expansion-right { animation: slideFromRight 0.5s cubic-bezier(0.22, 1, 0.36, 1); }

@keyframes slideFromTop { 0% { transform: translateY(-100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes slideFromBottom { 0% { transform: translateY(100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes slideFromLeft { 0% { transform: translateX(-100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
@keyframes slideFromRight { 0% { transform: translateX(100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }

.cell.expansion-mode-B_popInTiles.expansion-new { animation: popInTile 0.45s cubic-bezier(0.34, 1.56, 0.64, 1); }

@keyframes popInTile {
  0% { transform: scale(0.85); opacity: 0; }
  60% { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.cell.expansion-mode-C_stretchSettle.expansion-new { animation: stretchFadeIn 0.5s ease-out; }

@keyframes stretchFadeIn {
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

.board:has(.expansion-mode-C_stretchSettle.expansion-new) { animation: boardStretch 0.5s cubic-bezier(0.22, 1, 0.36, 1); }

@keyframes boardStretch {
  0% { transform: scale(1); }
  30% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

/* Pending indicator blink */
.pending-indicator {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Timeout banner animation */
.timeout-banner {
  animation: timeoutPulse 2s ease-in-out;
}

@keyframes timeoutPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
