<template>
  <div class="game-board-wrapper">
    <div class="players-strip-wrapper">
      <div class="players-strip">
        <Motion
          v-for="(player, index) in players"
          :key="player.symbol"
          tag="div"
          class="player-chip"
        :class="{
          active: currentPlayerIndex === index && !winner,
          winner: winner === player.symbol
        }"
        :data-symbol="player.symbol.toLowerCase()"
        :initial="{ opacity: 0, y: 12, scale: 0.92 }"
        :animate="getPlayerChipAnimation(player.symbol, index)"
        :transition="playerChipTransition"
      >
        <span class="player-symbol">
          <XIcon v-if="player.symbol === 'X'" :size="26" :stroke-width="4" />
          <OIcon v-else-if="player.symbol === 'O'" :size="26" :stroke-width="4" />
          <SquareIcon v-else-if="player.symbol === 'Square'" :size="26" :stroke-width="4" />
          <StarIcon v-else-if="player.symbol === 'Star'" :size="26" :stroke-width="4" />
          <TriangleIcon v-else-if="player.symbol === 'Triangle'" :size="26" :stroke-width="4" />
          <DiamondIcon v-else-if="player.symbol === 'Diamond'" :size="26" :stroke-width="4" />
          <CircleIcon v-else-if="player.symbol === 'Circle'" :size="26" :stroke-width="4" />
          <PlusIcon v-else-if="player.symbol === 'Plus'" :size="26" :stroke-width="4" />
          <HeartIcon v-else-if="player.symbol === 'Heart'" :size="26" :stroke-width="4" />
          <PentagonIcon v-else-if="player.symbol === 'Pentagon'" :size="26" :stroke-width="4" />
        </span>
        <span class="player-name">{{ player.name }}</span>
        <div class="turn-indicator" v-if="currentPlayerIndex === index && !winner">
          <span class="turn-indicator-dot"></span>
          <div v-if="hasTimeLimitRule && isTimerActive" class="timer-display" :class="{ warning: timerWarning }">
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
        <span v-if="winner === player.symbol" class="status-tag">Winner</span>
      </Motion>
      </div>
      <Motion
        v-if="showVictoryBadge && (winner || isDraw)"
        tag="div"
        class="victory-badge-chip"
        :initial="{ opacity: 0, y: -10, scale: 0.9 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, scale: 0.9 }"
        :transition="{ duration: 0.4, easing: livelySpringEasing }"
        :style="victoryBadgeStyle"
      >
        <span class="victory-badge-label">{{ victoryBadgeText }}</span>
        <span v-if="winner" class="victory-badge-subtle">{{ players.find(p => p.symbol === winner)?.name || winner }} is celebrating</span>
        <span v-else class="victory-badge-subtle">Balance achieved</span>
      </Motion>
    </div>

    <div class="board-info-row">
      <span>Board: {{ boardSize.rows }} × {{ boardSize.cols }}</span>
      <span>Win: {{ winLength + ' in a row' }}</span>
      <span>Mode: {{ gameModeLabel }}</span>
      <span v-if="activeRulesCount > 0">Rules: {{ activeRulesLabel }}</span>
    </div>

    <div class="board-container">
      <Motion
        v-if="showResultsOverlay && (winner || isDraw) && !showMapPopup"
        class="game-info-overlay"
        :initial="{ opacity: 0, scale: 0.9, y: 24 }"
        :animate="{ opacity: 1, scale: 1, y: 0 }"
        :transition="resultOverlayTransition"
      >
        <div v-if="winner" class="game-result victory">
          <span class="victory-text">{{players.find(p => p.symbol === winner)?.name}} won <br> {{ winLength }} in a row </span>
        </div>
        <div v-else class="game-result draw">
          <span class="draw-text">Perfect Harmony</span>
          <span class="draw-subtitle">All minds have contributed equally</span>
        </div>
        <div class="game-end-actions">
          <Motion
            tag="button"
            @click="showMapPopup = true"
            class="action-button"
            :hover="ctaHoverState"
            :press="ctaPressState"
            :transition="{ duration: 0.25, easing: livelySpringEasing }"
          >
            <MapIcon class="button-icon" :size="18" />
            <span>Explore Map</span>
          </Motion>
          <Motion
            tag="button"
            @click="resetGame"
            class="action-button"
            :hover="ctaHoverState"
            :press="ctaPressState"
            :transition="{ duration: 0.25, easing: livelySpringEasing }"
          >
            <RefreshIcon class="button-icon" :size="18" />
            <span>Restart</span>
          </Motion>
          <Motion
            tag="button"
            @click="$emit('backToMenu')"
            class="action-button"
            :hover="ctaHoverState"
            :press="ctaPressState"
            :transition="{ duration: 0.25, easing: livelySpringEasing }"
          >
            <HomeIcon class="button-icon" :size="18" />
            <span>Start Menu</span>
          </Motion>
        </div>
      </Motion>
      <div
        ref="boardElement"
        class="board"
        :style="boardStyle"
      >
        <template v-if="false">
          <div
            v-for="(row, rowIndex) in board"
            :key="`hex-row-${rowIndex}`"
            class="hex-row"
            :class="{ 'hex-row-offset': rowIndex % 2 === 1 }"
          >
            <Motion
              v-for="(cell, colIndex) in row"
              :key="`${rowIndex}-${colIndex}`"
              tag="div"
              class="cell"
              @click="makeMove(rowIndex, colIndex)"
              :class="{
                'hex-cell': true,
                'disabled': (cell !== '' || winner || isDraw) && props.cantPlaceEffects.dimmedCells,
                'disabled-patterned': cell === '' && (winner || isDraw) && props.cantPlaceEffects.stripedPattern,
                'edge': isEdgeCell(rowIndex, colIndex) && cell === '' && isAdjacentToFilledCell(rowIndex, colIndex),
                'not-playable': cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw && props.cantPlaceEffects.dimmedCells,
                'not-playable-patterned': cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw && props.cantPlaceEffects.stripedPattern,
                'center-area': isCenterAreaCell(rowIndex, colIndex),
                'winning-cell': isWinningCell(rowIndex, colIndex),
                'cell-filled': cell !== '',
                'cell-just-placed': isLastPlacedCell(rowIndex, colIndex),
                ['cell-' + cell.toLowerCase()]: cell !== '',
                'new-edge-top': isNewEdgeCell(rowIndex, colIndex).direction === 'top',
                'new-edge-bottom': isNewEdgeCell(rowIndex, colIndex).direction === 'bottom',
                'new-edge-left': isNewEdgeCell(rowIndex, colIndex).direction === 'left',
                'new-edge-right': isNewEdgeCell(rowIndex, colIndex).direction === 'right'
              }"
              :data-symbol="cell ? cell.toLowerCase() : undefined"
              :style="{ animationDelay: getNewEdgeCellDelay(rowIndex, colIndex) }"
              :initial="{ opacity: 1, scale: 1 }"
              :animate="getCellMotionState(rowIndex, colIndex, cell)"
              :transition="getCellMotionTransition(rowIndex, colIndex)"
            >
              <div
                v-if="getRecencyData(rowIndex, colIndex)"
                class="recency-overlay"
                :style="{
                  opacity: getRecencyData(rowIndex, colIndex)?.opacity,
                  background: `radial-gradient(circle, ${getRecencyData(rowIndex, colIndex)?.color}DD, ${getRecencyData(rowIndex, colIndex)?.color}99)`
                }"
              ></div>
              <!-- Alert icon for unplayable cells (hex mode) -->
              <div v-if="props.cantPlaceEffects.warningIcon && cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw" class="not-playable-indicator" title="Not playable - Place moves adjacent to existing pieces">
                <AlertIcon :size="16" color="rgba(251, 191, 36, 0.7)" :stroke-width="2" />
              </div>
              <XIcon v-if="cell === 'X'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <OIcon v-else-if="cell === 'O'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <SquareIcon v-else-if="cell === 'Square'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <StarIcon v-else-if="cell === 'Star'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <TriangleIcon v-else-if="cell === 'Triangle'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <DiamondIcon v-else-if="cell === 'Diamond'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <CircleIcon v-else-if="cell === 'Circle'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <PlusIcon v-else-if="cell === 'Plus'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <HeartIcon v-else-if="cell === 'Heart'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <PentagonIcon v-else-if="cell === 'Pentagon'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
            </Motion>
          </div>
        </template>
        <template v-else>
          <template v-for="(row, rowIndex) in board" :key="rowIndex">
            <Motion
              v-for="(cell, colIndex) in row"
              :key="`${rowIndex}-${colIndex}`"
              tag="div"
              class="cell"
              @click="makeMove(rowIndex, colIndex)"
              :class="{
                'disabled': (cell !== '' || winner || isDraw) && props.cantPlaceEffects.dimmedCells,
                'disabled-patterned': cell === '' && (winner || isDraw) && props.cantPlaceEffects.stripedPattern,
                'not-playable': cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw && props.cantPlaceEffects.dimmedCells,
                'not-playable-patterned': cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw && props.cantPlaceEffects.stripedPattern,
                'edge': isEdgeCell(rowIndex, colIndex) && cell === '' && isAdjacentToFilledCell(rowIndex, colIndex),
                'center-area': isCenterAreaCell(rowIndex, colIndex),
                'winning-cell': isWinningCell(rowIndex, colIndex),
                'cell-filled': cell !== '',
                'cell-just-placed': isLastPlacedCell(rowIndex, colIndex),
                ['cell-' + cell.toLowerCase()]: cell !== '',
                'new-edge-top': isNewEdgeCell(rowIndex, colIndex).direction === 'top',
                'new-edge-bottom': isNewEdgeCell(rowIndex, colIndex).direction === 'bottom',
                'new-edge-left': isNewEdgeCell(rowIndex, colIndex).direction === 'left',
                'new-edge-right': isNewEdgeCell(rowIndex, colIndex).direction === 'right'
              }"
              :data-symbol="cell ? cell.toLowerCase() : undefined"
              :style="{ animationDelay: getNewEdgeCellDelay(rowIndex, colIndex) }"
              :initial="{ opacity: 1, scale: 1 }"
              :animate="getCellMotionState(rowIndex, colIndex, cell)"
              :transition="getCellMotionTransition(rowIndex, colIndex)"
            >
              <!-- Recency heatmap overlay -->
              <div
                v-if="getRecencyData(rowIndex, colIndex)"
                class="recency-overlay"
                :style="{
                  opacity: getRecencyData(rowIndex, colIndex)?.opacity,
                  background: `radial-gradient(circle, ${getRecencyData(rowIndex, colIndex)?.color}DD, ${getRecencyData(rowIndex, colIndex)?.color}99)`
                }"
              ></div>
              <!-- Alert icon for unplayable cells (regular grid) -->
              <div v-if="props.cantPlaceEffects.warningIcon && cell === '' && !isAdjacentToFilledCell(rowIndex, colIndex) && !winner && !isDraw" class="not-playable-indicator" title="Not playable - Place moves adjacent to existing pieces">
                <AlertIcon :size="16" color="rgba(251, 191, 36, 0.7)" :stroke-width="2" />
              </div>
              <XIcon v-if="cell === 'X'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <OIcon v-else-if="cell === 'O'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <SquareIcon v-else-if="cell === 'Square'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <StarIcon v-else-if="cell === 'Star'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <TriangleIcon v-else-if="cell === 'Triangle'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <DiamondIcon v-else-if="cell === 'Diamond'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <CircleIcon v-else-if="cell === 'Circle'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <PlusIcon v-else-if="cell === 'Plus'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <HeartIcon v-else-if="cell === 'Heart'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
              <PentagonIcon v-else-if="cell === 'Pentagon'" :size="cellSize * 0.6" :stroke-width="4" class="cell-icon" />
            </Motion>
          </template>
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
                  'popup-star-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'star-two-in-row',
                  'popup-triangle-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'triangle-three-in-row',
                  'popup-triangle-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'triangle-two-in-row',
                  'popup-diamond-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'diamond-three-in-row',
                  'popup-diamond-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'diamond-two-in-row',
                  'popup-circle-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'circle-three-in-row',
                  'popup-circle-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'circle-two-in-row',
                  'popup-plus-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'plus-three-in-row',
                  'popup-plus-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'plus-two-in-row',
                  'popup-heart-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'heart-three-in-row',
                  'popup-heart-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'heart-two-in-row',
                  'popup-pentagon-three-in-row': getTwoInARowType(rowIndex, colIndex) === 'pentagon-three-in-row',
                  'popup-pentagon-two-in-row': getTwoInARowType(rowIndex, colIndex) === 'pentagon-two-in-row'
                }">
                  <XIcon v-if="cell === 'X'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <OIcon v-else-if="cell === 'O'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <SquareIcon v-else-if="cell === 'Square'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <StarIcon v-else-if="cell === 'Star'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <TriangleIcon v-else-if="cell === 'Triangle'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <DiamondIcon v-else-if="cell === 'Diamond'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <CircleIcon v-else-if="cell === 'Circle'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <PlusIcon v-else-if="cell === 'Plus'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <HeartIcon v-else-if="cell === 'Heart'" :size="popupCellSize * 0.6" :stroke-width="4" />
                  <PentagonIcon v-else-if="cell === 'Pentagon'" :size="popupCellSize * 0.6" :stroke-width="4" />
                </div>
              </template>
            </div>
          </div>

          <div class="popup-controls">
            <div class="popup-inner">
              <div class="control-group">
                <button @click="popupZoomIn" class="action-button zoom-btn" :disabled="popupZoomLevel >= maxZoom" title="Zoom In (+)">
                  <ZoomInIcon class="button-icon" :size="18" />
                </button>
                <button @click="popupZoomOut" class="action-button zoom-btn" :disabled="popupZoomLevel <= minZoom" title="Zoom Out (-)">
                  <ZoomOutIcon class="button-icon" :size="18" />
                </button>
                <div class="zoom-display">{{ Math.round(popupZoomLevel * 100) }}%</div>
              </div>
              <div class="control-group">
                <button @click="popupResetView" class="action-button" title="Reset View (0)">
                  <TargetIcon class="button-icon" :size="18" />
                  <span>Reset</span>
                </button>
                <button @click="popupFitToView" class="action-button" title="Fit to View (F)">
                  <FitScreenIcon class="button-icon" :size="18" />
                  <span>Fit</span>
                </button>
                <button @click="colorMapEnabled = !colorMapEnabled" class="action-button" :class="{ 'active': colorMapEnabled }" title="Toggle Color Map">
                  <PaletteIcon class="button-icon" :size="18" />
                  <span>{{ colorMapEnabled ? 'Hide' : 'Show' }} Map</span>
                </button>
                <button @click="showMapPopup = false" class="action-button" title="Exit Explorer (Esc)">
                  <CloseIcon class="button-icon" :size="18" />
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
import { ref, computed, nextTick, onMounted, onUnmounted, withDefaults, watch } from 'vue'
import { Motion } from '@motionone/vue'
import XIcon from './icons/XIcon.vue'
import OIcon from './icons/OIcon.vue'
import SquareIcon from './icons/SquareIcon.vue'
import StarIcon from './icons/StarIcon.vue'
import RefreshIcon from './icons/RefreshIcon.vue'
import MapIcon from './icons/MapIcon.vue'
import HomeIcon from './icons/HomeIcon.vue'
import ZoomInIcon from './icons/ZoomInIcon.vue'
import ZoomOutIcon from './icons/ZoomOutIcon.vue'
import TargetIcon from './icons/TargetIcon.vue'
import FitScreenIcon from './icons/FitScreenIcon.vue'
import PaletteIcon from './icons/PaletteIcon.vue'
import CloseIcon from './icons/CloseIcon.vue'
import AlertIcon from './icons/AlertIcon.vue'
import TriangleIcon from './icons/TriangleIcon.vue'
import DiamondIcon from './icons/DiamondIcon.vue'
import CircleIcon from './icons/CircleIcon.vue'
import PlusIcon from './icons/PlusIcon.vue'
import HeartIcon from './icons/HeartIcon.vue'
import PentagonIcon from './icons/PentagonIcon.vue'
import type { Player, PlayerSymbol } from './StartMenu.vue'
import { useQLearning, type AIDifficulty, PLAYER_SYMBOLS } from '~/composables/useQLearning'
type QBoard = ('' | typeof PLAYER_SYMBOLS[number])[][]

