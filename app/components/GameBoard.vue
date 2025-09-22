<template>
  <div class="game-board-wrapper">
    <div class="players-list">
      <div v-for="player in players" :key="player.symbol" class="player-wrapper"
        :class="{ active: currentPlayerIndex === players.indexOf(player) && !winner, winner: winner === player.symbol }">
        <div class="player">
          <span class="player-symbol">
            <XIcon v-if="player.symbol === 'X'" :size="28" :stroke-width="4" />
            <OIcon v-else-if="player.symbol === 'O'" :size="28" :stroke-width="4" />
            <SquareIcon v-else-if="player.symbol === 'Square'" :size="28" :stroke-width="4" />
            <StarIcon v-else-if="player.symbol === 'Star'" :size="28" :stroke-width="4" />
          </span>
          <span class="player-name">{{ player.name }}</span>
          <div class="turn-indicator" v-if="currentPlayerIndex === players.indexOf(player) && !winner">
            <span class="turn-arrow">◀</span>
          </div>
          <span v-if="winner === player.symbol" class="winner-badge">Winner!</span>
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
        <span class="info-value">{{ winLength }} in a row</span>
      </div>
    </div>


    <div class="board-container">
      <div class="game-info-overlay" v-if="winner || isDraw">
        <div v-if="winner" class="game-result victory">
          <span class="victory-text">Creative Mastery Achieved!</span>
          <span class="winner-name">{{players.find(p => p.symbol === winner)?.name}} Illuminates the Canvas</span>
        </div>
        <div v-else class="game-result draw">
          <span class="draw-text">Perfect Harmony</span>
          <span class="draw-subtitle">All minds have contributed equally</span>
        </div>
        <div class="game-end-actions">
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
      <div ref="boardElement" class="board" :style="{
        gridTemplateColumns: `repeat(${boardSize.cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${boardSize.rows}, ${cellSize}px)`
      }">
        <template v-for="(row, rowIndex) in board" :key="rowIndex">
          <div v-for="(cell, colIndex) in row" :key="`${rowIndex}-${colIndex}`" class="cell"
            @click="makeMove(rowIndex, colIndex)" :class="{
              'disabled': cell !== '' || winner || isDraw,
              'edge': isEdgeCell(rowIndex, colIndex) && cell === '' && isAdjacentToFilledCell(rowIndex, colIndex),
              'not-playable': cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw
            }">
            <XIcon v-if="cell === 'X'" :size="cellSize * 0.6" :stroke-width="4" />
            <OIcon v-else-if="cell === 'O'" :size="cellSize * 0.6" :stroke-width="4" />
            <SquareIcon v-else-if="cell === 'Square'" :size="cellSize * 0.6" :stroke-width="4" />
            <StarIcon v-else-if="cell === 'Star'" :size="cellSize * 0.6" :stroke-width="4" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import XIcon from './icons/XIcon.vue'
import OIcon from './icons/OIcon.vue'
import SquareIcon from './icons/SquareIcon.vue'
import StarIcon from './icons/StarIcon.vue'
import type { Player } from './StartMenu.vue'

const props = defineProps<{
  players: Player[]
}>()

const emit = defineEmits<{
  backToMenu: []
}>()

type Cell = string
type Board = Cell[][]

const boardSize = ref({ rows: 3, cols: 3 })
const boardOffset = ref({ row: 0, col: 0 })
const board = ref<Board>([['', '', ''], ['', '', ''], ['', '', '']])
const currentPlayerIndex = ref(0)
const winner = ref<string | null>(null)
const boardElement = ref<HTMLElement | null>(null)

// Win condition: 3 in a row for 2 players, 4 in a row for 3+ players
const winLength = computed(() => props.players.length > 2 ? 4 : 3)

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
  return row === 0 || row === boardSize.value.rows - 1 || col === 0 || col === boardSize.value.cols - 1
}

const expandBoard = (row: number, col: number) => {
  const newBoard = [...board.value]

  if (row === 0) {
    newBoard.unshift(Array(boardSize.value.cols).fill(''))
    boardSize.value.rows++
    boardOffset.value.row++
  }

  if (row === boardSize.value.rows - 1) {
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
  if (!board.value[row] || board.value[row][col] !== '' || winner.value || isDraw.value) {
    return
  }

  // Check if the cell is adjacent to an existing piece (or is the first move)
  if (!isAdjacentToFilledCell(row, col)) {
    return
  }

  board.value[row][col] = props.players[currentPlayerIndex.value]?.symbol || ''

  const wasEdgeCell = isEdgeCell(row, col)
  if (wasEdgeCell) {
    expandBoard(row, col)

    // After expansion, adjust scroll to maintain relative position
    await nextTick()
    if (boardElement.value) {
      // If we expanded on the top or left edges, we need to adjust the scroll
      if (row === 0 || col === 0) {
        // Scroll to maintain view of existing content
        const newScrollLeft = col === 0 ? boardElement.value.scrollLeft + cellSize.value + 6 : boardElement.value.scrollLeft
        const newScrollTop = row === 0 ? boardElement.value.scrollTop + cellSize.value + 6 : boardElement.value.scrollTop

        boardElement.value.scrollTo({
          left: newScrollLeft,
          top: newScrollTop,
          behavior: 'auto' // Instant scroll for edge expansion
        })
      }
    }
  }

  checkWinner()

  if (!winner.value && !isDraw.value) {
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % props.players.length
  }
}

const resetGame = async () => {
  board.value = [['', '', ''], ['', '', ''], ['', '', '']]
  boardSize.value = { rows: 3, cols: 3 }
  boardOffset.value = { row: 0, col: 0 }
  currentPlayerIndex.value = 0
  winner.value = null

  // Reset scroll position to center
  await scrollToCenter()
}

// Center the board on mount
onMounted(() => {
  scrollToCenter()
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
</style>