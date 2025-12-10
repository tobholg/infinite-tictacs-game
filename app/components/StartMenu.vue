<template>
  <div class="start-menu">
    <!-- Stage: Mode Selection -->
    <Transition name="slide-fade" mode="out-in">
      <div v-if="stage === 'mode-select'" key="mode-select" class="stage-content">
        <!-- Sound button only on main menu -->
        <div class="stage-header justify-end">
          <button class="settings-btn" @click="showSoundSettings = true">
            <span>🔊</span>
            <span>Sound</span>
          </button>
        </div>
        <section class="config-section mode-select-section">
          <div class="section-header centered">
            <h2 class="section-title large">How do you want to play?</h2>
          </div>
          <div class="mode-cards">
            <button class="mode-card" @click="selectLocalMode">
              <span class="mode-icon">🎮</span>
              <span class="mode-label">Local Game</span>
              <span class="mode-desc">Play on this device</span>
            </button>
            <button class="mode-card" @click="selectOnlineMode">
              <span class="mode-icon">🌐</span>
              <span class="mode-label">Online</span>
              <span class="mode-desc">Play with friends via room code</span>
            </button>
          </div>
        </section>
      </div>

      <!-- Stage: Local Setup -->
      <div v-else-if="stage === 'local-setup'" key="local-setup" class="stage-content">
        <!-- Header with Back and Settings -->
        <div class="stage-header">
          <button class="back-btn" @click="goBack">
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <div class="header-actions">
            <button class="settings-btn" @click="showSoundSettings = true">
              <span>🔊</span>
              <span>Sound</span>
            </button>
            <button class="settings-btn" @click="showSettings = true">
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        <!-- Game Mode -->
        <section class="config-section">
          <div class="section-header">
            <h3 class="section-title">Game Mode</h3>
            <p class="section-description">Select your favorite mode</p>
          </div>
          <div class="presets-grid">
            <label v-for="preset in gamePresets" :key="preset.id"
                   class="preset-card"
                   :class="{ selected: isPresetSelected(preset) }">
              <input type="radio"
                     :checked="isPresetSelected(preset)"
                     @change="selectPreset(preset)" />
              <div class="preset-icon">{{ preset.icon }}</div>
              <div class="preset-info">
                <h4 class="preset-name">{{ preset.name }}</h4>
                <p class="preset-description">{{ preset.description }}</p>
                <div v-if="preset.rules.length > 0" class="preset-tags">
                  <span v-for="rule in preset.rules" :key="rule" class="tag">
                    {{ getRuleLabel(rule) }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </section>

        <!-- Configure Players -->
        <section class="config-section">
          <div class="section-header">
            <h3 class="section-title">Players</h3>
            <p class="section-description">Set player names and symbols</p>
          </div>

          <div class="players-list">
            <div v-for="(player, index) in players" :key="index" class="player-row"
                 :class="{ 'ai-player': player.isAI }">
              <div class="player-badge">{{ index + 1 }}</div>
              <CharacterPicker
                v-model="player.symbol"
                :used-symbols="getUsedSymbols(index)" />
              <input
                v-model="player.name"
                type="text"
                :placeholder="player.isAI ? `AI ${index + 1}` : `Player ${index + 1} name`"
                class="player-input"
                :disabled="player.isAI"
                @input="handlePlayerNameInput(index)" />

              <!-- AI Toggle & Difficulty -->
              <div class="ai-controls">
                <button
                  @click="toggleAI(index)"
                  class="ai-toggle"
                  :class="{ active: player.isAI }"
                  :title="player.isAI ? 'Switch to Human' : 'Switch to AI'">
                  {{ player.isAI ? '🤖' : '👤' }}
                </button>
                <select
                  v-if="player.isAI"
                  v-model="player.aiDifficulty"
                  class="ai-difficulty-select">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <button
                v-if="players.length > 2"
                @click="removePlayer(index)"
                class="btn-remove"
                title="Remove player">
                ✕
              </button>
            </div>

            <!-- AI Model Status -->
            <div v-if="hasAnyAI" class="ai-model-status">
              <span v-if="aiModelInfo" class="model-trained">
                🤖 AI trained with {{ aiModelInfo.gamesPlayed.toLocaleString() }} games
              </span>
              <span v-else class="model-untrained">
                ⚠️ No AI trained for {{ players.length }} players yet.
              </span>
            </div>

            <button
              v-if="players.length < 10"
              @click="addPlayer"
              class="btn btn-secondary add-player-btn">
              <span>+</span>
              <span>Add Player</span>
            </button>
          </div>
        </section>

        <!-- Start Game Button -->
        <div class="stage-footer">
          <button
            @click="handleStartGame"
            class="btn btn-primary btn-large btn-start-game"
            :disabled="activePlayers.length < 2 || !selectedMode">
            <span>🎯 Start Game</span>
          </button>
          <p v-if="activePlayers.length < 2" class="error-message">
            At least 2 players required to start
          </p>
          <p v-else-if="!selectedMode" class="error-message">
            Please select a game mode
          </p>
        </div>
      </div>

      <!-- Stage: Online Selection -->
      <div v-else-if="stage === 'online-select'" key="online-select" class="stage-content">
        <!-- Header with Back and Sound -->
        <div class="stage-header">
          <button class="back-btn" @click="goBack">
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <button class="settings-btn" @click="showSoundSettings = true">
            <span>🔊</span>
            <span>Sound</span>
          </button>
        </div>

        <section class="config-section mode-select-section">
          <div class="section-header centered">
            <h2 class="section-title large">Online Multiplayer</h2>
          </div>
          <div class="mode-cards">
            <button class="mode-card" @click="selectHostMode">
              <span class="mode-icon">🎯</span>
              <span class="mode-label">Host Game</span>
              <span class="mode-desc">Create a room and invite friends</span>
            </button>
            <button class="mode-card" @click="handleJoinGameClick" :class="{ expanded: joinFormExpanded }">
              <span class="mode-icon">🔗</span>
              <span class="mode-label">Join Game</span>
              <span class="mode-desc">Enter a room code to join</span>
            </button>
          </div>
        </section>

        <!-- Join Form (inline) -->
        <Transition name="expand">
          <section v-if="joinFormExpanded" class="config-section join-form-section">
            <div class="section-header">
              <h3 class="section-title">Join a Room</h3>
            </div>
            <div class="join-form">
              <div class="form-group">
                <label for="join-name">Your Name</label>
                <input
                  id="join-name"
                  v-model="joinName"
                  type="text"
                  placeholder="Enter your name"
                  maxlength="20"
                />
              </div>
              <div class="form-group">
                <label for="join-code">Room Code</label>
                <input
                  id="join-code"
                  v-model="joinCode"
                  type="text"
                  placeholder="Enter 6-letter code"
                  maxlength="6"
                  class="code-input"
                  @keyup.enter="handleJoinRoom"
                />
              </div>
              <div class="form-group spectator-option">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="joinAsSpectator" />
                  <span class="checkbox-text">Join as spectator (watch only)</span>
                </label>
              </div>
              <button
                class="btn btn-primary"
                :disabled="!joinName.trim() || !joinCode.trim()"
                @click="handleJoinRoom"
              >
                {{ joinAsSpectator ? 'Join as Spectator' : 'Join Room' }}
              </button>
            </div>
          </section>
        </Transition>
      </div>

      <!-- Stage: Host Setup -->
      <div v-else-if="stage === 'host-setup'" key="host-setup" class="stage-content">
        <!-- Header with Back, Sound, and Settings -->
        <div class="stage-header">
          <button class="back-btn" @click="goBack">
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <div class="header-actions">
            <button class="settings-btn" @click="showSoundSettings = true">
              <span>🔊</span>
              <span>Sound</span>
            </button>
            <button class="settings-btn" @click="showOnlineSettings = true">
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        <section class="config-section">
          <div class="section-header centered">
            <h2 class="section-title large">Host Online Game</h2>
          </div>

          <!-- Host Name -->
          <div class="form-group">
            <label for="host-name">Your Name</label>
            <input
              id="host-name"
              v-model="hostName"
              type="text"
              placeholder="Enter your name"
              maxlength="20"
            />
          </div>
        </section>

        <!-- Game Mode -->
        <section class="config-section">
          <div class="section-header">
            <h3 class="section-title">Game Mode</h3>
            <p class="section-description">Select your favorite mode</p>
          </div>
          <div class="presets-grid">
            <label v-for="preset in gamePresets" :key="preset.id"
                   class="preset-card"
                   :class="{ selected: isPresetSelected(preset) }">
              <input type="radio"
                     :checked="isPresetSelected(preset)"
                     @change="selectPreset(preset)" />
              <div class="preset-icon">{{ preset.icon }}</div>
              <div class="preset-info">
                <h4 class="preset-name">{{ preset.name }}</h4>
                <p class="preset-description">{{ preset.description }}</p>
                <div v-if="preset.rules.length > 0" class="preset-tags">
                  <span v-for="rule in preset.rules" :key="rule" class="tag">
                    {{ getRuleLabel(rule) }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </section>

        <!-- Create Room Button -->
        <div class="stage-footer">
          <button
            @click="handleCreateRoom"
            class="btn btn-primary btn-large btn-start-game"
            :disabled="!hostName.trim() || !selectedMode">
            <span>🚀 Create Room</span>
          </button>
          <p v-if="!hostName.trim()" class="error-message">
            Please enter your name
          </p>
          <p v-else-if="!selectedMode" class="error-message">
            Please select a game mode
          </p>
        </div>
      </div>
    </Transition>

    <!-- Local Settings Modal -->
    <SettingsModal
      :is-open="showSettings"
      :cant-place-effects="cantPlaceEffects"
      @close="showSettings = false"
      @update:cant-place-effects="cantPlaceEffects = $event"
    />

    <!-- Online Settings Modal -->
    <OnlineSettingsPopup
      :is-open="showOnlineSettings"
      @close="showOnlineSettings = false"
    />

    <!-- Sound Settings Modal -->
    <SoundSettingsPopup
      :is-open="showSoundSettings"
      @close="showSoundSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CharacterPicker from './CharacterPicker.vue'
import SettingsModal from './SettingsModal.vue'
import OnlineSettingsPopup from './OnlineSettingsPopup.vue'
import SoundSettingsPopup from './SoundSettingsPopup.vue'
import { useQLearning, type AIDifficulty } from '~/composables/useQLearning'
import { useSound } from '~/composables/useSound'

interface GamePreset {
  id: string
  name: string
  icon: string
  description: string
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
}

export type PlayerSymbol = 'X' | 'O' | 'Square' | 'Star' | 'Triangle' | 'Diamond' | 'Circle' | 'Plus' | 'Heart' | 'Pentagon'

export interface Player {
  name: string
  symbol: PlayerSymbol
  active: boolean
  teamId?: number
  isAI?: boolean
  aiDifficulty?: AIDifficulty
}

export interface CantPlaceEffects {
  dimmedCells: boolean
  stripedPattern: boolean
  warningIcon: boolean
}

export interface GameSettings {
  players: Player[]
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
  cantPlaceEffects?: CantPlaceEffects
}

export interface OnlineHostSettings {
  hostName: string
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
  cantPlaceEffects?: CantPlaceEffects
}

// Get AI model info
const { getStoredModelInfo } = useQLearning()

// Sound effects
const { play: playSound } = useSound()

const emit = defineEmits<{
  startGame: [settings: GameSettings]
  createRoom: [settings: OnlineHostSettings]
  joinRoom: [code: string, name: string, asSpectator: boolean]
}>()

// Stage management
type Stage = 'mode-select' | 'local-setup' | 'online-select' | 'host-setup'
const stage = ref<Stage>('mode-select')

// Settings modals
const showSettings = ref(false) // Local settings
const showOnlineSettings = ref(false) // Online settings
const showSoundSettings = ref(false) // Sound settings

// Game configuration
const selectedMode = ref<'classic'>('classic')
const selectedRules = ref<string[]>([])
const timePresetValue = ref<number>(10)

// Can't Place Effects settings
const cantPlaceEffects = ref<CantPlaceEffects>({
  dimmedCells: true,
  stripedPattern: false,
  warningIcon: false
})

// Game presets
const gamePresets: GamePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '🎯',
    description: 'Pure strategy with unlimited time and infinite expansion.',
    gameMode: 'classic',
    rules: []
  },
  {
    id: 'speed-classic',
    name: 'Speed Classic',
    icon: '⚡',
    description: 'Fast-paced classic. 5 seconds per move keeps the pressure on.',
    gameMode: 'classic',
    rules: ['timeLimit'],
    timeLimit: 5
  }
]