interface CantPlaceEffects {
  dimmedCells: boolean
  stripedPattern: boolean
  warningIcon: boolean
}

const props = withDefaults(defineProps<{
  players: Player[]
  gameMode?: 'classic'
  rules?: string[]  // Stackable rules like ['timeLimit']
  timeLimit?: number
  cantPlaceEffects?: CantPlaceEffects
}>(), {
  gameMode: 'classic',
  rules: () => [],
  timeLimit: 10,
  cantPlaceEffects: () => ({
    dimmedCells: true,
    stripedPattern: false,
    warningIcon: false
  })
})

const emit = defineEmits<{
  backToMenu: []
}>()

// AI Integration
const { getAIMove, loadModelFromStorage } = useQLearning()
const isAIThinking = ref(false)

// Check if current player is AI
const isCurrentPlayerAI = computed(() => {
  const currentPlayer = props.players[currentPlayerIndex.value]
  return currentPlayer?.isAI ?? false
})

// Get current AI difficulty
const currentAIDifficulty = computed((): AIDifficulty => {
  const currentPlayer = props.players[currentPlayerIndex.value]
  return currentPlayer?.aiDifficulty ?? 'medium'
})

// Helper computed properties for checking active rules
const hasTimeLimitRule = computed(() => props.rules?.includes('timeLimit') ?? false)

