<template>
  <div class="ai-training">
    <div class="training-header">
      <h2>AI Training Lab</h2>
      <p class="subtitle">Watch {{ playerCount }} AI players learn by playing against each other</p>
    </div>

    <div class="training-layout">
      <!-- Game Visualization -->
      <div class="game-visualization">
        <div class="board-container">
          <div class="board-wrapper">
            <div
              class="training-board"
              :style="{
                gridTemplateColumns: `repeat(${currentGame.board[0]?.length || 3}, 1fr)`,
                gridTemplateRows: `repeat(${currentGame.board.length || 3}, 1fr)`
              }"
            >
              <template v-for="(row, rowIndex) in currentGame.board" :key="rowIndex">
                <div
                  v-for="(cell, colIndex) in row"
                  :key="`${rowIndex}-${colIndex}`"
                  class="cell"
                  :class="[
                    getCellClass(cell),
                    {
                      'cell-empty': cell === '',
                      'last-move': isLastMove(rowIndex, colIndex),
                      'new-cell': isNewCell(rowIndex, colIndex)
                    }
                  ]"
                >
                  <span v-if="cell" class="cell-symbol">{{ cell }}</span>
                </div>
              </template>
            </div>
          </div>
          <div class="board-size-indicator">
            {{ currentGame.board.length }} × {{ currentGame.board[0]?.length || 0 }}
          </div>

          <div class="game-status">
            <span v-if="currentGame.winner" class="winner-badge">
              {{ currentGame.winner }} Wins!
            </span>
            <span v-else-if="currentGame.isDraw" class="draw-badge">
              Draw!
            </span>
            <span v-else class="turn-indicator">
              {{ currentPlayer }}'s Turn
            </span>
          </div>
        </div>
      </div>

      <!-- Stats Panel -->
      <div class="stats-panel">
        <div class="stat-card primary">
          <div class="stat-value">{{ stats.gamesPlayed.toLocaleString() }}</div>
          <div class="stat-label">Games Played</div>
        </div>

        <!-- Player count selector -->
        <div class="stat-card player-count-card">
          <div class="stat-label">Players</div>
          <div class="player-selector">
            <button
              v-for="n in 9"
              :key="n + 1"
              class="player-btn"
              :class="{ active: playerCount === n + 1 }"
              :disabled="isTraining"
              @click="setPlayerCount(n + 1)"
            >
              {{ n + 1 }}
            </button>
          </div>
        </div>

        <!-- Dynamic player win stats -->
        <div class="player-stats-scroll">
          <div class="stat-grid-dynamic" :style="{ gridTemplateColumns: `repeat(${Math.min(playerCount, 5)}, 1fr)` }">
            <div
              v-for="player in getActivePlayers()"
              :key="player"
              class="stat-card player-stat"
              :style="{ borderTopColor: getPlayerColor(player) }"
            >
              <div class="stat-value">{{ winRates[player] || '0.0' }}%</div>
              <div class="stat-label">{{ player }}</div>
              <div class="stat-count">{{ (stats.winsByPlayer[player] || 0).toLocaleString() }}</div>
            </div>
          </div>
        </div>

        <div class="stat-card draws-card">
          <div class="stat-value">{{ winRates.draw }}%</div>
          <div class="stat-label">Draws</div>
          <div class="stat-count">{{ stats.draws.toLocaleString() }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ stats.qTableSize.toLocaleString() }}</div>
          <div class="stat-label">Learned States</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ (stats.currentEpsilon * 100).toFixed(1) }}%</div>
          <div class="stat-label">Exploration Rate</div>
          <div class="exploration-bar">
            <div class="exploration-fill" :style="{ width: `${stats.currentEpsilon * 100}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Multi-Model Training Progress -->
    <div v-if="multiModelProgress.isRunning" class="progress-section multi-model-progress">
      <div class="progress-header">
        <span class="progress-label">Training All Models (2-10 Players)</span>
        <span class="progress-value">Model {{ multiModelProgress.completedModels + 1 }} of {{ multiModelProgress.totalModels }}</span>
      </div>
      <div class="current-model-info">
        Currently training: <strong>{{ multiModelProgress.currentPlayerCount }} players</strong>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill multi" :style="{ width: `${multiModelProgressPercent}%` }"></div>
      </div>
      <div class="progress-percent">{{ multiModelProgressPercent.toFixed(1) }}% overall</div>

      <!-- Individual model progress bars -->
      <div class="model-progress-grid">
        <div
          v-for="pc in [2, 3, 4, 5, 6, 7, 8, 9, 10]"
          :key="pc"
          class="mini-model-progress"
          :class="{
            'completed': multiModelProgress.modelProgress[pc]?.current >= multiModelProgress.gamesPerModel,
            'active': pc === multiModelProgress.currentPlayerCount,
            'pending': pc > multiModelProgress.currentPlayerCount
          }"
        >
          <span class="mini-label">{{ pc }}P</span>
          <div class="mini-bar">
            <div
              class="mini-fill"
              :style="{ width: `${(multiModelProgress.modelProgress[pc]?.current || 0) / multiModelProgress.gamesPerModel * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Single Model Training Progress -->
    <div v-else-if="progress.isRunning || progress.total > 0" class="progress-section">
      <div class="progress-header">
        <span class="progress-label">Training {{ playerCount }} Players</span>
        <span class="progress-value">{{ progress.current.toLocaleString() }} / {{ progress.total.toLocaleString() }}</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <div class="progress-percent">{{ progressPercent.toFixed(1) }}%</div>
    </div>

    <!-- All Models Status Overview -->
    <div v-if="!isTraining && !multiModelProgress.isRunning" class="models-overview">
      <div class="models-overview-header">
        <h4>All Models Status</h4>
        <button
          @click="startTrainAllModels"
          class="btn btn-accent btn-train-all"
        >
          🚀 Train All Models
        </button>
      </div>
      <div class="models-status-grid">
        <div
          v-for="model in allModelStatuses"
          :key="model.playerCount"
          class="model-status-card"
          :class="{ trained: model.trained, 'is-current': model.playerCount === playerCount }"
        >
          <span class="model-player-count">{{ model.playerCount }}P</span>
          <span v-if="model.trained" class="model-games">{{ (model.gamesPlayed / 1000).toFixed(0) }}K</span>
          <span v-else class="model-untrained">—</span>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <div class="control-row">
        <div class="speed-control">
          <label>Speed:</label>
          <input
            type="range"
            v-model.number="trainingSpeed"
            min="0"
            max="500"
            step="10"
          />
          <span class="speed-label">
            {{ trainingSpeed === 0 ? 'Max Speed' : `${trainingSpeed}ms` }}
          </span>
        </div>

        <div class="parallel-control">
          <label>Parallel Games:</label>
          <input
            type="range"
            v-model.number="parallelGamesValue"
            min="1"
            max="50"
            step="1"
            :disabled="isTraining"
          />
          <span class="speed-label">{{ parallelGamesValue }}</span>
        </div>
      </div>

      <div class="button-group training-buttons">
        <button
          v-if="!isTraining && !multiModelProgress.isRunning"
          @click="startTraining(1000)"
          class="btn btn-secondary"
        >
          1K
        </button>

        <button
          v-if="!isTraining && !multiModelProgress.isRunning"
          @click="startTraining(10000)"
          class="btn btn-primary"
        >
          <span class="btn-icon">&#9654;</span>
          10K
        </button>

        <button
          v-if="!isTraining && !multiModelProgress.isRunning"
          @click="startTraining(100000)"
          class="btn btn-secondary"
        >
          100K
        </button>

        <button
          v-if="!isTraining && !multiModelProgress.isRunning"
          @click="startCustomTraining"
          class="btn btn-outline"
        >
          Custom
        </button>

        <button
          v-if="isTraining || multiModelProgress.isRunning"
          @click="stopAllTraining"
          class="btn btn-danger"
        >
          <span class="btn-icon">&#9632;</span>
          Stop
        </button>

        <button
          @click="resetTraining"
          class="btn btn-outline btn-reset"
          :disabled="isTraining || multiModelProgress.isRunning"
        >
          Reset
        </button>
      </div>

      <div class="button-group">
        <button @click="downloadModel" class="btn btn-outline" :disabled="stats.qTableSize === 0">
          Export Model
        </button>

        <label class="btn btn-outline file-input-label">
          Import Model
          <input type="file" @change="handleImport" accept=".json" class="file-input" />
        </label>
      </div>
    </div>

    <!-- Back button -->
    <button @click="$emit('close')" class="btn btn-back">
      &larr; Back to Menu
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useQLearning, type PlayerSymbol } from '../composables/useQLearning'