// Player setup
const allSymbols: PlayerSymbol[] = ['X', 'O', 'Square', 'Star', 'Triangle', 'Diamond', 'Circle', 'Plus', 'Heart', 'Pentagon']

const players = ref<Player[]>([
  { name: 'Player 1', symbol: 'X', active: true },
  { name: 'Player 2', symbol: 'O', active: true }
])

const activePlayers = computed(() => players.value.filter(p => p.active && (p.name.trim() !== '' || p.isAI)))

// AI-related computed properties
const hasAnyAI = computed(() => players.value.some(p => p.isAI))

const aiModelInfo = computed(() => {
  if (!hasAnyAI.value) return null
  return getStoredModelInfo(players.value.length)
})

// Online flow state
const joinFormExpanded = ref(false)
const joinName = ref('')
const joinCode = ref('')
const joinAsSpectator = ref(false)
const hostName = ref('')

// Stage navigation
function selectLocalMode() {
  playSound('buttonClick')
  resetLocalState()
  stage.value = 'local-setup'
}

function selectOnlineMode() {
  playSound('buttonClick')
  resetOnlineState()
  stage.value = 'online-select'
}

function selectHostMode() {
  playSound('buttonClick')
  stage.value = 'host-setup'
}

function handleJoinGameClick() {
  playSound('buttonClick')
  joinFormExpanded.value = true
}