// Labels for display
const gameModeLabel = computed(() => 'Classic')

const activeRulesCount = computed(() => props.rules?.length ?? 0)

const activeRulesLabel = computed(() => {
  if (hasTimeLimitRule.value) {
    return 'Time Limit'
  }
  return ''
})

type Cell = string
type Board = Cell[][]
type MoveRecord = { row: number; col: number; moveNumber: number; symbol: string }
type RecencyData = { opacity: number; symbol: string; color: string }

const PLAYER_COLOR_MAP: Record<string, string> = {
  X: '#2196F3',      // Blue
  O: '#F44336',      // Red
  Square: '#9C27B0', // Purple
  Star: '#FF9800',   // Orange
  Triangle: '#4CAF50', // Green
  Diamond: '#00BCD4',  // Cyan
  Circle: '#FFEB3B',   // Yellow
  Plus: '#E91E63',     // Pink
  Heart: '#FF5722',    // Deep Orange
  Pentagon: '#795548'  // Brown
}

const boardSize = ref({ rows: 3, cols: 3 })
const boardOffset = ref({ row: 0, col: 0 })
const board = ref<Board>([['', '', ''], ['', '', ''], ['', '', '']])
const currentPlayerIndex = ref(0)
const winner = ref<string | null>(null)
const winningCells = ref<{ row: number; col: number }[]>([])
const winningPlayerName = computed(() => {
  if (!winner.value) return null
  return props.players.find(player => player.symbol === winner.value)?.name ?? null
})

const boardElement = ref<HTMLElement | null>(null)
const showMapPopup = ref(false)
const showVictoryBadge = ref(false)
const showResultsOverlay = ref(false)
const viewportWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1280)
const viewportHeight = ref<number>(typeof window !== 'undefined' ? window.innerHeight : 720)
let overlayRevealTimeout: ReturnType<typeof setTimeout> | null = null
const overlayRevealDelay = 1400

