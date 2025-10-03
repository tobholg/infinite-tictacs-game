<template>
  <div class="game-board-wrapper">
    <div class="players-list">
      <div v-for="player in players" :key="player.symbol" class="player-wrapper"
        :class="{
          active: currentPlayerIndex === players.indexOf(player) && !winner && !eliminatedPlayers.has(players.indexOf(player)),
          winner: winner === player.symbol,
          eliminated: eliminatedPlayers.has(players.indexOf(player))
        }">
        <div class="player">
          <span class="player-symbol">
            <XIcon v-if="player.symbol === 'X'" :size="28" :stroke-width="4" />
            <OIcon v-else-if="player.symbol === 'O'" :size="28" :stroke-width="4" />
            <SquareIcon v-else-if="player.symbol === 'Square'" :size="28" :stroke-width="4" />
            <StarIcon v-else-if="player.symbol === 'Star'" :size="28" :stroke-width="4" />
          </span>
          <span class="player-name">{{ player.name }}</span>
          <div class="turn-indicator" v-if="currentPlayerIndex === players.indexOf(player) && !winner && !eliminatedPlayers.has(players.indexOf(player))">
            <span class="turn-arrow">◀</span>
            <!-- Timer display for Speed Mode -->
            <div v-if="props.gameMode === 'speed' && isTimerActive" class="timer-display" :class="{ warning: timerWarning }">
              <div class="timer-circle">
                <svg class="timer-svg" viewBox="0 0 36 36">
                  <path class="timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path class="timer-progress"
                    :style="{ strokeDasharray: `${(timeLeft / props.timeLimit) * 100}, 100` }"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div class="timer-text">{{ timeLeft.toFixed(1) }}</div>
              </div>
            </div>
          </div>
          <span v-if="winner === player.symbol" class="winner-badge">Winner!</span>
          <span v-else-if="eliminatedPlayers.has(players.indexOf(player))" class="eliminated-badge">⚠️ ELIMINATED</span>
        </div>
      </div>
    </div>
    <div class="board-info">
      <div class="info-item">
        <span class="info-label">Board Dimensions:</span>
        <span class="info-value">{{ boardSize.rows }} × {{ boardSize.cols }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Win Condition:</span>
        <span class="info-value">{{ props.gameMode === 'kingofthehill' ? 'Control center area' : winLength + ' in a row' }}</span>
      </div>
      <div class="info-item" v-if="props.gameMode === 'speed'">
        <span class="info-label">Game Mode:</span>
        <span class="info-value">Speed Mode</span>
      </div>
      <div class="info-item" v-if="props.gameMode === 'gravity'">
        <span class="info-label">Game Mode:</span>
        <span class="info-value">Gravity Mode</span>
      </div>
      <div class="info-item" v-if="props.gameMode === 'kingofthehill'">
        <span class="info-label">Game Mode:</span>
        <span class="info-value">King of the Hill</span>
      </div>
    </div>


    <div class="board-container">
      <div class="game-info-overlay" v-if="(winner || isDraw) && !showMapPopup">
        <div v-if="winner" class="game-result victory" :class="{ 'elimination-victory': winReason === 'elimination' }">
          <span v-if="winReason === 'traditional'" class="victory-text">{{players.find(p => p.symbol === winner)?.name}} won <br> {{ winLength }} in a row </span>
          <span v-else-if="winReason === 'elimination'" class="victory-text elimination-text">{{players.find(p => p.symbol === winner)?.name}} won <br> last player alive </span>
          <span v-else class="victory-text">{{players.find(p => p.symbol === winner)?.name}} won</span>
        </div>
        <div v-else class="game-result draw">
          <span class="draw-text">Perfect Harmony</span>
          <span class="draw-subtitle">All minds have contributed equally</span>
        </div>
        <div class="game-end-actions">
          <button @click="showMapPopup = true" class="action-button map-button">
            <span class="button-icon">🗺️</span>
            <span>Explore Map</span>
          </button>
          <button @click="resetGame" class="action-button restart-button">
            <span class="button-icon">🎨</span>
            <span>Restart</span>
          </button>
          <button @click="$emit('backToMenu')" class="action-button menu-button">
            <span class="button-icon">✨</span>
            <span>Start Menu</span>
          </button>
        </div>
      </div>
      <div ref="boardElement" class="board"
        :style="{
          gridTemplateColumns: `repeat(${boardSize.cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${boardSize.rows}, ${cellSize}px)`
        }"
      >
        <!-- Ground line for gravity mode -->
        <div v-if="props.gameMode === 'gravity'" class="ground-line"
          :style="{
            width: `${boardSize.cols * cellSize + (boardSize.cols - 1) * 5}px`,
            bottom: '10px'
          }"
        ></div>

        <!-- Falling piece animation for gravity mode -->
        <div v-if="fallingPiece && props.gameMode === 'gravity'" class="falling-piece"
          :style="{
            left: `${fallingPiece.col * (cellSize + 5)}px`,
            top: `${fallingPiece.fromRow * (cellSize + 5)}px`,
            '--fall-distance': `${(fallingPiece.toRow - fallingPiece.fromRow) * (cellSize + 5)}px`,
            width: `${cellSize}px`,
            height: `${cellSize}px`
          }"
        >
          <XIcon v-if="fallingPiece.symbol === 'X'" :size="cellSize * 0.6" :stroke-width="4" />
          <OIcon v-else-if="fallingPiece.symbol === 'O'" :size="cellSize * 0.6" :stroke-width="4" />
          <SquareIcon v-else-if="fallingPiece.symbol === 'Square'" :size="cellSize * 0.6" :stroke-width="4" />
          <StarIcon v-else-if="fallingPiece.symbol === 'Star'" :size="cellSize * 0.6" :stroke-width="4" />
        </div>
        <template v-for="(row, rowIndex) in board" :key="rowIndex">
          <div v-for="(cell, colIndex) in row" :key="`${rowIndex}-${colIndex}`" class="cell"
            @click="makeMove(rowIndex, colIndex)" :class="{
              'disabled': cell !== '' || winner || isDraw || (props.gameMode === 'gravity' && findLowestAvailableRow(colIndex) === -1),
              'edge': isEdgeCell(rowIndex, colIndex) && cell === '' && isAdjacentToFilledCell(rowIndex, colIndex),
              'not-playable': cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw && props.gameMode !== 'gravity',
              'gravity-landing': isGravityLandingCell(rowIndex, colIndex),
              'gravity-column': isGravityColumnCell(rowIndex, colIndex),
              'ground-cell': props.gameMode === 'gravity' && rowIndex === boardSize.rows - 1,
              'center-area': isCenterAreaCell(rowIndex, colIndex),
              'winning-cell': isWinningCell(rowIndex, colIndex)
            }">
            <!-- Recency heatmap overlay -->
            <div v-if="getRecencyOpacity(rowIndex, colIndex) > 0" class="recency-overlay"
              :style="{ opacity: getRecencyOpacity(rowIndex, colIndex) }">
            </div>
            <XIcon v-if="cell === 'X'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
            <OIcon v-else-if="cell === 'O'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
            <SquareIcon v-else-if="cell === 'Square'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
            <StarIcon v-else-if="cell === 'Star'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
          </div>
        </template>
      </div>
    </div>

    <!-- Map Explorer Popup -->
    <div v-if="showMapPopup" class="map-popup-overlay" @click="showMapPopup = false">
      <div class="map-popup" @click.stop>
        <div class="popup-header">
          <h3 class="popup-title">Board Explorer</h3>
        </div>

        <div class="popup-content">
          <div class="popup-board-container" @wheel="handlePopupWheel" @mousedown="handlePopupMouseDown" @mousemove="handlePopupMouseMove" @mouseup="handlePopupMouseUp" @mouseleave="handlePopupMouseUp">
            <div ref="popupBoardElement" class="popup-board"
              :style="{
                gridTemplateColumns: `repeat(${boardSize.cols}, ${popupCellSize}px)`,
                gridTemplateRows: `repeat(${boardSize.rows}, ${popupCellSize}px)`,
                transform: popupTransform
              }"
            >
              <template v-for="(row, rowIndex) in board" :key="rowIndex">
                <div v-for="(cell, colIndex) in row" :key="`popup-${rowIndex}-${colIndex}`" class="popup-cell" :class="{
                  'popup-winning-cell': getTwoInARowType(rowIndex, colIndex) === 'winning',
                  'popup-x-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'x-three-in-row',
                  'popup-x-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'x-two-in-row',
                  'popup-o-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'o-three-in-row',
                  'popup-o-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'o-two-in-row',
                  'popup-square-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'square-three-in-row',
                  'popup-square-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'square-two-in-row',
                  'popup-star-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'star-three-in-row',
                  'popup-star-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'star-two-in-row'
                }">
                  <XIcon v-if="cell === 'X'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <OIcon v-else-if="cell === 'O'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <SquareIcon v-else-if="cell === 'Square'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <StarIcon v-else-if="cell === 'Star'" :size="popupCellSize * 0.6" :stroke-width="4" />
                </div>
              </template>
            </div>
          </div>

          <div class="popup-controls">
            <div class="popup-inner">
              <div class="control-group">
                <button @click="popupZoomIn" class="action-button zoom-btn" :disabled="popupZoomLevel >= maxZoom" title="Zoom In (+)">
                  <span class="button-icon">🔍+</span>
                </button>
                <button @click="popupZoomOut" class="action-button zoom-btn" :disabled="popupZoomLevel <= minZoom" title="Zoom Out (-)">
                  <span class="button-icon">🔍-</span>
                </button>
                <div class="zoom-display">{{ Math.round(popupZoomLevel * 100) }}%</div>
              </div>
              <div class="control-group">
                <button @click="popupResetView" class="action-button" title="Reset View (0)">
                  <span class="button-icon">🎯</span>
                  <span>Reset</span>
                </button>
                <button @click="popupFitToView" class="action-button" title="Fit to View (F)">
                  <span class="button-icon">🔍</span>
                  <span>Fit</span>
                </button>
                <button @click="colorMapEnabled = !colorMapEnabled" class="action-button" :class="{ 'active': colorMapEnabled }" title="Toggle Color Map">
                  <span class="button-icon">🎨</span>
                  <span>{{ colorMapEnabled ? 'Hide' : 'Show' }} Map</span>
                </button>
                <button @click="showMapPopup = false" class="action-button" title="Exit Explorer (Esc)">
                  <span class="button-icon">✕</span>
                  <span>Exit</span>
                </button>
              </div>
            </div>
            <div class="popup-inner">
              <div class="popup-help">
                <strong>Controls:</strong> Scroll to pan • Ctrl+Scroll to zoom • Drag to pan • +/- to zoom • Arrow keys to pan
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, withDefaults } from 'vue'
import XIcon from './icons/XIcon.vue'
import OIcon from './icons/OIcon.vue'
import SquareIcon from './icons/SquareIcon.vue'
import StarIcon from './icons/StarIcon.vue'
import type { Player } from './StartMenu.vue'