function goBack() {
  playSound('buttonClick')
  if (stage.value === 'local-setup' || stage.value === 'online-select') {
    stage.value = 'mode-select'
  } else if (stage.value === 'host-setup') {
    stage.value = 'online-select'
  }
}

// Reset state when switching modes
function resetLocalState() {
  players.value = [
    { name: 'Player 1', symbol: 'X', active: true },
    { name: 'Player 2', symbol: 'O', active: true }
  ]
  selectedMode.value = 'classic'
  selectedRules.value = []
  timePresetValue.value = 10
}

function resetOnlineState() {
  joinFormExpanded.value = false
  joinName.value = ''
  joinCode.value = ''
  joinAsSpectator.value = false
  hostName.value = ''
  selectedMode.value = 'classic'
  selectedRules.value = []
  timePresetValue.value = 10
}

// AI functions
function toggleAI(index: number) {
  const player = players.value[index]
  player.isAI = !player.isAI
  if (player.isAI) {
    player.name = `AI ${index + 1}`
    player.aiDifficulty = 'medium'
    player.active = true
  } else {
    player.name = `Player ${index + 1}`
    player.aiDifficulty = undefined
  }
}

// Preset selection
const arraysEqual = (arr1: string[], arr2: string[]) => {
  if (arr1.length !== arr2.length) return false
  const sorted1 = [...arr1].sort()
  const sorted2 = [...arr2].sort()
  return sorted1.every((val, index) => val === sorted2[index])
}

