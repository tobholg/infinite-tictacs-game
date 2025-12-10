<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from '@motionone/vue'
import { useOnlineGame } from '~/composables/useOnlineGame'
import { useSound } from '~/composables/useSound'
import type { AIDifficulty } from '../../shared/types'

// Components
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

const emit = defineEmits<{
  backToMenu: []
}>()

// Online game state
const {
  isConnected,
  connectionError,
  roomCode,
  roomPhase,
  players,
  activePlayers,
  spectators,
  hostId,
  rules,
  scoreboard,
  playerId,
  myPlayer,
  isHost,
  isSpectator,
  canStartGame,
  countdownSeconds,
  isInCountdown,
  error,
  isLoading,
  initialize,
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  addAI,
  removeAI,
} = useOnlineGame()

// Sound effects
const { play: playSound } = useSound()

// Local UI state
const codeCopied = ref(false)
const prevPlayerCount = ref(0)

// AI player settings
const aiName = ref('')
const aiDifficulty = ref<AIDifficulty>('medium')
const showAIForm = ref(false)

// Symbol component mapping
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

// Animation constants
const livelySpringEasing = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Lifecycle
onMounted(() => {
  initialize()
  // Initialize player count tracking
  prevPlayerCount.value = activePlayers.value.length
})

// Watch for player joins/leaves and play sounds
watch(
  () => activePlayers.value.length,
  (newCount, oldCount) => {
    // Skip initial and invalid values
    if (oldCount === undefined || oldCount === 0) {
      prevPlayerCount.value = newCount
      return
    }

    if (newCount > oldCount) {
      // Player joined
      playSound('playerJoin')
    } else if (newCount < oldCount) {
      // Player left
      playSound('playerLeave')
    }

    prevPlayerCount.value = newCount
  }
)

// Watch countdown and play tick sounds
watch(countdownSeconds, (seconds) => {
  if (seconds !== null && seconds > 0 && seconds <= 3) {
    playSound('countdown')
  }
})

// Actions
function handleBackToMainMenu() {
  if (roomCode.value) {
    leaveRoom()
  }
  emit('backToMenu')
}

function handleLeaveRoom() {
  if (roomCode.value) {
    leaveRoom()
  }
  emit('backToMenu')
}

function handleStartGame() {
  startGame()
}