const updateViewportSize = () => {
  if (typeof window === 'undefined') return
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

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

// Move history for recency heatmap (2 * number of players)
const moveHistory = ref<MoveRecord[]>([])
const moveCounter = ref(0)
const recencyHighlightCell = ref<{ row: number; col: number; symbol: PlayerSymbol } | null>(null)

const lastPlacedCell = ref<{ row: number; col: number } | null>(null) // Track last placed cell for animation

// Track which edges were just expanded for entrance animation
const newExpandedEdges = ref<{ top: boolean; bottom: boolean; left: boolean; right: boolean }>({
  top: false, bottom: false, left: false, right: false
})

// Maximum moves to track in history: 2 per player
const maxHistorySize = computed(() => props.players.length * 2)

// Win condition: always 4 in a row
const winLength = computed(() => 4)

const centerAreaCells = computed(() => {
  const rows = boardSize.value.rows
  const cols = boardSize.value.cols
  const centerRow = Math.floor(rows / 2)
  const centerCol = Math.floor(cols / 2)
  const radius = Math.min(1, Math.floor(Math.min(rows, cols) / 2))
  const cells: Array<{ row: number; col: number }> = []

  for (let r = Math.max(0, centerRow - radius); r <= Math.min(rows - 1, centerRow + radius); r++) {
    for (let c = Math.max(0, centerCol - radius); c <= Math.min(cols - 1, centerCol + radius); c++) {
      cells.push({ row: r, col: c })
    }
  }

  return cells
})

const centerAreaCellSet = computed(() => {
  const set = new Set<string>()
  for (const cell of centerAreaCells.value) {
    set.add(`${cell.row}-${cell.col}`)
  }
  return set
})

const recencyDataByCell = computed(() => {
  const highlight = recencyHighlightCell.value
  if (!highlight) {
    return new Map<string, RecencyData>()
  }

  const color = PLAYER_COLOR_MAP[highlight.symbol] ?? '#72DBfB'
  const data: RecencyData = {
    opacity: 0.4,
    symbol: highlight.symbol,
    color
  }

  return new Map<string, RecencyData>([[`${highlight.row}-${highlight.col}`, data]])
})

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
  const maxBoardWidth = viewportWidth.value * 0.9 // 90vw from max-width
  const maxBoardHeight = Math.max(viewportHeight.value - 200, minCellSize) // Account for header, info, and players

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

const boardStyle = computed(() => {
  return {
    '--cell-size': `${cellSize.value}px`,
    gridTemplateColumns: `repeat(${boardSize.value.cols}, ${cellSize.value}px)`,
    gridTemplateRows: `repeat(${boardSize.value.rows}, ${cellSize.value}px)`
  } as Record<string, string>
})


const isDraw = computed(() => {
  return !winner.value && board.value.every(row => row.every(cell => cell !== ''))
})

const victoryBadgeText = computed(() => {
  if (winner.value) {
    return `${winningPlayerName.value ?? winner.value} just won!`
  }
  if (isDraw.value) {
    return "It's a draw!"
  }
  return ''
})

const victoryBadgeAccent = computed(() => {
  if (winner.value) {
    return PLAYER_COLOR_MAP[winner.value] ?? '#fbbf24'
  }
  if (isDraw.value) {
    return '#fbbf24'
  }
  return 'var(--color-accent)'
})

const victoryBadgeStyle = computed(() => ({
  borderColor: victoryBadgeAccent.value,
  boxShadow: `0 15px 35px ${victoryBadgeAccent.value}55`,
  background: `linear-gradient(135deg, ${victoryBadgeAccent.value}26, rgba(15, 23, 42, 0.85))`
}))

const shouldAnimateWinningCells = computed(() => Boolean(winner.value) && !showResultsOverlay.value)

watch([winner, isDraw, showMapPopup], ([winnerVal, isDrawVal, mapOpen]) => {
  if ((winnerVal || isDrawVal) && !mapOpen) {
    showVictoryBadge.value = true
    showResultsOverlay.value = false
    if (overlayRevealTimeout) {
      clearTimeout(overlayRevealTimeout)
      overlayRevealTimeout = null
    }
    overlayRevealTimeout = setTimeout(() => {
      showResultsOverlay.value = true
      showVictoryBadge.value = false
    }, overlayRevealDelay)
  } else {
    showVictoryBadge.value = false
    showResultsOverlay.value = false
    if (overlayRevealTimeout) {
      clearTimeout(overlayRevealTimeout)
      overlayRevealTimeout = null
    }
  }
}, { immediate: true })

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

  // Check all 8 adjacent cells (square grid)
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

const isCenterAreaCell = (row: number, col: number): boolean => {
  return centerAreaCellSet.value.has(`${row}-${col}`)
}

const isWinningCell = (row: number, col: number): boolean => {
  return winningCells.value.some(cell => cell.row === row && cell.col === col)
}

const isLastPlacedCell = (row: number, col: number): boolean => {
  return lastPlacedCell.value?.row === row && lastPlacedCell.value?.col === col
}

// Check if cell is on a newly expanded edge
const isNewEdgeCell = (row: number, col: number): { isNew: boolean; direction: 'top' | 'bottom' | 'left' | 'right' | null } => {
  const edges = newExpandedEdges.value
  if (edges.top && row === 0) return { isNew: true, direction: 'top' }
  if (edges.bottom && row === boardSize.value.rows - 1) return { isNew: true, direction: 'bottom' }
  if (edges.left && col === 0) return { isNew: true, direction: 'left' }
  if (edges.right && col === boardSize.value.cols - 1) return { isNew: true, direction: 'right' }
  return { isNew: false, direction: null }
}

// Get stagger delay for new edge cells (CSS animation-delay)
const getNewEdgeCellDelay = (row: number, col: number): string | undefined => {
  const edgeInfo = isNewEdgeCell(row, col)
  if (!edgeInfo.isNew || !edgeInfo.direction) return undefined

  let staggerIndex = 0
  if (edgeInfo.direction === 'top' || edgeInfo.direction === 'bottom') {
    staggerIndex = col
  } else {
    staggerIndex = row
  }

  return `${staggerIndex * 0.04}s`
}

const livelySpringEasing = 'cubic-bezier(0.22, 1, 0.36, 1)'
const playerChipTransition = { duration: 0.55, easing: livelySpringEasing } as const
const ctaHoverState = { scale: 1.05, y: -2, boxShadow: '0 16px 35px rgba(14, 165, 233, 0.25)' }
const ctaPressState = { scale: 0.95 }
const resultOverlayTransition = { duration: 0.55, easing: livelySpringEasing } as const

const getPlayerChipAnimation = (playerSymbol: PlayerSymbol, playerIndex: number) => {
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

const getCellMotionState = (row: number, col: number, value: string) => {
  const winning = isWinningCell(row, col)
  const justPlaced = isLastPlacedCell(row, col)
  const filled = value !== ''

  if (justPlaced) {
    return {
      opacity: 1,
      scale: [0.85, 1.1, 1],
      rotate: [-4, 0],
      boxShadow: '0 24px 45px rgba(99, 102, 241, 0.35)'
    }
  }

  if (winning && shouldAnimateWinningCells.value) {
    return {
      opacity: 1,
      scale: [1, 1.08, 1],
      boxShadow: '0 20px 55px rgba(34, 197, 94, 0.45)',
      rotate: 0
    }
  }

  if (winning) {
    return {
      opacity: 1,
      scale: 1,
      boxShadow: 'none',
      rotate: 0
    }
  }

  if (filled) {
    return {
      opacity: 1,
      scale: 1,
      boxShadow: 'none',
      rotate: 0
    }
  }

  return {
    opacity: 0.92,
    scale: 1,
    boxShadow: 'none',
    rotate: 0
  }
}

const getCellMotionTransition = (row: number, col: number) => {
  if (isLastPlacedCell(row, col)) {
    return {
      duration: 0.65,
      easing: livelySpringEasing
    }
  }

  if (isWinningCell(row, col) && shouldAnimateWinningCells.value) {
    return {
      duration: 1.1,
      easing: 'ease-in-out',
      repeat: Infinity,
      repeatType: 'mirror'
    }
  }

  return {
    duration: 0.4,
    easing: 'ease-out'
  }
}

const expandBoard = (row: number, col: number) => {
  const newBoard = [...board.value]
  const expandTop = row === 0
  const expandBottom = row === boardSize.value.rows - 1
  const expandLeft = col === 0
  const expandRight = col === boardSize.value.cols - 1

  // Track which edges are being expanded for entrance animation
  newExpandedEdges.value = {
    top: expandTop,
    bottom: expandBottom,
    left: expandLeft,
    right: expandRight
  }

  if (expandTop) {
    newBoard.unshift(Array(boardSize.value.cols).fill(''))
    boardSize.value.rows++
    boardOffset.value.row++
    // Update existing move history: all rows shift down by 1
    moveHistory.value.forEach(move => move.row++)
  }

  if (expandBottom) {
    newBoard.push(Array(boardSize.value.cols).fill(''))
    boardSize.value.rows++
  }

  if (expandLeft) {
    for (let i = 0; i < newBoard.length; i++) {
      const currentRow = newBoard[i]
      if (currentRow) {
        newBoard[i] = ['', ...currentRow]
      }
    }
    boardSize.value.cols++
    boardOffset.value.col++
    // Update existing move history: all columns shift right by 1
    moveHistory.value.forEach(move => move.col++)
  }

  if (expandRight) {
    for (let i = 0; i < newBoard.length; i++) {
      const currentRow = newBoard[i]
      if (currentRow) {
        newBoard[i] = [...currentRow, '']
      }
    }
    boardSize.value.cols++
  }

  board.value = newBoard

  // Clear expanded edges after animation completes
  setTimeout(() => {
    newExpandedEdges.value = { top: false, bottom: false, left: false, right: false }
  }, 600)
}

const checkWinner = () => {
  // Classic mode traditional win condition
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
  if (winner.value || isDraw.value) {
    return
  }

  // Classic mode logic
  if (!board.value[row] || board.value[row][col] !== '') {
    return
  }

  // Check if the cell is adjacent to an existing piece (or is the first move)
  if (!isAdjacentToFilledCell(row, col)) {
    return
  }

  // Determine if the board needs to grow before placing the piece
  const expandTop = row === 0
  const expandBottom = row === boardSize.value.rows - 1
  const expandLeft = col === 0
  const expandRight = col === boardSize.value.cols - 1
  const needsExpansion = expandTop || expandBottom || expandLeft || expandRight

  // Place immediately at the clicked coordinates (pre-expansion)
  const currentRow = board.value[row]
  if (!currentRow) return
  currentRow[col] = props.players[currentPlayerIndex.value]?.symbol || ''

  // Track this cell for animation (pre-expansion coords)
  lastPlacedCell.value = { row, col }
  recencyHighlightCell.value = {
    row,
    col,
    symbol: props.players[currentPlayerIndex.value]?.symbol || 'X'
  }

  if (needsExpansion) {
    expandBoard(row, col)
    await nextTick()

    // Shift tracked coordinates to match the new indices after prepends
    if (expandTop) {
      if (lastPlacedCell.value) lastPlacedCell.value.row++
      if (recencyHighlightCell.value) recencyHighlightCell.value.row++
    }
    if (expandLeft) {
      if (lastPlacedCell.value) lastPlacedCell.value.col++
      if (recencyHighlightCell.value) recencyHighlightCell.value.col++
    }
  }

  // Final target coordinates for this move (post-expansion)
  const targetRow = lastPlacedCell.value?.row ?? row
  const targetCol = lastPlacedCell.value?.col ?? col
  // Clear after animation completes
  setTimeout(() => {
    lastPlacedCell.value = null
  }, 900)

  if (needsExpansion) {
    // After expansion, center viewport on the placed piece (universal for all directions)
    await nextTick()
    if (boardElement.value) {
      // Calculate piece position in pixels (using actual CSS gap of 8px)
      const piecePixelX = targetCol * (cellSize.value + 8)
      const piecePixelY = targetRow * (cellSize.value + 8)

      // Calculate centering scroll position
      const centerX = piecePixelX - (boardElement.value.clientWidth / 2) + (cellSize.value / 2)
      const centerY = piecePixelY - (boardElement.value.clientHeight / 2) + (cellSize.value / 2)

      boardElement.value.scrollTo({
        left: Math.max(0, centerX),
        top: Math.max(0, centerY),
        behavior: 'smooth'
      })
    }
  }

  // Track move in history for recency heatmap
  moveCounter.value++
  moveHistory.value.unshift({
    row: targetRow,
    col: targetCol,
    moveNumber: moveCounter.value,
    symbol: props.players[currentPlayerIndex.value]?.symbol || ''
  })
  // Keep only the configured number of recent moves (2 per player)
  if (moveHistory.value.length > maxHistorySize.value) {
    moveHistory.value = moveHistory.value.slice(0, maxHistorySize.value)
  }

  checkWinner()

  if (!winner.value && !isDraw.value) {
    console.log('Move complete, advancing to next player')
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % props.players.length

    // Start timer for next player if Time Limit rule is active
    if (hasTimeLimitRule.value) {
      console.log('Starting timer for next player after move')
      startTimer()
    }

    // Trigger AI move if next player is AI
    await nextTick()
    triggerAIMoveIfNeeded()
  } else {
    // Game ended, clear timer
    console.log('Game ended, clearing timer')
    clearTimer()
  }
}

// AI Move Logic
async function triggerAIMoveIfNeeded() {
  if (winner.value || isDraw.value) return
  if (!isCurrentPlayerAI.value) return

  isAIThinking.value = true

  // Small delay to make it feel like the AI is "thinking"
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400))

  try {
    // Convert board to Q-Learning format
    const qBoard: QBoard = board.value.map(row =>
      row.map(cell => cell as '' | typeof PLAYER_SYMBOLS[number])
    )

    // Get player symbols in game order
    const playerSymbols = props.players.map(p => p.symbol as typeof PLAYER_SYMBOLS[number])

    // Get AI move
    const move = getAIMove(
      qBoard,
      currentPlayerIndex.value,
      playerSymbols,
      currentAIDifficulty.value
    )

    console.log(`AI (${props.players[currentPlayerIndex.value]?.name}) chose move:`, move)

    // Make the move
    await makeMove(move.row, move.col)
  } catch (e) {
    console.error('AI move error:', e)
  } finally {
    isAIThinking.value = false
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
const getRecencyData = (row: number, col: number): RecencyData | null => {
  const data = recencyDataByCell.value.get(`${row}-${col}`)
  const cellValue = board.value[row]?.[col]

  // Only show recency glow when the cell actually holds the recorded symbol
  if (!data || !cellValue || data.symbol !== cellValue) {
    return null
  }

  return data
}

// Timer functions for Time Limit rule
const startTimer = () => {
  console.log('Starting timer:', { hasTimeLimitRule: hasTimeLimitRule.value, timeLimit: props.timeLimit })

  if (!hasTimeLimitRule.value || !props.timeLimit) {
    console.log('Timer not started - Time Limit rule not active or no time limit set')
    return
  }

  clearTimer()
  timeLeft.value = props.timeLimit
  isTimerActive.value = true
  timerWarning.value = false

  console.log('Timer initialized:', { timeLeft: timeLeft.value, isActive: isTimerActive.value })

  timerInterval.value = setInterval(() => {
    timeLeft.value = Math.max(0, timeLeft.value - (timerPrecision / 1000))

    // Round to 1 decimal place for display
    timeLeft.value = Math.round(timeLeft.value * 10) / 10

    if (timeLeft.value <= 0.1) {
      console.log(`Timer tick: ${timeLeft.value.toFixed(1)}s remaining`)
    }

    // Show warning when 2 seconds or less (better for fast timers)
    timerWarning.value = timeLeft.value <= 2

    if (timeLeft.value <= 0) {
      console.log('Timer expired — auto-advancing to next player')
      // Time's up - auto-advance to next player
      handleTimeUp()
    }
  }, timerPrecision) as any
}

const clearTimer = () => {
  console.log('Clearing timer')
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  isTimerActive.value = false
  timerWarning.value = false
}

const handleTimeUp = () => {
  console.log('Handling time up - current player loses')
  clearTimer()

  // In classic mode with time limit rule, when time runs out the current player loses
  if (!winner.value && !isDraw.value) {
    const currentPlayer = props.players[currentPlayerIndex.value]
    console.log(`${currentPlayer?.name} (${currentPlayer?.symbol}) lost due to timeout`)

    // In a 2-player game, the other player wins
    if (props.players.length === 2) {
      const otherPlayerIndex = currentPlayerIndex.value === 0 ? 1 : 0
      const otherPlayer = props.players[otherPlayerIndex]
      if (otherPlayer) {
        winner.value = otherPlayer.symbol
        console.log(`${otherPlayer.name} wins by timeout!`)
      }
    } else {
      // In 3+ player games, advance to next player (they get another chance)
      // This is a simple approach - the timed-out player doesn't lose the whole game
      currentPlayerIndex.value = (currentPlayerIndex.value + 1) % props.players.length
      console.log('Timeout - advancing to next player')
      startTimer()
    }
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

  // Reset move history
  moveHistory.value = []
  moveCounter.value = 0
  recencyHighlightCell.value = null

  // Reset scroll position to center
  await scrollToCenter()

  // Trigger AI move if first player is AI
  setTimeout(() => {
    triggerAIMoveIfNeeded()
  }, 500)
}

// Center the board on mount and add keyboard listener
onMounted(() => {
  console.log('GameBoard mounted with props:', { gameMode: props.gameMode, timeLimit: props.timeLimit, players: props.players.length })
  scrollToCenter()
  document.addEventListener('keydown', handleKeyDown)

  if (typeof window !== 'undefined') {
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize, { passive: true })
  }

  // Start timer for first player if Time Limit rule is active
  if (hasTimeLimitRule.value) {
    console.log('Starting timer on mount - Time Limit rule is active')
    startTimer()
  } else {
    console.log('Time Limit rule not active - no timer started')
  }

  // Load AI model for the current player count
  const hasAI = props.players.some(p => p.isAI)
  if (hasAI) {
    loadModelFromStorage(props.players.length)
    console.log(`Loaded AI model for ${props.players.length} players`)
  }

  // Trigger AI move if first player is AI
  setTimeout(() => {
    triggerAIMoveIfNeeded()
  }, 500)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportSize)
  }
  clearTimer() // Clean up timer on component unmount
  if (overlayRevealTimeout) {
    clearTimeout(overlayRevealTimeout)
    overlayRevealTimeout = null
  }
})

