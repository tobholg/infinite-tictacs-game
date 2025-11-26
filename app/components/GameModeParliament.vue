<template>
  <div v-if="showSelector" class="parliament-overlay" @click="$emit('close')">
    <div class="parliament-popup" @click.stop>
      <!-- Header -->
      <div class="parliament-header">
        <h2 class="parliament-title">🏛️ Game Presets Gallery</h2>
        <p class="parliament-subtitle">Choose a preset combination or create your own</p>
      </div>

      <!-- Presets Grid -->
      <div class="presets-container">
        <div v-for="preset in presets" :key="preset.id"
             class="preset-card"
             :class="{ disabled: preset.disabled, favorite: isFavorite(preset.id) }"
             @click="selectPreset(preset)">
          <div class="preset-header">
            <div class="preset-icon">{{ preset.icon }}</div>
            <button v-if="!preset.disabled"
                    @click.stop="toggleFavorite(preset.id)"
                    class="favorite-btn"
                    :class="{ active: isFavorite(preset.id) }">
              {{ isFavorite(preset.id) ? '⭐' : '☆' }}
            </button>
          </div>
          <div class="preset-body">
            <h3 class="preset-name">{{ preset.name }}</h3>
            <p class="preset-description">{{ preset.description }}</p>
            <div class="preset-details">
              <div class="detail-item">
                <span class="detail-label">Mode:</span>
                <span class="detail-value">{{ getModeLabel(preset.gameMode) }}</span>
              </div>
              <div v-if="preset.rules.length > 0" class="detail-item">
                <span class="detail-label">Rules:</span>
                <span class="detail-value">{{ getRulesLabel(preset.rules) }}</span>
              </div>
              <div v-if="preset.timeLimit" class="detail-item">
                <span class="detail-label">Time:</span>
                <span class="detail-value">{{ preset.timeLimit }}s per move</span>
              </div>
            </div>
            <div v-if="preset.disabled" class="disabled-badge">Coming Soon</div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="parliament-controls">
        <button @click="$emit('close')" class="control-btn close-btn">
          <span class="btn-icon">🚪</span>
          <span>Close</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface GamePreset {
  id: string
  name: string
  icon: string
  description: string
  gameMode: 'classic' | 'kingofthehill' | 'territory' | 'chainreaction'
  rules: string[]
  timeLimit?: number
  disabled?: boolean
}

interface Props {
  showSelector: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  modeSelected: [preset: GamePreset]
}>()

// Preset combinations
const presets: GamePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '🎯',
    description: 'Pure strategy. Infinite expansion with unlimited time.',
    gameMode: 'classic',
    rules: []
  },
  {
    id: 'classic-gravity',
    name: 'Classic Gravity',
    icon: '⬇️',
    description: 'Connect Four meets Tic-Tac-Toe. Pieces fall to the ground.',
    gameMode: 'classic',
    rules: ['gravity']
  },
  {
    id: 'speed-classic',
    name: 'Speed Classic',
    icon: '⚡',
    description: 'Fast-paced classic. 10 seconds per move keeps the pressure on.',
    gameMode: 'classic',
    rules: ['timeLimit'],
    timeLimit: 10
  },
  {
    id: 'blitz',
    name: 'Blitz Mode',
    icon: '💨',
    description: 'Lightning fast! Only 5 seconds to make your move.',
    gameMode: 'classic',
    rules: ['timeLimit'],
    timeLimit: 5
  },
  {
    id: 'zen',
    name: 'Zen Mode',
    icon: '🧘',
    description: 'Take your time. One minute per move for deep strategy.',
    gameMode: 'classic',
    rules: ['timeLimit'],
    timeLimit: 60
  },
  {
    id: 'gravity-blitz',
    name: 'Gravity Blitz',
    icon: '💥',
    description: 'Gravity physics with 5 second turns. Think fast, drop faster!',
    gameMode: 'classic',
    rules: ['gravity', 'timeLimit'],
    timeLimit: 5
  },
  {
    id: 'king-of-the-hill',
    name: 'King of the Hill',
    icon: '👑',
    description: 'Control the center region to claim victory.',
    gameMode: 'kingofthehill',
    rules: []
  },
  {
    id: 'king-rush',
    name: 'King Rush',
    icon: '🏃',
    description: 'Race to control the center with 10 second turns.',
    gameMode: 'kingofthehill',
    rules: ['timeLimit'],
    timeLimit: 10
  },
  {
    id: 'gravity-king',
    name: 'Gravity King',
    icon: '👑⬇️',
    description: 'Control the center while pieces fall. Strategy meets physics.',
    gameMode: 'kingofthehill',
    rules: ['gravity']
  },
  {
    id: 'territory',
    name: 'Territory Conquest',
    icon: '🗺️',
    description: 'Win by controlling the largest continuous region.',
    gameMode: 'territory',
    rules: [],
    disabled: true
  },
  {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    icon: '⚡',
    description: 'Trigger chain combos by placing near your clusters.',
    gameMode: 'chainreaction',
    rules: [],
    disabled: true
  },
  {
    id: 'chaos',
    name: 'Chaos Mode',
    icon: '🌀',
    description: 'Everything at once! Gravity, mirrors, and 10s turns.',
    gameMode: 'classic',
    rules: ['gravity', 'mirror', 'timeLimit'],
    timeLimit: 10,
    disabled: true
  }
]