async function copyRoomCode() {
  if (!roomCode.value) return
  try {
    await navigator.clipboard.writeText(roomCode.value)
    codeCopied.value = true
    setTimeout(() => {
      codeCopied.value = false
    }, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

function getPlayerSymbolComponent(symbol: string) {
  return symbolComponents[symbol] || XIcon
}

// AI player count for auto-naming
const aiCount = computed(() => activePlayers.value.filter(p => p.isAI).length)

function handleAddAI() {
  const name = aiName.value.trim() || `Bot ${aiCount.value + 1}`
  addAI(name, aiDifficulty.value)
  aiName.value = ''
  showAIForm.value = false
}

function handleRemoveAI(aiPlayerId: string) {
  removeAI(aiPlayerId)
}

function getDifficultyLabel(difficulty: AIDifficulty): string {
  switch (difficulty) {
    case 'easy': return 'Easy'
    case 'medium': return 'Medium'
    case 'hard': return 'Hard'
    default: return 'Medium'
  }
}
</script>

<template>
  <div class="online-lobby">
    <!-- Header -->
    <div class="lobby-header">
      <button class="back-btn" @click="handleBackToMainMenu">
        <span>&larr;</span>
        <span>Back</span>
      </button>
      <div class="connection-status" :class="{ connected: isConnected }">
        <span class="status-dot"></span>
        <span>{{ isConnected ? 'Connected' : 'Connecting...' }}</span>
      </div>
    </div>

    <!-- Error Display -->
    <Motion
      v-if="error || connectionError"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      class="error-banner"
    >
      {{ error || connectionError }}
    </Motion>

    <!-- Loading State -->
    <Motion
      v-if="!roomCode && isLoading"
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, easing: livelySpringEasing }"
      class="loading-section"
    >
      <div class="loading-spinner"></div>
      <p class="loading-text">Setting up your room...</p>
    </Motion>

    <!-- Main Lobby Content -->
    <Motion
      v-else-if="roomCode"
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, easing: livelySpringEasing }"
      class="lobby-content"
    >
      <!-- Room Code Section -->
      <section class="config-section room-code-section">
        <div class="section-header centered">
          <span class="room-label">ROOM CODE</span>
        </div>
        <div class="room-code-display">
          <span class="room-code">{{ roomCode }}</span>
          <button
            class="copy-btn"
            @click="copyRoomCode"
            :class="{ copied: codeCopied }"
            :title="codeCopied ? 'Copied!' : 'Copy code'"
          >
            {{ codeCopied ? '✓' : '📋' }}
          </button>
        </div>
        <p class="room-hint">Share this code with friends to join the game</p>
      </section>

      <!-- Players Section -->
      <section class="config-section">
        <div class="section-header">
          <h3 class="section-title">Players</h3>
          <span class="player-count">{{ activePlayers.length }}/{{ rules?.maxPlayers || 20 }}</span>
        </div>

        <div class="players-list">
          <Motion
            v-for="(player, index) in activePlayers"
            :key="player.id"
            :initial="{ opacity: 0, x: -20 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.3, delay: index * 0.05, easing: livelySpringEasing }"
            class="player-row"
            :class="{
              'is-me': player.id === playerId,
              'is-host': player.id === hostId,
              'is-ai': player.isAI,
              'disconnected': !player.connected && !player.isAI
            }"
          >
            <div class="player-avatar" :class="`symbol-${player.symbol.toLowerCase()}`">
              <component :is="getPlayerSymbolComponent(player.symbol)" />
            </div>
            <div class="player-info">
              <span class="player-name">{{ player.name }}</span>
              <div class="player-badges">
                <span v-if="player.id === hostId" class="badge host-badge">Host</span>
                <span v-if="player.id === playerId" class="badge me-badge">You</span>
                <span v-if="player.isAI" class="badge ai-badge">
                  AI ({{ getDifficultyLabel(player.aiDifficulty || 'medium') }})
                </span>
                <span v-if="!player.connected && !player.isAI" class="badge offline-badge">Offline</span>
              </div>
            </div>
            <button
              v-if="isHost && player.isAI"
              class="btn-remove"
              @click="handleRemoveAI(player.id)"
              title="Remove bot"
            >
              ✕
            </button>
          </Motion>

          <!-- Empty slot placeholder when waiting -->
          <div v-if="activePlayers.length < 2" class="player-row empty-slot">
            <div class="empty-content">
              <span class="empty-icon">⏳</span>
              <span class="empty-text">Waiting for players to join...</span>
            </div>
          </div>
        </div>
      </section>

      <!-- AI Controls (Host Only) -->
      <section v-if="isHost" class="config-section ai-section">
        <div class="section-header">
          <h3 class="section-title">Add Bots</h3>
          <button
            v-if="!showAIForm"
            class="add-bot-btn"
            @click="showAIForm = true"
            :disabled="activePlayers.length >= (rules?.maxPlayers || 20)"
          >
            + Add Bot
          </button>
        </div>

        <Motion
          v-if="showAIForm"
          :initial="{ opacity: 0, height: 0 }"
          :animate="{ opacity: 1, height: 'auto' }"
          :transition="{ duration: 0.3 }"
          class="ai-form"
        >
          <div class="form-row">
            <input
              v-model="aiName"
              type="text"
              placeholder="Bot name (optional)"
              maxlength="20"
              class="ai-input"
            />
            <select v-model="aiDifficulty" class="ai-select">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showAIForm = false">Cancel</button>
            <button class="btn btn-primary" @click="handleAddAI">Add Bot</button>
          </div>
        </Motion>
      </section>

      <!-- Spectators -->
      <section v-if="spectators.length > 0" class="config-section spectators-section">
        <div class="section-header">
          <h3 class="section-title small">Spectators ({{ spectators.length }})</h3>
        </div>
        <div class="spectators-list">
          <span
            v-for="spectator in spectators"
            :key="spectator.id"
            class="spectator-chip"
            :class="{ 'is-me': spectator.id === playerId }"
          >
            {{ spectator.name }}
            <span v-if="spectator.id === playerId" class="you-tag">(you)</span>
          </span>
        </div>
      </section>

      <!-- Spectator Notice -->
      <div v-if="isSpectator" class="spectator-notice">
        <span>👁️</span>
        <span>You're watching as a spectator. You won't be able to make moves.</span>
      </div>

      <!-- Action Footer -->
      <div class="lobby-actions">
        <button class="btn btn-secondary" @click="handleLeaveRoom">
          Leave Room
        </button>

        <button
          v-if="isHost"
          class="btn btn-primary btn-start"
          :disabled="!canStartGame"
          @click="handleStartGame"
        >
          {{ activePlayers.length < 2 ? 'Waiting for players...' : '🎮 Start Game' }}
        </button>

        <div v-else class="waiting-message">
          <span class="waiting-dots"><span></span><span></span><span></span></span>
          <span>{{ isSpectator ? 'Waiting to spectate...' : 'Waiting for host to start...' }}</span>
        </div>
      </div>
    </Motion>

    <!-- Countdown Overlay -->
    <Transition name="countdown-fade">
      <div v-if="isInCountdown" class="countdown-overlay">
        <Motion
          :key="countdownSeconds"
          :initial="{ scale: 2, opacity: 0 }"
          :animate="{ scale: 1, opacity: 1 }"
          :transition="{ duration: 0.3, easing: livelySpringEasing }"
          class="countdown-number"
        >
          {{ countdownSeconds }}
        </Motion>
        <p class="countdown-text">Get Ready!</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.online-lobby {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 700px;
  margin: 0 auto;
  padding: var(--space-4);
}

/* Header */
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-warning);
  animation: pulse 1.5s infinite;
}

.connection-status.connected .status-dot {
  background: #22c55e;
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Error Banner */
.error-banner {
  padding: var(--space-3) var(--space-4);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: #fca5a5;
  font-size: var(--text-sm);
  text-align: center;
}

/* Loading */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Lobby Content */
.lobby-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Config Sections - matching StartMenu style */
.config-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
}

