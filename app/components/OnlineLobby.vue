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
  isHostSpectating,
  canHostRejoin,
  error,
  isLoading,
  needsNameSetup,
  nameSetupError,
  initialize,
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  addAI,
  removeAI,
  toggleHostSpectate,
  updateRules,
  setPlayerName,
  dismissNameSetup,
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

// Name setup form state
const nameInput = ref('')
const spectatorChoice = ref(false)

// Game mode presets (moved from StartMenu to Lobby)
interface GamePreset {
  id: string
  name: string
  icon: string
  description: string
  winLength: number
  timeLimit?: number
}

const gamePresets: GamePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '🎯',
    description: 'Pure strategy with unlimited time and infinite expansion.',
    winLength: 4,
  },
  {
    id: 'speed-classic',
    name: 'Speed Classic',
    icon: '⚡',
    description: 'Fast-paced classic. 5 seconds per move keeps the pressure on.',
    winLength: 4,
    timeLimit: 5,
  },
]

// Game mode selection state (host only)
const selectedPresetId = ref('classic')
const appliedPresetId = ref('classic')
const hasUnappliedChanges = computed(() => selectedPresetId.value !== appliedPresetId.value)

// Track pending rule updates to prevent race conditions
const isUpdatingRules = ref(false)
const pendingRulesUpdate = ref<{ winLength: number; timeLimit: number | null } | null>(null)

// Get current game mode from rules (for non-hosts)
const currentGameMode = computed(() => {
  if (!rules.value) return { name: 'Classic', icon: '🎯', description: 'Unlimited time' }

  // Match rules to a preset
  const preset = gamePresets.find(p =>
    p.winLength === rules.value?.winLength &&
    p.timeLimit === rules.value?.timeLimit
  )

  if (preset) {
    return { name: preset.name, icon: preset.icon, description: preset.description }
  }

  // Custom rules
  const timeLimitText = rules.value.timeLimit
    ? `${rules.value.timeLimit}s per turn`
    : 'Unlimited time'
  return {
    name: 'Custom',
    icon: '⚙️',
    description: `${rules.value.winLength} in a row, ${timeLimitText}`
  }
})

function selectGamePreset(presetId: string) {
  playSound('buttonClick')
  selectedPresetId.value = presetId
}

function applyGameMode() {
  const preset = gamePresets.find(p => p.id === selectedPresetId.value)
  if (!preset || isUpdatingRules.value) return

  playSound('buttonClick')

  // Set pending update to track what we're requesting
  isUpdatingRules.value = true
  pendingRulesUpdate.value = {
    winLength: preset.winLength,
    timeLimit: preset.timeLimit,
  }

  updateRules({
    winLength: preset.winLength,
    timeLimit: preset.timeLimit,
  })

  // appliedPresetId will be updated by the watcher when server confirms
  // Add timeout fallback in case server doesn't respond
  setTimeout(() => {
    if (isUpdatingRules.value) {
      // Fallback: assume update succeeded after timeout
      appliedPresetId.value = selectedPresetId.value
      isUpdatingRules.value = false
      pendingRulesUpdate.value = null
    }
  }, 3000)
}

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

// Watch for rules changes to confirm pending updates
// This resolves the race condition between rule updates and game start
watch(
  () => rules.value,
  (newRules) => {
    if (!isUpdatingRules.value || !pendingRulesUpdate.value || !newRules) return

    // Check if server confirmed our pending update
    if (
      newRules.winLength === pendingRulesUpdate.value.winLength &&
      newRules.timeLimit === pendingRulesUpdate.value.timeLimit
    ) {
      // Server confirmed - update local state
      appliedPresetId.value = selectedPresetId.value
      isUpdatingRules.value = false
      pendingRulesUpdate.value = null
    }
  },
  { deep: true }
)

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

function handleConfirmName() {
  if (nameInput.value.trim()) {
    playSound('buttonClick')
    setPlayerName(nameInput.value.trim(), spectatorChoice.value)
  }
}

function handleSkipNameSetup() {
  playSound('buttonClick')
  dismissNameSetup()
}
</script>