const isPresetSelected = (preset: GamePreset) => {
  return selectedMode.value === preset.gameMode && arraysEqual(selectedRules.value, preset.rules)
}

const getRuleLabel = (ruleId: string) => {
  const labels: Record<string, string> = {
    gravity: 'Gravity',
    timeLimit: 'Timer',
    surrounded: 'Surrounded',
    mirror: 'Mirror',
    decay: 'Decay'
  }
  return labels[ruleId] || ruleId
}

const selectPreset = (preset: GamePreset) => {
  playSound('buttonClick')
  selectedMode.value = preset.gameMode
  selectedRules.value = [...preset.rules]
  if (preset.timeLimit) {
    timePresetValue.value = preset.timeLimit
  } else {
    if (!preset.rules.includes('timeLimit')) {
      timePresetValue.value = 10
    }
  }
}

// Player management
const handlePlayerNameInput = (index: number) => {
  const player = players.value[index]
  if (!player) return
  player.active = player.name.trim() !== ''
}

const getUsedSymbols = (currentIndex: number): PlayerSymbol[] => {
  return players.value
    .filter((_, index) => index !== currentIndex)
    .map(p => p.symbol)
}

const addPlayer = () => {
  if (players.value.length >= 10) return

  const usedSymbols = players.value.map(p => p.symbol)
  const availableSymbol = allSymbols.find(s => !usedSymbols.includes(s)) || 'Circle'
  const playerNumber = players.value.length + 1

  players.value.push({
    name: `Player ${playerNumber}`,
    symbol: availableSymbol,
    active: true
  })
}