const props = withDefaults(defineProps<{
  players: Player[]
  gameMode?: 'classic' | 'speed' | 'gravity' | 'kingofthehill'
  timeLimit?: number
}>(), {
  gameMode: 'classic',
  timeLimit: 5
})

const emit = defineEmits<{
  backToMenu: []
}>()

type Cell = string
type Board = Cell[][]
type MoveRecord = { row: number; col: number; moveNumber: number }

const boardSize = ref({ rows: 3, cols: 3 })
const boardOffset = ref({ row: 0, col: 0 })
const board = ref<Board>([['', '', ''], ['', '', ''], ['', '', '']])
const currentPlayerIndex = ref(0)
const winner = ref<string | null>(null)
const winningCells = ref<{ row: number; col: number }[]>([])
const boardElement = ref<HTMLElement | null>(null)
const showMapPopup = ref(false)

// Popup-specific variables
const popupBoardElement = ref<HTMLElement | null>(null)
const popupZoomLevel = ref(1)
const popupPanOffset = ref({ x: 0, y: 0 })
const popupIsDragging = ref(false)
const popupLastMousePos = ref({ x: 0, y: 0 })
const colorMapEnabled = ref(false)
const minZoom = 0.3
const maxZoom = 3

// Timer system for Speed Mode
const timeLeft = ref<number>(0)
const timerInterval = ref<number | null>(null)
const isTimerActive = ref(false)
const timerWarning = ref(false)
const timerPrecision = 100 // Update every 100ms for smooth animation
const eliminatedPlayers = ref<Set<number>>(new Set()) // Track eliminated player indices
const winReason = ref<'traditional' | 'elimination' | null>(null) // Track how the game was won

// Gravity animation state
const fallingPiece = ref<{ fromRow: number; toRow: number; col: number; symbol: string } | null>(null)
const isAnimating = ref(false)

// Move history for recency heatmap (last 8 moves)
const moveHistory = ref<MoveRecord[]>([])
const moveCounter = ref(0)

// Win condition: 3 in a row for 2 players, 4 in a row for 3+ players
const winLength = computed(() => props.players.length > 2 ? 4 : 3)

// Popup computed properties
const popupCellSize = computed(() => 60) // Fixed size for popup
const popupTransform = computed(() => {
  return `translate(calc(-50% + ${popupPanOffset.value.x}px), calc(-50% + ${popupPanOffset.value.y}px)) scale(${popupZoomLevel.value})`
})


// Dynamic cell size calculation based on board dimensions
const cellSize = computed(() => {
  const minCellSize = 40 // Minimum cell size in pixels
  const initialCellSize = 80 // Starting cell size for 3x3 board
  const gap = 5 // Gap between cells from CSS
  const padding = 20 // Board padding from CSS (10px * 2)

  // Get viewport dimensions (accounting for padding and margins)
  const maxBoardWidth = window.innerWidth * 0.9 // 90vw from max-width
  const maxBoardHeight = window.innerHeight - 200 // Account for header, info, and players

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


const isDraw = computed(() => {
  return !winner.value && board.value.every(row => row.every(cell => cell !== ''))
})

const hasAnyMoves = computed(() => {
  return board.value.some(row => row.some(cell => cell !== ''))
})

const isAdjacentToFilledCell = (row: number, col: number): boolean => {
  // For the first move, only allow the center cell
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

  for (const dir of directions) {
    const newRow = row + (dir[0] ?? 0)
    const newCol = col + (dir[1] ?? 0)
    if (newRow >= 0 && newRow < boardSize.value.rows &&
      newCol >= 0 && newCol < boardSize.value.cols &&
      board.value[newRow]?.[newCol] !== '') {
      return true
    }
  }

  return false
}

const isEdgeCell = (row: number, col: number): boolean => {
  if (props.gameMode === 'gravity') {
    // In gravity mode, only expand up, left, and right (never down)
    return row === 0 || col === 0 || col === boardSize.value.cols - 1
  }
  return row === 0 || row === boardSize.value.rows - 1 || col === 0 || col === boardSize.value.cols - 1
}

const findLowestAvailableRow = (col: number): number => {
  // In gravity mode, find the lowest (highest row index) available position in the column
  for (let row = boardSize.value.rows - 1; row >= 0; row--) {
    if (board.value[row]?.[col] === '') {
      return row
    }
  }
  return -1 // Column is full
}

const isGravityLandingCell = (row: number, col: number): boolean => {
  if (props.gameMode !== 'gravity' || board.value[row]?.[col] !== '') return false

  // This is where a piece would actually land if dropped in this column
  const landingRow = findLowestAvailableRow(col)
  return landingRow === row
}

const isGravityColumnCell = (row: number, col: number): boolean => {
  if (props.gameMode !== 'gravity' || board.value[row]?.[col] !== '') return false

  // This is any playable cell in a droppable column, but not the landing spot
  const landingRow = findLowestAvailableRow(col)
  return landingRow !== -1 && landingRow !== row
}

// King of the Hill mode functions
const getCenterArea = () => {
  const rows = boardSize.value.rows
  const cols = boardSize.value.cols
  const centerRow = Math.floor(rows / 2)
  const centerCol = Math.floor(cols / 2)

  // Define a 3x3 center area (or smaller if board is small)
  const centerArea = []
  const radius = Math.min(1, Math.floor(Math.min(rows, cols) / 2))

  for (let r = Math.max(0, centerRow - radius); r <= Math.min(rows - 1, centerRow + radius); r++) {
    for (let c = Math.max(0, centerCol - radius); c <= Math.min(cols - 1, centerCol + radius); c++) {
      centerArea.push({ row: r, col: c })
    }
  }

  return centerArea
}

const isCenterAreaCell = (row: number, col: number): boolean => {
  if (props.gameMode !== 'kingofthehill') return false
  const centerArea = getCenterArea()
  return centerArea.some(cell => cell.row === row && cell.col === col)
}

const checkKingOfTheHillWinner = () => {
  const centerArea = getCenterArea()
  const playerCounts: { [symbol: string]: number } = {}

  // Count how many center cells each player controls
  for (const cell of centerArea) {
    const symbol = board.value[cell.row]?.[cell.col]
    if (symbol) {
      playerCounts[symbol] = (playerCounts[symbol] || 0) + 1
    }
  }

  // Check if any player controls more than half of the center area
  const totalCenterCells = centerArea.length
  const requiredCells = Math.ceil(totalCenterCells / 2)

  for (const [symbol, count] of Object.entries(playerCounts)) {
    if (count >= requiredCells) {
      winner.value = symbol
      winReason.value = 'traditional' // We'll use traditional for now
      // Highlight the center area as winning cells
      winningCells.value = centerArea.filter(cell => board.value[cell.row]?.[cell.col] === symbol)
      return
    }
  }
}

const isWinningCell = (row: number, col: number): boolean => {
  return winningCells.value.some(cell => cell.row === row && cell.col === col)
}

const expandBoard = (row: number, col: number) => {
  const newBoard = [...board.value]

  if (row === 0) {
    newBoard.unshift(Array(boardSize.value.cols).fill(''))
    boardSize.value.rows++
    boardOffset.value.row++
    // Update existing move history: all rows shift down by 1
    moveHistory.value.forEach(move => move.row++)
  }

  // In gravity mode, never expand downward (maintain hard ground)
  if (row === boardSize.value.rows - 1 && props.gameMode !== 'gravity') {
    newBoard.push(Array(boardSize.value.cols).fill(''))
    boardSize.value.rows++
  }

  if (col === 0) {
    for (let i = 0; i < newBoard.length; i++) {
      const row = newBoard[i]
      if (row) {
        newBoard[i] = ['', ...row]
      }
    }
    boardSize.value.cols++
    boardOffset.value.col++
    // Update existing move history: all columns shift right by 1
    moveHistory.value.forEach(move => move.col++)
  }

  if (col === boardSize.value.cols - 1) {
    for (let i = 0; i < newBoard.length; i++) {
      const row = newBoard[i]
      if (row) {
        newBoard[i] = [...row, '']
      }
    }
    boardSize.value.cols++
  }

  board.value = newBoard
}

const checkWinner = () => {
  // King of the Hill mode has different win condition
  if (props.gameMode === 'kingofthehill') {
    checkKingOfTheHillWinner()
    return
  }

  // Traditional win condition for other modes
  const rows = boardSize.value.rows
  const cols = boardSize.value.cols
  const len = winLength.value

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = board.value[row]?.[col]
      if (!cell) continue

      // Check horizontal
      if (col <= cols - len) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (board.value[row]?.[col + i] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          winner.value = cell
          winReason.value = 'traditional'
          winningCells.value = Array.from({ length: len }, (_, i) => ({ row, col: col + i }))
          return
        }
      }

      // Check vertical
      if (row <= rows - len) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (board.value[row + i]?.[col] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          winner.value = cell
          winReason.value = 'traditional'
          winningCells.value = Array.from({ length: len }, (_, i) => ({ row: row + i, col }))
          return
        }
      }

      // Check diagonal (top-left to bottom-right)
      if (row <= rows - len && col <= cols - len) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (board.value[row + i]?.[col + i] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          winner.value = cell
          winReason.value = 'traditional'
          winningCells.value = Array.from({ length: len }, (_, i) => ({ row: row + i, col: col + i }))
          return
        }
      }

      // Check diagonal (top-right to bottom-left)
      if (row <= rows - len && col >= len - 1) {
        let match = true
        for (let i = 1; i < len; i++) {
          if (board.value[row + i]?.[col - i] !== cell) {
            match = false
            break
          }
        }
        if (match) {
          winner.value = cell
          winReason.value = 'traditional'
          winningCells.value = Array.from({ length: len }, (_, i) => ({ row: row + i, col: col - i }))
          return
        }
      }
    }
  }
}

