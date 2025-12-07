<template>
  <div class="start-menu">
    <!-- Single Page Setup - No Stages -->
    <div class="stage-content">

        <!-- Game Mode -->
        <section class="config-section">
          <div class="section-header">
            <h3 class="section-title">Game Mode</h3>
            <p class="section-description">Select your favorite mode from the quick picks below</p>
          </div>

          <!-- Favorites -->
          <div v-if="favoritePresetsData.length > 0" class="presets-grid">
            <label v-for="preset in favoritePresetsData" :key="preset.id"
                   class="preset-card"
                   :class="{ selected: isPresetSelected(preset) }">
              <input type="radio"
                     :checked="isPresetSelected(preset)"
                     @change="selectPresetFromFavorite(preset)" />
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

          <!-- Empty State -->
          <div v-else class="empty-state">
            <div class="empty-icon">⭐</div>
            <p class="empty-text">No favorites yet</p>
            <p class="empty-hint">Continue to next page to browse the preset gallery</p>
          </div>
        </section>

        <!-- Configure Players -->
        <section class="config-section">
          <div class="section-header">
            <h3 class="section-title">Players</h3>
            <p class="section-description">
              {{ selectedMode === 'team' ? 'Set team names - teammates share symbols and alternate turns' : 'Set player names and symbols' }}
            </p>
          </div>

          <div class="players-list">
            <div v-for="(player, index) in players" :key="index" class="player-row"
                 :class="{ 'team-row': selectedMode === 'team', 'ai-player': player.isAI }">
              <div class="player-badge">{{ index + 1 }}</div>
              <div v-if="selectedMode === 'team' && player.teamId !== undefined" class="team-badge"
                   :class="`team-${player.teamId}`">
                Team {{ player.teamId + 1 }}
              </div>
              <CharacterPicker
                v-model="player.symbol"
                :used-symbols="getUsedSymbols(index)"
                :disabled="selectedMode === 'team'" />
              <input
                v-model="player.name"
                type="text"
                :placeholder="player.isAI ? `AI ${index + 1}` : (selectedMode === 'team' ? `Team ${player.teamId! + 1} - Player ${Math.floor(index / 2) + 1}` : `Player ${index + 1} name`)"
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
                v-if="players.length > 2 && selectedMode !== 'team'"
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
                <button @click="emit('openAiTraining')" class="train-link">Train now</button>
              </span>
            </div>

            <button
              v-if="players.length < 10 && selectedMode !== 'team'"
              @click="addPlayer"
              class="btn btn-secondary add-player-btn">
              <span>+</span>
              <span>Add Player</span>
            </button>
          </div>
        </section>

        <!-- Visual Settings -->
        <section class="config-section effects-settings" v-if="showVisualSettings">
          <div class="section-header">
            <h3 class="section-title">Visual Settings</h3>
            <p class="section-description">Customize the look and feel of your game</p>
          </div>

          <!-- Theme Selector -->
          <div class="theme-selector">
            <h4 class="subsection-label">Theme</h4>
            <div class="theme-options">
              <label class="theme-option" :class="{ active: themePreference === 'auto' }">
                <input type="radio" name="theme" value="auto" :checked="themePreference === 'auto'" @change="setPreference('auto')" />
                <span class="theme-icon">🎄</span>
                <span class="theme-label">Auto</span>
                <span class="theme-hint">{{ isDecember ? 'Christmas active' : 'Default active' }}</span>
              </label>
              <label class="theme-option" :class="{ active: themePreference === 'christmas' }">
                <input type="radio" name="theme" value="christmas" :checked="themePreference === 'christmas'" @change="setPreference('christmas')" />
                <span class="theme-icon">❄️</span>
                <span class="theme-label">Christmas</span>
                <span class="theme-hint">Always festive</span>
              </label>
              <label class="theme-option" :class="{ active: themePreference === 'default' }">
                <input type="radio" name="theme" value="default" :checked="themePreference === 'default'" @change="setPreference('default')" />
                <span class="theme-icon">🌙</span>
                <span class="theme-label">Default</span>
                <span class="theme-hint">Classic neon</span>
              </label>
            </div>
          </div>

          <!-- Blocked Cells Settings -->
          <h4 class="subsection-label">Blocked Cells Appearance</h4>
          <div class="effects-grid">
            <label class="effect-card" :class="{ active: cantPlaceEffects.dimmedCells }">
              <input type="checkbox" v-model="cantPlaceEffects.dimmedCells" />
              <span class="effect-icon">🌘</span>
              <div class="effect-info">
                <h4 class="effect-name">Dimmed Cells</h4>
                <p class="effect-description">Lower opacity on unavailable cells for subtle depth</p>
              </div>
            </label>

            <label class="effect-card" :class="{ active: cantPlaceEffects.stripedPattern }">
              <input type="checkbox" v-model="cantPlaceEffects.stripedPattern" />
              <span class="effect-icon">▧</span>
              <div class="effect-info">
                <h4 class="effect-name">Striped Pattern</h4>
                <p class="effect-description">Diagonal lines to clearly mark blocked zones</p>
              </div>
            </label>

            <label class="effect-card" :class="{ active: cantPlaceEffects.warningIcon }">
              <input type="checkbox" v-model="cantPlaceEffects.warningIcon" />
              <span class="effect-icon">⚠️</span>
              <div class="effect-info">
                <h4 class="effect-name">Warning Badge</h4>
                <p class="effect-description">Show indicator icon on non-playable cells</p>
              </div>
            </label>
          </div>
        </section>

        <!-- Start Game Button -->
        <div class="stage-footer">
          <div class="footer-actions">
            <button
              @click="showVisualSettings = !showVisualSettings"
              class="btn btn-secondary settings-toggle-btn"
              type="button">
              <span>⚙️</span>
              <span>{{ showVisualSettings ? 'Hide' : 'Show' }} Settings</span>
            </button>
            <button
              @click="emit('openAiTraining')"
              class="btn btn-secondary ai-training-btn"
              type="button">
              <span>🤖</span>
              <span>Train AI</span>
            </button>
          </div>
          <button
            @click="handleStartGame"
            class="btn btn-primary btn-large btn-start-game"
            :disabled="activePlayers.length < 2 || !selectedMode">
            <span>🎯 !</span>
          </button>
          <p v-if="activePlayers.length < 2" class="error-message">
            At least 2 players required to start
          </p>
          <p v-else-if="!selectedMode" class="error-message">
            Please select a game mode
          </p>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CharacterPicker from './CharacterPicker.vue'