const removePlayer = (index: number) => {
  if (players.value.length <= 2) return
  players.value.splice(index, 1)
}

// Actions
const handleStartGame = () => {
  if (activePlayers.value.length >= 2) {
    playSound('buttonClick')
    const settings: GameSettings = {
      players: [...activePlayers.value],
      gameMode: selectedMode.value,
      rules: [...selectedRules.value],
      timeLimit: selectedRules.value.includes('timeLimit') ? timePresetValue.value : undefined,
      cantPlaceEffects: { ...cantPlaceEffects.value }
    }
    emit('startGame', settings)
  }
}

const handleCreateRoom = () => {
  if (hostName.value.trim() && selectedMode.value) {
    playSound('buttonClick')
    const settings: OnlineHostSettings = {
      hostName: hostName.value.trim(),
      gameMode: selectedMode.value,
      rules: [...selectedRules.value],
      timeLimit: selectedRules.value.includes('timeLimit') ? timePresetValue.value : undefined,
      cantPlaceEffects: { ...cantPlaceEffects.value }
    }
    emit('createRoom', settings)
  }
}

const handleJoinRoom = () => {
  if (joinName.value.trim() && joinCode.value.trim()) {
    playSound('buttonClick')
    emit('joinRoom', joinCode.value.trim().toUpperCase(), joinName.value.trim(), joinAsSpectator.value)
  }
}
</script>

<style scoped>
.start-menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 700px;
  margin: 0 auto;
}

.stage-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Stage Header */
.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.stage-header.justify-end {
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

.settings-btn {
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

.settings-btn:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
  transform: rotate(15deg);
}

/* Transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

/* Sections */
.config-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
}

.mode-select-section {
  background: linear-gradient(135deg, var(--color-surface), rgba(99, 102, 241, 0.05));
}

.section-header {
  margin-bottom: var(--space-3);
}

.section-header.centered {
  text-align: center;
}

.section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-title.large {
  font-size: var(--text-xl);
}

.section-description {
  margin: var(--space-1) 0 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Mode Cards */
.mode-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-5);
  background: var(--color-surface-elevated);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.mode-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(99, 102, 241, 0.2);
}

.mode-icon {
  font-size: 2.5rem;
}

.mode-label {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.mode-desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* Presets Grid */
.presets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.preset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-muted);
  border: 4px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}

.preset-card input {
  display: none;
}

.preset-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 24px rgba(99, 102, 241, 0.2);
}