const emit = defineEmits<{
  close: []
}>()

const {
  stats,
  currentGame,
  isTraining,
  trainingSpeed,
  winRates,
  playerCount,
  config,
  progress,
  multiModelProgress,
  startTraining,
  stopTraining,
  startTrainingAllModels,
  stopAllTraining,
  resetTraining,
  exportModel,
  importModel,
  setPlayerCount,
  setParallelGames,
  getActivePlayers,
  getStoredModelInfo
} = useQLearning()

// Parallel games local state (synced with config)
const parallelGamesValue = ref(config.value.parallelGames)
watch(parallelGamesValue, (val) => setParallelGames(val))

// Refresh trigger for model statuses (localStorage is not reactive)
const modelStatusRefreshTrigger = ref(0)

function refreshModelStatuses() {
  modelStatusRefreshTrigger.value++
  console.log('Model statuses refreshed, trigger:', modelStatusRefreshTrigger.value)
}

// Refresh model statuses on mount
onMounted(() => {
  refreshModelStatuses()
})

// Watch for regular training completion
watch(() => isTraining.value, (training, wasTraining) => {
  if (wasTraining && !training) {
    // Small delay to ensure localStorage has been updated
    setTimeout(() => {
      refreshModelStatuses()
    }, 100)
  }
})