const scrollToCenter = async () => {
  await nextTick()
  if (boardElement.value) {
    const boardRect = boardElement.value.getBoundingClientRect()
    const scrollLeft = (boardElement.value.scrollWidth - boardRect.width) / 2
    const scrollTop = (boardElement.value.scrollHeight - boardRect.height) / 2

    boardElement.value.scrollTo({
      left: scrollLeft,
      top: scrollTop,
      behavior: 'smooth'
    })
  }
}

const makeMove = async (row: number, col: number) => {
  if (winner.value || isDraw.value || isAnimating.value) {
    return
  }

  let targetRow = row
  let targetCol = col

  if (props.gameMode === 'gravity') {
    // In gravity mode, handle board expansion first if needed
    let needsExpansion = false
    let expandCol = col

    if (col === 0) {
      // Expand left
      expandBoard(row, col)
      expandCol = col + 1 // Adjust column after left expansion
      needsExpansion = true
    } else if (col === boardSize.value.cols - 1) {
      // Expand right
      expandBoard(row, col)
      expandCol = col // Column stays the same for right expansion
      needsExpansion = true
    } else if (row === 0) {
      // Expand up
      expandBoard(row, col)
      expandCol = col
      needsExpansion = true
    }

    // After potential expansion, find where piece falls to ground
    targetRow = findLowestAvailableRow(expandCol)
    if (targetRow === -1) {
      return // Column is full
    }
    targetCol = expandCol

    // Start falling animation
    const fromRow = needsExpansion && row === 0 ? 0 : row
    const symbol = props.players[currentPlayerIndex.value]?.symbol || ''

    fallingPiece.value = {
      fromRow,
      toRow: targetRow,
      col: targetCol,
      symbol
    }
    isAnimating.value = true

    // Wait for animation to complete, then place the piece
    await new Promise(resolve => setTimeout(resolve, 600)) // Animation duration

    board.value[targetRow][targetCol] = symbol
    fallingPiece.value = null
    isAnimating.value = false

    // Handle scroll adjustment if we expanded
    if (needsExpansion) {
      await nextTick()
      if (boardElement.value) {
        if (col === 0) {
          // Adjust scroll for left expansion
          const newScrollLeft = boardElement.value.scrollLeft + cellSize.value + 6
          boardElement.value.scrollTo({
            left: newScrollLeft,
            top: boardElement.value.scrollTop,
            behavior: 'auto'
          })
        } else if (row === 0) {
          // Adjust scroll for top expansion
          const newScrollTop = boardElement.value.scrollTop + cellSize.value + 6
          boardElement.value.scrollTo({
            left: boardElement.value.scrollLeft,
            top: newScrollTop,
            behavior: 'auto'
          })
        }
      }
    }
  } else {
    // Classic/Speed mode logic
    if (!board.value[row] || board.value[row][col] !== '') {
      return
    }

    // Check if the cell is adjacent to an existing piece (or is the first move)
    if (!isAdjacentToFilledCell(row, col)) {
      return
    }

    board.value[targetRow][targetCol] = props.players[currentPlayerIndex.value]?.symbol || ''

    const wasEdgeCell = isEdgeCell(targetRow, targetCol)
    if (wasEdgeCell) {
      // Track if we're expanding at top or left edge (coordinates will shift)
      const expandedAtTop = targetRow === 0
      const expandedAtLeft = targetCol === 0

      expandBoard(targetRow, targetCol)

      // Update target coordinates to reflect post-expansion position
      if (expandedAtTop) {
        targetRow++
      }
      if (expandedAtLeft) {
        targetCol++
      }

      // After expansion, adjust scroll to maintain relative position
      await nextTick()
      if (boardElement.value) {
        // If we expanded on the top or left edges, we need to adjust the scroll
        if (expandedAtTop || expandedAtLeft) {
          // Scroll to maintain view of existing content
          const newScrollLeft = expandedAtLeft ? boardElement.value.scrollLeft + cellSize.value + 6 : boardElement.value.scrollLeft
          const newScrollTop = expandedAtTop ? boardElement.value.scrollTop + cellSize.value + 6 : boardElement.value.scrollTop

          boardElement.value.scrollTo({
            left: newScrollLeft,
            top: newScrollTop,
            behavior: 'auto' // Instant scroll for edge expansion
          })
        }
      }
    }
  }

  // Track move in history for recency heatmap
  moveCounter.value++
  moveHistory.value.unshift({
    row: targetRow,
    col: targetCol,
    moveNumber: moveCounter.value
  })
  // Keep only last 8 moves
  if (moveHistory.value.length > 8) {
    moveHistory.value = moveHistory.value.slice(0, 8)
  }

  checkWinner()

  if (!winner.value && !isDraw.value) {
    console.log('🎮 Move complete, advancing to next player')
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % props.players.length
    // Start timer for next player in Speed Mode
    if (props.gameMode === 'speed') {
      console.log('⏰ Starting timer for next player after move')
      startTimer()
    }
  } else {
    // Game ended, clear timer
    console.log('🏆 Game ended, clearing timer')
    clearTimer()
  }
}