.preset-card.selected {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(129, 140, 248, 0.22));
  border-color: var(--color-accent);
  border-width: 5px;
  box-shadow:
    0 20px 40px rgba(99, 102, 241, 0.35),
    0 0 0 4px rgba(99, 102, 241, 0.3),
    0 0 60px rgba(99, 102, 241, 0.2);
  transform: translateY(-6px) scale(1.03);
  color: #eef2ff;
}

.preset-card.selected .preset-description {
  color: rgba(238, 242, 255, 0.85);
}

.preset-card.selected .preset-name {
  color: #ffffff;
  font-size: 1.1rem;
}

.preset-icon {
  font-size: 3.5rem;
  line-height: 1;
}

.preset-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.preset-name {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.preset-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  padding: 0.25rem 0.75rem;
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 600;
  border-radius: var(--radius-pill);
}

/* Players List */
.players-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.player-row {
  display: grid;
  grid-template-columns: 40px auto 1fr auto auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  background: rgba(30, 30, 45, 0.5);
  backdrop-filter: blur(12px);
  border: 2px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.player-row:hover {
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(40, 40, 60, 0.6);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

.player-badge {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.2);
  backdrop-filter: blur(8px);
  color: rgba(167, 139, 250, 0.95);
  font-weight: 700;
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);
}

.player-input {
  padding: 0.75rem 1rem;
  background: rgba(20, 20, 35, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: var(--radius-md);
  color: rgba(230, 230, 250, 0.95);
  font-size: var(--text-md);
  transition: all var(--transition-base);
}

.player-input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  background: rgba(25, 25, 40, 0.5);
}

.player-input::placeholder {
  color: rgba(150, 150, 170, 0.6);
}

.btn-remove {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: var(--color-critical);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.1);
}

.add-player-btn {
  align-self: flex-start;
}

/* AI Controls */
.ai-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ai-toggle {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.25rem;
  transition: all var(--transition-base);
}

.ai-toggle:hover {
  border-color: var(--color-accent);
  transform: scale(1.05);
}

.ai-toggle.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border-color: var(--color-accent);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
}

.ai-difficulty-select {
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.ai-difficulty-select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.player-row.ai-player {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
  border-color: rgba(99, 102, 241, 0.4);
}

.player-row.ai-player .player-input {
  opacity: 0.7;
}

/* AI Model Status */
.ai-model-status {
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
  text-align: center;
  font-size: var(--text-sm);
}

.model-trained {
  color: #22c55e;
}

.model-untrained {
  color: #f59e0b;
}

/* Form Groups */
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input[type="text"] {
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  outline: none;
  transition: border-color 0.2s ease;
}

.form-group input[type="text"]:focus {
  border-color: var(--color-primary);
}

.form-group input::placeholder {
  color: var(--color-text-muted);
}

.code-input {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-family: monospace;
  font-size: var(--text-lg) !important;
  text-align: center;
}

/* Join Form Section */
.join-form-section {
  margin-top: var(--space-3);
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Spectator Option */
.spectator-option {
  margin-top: var(--space-1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.checkbox-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Stage Footer */
.stage-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: var(--text-md);
  transition: all var(--transition-base);
  cursor: pointer;
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
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.btn-large {
  padding: 1rem 2rem;
  font-size: var(--text-lg);
}

.btn-start-game {
  padding: 1.5rem 3rem;
  font-size: 1.25rem;
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: #10b981;
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
}

.btn-start-game:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 15px 40px rgba(16, 185, 129, 0.4);
  background: linear-gradient(135deg, #059669, #047857);
}

.btn-start-game:disabled {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  border-color: #6b7280;
  box-shadow: none;
}

.error-message {
  margin: 0;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: var(--color-critical);
  font-size: var(--text-sm);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 600px) {
  .mode-cards {
    grid-template-columns: 1fr;
  }

  .presets-grid {
    grid-template-columns: 1fr;
  }

  .player-row {
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
  }

  .player-row > :nth-child(3) {
    grid-column: span 2;
  }

  .stage-header {
    flex-wrap: wrap;
  }
}
</style>