// Expose resetGame method for parent component
defineExpose({
  resetGame
})
</script>

<style scoped>
.game-board-wrapper {
  width: min(720px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  overflow: visible; /* allow chip glows to render outside wrapper */
  position: relative;
  z-index: 1; /* keep content above global background */
}

.players-strip-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: calc(var(--space-3) + 14px) var(--space-2); /* extra vertical space so chip glows aren't clipped */
  overflow: visible; /* allow active-chip glow to render above without clipping */
}

.players-strip {
  --chip-glow-space: 32px;
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  overflow-y: visible;
  padding: calc(var(--space-2) + 14px) var(--chip-glow-space) calc(var(--space-2) + 14px) var(--chip-glow-space); /* more top/bottom room for glow */
  width: 100%;
  justify-content: center;
  scroll-padding-inline: var(--chip-glow-space);
  scrollbar-gutter: stable both-edges;
  overflow: visible; /* ensure glow not clipped inside strip */
  z-index: 1;
}

.players-strip::before,
.players-strip::after {
  content: '';
  flex: 0 0 var(--chip-glow-space);
}

.victory-badge-chip {
  position: absolute;
  top: -0.35rem;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.9);
  pointer-events: none;
}

.victory-badge-label {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.victory-badge-subtle {
  font-size: 0.72rem;
  opacity: 0.8;
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

.player-chip.eliminated {
  opacity: 0.5;
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
  font-weight: 600;
}

.turn-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-accent);
  font-size: var(--text-xs);
}