// Watch for multi-model training completion
watch(() => multiModelProgress.value.isRunning, (isRunning, wasRunning) => {
  if (wasRunning && !isRunning) {
    // Training completed - refresh with delay to ensure all saves are done
    setTimeout(() => {
      refreshModelStatuses()
    }, 200)
  }
})

// Watch for each model completion during multi-model training
watch(() => multiModelProgress.value.completedModels, (newCount, oldCount) => {
  if (newCount > oldCount) {
    // A model just finished - refresh immediately
    refreshModelStatuses()
  }
}, { immediate: false })

// Also refresh periodically during training to show live updates
watch(() => stats.value.gamesPlayed, (gamesPlayed) => {
  // Refresh every 1000 games during training
  if (gamesPlayed > 0 && gamesPlayed % 1000 === 0) {
    refreshModelStatuses()
  }
})

// Progress computed
const progressPercent = computed(() => {
  if (progress.value.total === 0) return 0
  return (progress.value.current / progress.value.total) * 100
})

// Custom training
function startCustomTraining() {
  const input = prompt('Enter number of games to train:', '50000')
  if (input) {
    const games = parseInt(input, 10)
    if (!isNaN(games) && games > 0) {
      startTraining(games)
    }
  }
}

// Train All Models
function startTrainAllModels() {
  const input = prompt('Enter games per model (2-10 players):', '10000')
  if (input) {
    const games = parseInt(input, 10)
    if (!isNaN(games) && games > 0) {
      startTrainingAllModels(games)
    }
  }
}

// Multi-model progress computed
const multiModelProgressPercent = computed(() => {
  const mp = multiModelProgress.value
  if (mp.totalModels === 0) return 0
  const completedGames = mp.completedModels * mp.gamesPerModel
  const currentModelGames = mp.modelProgress[mp.currentPlayerCount]?.current || 0
  const totalGames = mp.totalModels * mp.gamesPerModel
  return ((completedGames + currentModelGames) / totalGames) * 100
})

// Get all model statuses for overview
// Uses modelStatusRefreshTrigger to force re-read from localStorage
const allModelStatuses = computed(() => {
  // This dependency ensures re-computation when triggered
  const _trigger = modelStatusRefreshTrigger.value

  return [2, 3, 4, 5, 6, 7, 8, 9, 10].map(pc => {
    const info = getStoredModelInfo(pc)
    return {
      playerCount: pc,
      trained: info !== null,
      gamesPlayed: info?.gamesPlayed || 0
    }
  })
})