// Color map detection functions
const getTwoInARowType = (row: number, col: number): string => {
  if (!colorMapEnabled.value) return 'normal'

  const cell = board.value[row]?.[col]
  if (!cell) return 'normal' // Empty cell

  // Check if this cell is part of any winning sequence (highest priority)
  if (isWinningCell(row, col)) return 'winning'

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1]   // diagonal down-left
  ]

  let maxSequenceLength = 1

  for (const [dr, dc] of directions) {
    // Check for sequences in both directions from this cell
    const sequence = []

    // Check backwards
    for (let i = -1; i >= -(winLength.value - 1); i--) {
      const r = row + i * (dr ?? 0)
      const c = col + i * (dc ?? 0)
      if (r >= 0 && r < boardSize.value.rows && c >= 0 && c < boardSize.value.cols) {
        const cellValue = board.value[r]?.[c]
        if (cellValue && cellValue === cell) {
          sequence.unshift({ r, c, value: cellValue })
        } else {
          break
        }
      } else {
        break
      }
    }

    // Add current cell
    sequence.push({ r: row, c: col, value: cell })

    // Check forwards
    for (let i = 1; i < winLength.value; i++) {
      const r = row + i * (dr ?? 0)
      const c = col + i * (dc ?? 0)
      if (r >= 0 && r < boardSize.value.rows && c >= 0 && c < boardSize.value.cols) {
        const cellValue = board.value[r]?.[c]
        if (cellValue && cellValue === cell) {
          sequence.push({ r, c, value: cellValue })
        } else {
          break
        }
      } else {
        break
      }
    }

    // Track the longest sequence found
    maxSequenceLength = Math.max(maxSequenceLength, sequence.length)
  }

  // Return player-specific sequence types
  if (maxSequenceLength >= 3) {
    return `${cell.toLowerCase()}-three-in-row` // Player-specific near-winning
  } else if (maxSequenceLength === 2) {
    return `${cell.toLowerCase()}-two-in-row`   // Player-specific strategic
  }

  return 'normal'
}

// Recency heatmap functions
const getRecencyOpacity = (row: number, col: number): number => {
  // Find if this cell is in the move history
  const moveIndex = moveHistory.value.findIndex(
    move => move.row === row && move.col === col
  )

  if (moveIndex === -1) return 0 // Not in recent moves

  // Calculate opacity: most recent (index 0) = 0.8, oldest = 0.1
  // Linear gradient from 0.1 to 0.8
  const historyLength = moveHistory.value.length
  const recencyScore = (historyLength - moveIndex) / historyLength // 1.0 for newest, 0 for oldest
  const opacity = 0.1 + (recencyScore * 0.7) // Range: 0.1 to 0.8

  return opacity
}

// Timer functions for Speed Mode
const startTimer = () => {
  console.log('🕐 Starting timer:', { gameMode: props.gameMode, timeLimit: props.timeLimit })

  if (props.gameMode !== 'speed' || !props.timeLimit) {
    console.log('❌ Timer not started - not in speed mode or no time limit')
    return
  }

  clearTimer()
  timeLeft.value = props.timeLimit
  isTimerActive.value = true
  timerWarning.value = false

  console.log('✅ Timer initialized:', { timeLeft: timeLeft.value, isActive: isTimerActive.value })

  timerInterval.value = setInterval(() => {
    timeLeft.value = Math.max(0, timeLeft.value - (timerPrecision / 1000))

    // Round to 1 decimal place for display
    timeLeft.value = Math.round(timeLeft.value * 10) / 10

    if (timeLeft.value <= 0.1) {
      console.log(`⏰ Timer tick: ${timeLeft.value.toFixed(1)}s remaining`)
    }

    // Show warning when 2 seconds or less (better for fast timers)
    timerWarning.value = timeLeft.value <= 2

    if (timeLeft.value <= 0) {
      console.log('⏰ Time\'s up! Auto-advancing to next player')
      // Time's up - auto-advance to next player
      handleTimeUp()
    }
  }, timerPrecision) as any
}

const clearTimer = () => {
  console.log('🔄 Clearing timer')
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  isTimerActive.value = false
  timerWarning.value = false
}

const handleTimeUp = () => {
  console.log('⏰ Handling time up - PLAYER LOSES!')
  clearTimer()

  // Current player loses due to timeout
  if (!winner.value && !isDraw.value) {
    const currentPlayer = props.players[currentPlayerIndex.value]
    console.log(`💀 ${currentPlayer?.name} (${currentPlayer?.symbol}) LOST due to timeout!`)

    // Set the current player as eliminated/loser
    eliminatePlayer(currentPlayerIndex.value)

    // Check if we have a winner (last player standing)
    checkForWinnerByElimination()

    // If game continues, advance to next player
    if (!winner.value && !isDraw.value) {
      currentPlayerIndex.value = getNextActivePlayerIndex()
      startTimer() // Start timer for next player
    }
  }
}

// Player elimination functions
const eliminatePlayer = (playerIndex: number) => {
  console.log(`🚫 Eliminating player ${playerIndex}: ${props.players[playerIndex]?.name}`)
  eliminatedPlayers.value.add(playerIndex)
}

const getActivePlayers = () => {
  return props.players.filter((_, index) => !eliminatedPlayers.value.has(index))
}

const getNextActivePlayerIndex = (): number => {
  let nextIndex = (currentPlayerIndex.value + 1) % props.players.length

  // Find next non-eliminated player
  const startIndex = nextIndex
  while (eliminatedPlayers.value.has(nextIndex)) {
    nextIndex = (nextIndex + 1) % props.players.length
    // Prevent infinite loop
    if (nextIndex === startIndex) {
      break
    }
  }

  return nextIndex
}

const checkForWinnerByElimination = () => {
  const activePlayers = getActivePlayers()
  console.log(`🎯 Active players remaining: ${activePlayers.length}`)

  if (activePlayers.length === 1) {
    // Last player standing wins
    const winnerPlayer = activePlayers[0]
    if (winnerPlayer) {
      winner.value = winnerPlayer.symbol
      winReason.value = 'elimination'
      console.log(`🏆 ${winnerPlayer.name} wins by elimination!`)
    }
  } else if (activePlayers.length === 0) {
    // Shouldn't happen, but handle edge case
    console.log('🤷 No players left - draw?')
  }
}

// Popup navigation functions
const popupZoomIn = () => {
  const newZoom = Math.min(maxZoom, popupZoomLevel.value * 1.25)
  popupZoomLevel.value = newZoom
}

const popupZoomOut = () => {
  const newZoom = Math.max(minZoom, popupZoomLevel.value / 1.25)
  popupZoomLevel.value = newZoom
}

const popupResetView = () => {
  popupZoomLevel.value = 1
  popupPanOffset.value = { x: 0, y: 0 }
  popupIsDragging.value = false
}

const popupFitToView = () => {
  if (!popupBoardElement.value) return

  const containerRect = popupBoardElement.value.parentElement?.getBoundingClientRect()
  if (!containerRect) return

  const boardWidth = boardSize.value.cols * popupCellSize.value
  const boardHeight = boardSize.value.rows * popupCellSize.value

  const scaleX = (containerRect.width - 100) / boardWidth
  const scaleY = (containerRect.height - 100) / boardHeight
  const scale = Math.min(scaleX, scaleY, maxZoom)

  popupZoomLevel.value = Math.max(minZoom, scale)
  popupPanOffset.value = { x: 0, y: 0 }
}

const handlePopupWheel = (event: WheelEvent) => {
  event.preventDefault()
  event.stopPropagation()

  // Simplified zoom detection: Ctrl/Cmd + wheel or shift + wheel for zoom
  const isZoomIntent = event.ctrlKey || event.metaKey || event.shiftKey

  if (isZoomIntent) {
    // Zoom functionality
    const zoomDirection = event.deltaY < 0 ? 1 : -1 // Inverted for natural feel
    const zoomFactor = zoomDirection > 0 ? 1.25 : 0.8
    const newZoom = Math.max(minZoom, Math.min(maxZoom, popupZoomLevel.value * zoomFactor))

    if (newZoom !== popupZoomLevel.value) {
      popupZoomLevel.value = newZoom
    }
  } else {
    // Regular wheel scroll for panning
    const panSpeed = 2
    const deltaX = event.deltaX || 0
    const deltaY = event.deltaY || 0

    popupPanOffset.value = {
      x: popupPanOffset.value.x - (deltaX * panSpeed),
      y: popupPanOffset.value.y - (deltaY * panSpeed)
    }
  }
}

const handlePopupMouseDown = (event: MouseEvent) => {
  popupIsDragging.value = true
  popupLastMousePos.value = { x: event.clientX, y: event.clientY }
}