.turn-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
}

.timer-display {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-pill);
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  font-size: var(--text-xs);
  font-weight: 600;
}

.timer-display.warning {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}

.timer-circle {
  display: grid;
  place-items: center;
}

.timer-svg {
  width: 26px;
  height: 26px;
}

.timer-bg {
  fill: none;
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 3;
}

.timer-progress {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 3;
  stroke-linecap: round;
}

.timer-text {
  font-size: var(--text-xs);
}

.status-tag {
  font-size: var(--text-xs);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-pill);
  background: rgba(34, 197, 94, 0.14);
  color: #4ade80;
  font-weight: 600;
}

.status-tag.eliminated {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.team-indicator {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.player-chip.team-0 .team-indicator {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.25));
  color: rgb(59, 130, 246);
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.player-chip.team-1 .team-indicator {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.25));
  color: rgb(239, 68, 68);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

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

.fill-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.fill-indicator.can-expand {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(34, 197, 94);
}

.fill-indicator.cannot-expand {
  background: rgba(239, 68, 68, 0.15);
  color: rgb(239, 68, 68);
}

.expand-status {
  font-size: 10px;
}

.board-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.board {
  display: grid;
  gap: 8px;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: none; /* borderless look */
  box-shadow:
    inset 0 0 18px rgba(0, 217, 255, 0.12),
    0 0 26px rgba(0, 217, 255, 0.26),
    0 0 46px rgba(0, 217, 255, 0.2);
  overflow: auto;
  max-height: 70vh;
  position: relative;
}

/* Grid glow effect */
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
  cursor: pointer;
}

.cell:hover:not(.cell-filled):not(.disabled) {
  border-color: var(--neon-cyan);
  background: rgba(0, 217, 255, 0.05);
  box-shadow:
    0 0 15px rgba(0, 217, 255, 0.3),
    inset 0 0 15px rgba(0, 217, 255, 0.1);
  transform: scale(1.05);
}

.cell-filled[data-symbol="x"] {
  background: rgba(0, 217, 255, 0.1);
  border-color: var(--neon-cyan);
  box-shadow: var(--glow-x);
}
.cell-filled[data-symbol="o"] {
  background: rgba(255, 51, 102, 0.1);
  border-color: var(--neon-pink);
  box-shadow: var(--glow-o);
}
.cell-filled[data-symbol="square"] {
  background: rgba(168, 85, 247, 0.1);
  border-color: var(--neon-purple);
  box-shadow: var(--glow-square);
}
.cell-filled[data-symbol="star"] {
  background: rgba(255, 184, 0, 0.1);
  border-color: var(--neon-orange);
  box-shadow: var(--glow-star);
}
.cell-filled[data-symbol="triangle"] {
  background: rgba(0, 255, 159, 0.1);
  border-color: var(--neon-green);
  box-shadow: var(--glow-triangle);
}
.cell-filled[data-symbol="diamond"] {
  background: rgba(33, 150, 243, 0.1);
  border-color: var(--neon-blue);
  box-shadow: var(--glow-diamond);
}
.cell-filled[data-symbol="circle"] {
  background: rgba(255, 235, 59, 0.1);
  border-color: var(--neon-yellow);
  box-shadow: var(--glow-circle);
}
.cell-filled[data-symbol="plus"] {
  background: rgba(244, 67, 54, 0.1);
  border-color: var(--neon-red);
  box-shadow: var(--glow-plus);
}
.cell-filled[data-symbol="heart"] {
  background: rgba(0, 188, 212, 0.1);
  border-color: var(--neon-teal);
  box-shadow: var(--glow-heart);
}
.cell-filled[data-symbol="pentagon"] {
  background: rgba(205, 220, 57, 0.1);
  border-color: var(--neon-lime);
  box-shadow: var(--glow-pentagon);
}