// Player colors for visual distinction
const PLAYER_COLORS: Record<string, string> = {
  'X': '#3b82f6',      // Blue
  'O': '#ef4444',      // Red
  'Square': '#22c55e', // Green
  'Star': '#f59e0b',   // Amber
  'Triangle': '#8b5cf6', // Purple
  'Diamond': '#06b6d4', // Cyan
  'Circle': '#ec4899', // Pink
  'Plus': '#84cc16',   // Lime
  'Heart': '#f43f5e',  // Rose
  'Pentagon': '#6366f1' // Indigo
}

const currentPlayer = computed(() => {
  const players = currentGame.value.players
  const index = currentGame.value.currentPlayerIndex
  return players[index] || 'X'
})

function getPlayerColor(player: string): string {
  return PLAYER_COLORS[player] || '#6b7280'
}

function getCellClass(cell: string): string {
  if (!cell) return ''
  const index = getActivePlayers().indexOf(cell as PlayerSymbol)
  return `cell-player-${index}`
}

function isLastMove(row: number, col: number): boolean {
  const history = currentGame.value.moveHistory
  if (history.length === 0) return false
  const last = history[history.length - 1]
  return last.row === row && last.col === col
}

function isNewCell(row: number, col: number): boolean {
  // Highlight edge cells (newly expanded)
  const rows = currentGame.value.board.length
  const cols = currentGame.value.board[0]?.length || 0
  return row === 0 || row === rows - 1 || col === 0 || col === cols - 1
}

function downloadModel(): void {
  const data = exportModel()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tictactoe-ai-${playerCount.value}p-${stats.value.gamesPlayed}-games.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    importModel(content)
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.ai-training {
  min-height: 100vh;
  padding: var(--space-6);
  background: var(--color-bg);
  color: var(--color-text-primary);
}

.training-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.training-header h2 {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-2);
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
}

.training-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--space-6);
  max-width: 900px;
  margin: 0 auto var(--space-6);
}