const handlePopupMouseMove = (event: MouseEvent) => {
  if (!popupIsDragging.value) return

  const deltaX = event.clientX - popupLastMousePos.value.x
  const deltaY = event.clientY - popupLastMousePos.value.y

  popupPanOffset.value = {
    x: popupPanOffset.value.x + deltaX,
    y: popupPanOffset.value.y + deltaY
  }

  popupLastMousePos.value = { x: event.clientX, y: event.clientY }
}

const handlePopupMouseUp = () => {
  popupIsDragging.value = false
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!showMapPopup.value) return

  switch (event.key) {
    case '+':
    case '=':
      event.preventDefault()
      popupZoomIn()
      break
    case '-':
      event.preventDefault()
      popupZoomOut()
      break
    case '0':
      event.preventDefault()
      popupResetView()
      break
    case 'f':
    case 'F':
      event.preventDefault()
      popupFitToView()
      break
    case 'Escape':
      event.preventDefault()
      showMapPopup.value = false
      break
    case 'ArrowUp':
      event.preventDefault()
      popupPanOffset.value = { x: popupPanOffset.value.x, y: popupPanOffset.value.y + 50 }
      break
    case 'ArrowDown':
      event.preventDefault()
      popupPanOffset.value = { x: popupPanOffset.value.x, y: popupPanOffset.value.y - 50 }
      break
    case 'ArrowLeft':
      event.preventDefault()
      popupPanOffset.value = { x: popupPanOffset.value.x + 50, y: popupPanOffset.value.y }
      break
    case 'ArrowRight':
      event.preventDefault()
      popupPanOffset.value = { x: popupPanOffset.value.x - 50, y: popupPanOffset.value.y }
      break
  }
}

const resetGame = async () => {
  board.value = [['', '', ''], ['', '', ''], ['', '', '']]
  boardSize.value = { rows: 3, cols: 3 }
  boardOffset.value = { row: 0, col: 0 }
  currentPlayerIndex.value = 0
  winner.value = null
  winReason.value = null
  winningCells.value = []
  showMapPopup.value = false

  // Reset popup state
  popupZoomLevel.value = 1
  popupPanOffset.value = { x: 0, y: 0 }
  popupIsDragging.value = false
  colorMapEnabled.value = false

  // Reset timer state
  clearTimer()
  timeLeft.value = 0

  // Reset elimination state
  eliminatedPlayers.value.clear()

  // Reset gravity animation state
  fallingPiece.value = null
  isAnimating.value = false

  // Reset move history
  moveHistory.value = []
  moveCounter.value = 0

  // Reset scroll position to center
  await scrollToCenter()
}

// Center the board on mount and add keyboard listener
onMounted(() => {
  console.log('🎯 GameBoard mounted with props:', { gameMode: props.gameMode, timeLimit: props.timeLimit, players: props.players.length })
  scrollToCenter()
  document.addEventListener('keydown', handleKeyDown)

  // Start timer for first player in Speed Mode
  if (props.gameMode === 'speed') {
    console.log('🚀 Starting timer on mount for Speed Mode')
    startTimer()
  } else {
    console.log('⭐ In Classic Mode - no timer needed')
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  clearTimer() // Clean up timer on component unmount
})

// Expose resetGame method for parent component
defineExpose({
  resetGame
})
</script>

<style scoped>
.game-board-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem;
  width: 100vw;
  height: 100vh;
  gap: 1rem;
}

.game-info-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  text-align: center;
  animation: overlayAppear 0.6s ease-out;
  pointer-events: auto;
}

@keyframes overlayAppear {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.7);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.game-result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 2.5rem 3.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95));
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.3),
    0 10px 30px rgba(138, 43, 226, 0.2),
    inset 0 0 40px rgba(255, 255, 255, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.6);
  animation: resultPulse 2s ease-in-out infinite;
}

@keyframes resultPulse {

  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 25px 60px rgba(0, 0, 0, 0.3),
      0 10px 30px rgba(138, 43, 226, 0.2),
      inset 0 0 40px rgba(255, 255, 255, 0.5);
  }

  50% {
    transform: scale(1.02);
    box-shadow:
      0 30px 70px rgba(0, 0, 0, 0.35),
      0 15px 40px rgba(138, 43, 226, 0.25),
      inset 0 0 50px rgba(255, 255, 255, 0.6);
  }
}

.victory-text,
.draw-text {
  font-size: 2.2rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 3px;
  line-height: 1.2;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.victory-text {
  background: linear-gradient(45deg, #ffd700, #ff6ec4, #7873f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% 200%;
  animation: victoryGradient 3s ease infinite;
}

.elimination-text {
  background: linear-gradient(45deg, #ff6b00, #e65100, #ffd54f, #ff9800) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  background-size: 200% 200% !important;
  animation: eliminationGradient 2.5s ease infinite !important;
}

@keyframes victoryGradient {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

@keyframes eliminationGradient {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.elimination-victory {
  background: linear-gradient(135deg, rgba(255, 107, 0, 0.15), rgba(230, 81, 0, 0.12), rgba(255, 255, 255, 0.95)) !important;
  border: 2px solid rgba(255, 107, 0, 0.4) !important;
  box-shadow:
    0 25px 60px rgba(255, 107, 0, 0.2),
    0 10px 30px rgba(230, 81, 0, 0.15),
    inset 0 0 40px rgba(255, 152, 0, 0.1) !important;
}

.winner-name {
  font-size: 1.3rem;
  color: #444;
  font-weight: 600;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

.draw-text {
  background: linear-gradient(90deg, #48dbfb, #0abde3, #006ba6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.draw-subtitle {
  font-size: 1.1rem;
  color: #555;
  font-weight: 400;
  font-style: italic;
  opacity: 0.85;
}

.board-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: calc(100% - 2rem);
  max-width: min(90vw, 900px);
  min-height: 0;
  padding: 1.25rem;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  margin: 0 auto;
}

.board {
  display: grid;
  gap: 5px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(15px);
  padding: 10px;
  border-radius: 18px;
  max-height: calc(100% - 3.5rem);
  max-width: 100%;
  overflow: auto;
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.15),
    inset 0 0 20px rgba(255, 255, 255, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: boardPulse 8s ease-in-out infinite;
  scrollbar-width: thin;
  scrollbar-color: rgba(138, 43, 226, 0.5) rgba(255, 255, 255, 0.15);
}

.board::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.board::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  border: 1px solid rgba(138, 43, 226, 0.08);
  margin: 3px;
}

.board::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.6), rgba(255, 119, 48, 0.6));
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset 0 0 4px rgba(255, 255, 255, 0.2),
    0 0 6px rgba(138, 43, 226, 0.3);
}

.board::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.9), rgba(255, 119, 48, 0.9));
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 0 8px rgba(255, 255, 255, 0.4),
    0 0 12px rgba(138, 43, 226, 0.6);
}

.board::-webkit-scrollbar-thumb:active {
  background: linear-gradient(135deg, rgba(138, 43, 226, 1), rgba(255, 119, 48, 1));
}

.board::-webkit-scrollbar-corner {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

@keyframes boardPulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.01);
  }
}

.cell {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 245, 255, 0.95));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(138, 43, 226, 0.05);
}

.cell::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(138, 43, 226, 0.3), transparent);
  transition: all 0.5s ease;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

.cell:hover:not(.disabled)::before {
  width: 150%;
  height: 150%;
}

.cell:hover:not(.disabled) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(250, 240, 255, 1));
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 5px 15px rgba(138, 43, 226, 0.3),
    0 3px 8px rgba(255, 119, 48, 0.2);
}

.cell.disabled {
  cursor: not-allowed;
  opacity: 0.9;
}

.recency-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(72, 219, 251, 0.9), rgba(138, 43, 226, 0.6));
  pointer-events: none;
  z-index: 1;
  border-radius: 10px;
  animation: recencyPulse 2s ease-in-out infinite;
}

@keyframes recencyPulse {
  0%, 100% {
    transform: scale(0.98);
  }
  50% {
    transform: scale(1);
  }
}

.cell-icon {
  position: relative;
  z-index: 2;
}

.cell.edge:not(.disabled) {
  animation: edgePulse 2s ease-in-out infinite;
  box-shadow:
    inset 0 0 0 3px rgba(76, 215, 80, 0.4),
    0 0 20px rgba(76, 215, 80, 0.2);
}

@keyframes edgePulse {

  0%,
  100% {
    box-shadow:
      inset 0 0 0 3px rgba(76, 215, 80, 0.4),
      0 0 20px rgba(76, 215, 80, 0.2);
  }

  50% {
    box-shadow:
      inset 0 0 0 3px rgba(76, 215, 80, 0.6),
      0 0 30px rgba(76, 215, 80, 0.4);
  }
}

.cell.edge:not(.disabled):hover {
  background: linear-gradient(135deg, rgba(232, 255, 233, 1), rgba(200, 255, 200, 0.9));
  transform: translateY(-3px) scale(1.08);
}