// Favorites management
const favorites = ref<string[]>(['classic', 'classic-gravity', 'speed-classic'])

const isFavorite = (presetId: string) => {
  return favorites.value.includes(presetId)
}

const toggleFavorite = (presetId: string) => {
  const index = favorites.value.indexOf(presetId)
  if (index > -1) {
    favorites.value.splice(index, 1)
  } else {
    if (favorites.value.length < 3) {
      favorites.value.push(presetId)
    } else {
      // Replace the first one
      favorites.value.shift()
      favorites.value.push(presetId)
    }
  }
  // Save to localStorage
  localStorage.setItem('favoritePresets', JSON.stringify(favorites.value))
}

const selectPreset = (preset: GamePreset) => {
  if (preset.disabled) return
  emit('modeSelected', preset)
  emit('close')
}

// Labels for display
const getModeLabel = (mode: string) => {
  const labels: Record<string, string> = {
    classic: 'Classic',
    kingofthehill: 'King of the Hill',
    territory: 'Territory',
    chainreaction: 'Chain Reaction'
  }
  return labels[mode] || mode
}

const getRulesLabel = (rules: string[]) => {
  const labels: Record<string, string> = {
    gravity: 'Gravity',
    timeLimit: 'Time Limit',
    surrounded: 'Surrounded',
    mirror: 'Mirror',
    decay: 'Decay'
  }
  return rules.map(rule => labels[rule] || rule).join(', ')
}

// Load favorites from localStorage on mount
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('favoritePresets')
  if (saved) {
    try {
      favorites.value = JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to parse saved favorite presets')
    }
  }
}
</script>

<style scoped>
.parliament-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: overlayFadeIn 0.3s ease;
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.parliament-popup {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 240, 255, 0.95));
  border-radius: 24px;
  padding: 2rem;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.5),
    inset 0 0 60px rgba(255, 255, 255, 0.3);
  animation: popupSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popupSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.parliament-header {
  text-align: center;
  margin-bottom: 2rem;
}

.parliament-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(90deg, #8a2be2, #ff7730, #ff1493);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.parliament-subtitle {
  color: #666;
  font-size: 1rem;
  margin: 0.5rem 0 0 0;
  font-style: italic;
}

.presets-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.preset-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 245, 255, 0.8));
  border: 2px solid rgba(138, 43, 226, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.preset-card:hover:not(.disabled) {
  transform: translateY(-5px);
  border-color: rgba(138, 43, 226, 0.5);
  box-shadow: 0 10px 30px rgba(138, 43, 226, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(250, 245, 255, 0.95));
}

.preset-card.favorite {
  border-color: rgba(255, 215, 0, 0.6);
  background: linear-gradient(135deg, rgba(255, 250, 220, 0.95), rgba(255, 245, 200, 0.85));
}

.preset-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.preset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.preset-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(255, 119, 48, 0.1));
  border-radius: 12px;
}

.favorite-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0.25rem;
  opacity: 0.3;
}

.favorite-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.favorite-btn.active {
  opacity: 1;
}

.preset-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preset-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.preset-description {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
  margin: 0;
}

.preset-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(138, 43, 226, 0.1);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.detail-label {
  font-weight: 600;
  color: #8a2be2;
  min-width: 50px;
}

.detail-value {
  color: #555;
  font-style: italic;
}

.disabled-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: linear-gradient(135deg, #ff6b6b, #ff4757);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.parliament-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 2px solid rgba(138, 43, 226, 0.1);
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid rgba(138, 43, 226, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 240, 255, 0.8));
}

.control-btn:hover {
  transform: translateY(-2px);
  border-color: rgba(138, 43, 226, 0.6);
  box-shadow: 0 5px 15px rgba(138, 43, 226, 0.2);
}

.close-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-color: transparent;
}

.close-btn:hover {
  background: linear-gradient(135deg, #7788ff, #8855cc);
}

.btn-icon {
  font-size: 1.2rem;
}
</style>