<template>
  <div class="flex flex-col gap-3 max-w-[700px] mx-auto p-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-2">
      <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="handleBackToMainMenu">
        <span>&larr;</span>
        <span>Back</span>
      </button>
      <div class="connection-status flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-xs text-text-muted" :class="{ connected: isConnected }">
        <span class="status-dot w-2 h-2 rounded-full"></span>
        <span>{{ isConnected ? 'Connected' : 'Connecting...' }}</span>
      </div>
    </div>

    <!-- Error Display -->
    <Motion
      v-if="error || connectionError"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      class="py-3 px-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-md text-[#fca5a5] text-sm text-center"
    >
      {{ error || connectionError }}
    </Motion>

    <!-- Loading State -->
    <Motion
      v-if="!roomCode && isLoading"
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, easing: livelySpringEasing }"
      class="flex flex-col items-center gap-4 p-8"
    >
      <div class="loading-spinner w-12 h-12 border-[3px] border-border border-t-primary rounded-full"></div>
      <p class="text-base text-text-secondary m-0">Setting up your room...</p>
    </Motion>

    <!-- Main Lobby Content -->
    <Motion
      v-else-if="roomCode"
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, easing: livelySpringEasing }"
      class="flex flex-col gap-3"
    >
      <!-- Room Code Section -->
      <section class="config-section bg-gradient-to-br from-surface to-[rgba(99,102,241,0.05)] text-center p-5 border border-border rounded-lg">
        <div class="flex justify-center mb-3">
          <span class="text-xs font-semibold text-text-muted uppercase tracking-[0.15em]">ROOM CODE</span>
        </div>
        <div class="flex items-center justify-center gap-3 my-3">
          <span class="font-mono text-[clamp(2rem,8vw,3rem)] font-bold tracking-[0.15em] text-primary">{{ roomCode }}</span>
          <button
            class="copy-btn w-11 h-11 grid place-items-center bg-bg-muted border border-border rounded-md text-text-secondary text-[1.2rem] cursor-pointer transition-all duration-200 hover:bg-primary hover:border-primary hover:text-white"
            @click="copyRoomCode"
            :class="{ copied: codeCopied }"
            :title="codeCopied ? 'Copied!' : 'Copy code'"
          >
            {{ codeCopied ? '✓' : '📋' }}
          </button>
        </div>
        <p class="m-0 text-sm text-text-muted">Share this code with friends to join the game</p>
      </section>

      <!-- Players Section -->
      <section class="config-section border border-border rounded-lg py-3 px-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Players</h3>
          <span class="text-sm text-text-muted py-1 px-2 bg-bg-muted rounded-sm">{{ activePlayers.length }}/{{ rules?.maxPlayers || 20 }}</span>
        </div>

        <div class="flex flex-col gap-2">
          <Motion
            v-for="(player, index) in activePlayers"
            :key="player.id"
            :initial="{ opacity: 0, x: -20 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.3, delay: index * 0.05, easing: livelySpringEasing }"
            class="player-row flex items-center gap-3 p-3 bg-bg-muted border-2 border-border rounded-md transition-all duration-200 hover:border-[rgba(99,102,241,0.4)]"
            :class="{
              'is-me': player.id === playerId,
              'is-host': player.id === hostId,
              'is-ai': player.isAI,
              'disconnected': !player.connected && !player.isAI
            }"
          >
            <div class="player-avatar w-11 h-11 grid place-items-center bg-[rgba(99,102,241,0.1)] rounded-md shrink-0" :class="`symbol-${player.symbol.toLowerCase()}`">
              <component :is="getPlayerSymbolComponent(player.symbol)" />
            </div>
            <div class="flex-1 min-w-0">
              <span class="block font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                {{ player.name }}
                <span v-if="player.id === hostId" class="font-normal text-[#fcd34d] ml-1">(Host)</span>
              </span>
              <div class="flex flex-wrap gap-1 mt-1">
                <span v-if="player.id === playerId" class="badge py-[2px] px-2 text-xs font-semibold rounded-sm uppercase bg-[rgba(99,102,241,0.2)] text-[#a5b4fc]">You</span>
                <span v-if="player.isAI" class="badge py-[2px] px-2 text-xs font-semibold rounded-sm uppercase bg-[rgba(139,92,246,0.2)] text-[#c4b5fd]">
                  AI ({{ getDifficultyLabel(player.aiDifficulty || 'medium') }})
                </span>
                <span v-if="!player.connected && !player.isAI" class="badge py-[2px] px-2 text-xs font-semibold rounded-sm uppercase bg-[rgba(239,68,68,0.2)] text-[#fca5a5]">Offline</span>
              </div>
            </div>
            <button
              v-if="isHost && player.isAI"
              class="w-8 h-8 grid place-items-center bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-sm text-[#fca5a5] text-base cursor-pointer transition-all duration-200 shrink-0 hover:bg-[rgba(239,68,68,0.2)] hover:text-[#f87171]"
              @click="handleRemoveAI(player.id)"
              title="Remove bot"
            >
              ✕
            </button>
          </Motion>

          <!-- Empty slot placeholder when waiting -->
          <div v-if="activePlayers.length < 2" class="flex items-center gap-3 p-3 bg-bg-muted border-2 border-dashed border-border rounded-md justify-center min-h-[70px]">
            <div class="flex items-center gap-2 text-text-muted">
              <span class="text-[1.25rem]">⏳</span>
              <span class="text-sm">Waiting for players to join...</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Game Mode (Host Only - can edit) -->
      <section v-if="isHost" class="config-section border border-border rounded-lg py-3 px-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Game Mode</h3>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <button
            v-for="preset in gamePresets"
            :key="preset.id"
            type="button"
            class="preset-btn flex flex-col items-center gap-1 p-3 bg-bg-muted border-2 border-border rounded-md text-text-secondary cursor-pointer transition-all duration-200 text-center hover:border-accent hover:bg-surface-elevated hover:-translate-y-0.5"
            :class="{ selected: selectedPresetId === preset.id, applied: appliedPresetId === preset.id }"
            @click="selectGamePreset(preset.id)"
          >
            <span class="text-[2rem]">{{ preset.icon }}</span>
            <span class="text-base font-semibold text-text-primary">{{ preset.name }}</span>
            <span class="text-xs text-text-muted leading-[1.4]">{{ preset.description }}</span>
            <span v-if="preset.timeLimit" class="mt-1 py-[2px] px-2 bg-[rgba(99,102,241,0.15)] text-accent text-xs font-semibold rounded-full">{{ preset.timeLimit }}s turns</span>
          </button>
        </div>
        <div v-if="hasUnappliedChanges" class="flex items-center gap-3 p-2 bg-[rgba(250,204,21,0.1)] border border-dashed border-[rgba(250,204,21,0.3)] rounded-md">
          <button class="py-2 px-4 bg-gradient-to-br from-[#f59e0b] to-[#d97706] border border-[#f59e0b] rounded-md text-white font-semibold text-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(245,158,11,0.3)]" @click="applyGameMode">
            Apply Settings
          </button>
          <span class="text-xs text-warning">Changes not yet applied to room</span>
        </div>
        <p v-else class="m-0 text-xs text-text-muted text-center">
          {{ appliedPresetId === 'speed-classic' ? 'Speed mode active: 5 seconds per turn' : 'Classic mode: unlimited time per turn' }}
        </p>
      </section>

      <!-- Game Mode Display (Non-host - read only) -->
      <section v-else class="config-section border border-border rounded-lg py-3 px-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Game Mode</h3>
        </div>
        <div class="flex items-center gap-3 p-3 bg-bg-muted border-2 border-border rounded-md">
          <span class="text-[2rem] shrink-0">{{ currentGameMode.icon }}</span>
          <div class="flex flex-col gap-1">
            <span class="text-base font-semibold text-text-primary">{{ currentGameMode.name }}</span>
            <span class="text-sm text-text-muted">{{ currentGameMode.description }}</span>
          </div>
        </div>
      </section>

      <!-- AI Controls (Host Only) -->
      <section v-if="isHost" class="config-section border border-border rounded-lg py-3 px-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Add Bots</h3>
          <button
            v-if="!showAIForm"
            class="py-2 px-3 bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.3)] rounded-md text-[#c4b5fd] text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-[rgba(139,92,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
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
          class="flex flex-col gap-3 overflow-hidden"
        >
          <div class="flex gap-2">
            <input
              v-model="aiName"
              type="text"
              placeholder="Bot name (optional)"
              maxlength="20"
              class="flex-1 py-2 px-3 bg-bg-muted border border-border rounded-md text-text-primary text-sm outline-none transition-colors duration-200 focus:border-primary placeholder:text-text-muted"
            />
            <select v-model="aiDifficulty" class="py-2 px-3 bg-bg-muted border border-border rounded-md text-text-primary text-sm cursor-pointer outline-none">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md font-semibold text-sm cursor-pointer transition-all duration-200 border bg-surface border-border text-text-secondary hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="showAIForm = false">Cancel</button>
            <button class="btn inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md font-semibold text-sm cursor-pointer transition-all duration-200 border bg-gradient-to-br from-accent to-accent-strong text-white border-accent hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)]" @click="handleAddAI">Add Bot</button>
          </div>
        </Motion>
      </section>

      <!-- Spectators -->
      <section v-if="spectators.length > 0" class="config-section border border-border rounded-lg p-3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="m-0 font-display text-base font-semibold text-text-primary">Spectators ({{ spectators.length }})</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="spectator in spectators"
            :key="spectator.id"
            class="spectator-chip py-1 px-3 bg-bg-muted border border-border rounded-full text-sm text-text-secondary"
            :class="{ 'is-me': spectator.id === playerId }"
          >
            {{ spectator.name }}
            <span v-if="spectator.id === playerId" class="text-text-muted text-xs">(you)</span>
          </span>
        </div>
      </section>

      <!-- Spectator Notice -->
      <div v-if="isSpectator" class="flex items-center justify-center gap-2 py-3 px-4 bg-[rgba(99,102,241,0.1)] border border-dashed border-[rgba(99,102,241,0.3)] rounded-md text-text-secondary text-sm">
        <span>👁️</span>
        <span>You're watching as a spectator. You won't be able to make moves.</span>
      </div>

      <!-- Action Footer -->
      <div class="lobby-actions flex items-center justify-between gap-3 pt-4 border-t border-border mt-2">
        <button class="btn inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md font-semibold text-sm cursor-pointer transition-all duration-200 border bg-surface border-border text-text-secondary hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="handleLeaveRoom">
          Leave Room
        </button>

        <button
          v-if="isHost"
          class="btn btn-start inline-flex items-center justify-center gap-2 py-3 px-6 rounded-md font-semibold text-base cursor-pointer transition-all duration-200 border bg-gradient-to-br from-positive to-[#059669] border-positive text-white hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)] disabled:bg-gradient-to-br disabled:from-[#4b5563] disabled:to-[#374151] disabled:border-[#4b5563] disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canStartGame || isUpdatingRules"
          @click="handleStartGame"
        >
          {{ isUpdatingRules ? 'Syncing...' : activePlayers.length < 2 ? 'Waiting for players...' : '🎮 Start Game' }}
        </button>

        <div v-else class="waiting-message flex items-center gap-2 text-text-muted text-sm">
          <span class="waiting-dots flex gap-1"><span></span><span></span><span></span></span>
          <span>{{ isSpectator ? 'Waiting to spectate...' : 'Waiting for host to start...' }}</span>
        </div>
      </div>
    </Motion>

    <!-- Name Setup Popup -->
    <Transition name="fade">
      <div v-if="needsNameSetup" class="name-setup-overlay fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.85)] z-[900] p-4">
        <Motion
          :initial="{ opacity: 0, scale: 0.95, y: 20 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.3, easing: livelySpringEasing }"
          class="bg-surface border border-border rounded-lg p-6 max-w-[400px] w-full text-center"
        >
          <h3 class="m-0 mb-2 font-display text-xl font-bold text-text-primary">Welcome! Pick Your Name</h3>
          <p class="m-0 mb-4 text-sm text-text-muted">Choose a unique name for this room</p>

          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-2 text-left">
              <label for="name-input" class="text-sm font-medium text-text-secondary">Your Name</label>
              <input
                id="name-input"
                v-model="nameInput"
                type="text"
                placeholder="Enter your name"
                maxlength="20"
                class="py-3 px-4 bg-bg-muted border-2 border-border rounded-md text-text-primary text-base outline-none transition-colors duration-200 focus:border-accent placeholder:text-text-tertiary"
                @keyup.enter="handleConfirmName"
              />
            </div>

            <label class="flex items-center gap-2 cursor-pointer p-2 my-1">
              <input type="checkbox" v-model="spectatorChoice" class="w-[18px] h-[18px] accent-accent cursor-pointer" />
              <span class="text-sm text-text-secondary">Join as spectator (watch only)</span>
            </label>

            <!-- Error display -->
            <div v-if="nameSetupError" class="py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-md text-[#fca5a5] text-sm text-center">
              {{ nameSetupError }}
            </div>

            <div class="flex gap-2 mt-2">
              <button class="btn flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md font-semibold text-sm cursor-pointer transition-all duration-200 border bg-transparent border-border text-text-secondary hover:bg-surface-elevated hover:text-text-primary" @click="handleSkipNameSetup">
                Skip
              </button>
              <button
                class="btn flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md font-semibold text-sm cursor-pointer transition-all duration-200 border bg-gradient-to-br from-accent to-accent-strong text-white border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!nameInput.trim()"
                @click="handleConfirmName"
              >
                {{ spectatorChoice ? 'Join as Spectator' : 'Confirm' }}
              </button>
            </div>
          </div>

          <p class="mt-4 text-xs text-text-muted">Or skip to keep your current name ({{ myPlayer?.name || 'Player' }})</p>
        </Motion>
      </div>
    </Transition>

    <!-- Countdown Overlay -->
    <Transition name="countdown-fade">
      <div v-if="isInCountdown" class="countdown-overlay fixed inset-0 flex flex-col items-center justify-center bg-[rgba(0,0,0,0.9)] z-[1000]">
        <Motion
          :key="countdownSeconds"
          :initial="{ scale: 2, opacity: 0 }"
          :animate="{ scale: 1, opacity: 1 }"
          :transition="{ duration: 0.3, easing: livelySpringEasing }"
          class="text-[10rem] font-extrabold text-primary leading-none"
          :style="{ textShadow: '0 0 60px var(--color-primary)' }"
        >
          {{ countdownSeconds }}
        </Motion>
        <p class="mt-4 text-xl text-text-secondary uppercase tracking-[0.15em]">Get Ready!</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Connection status animations */