import { useTheme, type ThemePreference } from '~/composables/useTheme'
import { useQLearning, type AIDifficulty } from '~/composables/useQLearning'

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
  teamId?: number  // Optional team identifier for team mode
  isAI?: boolean   // Whether this player is controlled by AI
  aiDifficulty?: AIDifficulty  // AI difficulty level
}

export interface CantPlaceEffects {
  dimmedCells: boolean        // Reduced opacity + darker tint
  stripedPattern: boolean     // Diagonal stripes pattern
  warningIcon: boolean        // Alert icon indicator
}

export interface GameSettings {
  players: Player[]
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
  cantPlaceEffects?: CantPlaceEffects
}

// Get AI model info
const { hasStoredModel, getStoredModelInfo } = useQLearning()

const emit = defineEmits<{
  startGame: [settings: GameSettings]
  openAiTraining: []
}>()

// Game configuration
const selectedMode = ref<'classic'>('classic')
const selectedRules = ref<string[]>([])
const timePresetValue = ref<number>(10)
const favoritePresets = ref<string[]>(['classic', 'speed-classic'])

// Can't Place Effects settings
const cantPlaceEffects = ref<CantPlaceEffects>({
  dimmedCells: true,
  stripedPattern: false,
  warningIcon: false
})

// Visual settings panel visibility
const showVisualSettings = ref(false)

// Theme settings
const { themePreference, setPreference, isDecember } = useTheme()

// Game presets - Only Classic and Speed Classic (5 sec)
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

const favoritePresetsData = computed(() => {
  return gamePresets.filter(preset => favoritePresets.value.includes(preset.id))
})

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