/* Game Visualization */
.game-visualization {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.board-container {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.board-wrapper {
  width: 320px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: var(--space-2);
}

.training-board {
  display: grid;
  gap: 3px;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  font-weight: 700;
  transition: all 0.15s ease;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.cell-symbol {
  font-size: clamp(0.6rem, 2vw, 1.2rem);
}

/* Player cell colors */
.cell-player-0 { background: rgba(59, 130, 246, 0.25); color: #3b82f6; }  /* X - Blue */
.cell-player-1 { background: rgba(239, 68, 68, 0.25); color: #ef4444; }   /* O - Red */
.cell-player-2 { background: rgba(34, 197, 94, 0.25); color: #22c55e; }   /* Square - Green */
.cell-player-3 { background: rgba(245, 158, 11, 0.25); color: #f59e0b; }  /* Star - Amber */
.cell-player-4 { background: rgba(139, 92, 246, 0.25); color: #8b5cf6; }  /* Triangle - Purple */
.cell-player-5 { background: rgba(6, 182, 212, 0.25); color: #06b6d4; }   /* Diamond - Cyan */
.cell-player-6 { background: rgba(236, 72, 153, 0.25); color: #ec4899; }  /* Circle - Pink */
.cell-player-7 { background: rgba(132, 204, 22, 0.25); color: #84cc16; }  /* Plus - Lime */
.cell-player-8 { background: rgba(244, 63, 94, 0.25); color: #f43f5e; }   /* Heart - Rose */
.cell-player-9 { background: rgba(99, 102, 241, 0.25); color: #6366f1; }  /* Pentagon - Indigo */

.cell-empty {
  background: var(--color-surface);
}

.cell-empty.new-cell {
  background: rgba(99, 102, 241, 0.08);
  border: 1px dashed rgba(99, 102, 241, 0.3);
}

.cell.last-move {
  box-shadow: 0 0 0 2px var(--color-primary);
  transform: scale(1.02);
  z-index: 1;
}

.board-size-indicator {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-family: monospace;
}

.game-status {
  text-align: center;
  font-size: var(--text-lg);
  font-weight: 600;
  min-height: 28px;
}

.winner-badge {
  color: #22c55e;
}

.draw-badge {
  color: var(--color-text-secondary);
}

.turn-indicator {
  color: var(--color-primary);
}

/* Stats Panel */
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  text-align: center;
}

.stat-card.primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
}

.stat-card.primary .stat-value {
  font-size: var(--text-3xl);
  color: white;
}

.stat-card.primary .stat-label {
  color: rgba(255, 255, 255, 0.8);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.stat-count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

/* Player count selector */
.player-count-card {
  padding: var(--space-3) !important;
}

.player-selector {
  display: flex;
  gap: var(--space-1);
  justify-content: center;
  margin-top: var(--space-2);
  flex-wrap: wrap;
}

.player-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.player-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.player-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.player-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dynamic player stats */
.player-stats-scroll {
  max-height: 150px;
  overflow-y: auto;
}

.stat-grid-dynamic {
  display: grid;
  gap: var(--space-2);
}

.stat-grid-dynamic .stat-card {
  padding: var(--space-2);
}

.stat-grid-dynamic .stat-value {
  font-size: var(--text-base);
}

.stat-grid-dynamic .stat-label {
  font-size: var(--text-xs);
}

.player-stat {
  border-top: 3px solid;
}

.draws-card {
  border-top: 3px solid #6b7280;
}

/* Progress Section */
.progress-section {
  max-width: 900px;
  margin: 0 auto var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.progress-label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.progress-value {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-family: monospace;
}

.progress-bar-container {
  height: 8px;
  background: var(--color-bg);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  transition: width 0.3s ease;
}

.progress-percent {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-2);
}

/* Control Row */
.control-row {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}

.parallel-control {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
}

.parallel-control input[type="range"] {
  width: 100px;
  accent-color: var(--color-primary);
}

.training-buttons {
  flex-wrap: nowrap;
}

.btn-reset {
  margin-left: var(--space-2);
}

/* Multi-Model Training */
.multi-model-progress {
  border: 2px solid var(--color-primary);
}

.current-model-info {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.current-model-info strong {
  color: var(--color-primary);
}

.progress-bar-fill.multi {
  background: linear-gradient(90deg, #22c55e, #10b981);
}

.model-progress-grid {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}

.mini-model-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  opacity: 0.4;
}

.mini-model-progress.active {
  opacity: 1;
}

.mini-model-progress.completed {
  opacity: 1;
}

.mini-model-progress.completed .mini-fill {
  background: #22c55e;
}

.mini-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.mini-model-progress.active .mini-label {
  color: var(--color-primary);
}

.mini-bar {
  width: 40px;
  height: 4px;
  background: var(--color-bg);
  border-radius: 2px;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
}

/* Models Overview */
.models-overview {
  max-width: 900px;
  margin: 0 auto var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.models-overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  gap: var(--space-2);
}

.models-overview-header h4 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.btn-train-all {
  background: linear-gradient(135deg, #22c55e, #10b981);
  color: white;
  border: none;
}

.btn-train-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.btn-accent {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
}

.models-status-grid {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  flex-wrap: wrap;
}

.model-status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  min-width: 50px;
  transition: all 0.2s ease;
}

.model-status-card.trained {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.model-status-card.is-current {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.model-player-count {
  font-weight: 700;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.model-games {
  font-size: var(--text-xs);
  color: #22c55e;
  font-weight: 600;
}

.model-untrained {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.exploration-bar {
  height: 4px;
  background: var(--color-bg);
  border-radius: 2px;
  margin-top: var(--space-2);
  overflow: hidden;
}

.exploration-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  transition: width 0.3s ease;
}

/* Controls */
.controls {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
}

.speed-control input[type="range"] {
  width: 150px;
  accent-color: var(--color-primary);
}

.speed-label {
  min-width: 80px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.button-group {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-outline {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-outline:hover:not(:disabled) {
  background: var(--color-surface);
}

.btn-back {
  position: fixed;
  top: var(--space-4);
  left: var(--space-4);
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-icon {
  font-size: 0.8em;
}

.file-input-label {
  position: relative;
  overflow: hidden;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

@media (max-width: 768px) {
  .training-layout {
    grid-template-columns: 1fr;
  }

  .training-board {
    width: 250px;
    height: 250px;
  }

  .stat-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