.cell.not-playable {
  background: linear-gradient(135deg, rgba(200, 200, 200, 0.5), rgba(180, 180, 180, 0.4));
  cursor: not-allowed;
  opacity: 0.6;
  border: 1px solid rgba(138, 43, 226, 0.08);
}

.cell.not-playable:hover {
  background: linear-gradient(135deg, rgba(200, 200, 200, 0.3), rgba(180, 180, 180, 0.2));
  transform: none;
  box-shadow: none;
}

/* Gravity landing cells - where pieces will actually land (GREEN) */
.cell.gravity-landing {
  background: linear-gradient(135deg, rgba(76, 215, 80, 0.2), rgba(129, 199, 132, 0.15));
  border: 2px solid rgba(76, 215, 80, 0.6);
  animation: gravityLandingPulse 2s ease-in-out infinite;
  box-shadow:
    0 0 15px rgba(76, 215, 80, 0.3),
    0 3px 8px rgba(129, 199, 132, 0.2);
}

@keyframes gravityLandingPulse {
  0%, 100% {
    border-color: rgba(76, 215, 80, 0.6);
    background: linear-gradient(135deg, rgba(76, 215, 80, 0.2), rgba(129, 199, 132, 0.15));
    box-shadow:
      0 0 15px rgba(76, 215, 80, 0.3),
      0 3px 8px rgba(129, 199, 132, 0.2);
  }
  50% {
    border-color: rgba(76, 215, 80, 0.8);
    background: linear-gradient(135deg, rgba(76, 215, 80, 0.3), rgba(129, 199, 132, 0.25));
    box-shadow:
      0 0 25px rgba(76, 215, 80, 0.5),
      0 5px 12px rgba(129, 199, 132, 0.3);
  }
}

.cell.gravity-landing:hover {
  background: linear-gradient(135deg, rgba(76, 215, 80, 0.4), rgba(129, 199, 132, 0.3));
  border-color: rgba(76, 215, 80, 0.9);
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 0 30px rgba(76, 215, 80, 0.6),
    0 6px 15px rgba(129, 199, 132, 0.4);
}

/* Gravity column cells - other playable cells in column (BLUE) */
.cell.gravity-column {
  background: linear-gradient(135deg, rgba(0, 200, 255, 0.1), rgba(0, 150, 255, 0.05));
  border: 2px dashed rgba(0, 200, 255, 0.4);
  animation: gravityColumnPulse 2s ease-in-out infinite;
}

@keyframes gravityColumnPulse {
  0%, 100% {
    border-color: rgba(0, 200, 255, 0.4);
    background: linear-gradient(135deg, rgba(0, 200, 255, 0.1), rgba(0, 150, 255, 0.05));
  }
  50% {
    border-color: rgba(0, 200, 255, 0.7);
    background: linear-gradient(135deg, rgba(0, 200, 255, 0.2), rgba(0, 150, 255, 0.1));
  }
}

.cell.gravity-column:hover {
  background: linear-gradient(135deg, rgba(0, 200, 255, 0.3), rgba(0, 150, 255, 0.2));
  border-color: rgba(0, 200, 255, 0.8);
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 5px 15px rgba(0, 200, 255, 0.4),
    0 3px 8px rgba(0, 150, 255, 0.3);
}

/* Ground line for gravity mode */
.ground-line {
  position: absolute;
  height: 4px;
  background: linear-gradient(90deg, #8B4513, #D2691E, #8B4513);
  border-radius: 2px;
  box-shadow:
    0 2px 8px rgba(139, 69, 19, 0.6),
    0 4px 16px rgba(139, 69, 19, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  z-index: 1000;
  animation: groundGlow 3s ease-in-out infinite;
}

@keyframes groundGlow {
  0%, 100% {
    box-shadow:
      0 2px 8px rgba(139, 69, 19, 0.6),
      0 4px 16px rgba(139, 69, 19, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow:
      0 3px 12px rgba(139, 69, 19, 0.8),
      0 6px 20px rgba(139, 69, 19, 0.5),
      inset 0 2px 4px rgba(255, 255, 255, 0.4);
  }
}

/* Ground-level cells styling */
.cell.ground-cell {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.15), rgba(210, 105, 30, 0.1)) !important;
  border-bottom: 3px solid rgba(139, 69, 19, 0.8) !important;
  box-shadow:
    0 3px 8px rgba(139, 69, 19, 0.4),
    inset 0 -2px 4px rgba(139, 69, 19, 0.2) !important;
}

.cell.ground-cell.gravity-landing {
  background: linear-gradient(135deg, rgba(76, 215, 80, 0.3), rgba(139, 69, 19, 0.15)) !important;
  border: 2px solid rgba(76, 215, 80, 0.6) !important;
  border-bottom: 3px solid rgba(139, 69, 19, 0.8) !important;
  box-shadow:
    0 0 15px rgba(76, 215, 80, 0.4),
    0 3px 8px rgba(139, 69, 19, 0.4),
    inset 0 -2px 4px rgba(139, 69, 19, 0.2) !important;
}

.cell.ground-cell.gravity-column {
  background: linear-gradient(135deg, rgba(0, 200, 255, 0.2), rgba(139, 69, 19, 0.15)) !important;
  border: 2px dashed rgba(0, 200, 255, 0.6) !important;
  border-bottom: 3px solid rgba(139, 69, 19, 0.8) !important;
}

.board-info {
  display: flex;
  gap: 2.5rem;
  justify-content: center;
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.12));
  backdrop-filter: blur(15px);
  border-radius: 14px;
  flex-shrink: 0;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.info-value {
  font-size: 1rem;
  color: white;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(138, 43, 226, 0.3);
}

.players-list {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: stretch;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  min-height: 72px;
}

.player-wrapper {
  border: 2px solid rgba(200, 200, 200, 0.3);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow:
    0 0 15px rgba(255, 255, 255, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.06);
  min-width: 140px;
}

.player-wrapper.active {
  border-color: rgba(138, 43, 226, 0.7);
  box-shadow:
    0 0 30px rgba(138, 43, 226, 0.4),
    0 0 15px rgba(255, 119, 48, 0.3);
  animation: activeGlow 2s ease-in-out infinite;
}

@keyframes activeGlow {

  0%,
  100% {
    box-shadow:
      0 0 30px rgba(138, 43, 226, 0.4),
      0 0 15px rgba(255, 119, 48, 0.3);
  }

  50% {
    box-shadow:
      0 0 40px rgba(138, 43, 226, 0.6),
      0 0 20px rgba(255, 119, 48, 0.4);
  }
}

.player-wrapper.winner {
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow:
    0 8px 24px rgba(255, 215, 0, 0.2),
    0 4px 12px rgba(255, 165, 0, 0.15);
}

.player-wrapper.eliminated {
  border-color: rgba(200, 200, 200, 0.3);
  opacity: 0.5;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.1),
    inset 0 0 20px rgba(0, 0, 0, 0.1);
  filter: grayscale(0.7);
  animation: eliminatedPulse 2s ease-in-out infinite;
}

@keyframes eliminatedPulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}

.player {
  padding: 0.75rem 1.25rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  position: relative;
  min-height: 52px;
  transition: background 0.3s ease;
}

.player-wrapper.active .player {
  background: linear-gradient(135deg, #fff, rgba(245, 235, 255, 0.95));
  padding-right: 3rem;
}

.player-wrapper.winner .player {
  background: linear-gradient(135deg, #fff, rgba(255, 250, 230, 0.95));
}

.turn-indicator {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.turn-arrow {
  color: #8a2be2;
  font-size: 1.2rem;
  font-weight: bold;
  animation: arrowPulse 1s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(138, 43, 226, 0.3));
}

@keyframes arrowPulse {

  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-3px);
  }
}