const selectPresetFromFavorite = (preset: GamePreset) => {
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

const handleStartGame = () => {
  if (activePlayers.value.length >= 2) {
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

onMounted(() => {
  // Always ensure both classic modes are available
  favoritePresets.value = ['classic', 'speed-classic']
  localStorage.setItem('favoritePresets', JSON.stringify(favoritePresets.value))
})
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

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.expand-enter-active, .expand-leave-active {
  transition: all 250ms ease;
  transform-origin: top;
}

.expand-enter-from, .expand-leave-to {
  opacity: 0;
  transform: scaleY(0.95);
}

/* Sections */
.config-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
}

.section-header {
  margin-bottom: var(--space-3);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-description {
  margin: var(--space-1) 0 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Button Icon */
.btn-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.25rem;
  transition: all var(--transition-base);
}

.btn-icon:hover {
  border-color: var(--color-accent);
  transform: scale(1.05);
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

.time-tag {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
}

.check-badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  background: var(--color-accent);
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Current Mode Indicator */
.mode-indicator {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.mode-indicator-content {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.mode-icon-large {
  font-size: 4rem;
  flex-shrink: 0;
}

.mode-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.mode-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.mode-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.mode-rules {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.mode-rule-tag {
  padding: 0.25rem 0.75rem;
  background: rgba(99, 102, 241, 0.2);
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 600;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.mode-rule-tag.time-tag {
  background: rgba(14, 165, 233, 0.2);
  color: #38bdf8;
  border-color: rgba(14, 165, 233, 0.3);
}

/* Collapsible Subsection */
.subsection-container {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.subsection-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.subsection-toggle:hover {
  border-color: var(--color-accent);
  background: var(--color-surface);
}

.toggle-icon {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  transition: transform 200ms ease;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.subsection-title {
  flex: 1;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
}

.rules-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 var(--space-2);
  background: var(--color-accent);
  color: white;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
}

.subsection-content {
  margin-top: var(--space-3);
}

.subsection-description {
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-4);
  background: var(--color-bg-muted);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-2);
  opacity: 0.5;
}

.empty-text {
  margin: 0 0 var(--space-1) 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Permanent Gallery Section */
.gallery-section-permanent {
  background: var(--color-surface-elevated);
}

.gallery-category {
  margin-bottom: var(--space-4);
}

.gallery-category:last-child {
  margin-bottom: 0;
}

.category-header {
  margin-bottom: var(--space-2);
}

.category-title {
  margin: 0 0 var(--space-1) 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.category-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-2);
}

.gallery-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.gallery-card:hover:not(.disabled) {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.gallery-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gallery-card.favorited {
  border-color: #facc15;
}

.gallery-card.selected {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(139, 92, 246, 0.24));
  border-color: var(--color-accent);
  box-shadow:
    0 18px 36px rgba(99, 102, 241, 0.28),
    0 0 0 3px rgba(99, 102, 241, 0.22);
  transform: translateY(-4px) scale(1.015);
  color: #eef2ff;
}

.gallery-card.selected .gallery-description {
  color: rgba(238, 242, 255, 0.85);
}

.gallery-card.selected .gallery-name {
  color: #ffffff;
}

.gallery-card.selected .tag,
.preset-card.selected .tag {
  background: rgba(15, 118, 110, 0.25);
  color: #5eead4;
}

.favorite-btn {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all var(--transition-base);
  opacity: 0.5;
  z-index: 2;
}

.favorite-btn:hover,
.favorite-btn.active {
  opacity: 1;
  transform: scale(1.2);
}

.settings-indicator {
  position: absolute;
  top: var(--space-1);
  left: var(--space-1);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid var(--color-accent);
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  transition: all var(--transition-base);
  z-index: 2;
}

.settings-indicator:hover {
  transform: scale(1.15) rotate(90deg);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
}

.gallery-icon {
  font-size: 1.75rem;
}

.gallery-name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.gallery-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.gallery-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.disabled-tag {
  margin-top: var(--space-1);
  padding: 0.25rem 0.5rem;
  background: rgba(148, 163, 184, 0.15);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: 600;
  border-radius: var(--radius-pill);
  align-self: flex-start;
}

/* Rules Grid */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-2);
}

.rule-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.rule-card input {
  display: none;
}

.rule-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.rule-card.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.rule-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.rule-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.rule-name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.rule-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.3;
}

/* Time Options */
.time-options {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.time-label {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: var(--text-sm);
}

.time-buttons {
  display: flex;
  gap: var(--space-2);
}

.time-btn {
  padding: 0.4rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.time-btn:hover {
  border-color: var(--color-accent);
}

.time-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

/* Territory Mode Settings */
.territory-settings {
  background: var(--color-surface-elevated);
  border: 2px solid rgba(99, 102, 241, 0.3);
}

/* Chain Reaction Mode Settings */
.chainreaction-settings {
  background: var(--color-surface-elevated);
  border: 2px solid rgba(255, 152, 0, 0.3);
}

/* Effects Settings */
.effects-settings {
  background: var(--color-surface-elevated);
  border: 2px solid rgba(168, 85, 247, 0.3);
}

/* Theme Selector */
.theme-selector {
  margin-bottom: var(--space-4);
}

.subsection-label {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: center;
}

.theme-option input {
  display: none;
}

.theme-option:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.theme-option.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.theme-icon {
  font-size: 1.75rem;
}

.theme-label {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.theme-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

@media (max-width: 600px) {
  .theme-options {
    grid-template-columns: 1fr;
  }
}

.effects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-2);
}

.effect-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.effect-card input {
  display: none;
}

.effect-card:hover {
  border-color: rgba(168, 85, 247, 0.5);
  transform: translateY(-2px);
}

.effect-card.active {
  background: rgba(168, 85, 247, 0.1);
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}

.effect-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.effect-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.effect-name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.effect-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.territory-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.territory-option-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.territory-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: var(--text-lg);
  color: var(--color-text-primary);
}

.label-icon {
  font-size: 1.5rem;
}

.territory-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-style: italic;
}

.territory-buttons {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.territory-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--color-text-primary);
}

.territory-btn:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.territory-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
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

.player-row.team-row {
  grid-template-columns: 40px 80px auto 1fr auto;
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

.team-badge {
  padding: 0.5rem 0.75rem;
  font-size: var(--text-xs);
  font-weight: 700;
  border-radius: var(--radius-pill);
  text-align: center;
  white-space: nowrap;
}

.team-badge.team-0 {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2));
  color: rgb(59, 130, 246);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.team-badge.team-1 {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
  color: rgb(239, 68, 68);
  border: 1px solid rgba(239, 68, 68, 0.3);
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

.train-link {
  background: none;
  border: none;
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  margin-left: var(--space-1);
}

.train-link:hover {
  color: var(--color-accent-strong);
}

/* Stage Footer */
.stage-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
}

.settings-toggle-btn {
  align-self: center;
}

.footer-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
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

.player-badge-inline {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
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
@media (max-width: 900px) {
  .presets-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  .gallery-grid {
    grid-template-columns: 1fr;
  }

  .rules-grid {
    grid-template-columns: 1fr;
  }

  .mode-indicator-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .mode-icon-large {
    font-size: 3rem;
  }

  .player-row {
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
  }

  .player-row > :nth-child(3) {
    grid-column: span 2;
  }

  .footer-actions {
    flex-direction: column;
    width: 100%;
  }

  .footer-actions .btn {
    width: 100%;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.modal-container {
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-lg);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 10;
}

.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.modal-close-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  transition: all var(--transition-base);
}

.modal-close-btn:hover {
  border-color: var(--color-critical);
  color: var(--color-critical);
  transform: rotate(90deg);
}

.modal-body {
  padding: var(--space-4);
}

.modal-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-description {
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  justify-content: flex-end;
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
  z-index: 10;
}

/* Modal Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 300ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: all 300ms ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

@media (max-width: 900px) {
  .modal-footer {
    flex-direction: column;
  }

  .modal-footer .btn {
    width: 100%;
  }
}

/* Light Mode Overrides */
@media (prefers-color-scheme: light) {
  /* Selected Preset Cards - Use dark text instead of white */
  .preset-card.selected {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(129, 140, 248, 0.12));
    color: #1e1b4b;
    box-shadow:
      0 20px 40px rgba(99, 102, 241, 0.2),
      0 0 0 4px rgba(99, 102, 241, 0.15),
      0 0 60px rgba(99, 102, 241, 0.1);
  }

  .preset-card.selected .preset-description {
    color: rgba(30, 27, 75, 0.75);
  }

  .preset-card.selected .preset-name {
    color: #1e1b4b;
  }

  .preset-card.selected .tag {
    background: rgba(99, 102, 241, 0.2);
    color: #4338ca;
  }

  /* Gallery Cards - Selected state */
  .gallery-card.selected {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.12));
    color: #1e1b4b;
    box-shadow:
      0 18px 36px rgba(99, 102, 241, 0.18),
      0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .gallery-card.selected .gallery-description {
    color: rgba(30, 27, 75, 0.75);
  }

  .gallery-card.selected .gallery-name {
    color: #1e1b4b;
  }

  .gallery-card.selected .tag {
    background: rgba(99, 102, 241, 0.2);
    color: #4338ca;
  }

  /* Player Rows - Lighter backgrounds */
  .player-row {
    background: rgba(248, 250, 252, 0.8);
    border: 2px solid rgba(99, 102, 241, 0.25);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .player-row:hover {
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(241, 245, 249, 0.9);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }

  /* Player Badge - Light mode colors */
  .player-badge {
    background: rgba(99, 102, 241, 0.15);
    color: #4338ca;
    border: 1px solid rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.1);
  }

  /* Player Input - Light background with dark text */
  .player-input {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(99, 102, 241, 0.25);
    color: #1e293b;
  }

  .player-input:focus {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  .player-input::placeholder {
    color: rgba(100, 116, 139, 0.6);
  }

  /* Mode Indicator */
  .mode-indicator {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
  }

  /* Mode Summary */
  .mode-summary {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
  }

  /* Territory/Chain Reaction Settings */
  .territory-settings,
  .chainreaction-settings {
    background: var(--color-surface);
  }

  /* Rule Cards - Active state */
  .rule-card.active {
    background: rgba(99, 102, 241, 0.1);
  }

  /* Time Options */
  .time-options {
    background: rgba(99, 102, 241, 0.08);
  }

  /* Effect Cards - Active state */
  .effect-card.active {
    background: rgba(168, 85, 247, 0.08);
  }
}

/* Stage 3: Review & Start */
.review-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.review-header {
  text-align: center;
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-border);
}

.review-title {
  margin: 0 0 var(--space-1) 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.review-subtitle {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.review-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.review-section-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}

.mode-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-md);
}