.status-dot {
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

/* Loading spinner */
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Config section theming */
.config-section {
  background: rgba(26, 29, 53, 0.7);
}

:root.light .config-section {
  background: rgba(255, 255, 255, 0.7);
}

:root[data-theme="christmas"] .config-section {
  background: rgba(42, 21, 24, 0.7);
}

/* Player row states */
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

/* Player avatar symbol colors */
.player-avatar :deep(svg) {
  width: 28px;
  height: 28px;
}

.player-avatar.symbol-x { color: var(--neon-cyan); }
.player-avatar.symbol-o { color: var(--neon-pink); }
.player-avatar.symbol-square { color: var(--neon-purple); }
.player-avatar.symbol-star { color: var(--neon-orange); }
.player-avatar.symbol-triangle { color: var(--neon-green); }
.player-avatar.symbol-diamond { color: var(--neon-blue); }
.player-avatar.symbol-circle { color: var(--neon-yellow); }
.player-avatar.symbol-plus { color: var(--neon-red); }
.player-avatar.symbol-heart { color: var(--neon-teal); }
.player-avatar.symbol-pentagon { color: var(--neon-lime); }

/* Copy button copied state */
.copy-btn.copied {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

/* Preset button states */
.preset-btn.selected {
  background: rgba(99, 102, 241, 0.15);
  border-color: var(--color-accent);
  color: var(--color-text-primary);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.preset-btn.applied {
  border-width: 3px;
}

/* Spectator chip states */
.spectator-chip.is-me {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--color-text-primary);
}

/* Waiting dots animation */
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

/* Transitions */
.countdown-fade-enter-active,
.countdown-fade-leave-active {
  transition: opacity 0.3s ease;
}

.countdown-fade-enter-from,
.countdown-fade-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .lobby-actions {
    flex-direction: column;
  }

  .lobby-actions .btn {
    width: 100%;
  }

  .btn-start {
    order: -1;
  }
}
</style>