.player-symbol {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.player-name {
  font-size: 1rem;
  color: #2c3e50;
  font-weight: 600;
  letter-spacing: 0.3px;
  line-height: 1.2;
  flex: 1;
}

.player-wrapper.active .player-name {
  color: #6c3ab5;
  font-weight: 700;
}

.winner-badge {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: white;
  padding: 0.35rem 0.8rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 700;
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  box-shadow:
    0 3px 12px rgba(255, 215, 0, 0.35),
    inset 0 1px 3px rgba(255, 255, 255, 0.4);
  animation: winnerGlow 1.2s ease-in-out infinite;
  border: 1px solid rgba(255, 255, 255, 0.2);
  line-height: 1;
  display: flex;
  align-items: center;
}

@keyframes winnerGlow {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

.eliminated-badge {
  background: linear-gradient(135deg, #ff6b00, #e65100);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 800;
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  box-shadow:
    0 4px 16px rgba(255, 107, 0, 0.5),
    0 8px 25px rgba(230, 81, 0, 0.3),
    inset 0 1px 3px rgba(255, 255, 255, 0.4);
  animation: eliminatedBadgeGlow 1.2s ease-in-out infinite;
  border: 2px solid rgba(255, 152, 0, 0.6);
  line-height: 1;
  display: flex;
  align-items: center;
  transform: scale(1.05);
}

@keyframes eliminatedBadgeGlow {
  0%, 100% {
    transform: scale(1.05);
    opacity: 0.9;
    box-shadow:
      0 4px 16px rgba(255, 107, 0, 0.5),
      0 8px 25px rgba(230, 81, 0, 0.3),
      inset 0 1px 3px rgba(255, 255, 255, 0.4);
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
    box-shadow:
      0 6px 20px rgba(255, 107, 0, 0.7),
      0 10px 35px rgba(230, 81, 0, 0.5),
      inset 0 2px 4px rgba(255, 255, 255, 0.6);
  }
}

.game-end-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
  animation: slideUp 0.6s ease-out 0.4s both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.action-button {
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.9), rgba(255, 119, 48, 0.9));
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow:
    0 4px 15px rgba(138, 43, 226, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
}

.action-button:hover {
  background: linear-gradient(135deg, rgba(138, 43, 226, 1), rgba(255, 119, 48, 1));
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 6px 20px rgba(138, 43, 226, 0.4),
    0 8px 25px rgba(255, 119, 48, 0.3),
    inset 0 2px 3px rgba(255, 255, 255, 0.3);
}

.action-button:active {
  transform: translateY(0) scale(0.98);
}

.button-icon {
  font-size: 1.2rem;
}

.restart-button {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(129, 199, 132, 0.9));
}

.restart-button:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 1), rgba(129, 199, 132, 1));
  box-shadow:
    0 6px 20px rgba(76, 175, 80, 0.4),
    0 8px 25px rgba(129, 199, 132, 0.3),
    inset 0 2px 3px rgba(255, 255, 255, 0.3);
}

.menu-button {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.9), rgba(255, 119, 48, 0.9));
}

.menu-button:hover {
  background: linear-gradient(135deg, rgba(138, 43, 226, 1), rgba(255, 119, 48, 1));
  box-shadow:
    0 6px 20px rgba(138, 43, 226, 0.4),
    0 8px 25px rgba(255, 119, 48, 0.3),
    inset 0 2px 3px rgba(255, 255, 255, 0.3);
}

.map-button {
  background: linear-gradient(135deg, rgba(72, 219, 251, 0.9), rgba(0, 171, 227, 0.9));
}

.map-button:hover {
  background: linear-gradient(135deg, rgba(72, 219, 251, 1), rgba(0, 171, 227, 1));
  box-shadow:
    0 6px 20px rgba(72, 219, 251, 0.4),
    0 8px 25px rgba(0, 171, 227, 0.3),
    inset 0 2px 3px rgba(255, 255, 255, 0.3);
}

/* Map Overlay Styles */
.map-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.map-popup {
  background: transparent;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.3s ease-out;
}

.popup-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem 2rem;
  background: transparent;
}

.popup-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}


.popup-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 2rem;
  overflow: hidden;
  background: transparent;
}

.popup-board-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(90vw, 800px);
  height: 60vh;
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(15px);
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.15),
    inset 0 0 20px rgba(255, 255, 255, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  cursor: grab;
}

.popup-board-container:active {
  cursor: grabbing;
}

.popup-board {
  display: grid;
  gap: 4px;
  transform-origin: center center;
  transition: none;
  will-change: transform;
  position: absolute;
  top: 50%;
  left: 50%;
}


.popup-cell {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 245, 255, 0.95));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(72, 219, 251, 0.2); /* Cooler border for cells */
  transition: all 0.3s ease;
}

.popup-winning-cell {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 165, 0, 0.8)) !important;
  border-color: #ffd700 !important;
  box-shadow:
    0 0 20px rgba(255, 215, 0, 0.6),
    0 4px 12px rgba(255, 165, 0, 0.4) !important;
  animation: winningGlow 2s ease-in-out infinite;
}

/* X Player Gradients (Red) */
.popup-x-three-in-row {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.95), rgba(176, 42, 55, 0.9)) !important;
  border-color: rgba(220, 53, 69, 0.8) !important;
  box-shadow:
    0 0 25px rgba(220, 53, 69, 0.6),
    0 5px 15px rgba(176, 42, 55, 0.5) !important;
  animation: xThreatGlow 2s ease-in-out infinite;
}

.popup-x-two-in-row {
  background: linear-gradient(135deg, rgba(255, 114, 127, 0.85), rgba(255, 86, 101, 0.75)) !important;
  border-color: rgba(255, 114, 127, 0.7) !important;
  box-shadow:
    0 0 20px rgba(255, 114, 127, 0.5),
    0 4px 12px rgba(255, 86, 101, 0.4) !important;
  animation: xStrategicGlow 2.5s ease-in-out infinite;
}

/* O Player Gradients (Blue) */
.popup-o-three-in-row {
  background: linear-gradient(135deg, rgba(13, 110, 253, 0.95), rgba(10, 88, 202, 0.9)) !important;
  border-color: rgba(13, 110, 253, 0.8) !important;
  box-shadow:
    0 0 25px rgba(13, 110, 253, 0.6),
    0 5px 15px rgba(10, 88, 202, 0.5) !important;
  animation: oThreatGlow 2s ease-in-out infinite;
}

.popup-o-two-in-row {
  background: linear-gradient(135deg, rgba(108, 175, 254, 0.85), rgba(86, 156, 254, 0.75)) !important;
  border-color: rgba(108, 175, 254, 0.7) !important;
  box-shadow:
    0 0 20px rgba(108, 175, 254, 0.5),
    0 4px 12px rgba(86, 156, 254, 0.4) !important;
  animation: oStrategicGlow 2.5s ease-in-out infinite;
}

/* Square Player Gradients (Green) */
.popup-square-three-in-row {
  background: linear-gradient(135deg, rgba(25, 135, 84, 0.95), rgba(20, 108, 67, 0.9)) !important;
  border-color: rgba(25, 135, 84, 0.8) !important;
  box-shadow:
    0 0 25px rgba(25, 135, 84, 0.6),
    0 5px 15px rgba(20, 108, 67, 0.5) !important;
  animation: squareThreatGlow 2s ease-in-out infinite;
}

.popup-square-two-in-row {
  background: linear-gradient(135deg, rgba(116, 198, 157, 0.85), rgba(93, 188, 141, 0.75)) !important;
  border-color: rgba(116, 198, 157, 0.7) !important;
  box-shadow:
    0 0 20px rgba(116, 198, 157, 0.5),
    0 4px 12px rgba(93, 188, 141, 0.4) !important;
  animation: squareStrategicGlow 2.5s ease-in-out infinite;
}

/* Star Player Gradients (Purple) */
.popup-star-three-in-row {
  background: linear-gradient(135deg, rgba(111, 66, 193, 0.95), rgba(89, 53, 154, 0.9)) !important;
  border-color: rgba(111, 66, 193, 0.8) !important;
  box-shadow:
    0 0 25px rgba(111, 66, 193, 0.6),
    0 5px 15px rgba(89, 53, 154, 0.5) !important;
  animation: starThreatGlow 2s ease-in-out infinite;
}

.popup-star-two-in-row {
  background: linear-gradient(135deg, rgba(162, 129, 247, 0.85), rgba(141, 108, 241, 0.75)) !important;
  border-color: rgba(162, 129, 247, 0.7) !important;
  box-shadow:
    0 0 20px rgba(162, 129, 247, 0.5),
    0 4px 12px rgba(141, 108, 241, 0.4) !important;
  animation: starStrategicGlow 2.5s ease-in-out infinite;
}

/* X Player Animations (Red) */
@keyframes xThreatGlow {
  0%, 100% {
    box-shadow:
      0 0 25px rgba(220, 53, 69, 0.6),
      0 5px 15px rgba(176, 42, 55, 0.5);
  }
  50% {
    box-shadow:
      0 0 35px rgba(220, 53, 69, 0.8),
      0 7px 20px rgba(176, 42, 55, 0.7);
  }
}

@keyframes xStrategicGlow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(255, 114, 127, 0.5),
      0 4px 12px rgba(255, 86, 101, 0.4);
  }
  50% {
    box-shadow:
      0 0 30px rgba(255, 114, 127, 0.7),
      0 6px 18px rgba(255, 86, 101, 0.6);
  }
}