.mode-summary-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.mode-summary-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.mode-summary-name {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.mode-summary-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.mode-summary-rules {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.mode-specific-settings {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
}

.setting-chip {
  padding: 0.375rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.setting-chip strong {
  color: var(--color-text-primary);
  font-weight: 600;
}

.players-review-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}

.player-review-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  min-width: 120px;
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.player-review-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.player-review-badge {
  position: absolute;
  top: var(--space-1);
  left: var(--space-1);
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-weight: 700;
  font-size: var(--text-xs);
  border-radius: 50%;
}

.player-team-badge {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  padding: 0.2rem 0.4rem;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: var(--radius-pill);
}

.player-team-badge.team-0 {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2));
  color: rgb(59, 130, 246);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.player-team-badge.team-1 {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
  color: rgb(239, 68, 68);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.player-review-symbol {
  font-size: 2rem;
  color: var(--color-accent);
  margin: 0;
}

.player-review-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  word-break: break-word;
}

.btn-start {
  background: linear-gradient(135deg, #10b981, #059669);
  border-color: #10b981;
}

.btn-start:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
}

@media (max-width: 900px) {
  .mode-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .mode-summary-icon {
    font-size: 3rem;
  }

  .players-review-grid {
    grid-template-columns: 1fr;
  }
}
</style>