/* Room Code Section */
.room-code-section {
  background: linear-gradient(135deg, var(--color-surface), rgba(99, 102, 241, 0.05));
  text-align: center;
  padding: var(--space-5);
}

.room-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.room-code-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin: var(--space-3) 0;
}

.room-code {
  font-family: monospace;
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--color-primary);
}

.copy-btn {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.copy-btn.copied {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

.room-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.section-header.centered {
  justify-content: center;
}

.section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-title.small {
  font-size: var(--text-base);
}

.player-count {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-muted);
  border-radius: var(--radius-sm);
}

/* Players List - matching StartMenu player rows */
.players-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.player-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.player-row:hover {
  border-color: rgba(99, 102, 241, 0.4);
}

.player-row.is-me {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.4);
}

.player-row.is-host {
  border-color: rgba(250, 204, 21, 0.4);
}

.player-row.is-ai {
  background: rgba(139, 92, 246, 0.05);
  border-style: dashed;
}

.player-row.disconnected {
  opacity: 0.5;
}

.player-row.empty-slot {
  border-style: dashed;
  border-color: var(--color-border);
  justify-content: center;
  min-height: 70px;
}

.empty-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.empty-icon {
  font-size: 1.25rem;
}

.empty-text {
  font-size: var(--text-sm);
}

/* Player Avatar */
.player-avatar {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.1);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.player-avatar :deep(svg) {
  width: 28px;
  height: 28px;
}

.player-avatar.symbol-x { color: var(--glow-x); }
.player-avatar.symbol-o { color: var(--glow-o); }
.player-avatar.symbol-square { color: var(--glow-square); }
.player-avatar.symbol-star { color: var(--glow-star); }
.player-avatar.symbol-triangle { color: var(--glow-triangle); }
.player-avatar.symbol-diamond { color: var(--glow-diamond); }
.player-avatar.symbol-circle { color: var(--glow-circle); }
.player-avatar.symbol-plus { color: var(--glow-plus); }
.player-avatar.symbol-heart { color: var(--glow-heart); }
.player-avatar.symbol-pentagon { color: var(--glow-pentagon); }

/* Player Info */
.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  display: block;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.badge {
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 600;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.host-badge {
  background: rgba(250, 204, 21, 0.2);
  color: #fcd34d;
}

.me-badge {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

.ai-badge {
  background: rgba(139, 92, 246, 0.2);
  color: #c4b5fd;
}

.offline-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.btn-remove {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  color: #fca5a5;
  font-size: var(--text-base);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* AI Section */
.ai-section .section-header {
  margin-bottom: var(--space-2);
}

.add-bot-btn {
  padding: var(--space-2) var(--space-3);
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-md);
  color: #c4b5fd;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-bot-btn:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.25);
}

.add-bot-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* AI Form */
.ai-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow: hidden;
}

.form-row {
  display: flex;
  gap: var(--space-2);
}

.ai-input {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  outline: none;
  transition: border-color 0.2s ease;
}

.ai-input:focus {
  border-color: var(--color-primary);
}

.ai-input::placeholder {
  color: var(--color-text-muted);
}

.ai-select {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  outline: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

/* Spectators Section */
.spectators-section {
  padding: var(--space-3);
}

.spectators-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.spectator-chip {
  padding: var(--space-1) var(--space-3);
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.spectator-chip.is-me {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--color-text-primary);
}

.you-tag {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

/* Spectator Notice */
.spectator-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: rgba(99, 102, 241, 0.1);
  border: 1px dashed rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* Lobby Actions */
.lobby-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-2);
}

/* Buttons - matching StartMenu style */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-strong));
  color: white;
  border-color: var(--color-accent);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.btn-secondary:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

.btn-start {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: #10b981;
}

.btn-start:hover:not(:disabled) {
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
}

.btn-start:disabled {
  background: linear-gradient(135deg, #4b5563, #374151);
  border-color: #4b5563;
}

/* Waiting Message */
.waiting-message {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.waiting-dots {
  display: flex;
  gap: 4px;
}

.waiting-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-muted);
  animation: dotPulse 1.4s infinite ease-in-out both;
}

.waiting-dots span:nth-child(1) { animation-delay: -0.32s; }
.waiting-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* Countdown Overlay */
.countdown-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
}

.countdown-number {
  font-size: 10rem;
  font-weight: 800;
  color: var(--color-primary);
  text-shadow: 0 0 60px var(--color-primary);
  line-height: 1;
}

.countdown-text {
  margin: var(--space-4) 0 0;
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.countdown-fade-enter-active,
.countdown-fade-leave-active {
  transition: opacity 0.3s ease;
}

.countdown-fade-enter-from,
.countdown-fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .online-lobby {
    padding: var(--space-3);
  }

  .room-code {
    font-size: 2rem;
  }

  .lobby-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .btn-start {
    order: -1;
  }

  .waiting-message {
    justify-content: center;
  }

  .countdown-number {
    font-size: 6rem;
  }
}
</style>