/* O Player Animations (Blue) */
@keyframes oThreatGlow {
  0%, 100% {
    box-shadow:
      0 0 25px rgba(13, 110, 253, 0.6),
      0 5px 15px rgba(10, 88, 202, 0.5);
  }
  50% {
    box-shadow:
      0 0 35px rgba(13, 110, 253, 0.8),
      0 7px 20px rgba(10, 88, 202, 0.7);
  }
}

@keyframes oStrategicGlow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(108, 175, 254, 0.5),
      0 4px 12px rgba(86, 156, 254, 0.4);
  }
  50% {
    box-shadow:
      0 0 30px rgba(108, 175, 254, 0.7),
      0 6px 18px rgba(86, 156, 254, 0.6);
  }
}

/* Square Player Animations (Green) */
@keyframes squareThreatGlow {
  0%, 100% {
    box-shadow:
      0 0 25px rgba(25, 135, 84, 0.6),
      0 5px 15px rgba(20, 108, 67, 0.5);
  }
  50% {
    box-shadow:
      0 0 35px rgba(25, 135, 84, 0.8),
      0 7px 20px rgba(20, 108, 67, 0.7);
  }
}

@keyframes squareStrategicGlow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(116, 198, 157, 0.5),
      0 4px 12px rgba(93, 188, 141, 0.4);
  }
  50% {
    box-shadow:
      0 0 30px rgba(116, 198, 157, 0.7),
      0 6px 18px rgba(93, 188, 141, 0.6);
  }
}

/* Star Player Animations (Purple) */
@keyframes starThreatGlow {
  0%, 100% {
    box-shadow:
      0 0 25px rgba(111, 66, 193, 0.6),
      0 5px 15px rgba(89, 53, 154, 0.5);
  }
  50% {
    box-shadow:
      0 0 35px rgba(111, 66, 193, 0.8),
      0 7px 20px rgba(89, 53, 154, 0.7);
  }
}

@keyframes starStrategicGlow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(162, 129, 247, 0.5),
      0 4px 12px rgba(141, 108, 241, 0.4);
  }
  50% {
    box-shadow:
      0 0 30px rgba(162, 129, 247, 0.7),
      0 6px 18px rgba(141, 108, 241, 0.6);
  }
}

@keyframes winningGlow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(255, 215, 0, 0.6),
      0 4px 12px rgba(255, 165, 0, 0.4);
  }
  50% {
    box-shadow:
      0 0 30px rgba(255, 215, 0, 0.8),
      0 6px 18px rgba(255, 165, 0, 0.6);
  }
}
.popup-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
}



.popup-controls {
  display: flex-col;
  align-items: center;
  width: min(90vw, 800px);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(15px);
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.15),
    inset 0 0 20px rgba(255, 255, 255, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  cursor: grab;
  padding: 10px;

}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.zoom-display {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  min-width: 60px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.popup-help {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  flex: 1;
}

/* Zoom button styling - inherits from action-button but with specific tweaks */
.action-button.zoom-btn {
  min-width: 60px;
  padding: 0.6rem 1rem;
}

.action-button.zoom-btn .button-icon {
  font-size: 1rem;
}

/* Active button state for toggle buttons */
.action-button.active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(129, 199, 132, 0.9)) !important;
  border-color: rgba(76, 175, 80, 0.8) !important;
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.4) !important;
}

.action-button.active:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 1), rgba(129, 199, 132, 1)) !important;
  border-color: rgba(76, 175, 80, 1) !important;
}

/* Timer Display Styles */
.timer-display {
  margin-left: 0.75rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-circle {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-svg {
  width: 48px;
  height: 48px;
  transform: rotate(-90deg);
  position: absolute;
  top: 0;
  left: 0;
}

.timer-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 3;
}

.timer-progress {
  fill: none;
  stroke: #4fc3f7;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
  animation: timerPulse 2s ease-in-out infinite;
}

.timer-display.warning .timer-progress {
  stroke: #ff4757;
  animation: timerWarning 0.5s ease-in-out infinite;
}

.timer-text {
  position: relative;
  font-size: 1rem;
  font-weight: 700;
  color: #4fc3f7;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 1;
  transition: color 0.3s ease;
}

.timer-display.warning .timer-text {
  color: #ff4757;
  animation: textWarning 0.5s ease-in-out infinite;
}

@keyframes timerPulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

@keyframes timerWarning {
  0%, 100% {
    stroke: #ff4757;
    opacity: 0.8;
  }
  50% {
    stroke: #ff6b6b;
    opacity: 1;
  }
}

@keyframes textWarning {
  0%, 100% {
    color: #ff4757;
    transform: scale(1);
  }
  50% {
    color: #ff6b6b;
    transform: scale(1.1);
  }
}

/* King of the Hill center area styling */
.cell.center-area {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.15)) !important;
  border: 2px solid rgba(255, 215, 0, 0.6) !important;
  box-shadow:
    0 0 20px rgba(255, 215, 0, 0.4),
    0 4px 12px rgba(255, 165, 0, 0.3),
    inset 0 0 15px rgba(255, 215, 0, 0.1) !important;
  animation: centerAreaPulse 3s ease-in-out infinite;
  position: relative;
}

.cell.center-area::before {
  content: '👑';
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.7rem;
  opacity: 0.8;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.cell.center-area:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.35), rgba(255, 165, 0, 0.25)) !important;
  border-color: rgba(255, 215, 0, 0.8) !important;
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 0 30px rgba(255, 215, 0, 0.6),
    0 6px 18px rgba(255, 165, 0, 0.4),
    inset 0 0 20px rgba(255, 215, 0, 0.15) !important;
}

@keyframes centerAreaPulse {
  0%, 100% {
    border-color: rgba(255, 215, 0, 0.6);
    box-shadow:
      0 0 20px rgba(255, 215, 0, 0.4),
      0 4px 12px rgba(255, 165, 0, 0.3),
      inset 0 0 15px rgba(255, 215, 0, 0.1);
  }
  50% {
    border-color: rgba(255, 215, 0, 0.8);
    box-shadow:
      0 0 30px rgba(255, 215, 0, 0.6),
      0 6px 16px rgba(255, 165, 0, 0.4),
      inset 0 0 20px rgba(255, 215, 0, 0.15);
  }
}

/* Winning cell highlighting */
.cell.winning-cell {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 165, 0, 0.8)) !important;
  border: 3px solid #ffd700 !important;
  box-shadow:
    0 0 25px rgba(255, 215, 0, 0.8),
    0 6px 20px rgba(255, 165, 0, 0.6),
    inset 0 0 20px rgba(255, 255, 255, 0.3) !important;
  animation: winningCellGlow 2s ease-in-out infinite;
  z-index: 10;
  transform: scale(1.05) !important;
}

@keyframes winningCellGlow {
  0%, 100% {
    box-shadow:
      0 0 25px rgba(255, 215, 0, 0.8),
      0 6px 20px rgba(255, 165, 0, 0.6),
      inset 0 0 20px rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow:
      0 0 35px rgba(255, 215, 0, 1),
      0 8px 25px rgba(255, 165, 0, 0.8),
      inset 0 0 25px rgba(255, 255, 255, 0.4);
  }
}

/* Falling piece animation for gravity mode */
.falling-piece {
  position: absolute;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 245, 255, 0.95));
  border-radius: 10px;
  box-shadow:
    0 4px 15px rgba(0, 0, 0, 0.2),
    0 8px 25px rgba(0, 0, 0, 0.1);
  animation: fallDown 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  pointer-events: none;
}

@keyframes fallDown {
  0% {
    transform: translateY(0) scale(1);
    box-shadow:
      0 4px 15px rgba(0, 0, 0, 0.2),
      0 8px 25px rgba(0, 0, 0, 0.1);
  }
  20% {
    transform: translateY(calc(var(--fall-distance) * 0.3)) scale(1.02);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.25),
      0 12px 30px rgba(0, 0, 0, 0.15);
  }
  50% {
    transform: translateY(calc(var(--fall-distance) * 0.7)) scale(1.05);
    box-shadow:
      0 8px 25px rgba(0, 0, 0, 0.3),
      0 16px 40px rgba(0, 0, 0, 0.2);
  }
  80% {
    transform: translateY(calc(var(--fall-distance) * 0.95)) scale(1.08);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.35),
      0 20px 50px rgba(0, 0, 0, 0.25);
  }
  95% {
    transform: translateY(var(--fall-distance)) scale(1.1);
    box-shadow:
      0 12px 35px rgba(0, 0, 0, 0.4),
      0 24px 60px rgba(0, 0, 0, 0.3);
  }
  100% {
    transform: translateY(var(--fall-distance)) scale(1);
    box-shadow:
      0 4px 15px rgba(0, 0, 0, 0.2),
      0 8px 25px rgba(0, 0, 0, 0.1);
  }
}
</style>