/* Only animate the cell that was just placed */
.cell-just-placed {
  animation: cellAppear 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
}


.cell:not(.disabled):hover {
  border-color: rgba(99, 102, 241, 0.45);
  transform: translateY(-2px);
}

.cell.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cell.disabled-patterned {
  cursor: not-allowed;
  background:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 5px,
      rgba(255, 255, 255, 0.12) 5px,
      rgba(255, 255, 255, 0.12) 10px
    ),
    rgba(10, 15, 30, 0.5);
}

/* Not-playable cell styles - Shaded Overlay option */
.cell.not-playable {
  /* Semi-transparent dark tint overlay */
  background: rgba(10, 15, 30, 0.65);
  opacity: 0.6;
  cursor: not-allowed;
  border-color: rgba(71, 85, 105, 0.25);
  pointer-events: none;
}

/* Not-playable cell styles - Patterned Background option */
.cell.not-playable-patterned {
  background:
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.3),
      rgba(0, 0, 0, 0.3) 5px,
      rgba(255, 255, 255, 0.08) 5px,
      rgba(255, 255, 255, 0.08) 10px
    ),
    rgba(10, 15, 30, 0.6);
  cursor: not-allowed;
  border-color: rgba(71, 85, 105, 0.35);
  pointer-events: none;
}

/* Remove hover effects for not-playable cells */
.cell.not-playable:hover,
.cell.not-playable-patterned:hover {
  transform: none;
  border-color: rgba(71, 85, 105, 0.25);
}

/* Edge cells blocked (expansion not allowed - fill board first) */
.cell.edge-blocked {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  cursor: not-allowed;
  opacity: 0.7;
}

.cell.edge-blocked::after {
  content: '🔒';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  opacity: 0.6;
}

.cell.edge-blocked:hover {
  transform: none;
  border-color: rgba(239, 68, 68, 0.5);
}

/* Alert icon positioning */
.not-playable-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(10, 15, 30, 0.7);
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.cell.gravity-landing {
  border-color: rgba(34, 197, 94, 0.5);
  background: rgba(34, 197, 94, 0.12);
}

.cell.gravity-column {
  border-style: dashed;
  border-color: rgba(14, 165, 233, 0.45);
}

.cell.winning-cell {
  border-color: var(--neon-green);
  background: linear-gradient(135deg, rgba(0, 255, 159, 0.15), rgba(0, 255, 159, 0.25));
  animation: winningPulse 1s ease-in-out infinite;
}

/* Hexagonal cell styles */
.board.hex-board {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--hex-row-gap, 12px);
}

.board.hex-board .cell {
  flex: 0 0 auto;
}

.hex-row {
  display: flex;
  gap: var(--hex-column-gap, 12px);
  justify-content: center;
  width: max-content;
}

.hex-row.hex-row-offset {
  margin-left: var(--hex-row-offset, 24px);
}

.hex-cell {
  clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
  border-radius: 0;
  width: var(--cell-size, 80px);
  height: calc(var(--cell-size, 80px) * 0.866);
  aspect-ratio: auto;
}

.hex-cell:not(.disabled):hover {
  transform: scale(1.05);
}

.recency-overlay {
  position: absolute;
  inset: 6px;
  border-radius: 10px;
  pointer-events: none;
}

.cell-icon {
  position: relative;
  z-index: 2;
}

.game-info-overlay {
  position: absolute;
  inset: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  background: rgba(10, 16, 32, 0.92);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 102, 241, 0.25);
  text-align: center;
  backdrop-filter: blur(16px);
  z-index: 10;
}

.victory-text,
.draw-text {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: #eef2ff;
}

.elimination-victory .victory-text {
  color: #fbbf24;
}

.draw-subtitle,
.elimination-text {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.game-end-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
  font-weight: 600;
  transition: border var(--transition-base), transform var(--transition-base);
}

.action-button:hover:not(:disabled) {
  border-color: rgba(99, 102, 241, 0.45);
  transform: translateY(-2px);
}

.button-icon {
  width: 16px;
  height: 16px;
}

.map-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(6, 10, 23, 0.8);
  backdrop-filter: blur(14px);
  display: grid;
  place-items: center;
  z-index: 40;
}

.map-popup {
  width: min(860px, 92vw);
  max-height: 90vh;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
}

.popup-board-container {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-muted);
  min-height: 320px;
}

.popup-board {
  display: grid;
  gap: 2px;
  position: absolute;
  top: 50%;
  left: 50%;
}

.popup-cell {
  display: grid;
  place-items: center;
  background: var(--color-surface);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 6px;
}

.popup-x-two-in-row { background: linear-gradient(135deg, rgba(33, 150, 243, 0.12), rgba(33, 150, 243, 0.24)); }
.popup-x-three-in-row { background: linear-gradient(135deg, rgba(33, 150, 243, 0.22), rgba(33, 150, 243, 0.38)); }
.popup-o-two-in-row { background: linear-gradient(135deg, rgba(244, 67, 54, 0.12), rgba(244, 67, 54, 0.24)); }
.popup-o-three-in-row { background: linear-gradient(135deg, rgba(244, 67, 54, 0.22), rgba(244, 67, 54, 0.38)); }
.popup-square-two-in-row { background: linear-gradient(135deg, rgba(156, 39, 176, 0.12), rgba(156, 39, 176, 0.24)); }
.popup-square-three-in-row { background: linear-gradient(135deg, rgba(156, 39, 176, 0.22), rgba(156, 39, 176, 0.38)); }
.popup-star-two-in-row { background: linear-gradient(135deg, rgba(255, 152, 0, 0.12), rgba(255, 152, 0, 0.24)); }
.popup-star-three-in-row { background: linear-gradient(135deg, rgba(255, 152, 0, 0.22), rgba(255, 152, 0, 0.38)); }
.popup-triangle-two-in-row { background: linear-gradient(135deg, rgba(76, 175, 80, 0.12), rgba(76, 175, 80, 0.24)); }
.popup-triangle-three-in-row { background: linear-gradient(135deg, rgba(76, 175, 80, 0.22), rgba(76, 175, 80, 0.38)); }
.popup-diamond-two-in-row { background: linear-gradient(135deg, rgba(0, 188, 212, 0.12), rgba(0, 188, 212, 0.24)); }
.popup-diamond-three-in-row { background: linear-gradient(135deg, rgba(0, 188, 212, 0.22), rgba(0, 188, 212, 0.38)); }
.popup-circle-two-in-row { background: linear-gradient(135deg, rgba(255, 235, 59, 0.12), rgba(255, 235, 59, 0.24)); }
.popup-circle-three-in-row { background: linear-gradient(135deg, rgba(255, 235, 59, 0.22), rgba(255, 235, 59, 0.38)); }
.popup-plus-two-in-row { background: linear-gradient(135deg, rgba(233, 30, 99, 0.12), rgba(233, 30, 99, 0.24)); }
.popup-plus-three-in-row { background: linear-gradient(135deg, rgba(233, 30, 99, 0.22), rgba(233, 30, 99, 0.38)); }
.popup-heart-two-in-row { background: linear-gradient(135deg, rgba(255, 87, 34, 0.12), rgba(255, 87, 34, 0.24)); }
.popup-heart-three-in-row { background: linear-gradient(135deg, rgba(255, 87, 34, 0.22), rgba(255, 87, 34, 0.38)); }
.popup-pentagon-two-in-row { background: linear-gradient(135deg, rgba(121, 85, 72, 0.12), rgba(121, 85, 72, 0.24)); }
.popup-pentagon-three-in-row { background: linear-gradient(135deg, rgba(121, 85, 72, 0.22), rgba(121, 85, 72, 0.38)); }


.popup-winning-cell {
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(99, 102, 241, 0.2);
}

.popup-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.popup-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.zoom-display {
  min-width: 60px;
  text-align: center;
  font-weight: 600;
}

.popup-help {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.ground-line {
  position: absolute;
  height: 3px;
  background: rgba(148, 163, 184, 0.35);
  border-radius: var(--radius-pill);
}

.falling-piece {
  position: absolute;
  transition: transform 0.6s ease;
  transform: translateY(var(--fall-distance));
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.35);
  z-index: 5;
}

/* Chain Reaction Scores */
.chain-scores {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.score-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.5rem 0.75rem;
  background: var(--color-surface-elevated);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: all var(--transition-base);
}

.score-chip.active {
  border-color: rgba(255, 152, 0, 0.6);
  background: rgba(255, 152, 0, 0.12);
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
}

.score-symbol {
  display: grid;
  place-items: center;
}

.score-value {
  font-weight: 700;
  font-size: var(--text-lg);
  color: var(--color-text-primary);
  min-width: 2ch;
  text-align: center;
}

/* Chain Animation */
.cell.chain-spreading {
  animation: chainPulse 0.5s ease;
  border-color: rgba(255, 152, 0, 0.8);
  background: rgba(255, 152, 0, 0.2);
}

@keyframes chainPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes playerChipPulse {
  0%, 100% {
    box-shadow:
      0 10px 22px rgba(0, 217, 255, 0.25),
      0 0 24px rgba(0, 217, 255, 0.35);
  }
  50% {
    box-shadow:
      0 12px 26px rgba(0, 217, 255, 0.32),
      0 0 30px rgba(0, 217, 255, 0.42);
  }
}

/* Cell appear animation for just-placed cells */
@keyframes cellAppear {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-10deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.15) rotate(3deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* New edge cell entrance animations */
@keyframes slideFromTop {
  0% {
    opacity: 0;
    transform: translateY(-40px) scale(0.7) rotate(-8deg);
  }
  60% {
    opacity: 1;
    transform: translateY(5px) scale(1.05) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

@keyframes slideFromBottom {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.7) rotate(8deg);
  }
  60% {
    opacity: 1;
    transform: translateY(-5px) scale(1.05) rotate(-2deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

@keyframes slideFromLeft {
  0% {
    opacity: 0;
    transform: translateX(-40px) scale(0.7) rotate(-8deg);
  }
  60% {
    opacity: 1;
    transform: translateX(5px) scale(1.05) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1) rotate(0deg);
  }
}

@keyframes slideFromRight {
  0% {
    opacity: 0;
    transform: translateX(40px) scale(0.7) rotate(8deg);
  }
  60% {
    opacity: 1;
    transform: translateX(-5px) scale(1.05) rotate(-2deg);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1) rotate(0deg);
  }
}

/* New edge cell styles with staggered animation */
.new-edge-top {
  animation: slideFromTop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.new-edge-bottom {
  animation: slideFromBottom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.new-edge-left {
  animation: slideFromLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.new-edge-right {
  animation: slideFromRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@media (max-width: 768px) {
  .players-strip {
    gap: var(--space-2);
  }

  .victory-badge-chip {
    position: relative;
    top: 0;
    right: auto;
    align-self: center;
    margin-top: var(--space-1);
  }

  .board {
    max-height: 55vh;
  }

  .game-info-overlay {
    inset: var(--space-3);
  }

  .game-end-actions {
    flex-direction: column;
  }
}

/* Light Mode Overrides */
@media (prefers-color-scheme: light) {
  /* Empty cells - lighter background */
  .cell {
    background: rgba(248, 250, 252, 0.8);
    border: 2px solid rgba(99, 102, 241, 0.25);
  }

  .cell:hover:not(.cell-filled):not(.disabled) {
    border-color: rgba(99, 102, 241, 0.6);
    background: rgba(219, 234, 254, 0.6);
    box-shadow:
      0 0 15px rgba(99, 102, 241, 0.2),
      inset 0 0 15px rgba(99, 102, 241, 0.08);
  }

  /* Not-playable cells - Shaded Overlay (light mode) */
  .cell.not-playable {
    background: rgba(241, 245, 249, 0.8);
    opacity: 0.7;
    border-color: rgba(148, 163, 184, 0.3);
  }

  /* Not-playable cells - Patterned Background (light mode) */
  .cell.not-playable-patterned {
    background:
      repeating-linear-gradient(
        45deg,
        rgba(100, 116, 139, 0.25),
        rgba(100, 116, 139, 0.25) 5px,
        rgba(148, 163, 184, 0.15) 5px,
        rgba(148, 163, 184, 0.15) 10px
      ),
      rgba(226, 232, 240, 0.7);
    border-color: rgba(148, 163, 184, 0.4);
  }

  .cell.not-playable:hover,
  .cell.not-playable-patterned:hover {
    border-color: rgba(148, 163, 184, 0.3);
  }

  /* Not-playable indicator background */
  .not-playable-indicator {
    background: rgba(255, 255, 255, 0.9);
  }

  /* Board background */
  .board {
    background: var(--color-bg);
    border: 2px solid rgba(99, 102, 241, 0.4);
    box-shadow:
      inset 0 0 20px rgba(99, 102, 241, 0.05),
      0 0 20px rgba(99, 102, 241, 0.15),
      0 0 40px rgba(99, 102, 241, 0.1);
  }

  /* Game overlay */
  .game-info-overlay {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .victory-text,
  .draw-text {
    color: #1e293b;
  }

  /* Popup board */
  .popup-cell {
    background: rgba(248, 250, 252, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  /* Popup container */
  .popup-board-container {
    background: rgba(241, 245, 249, 0.8);
  }

  .map-popup-overlay {
    background: rgba(241, 245, 249, 0.85);
  }
}
</style>
