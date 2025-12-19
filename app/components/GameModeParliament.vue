<template>
  <div v-if="showSelector" class="parliament-overlay fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-[8px] flex items-center justify-center z-[1000] animate-[overlayFadeIn_0.3s_ease]" @click="$emit('close')">
    <div class="parliament-popup bg-gradient-to-br from-[rgba(255,255,255,0.98)] to-[rgba(240,240,255,0.95)] rounded-3xl p-8 max-w-[90vw] max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.5),inset_0_0_60px_rgba(255,255,255,0.3)] animate-[popupSlideIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]" @click.stop>
      <!-- Header -->
      <div class="text-center mb-8">
        <h2 class="text-[2rem] font-extrabold bg-gradient-to-r from-[#8a2be2] via-[#ff7730] to-[#ff1493] bg-clip-text text-transparent m-0">🏛️ Game Presets Gallery</h2>
        <p class="text-[#666] text-base mt-2 mb-0 italic">Choose a preset combination or create your own</p>
      </div>

      <!-- Presets Grid -->
      <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 mb-8">
        <div v-for="preset in presets" :key="preset.id"
             class="preset-card bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(240,245,255,0.8)] border-2 border-[rgba(138,43,226,0.2)] rounded-2xl p-6 cursor-pointer transition-all duration-300 relative"
             :class="{ disabled: preset.disabled, favorite: isFavorite(preset.id) }"
             @click="selectPreset(preset)">
          <div class="flex items-center justify-between mb-4">
            <div class="text-[2.5rem] w-[60px] h-[60px] flex items-center justify-center bg-gradient-to-br from-[rgba(138,43,226,0.1)] to-[rgba(255,119,48,0.1)] rounded-xl">{{ preset.icon }}</div>
            <button v-if="!preset.disabled"
                    @click.stop="toggleFavorite(preset.id)"
                    class="favorite-btn bg-transparent border-none text-2xl cursor-pointer transition-all duration-300 p-1 opacity-30 hover:opacity-100 hover:scale-[1.2]"
                    :class="{ active: isFavorite(preset.id) }">
              {{ isFavorite(preset.id) ? '⭐' : '☆' }}
            </button>
          </div>
          <div class="flex flex-col gap-3">
            <h3 class="text-[1.3rem] font-bold text-[#333] m-0">{{ preset.name }}</h3>
            <p class="text-[0.9rem] text-[#666] leading-[1.4] m-0">{{ preset.description }}</p>
            <div class="flex flex-col gap-2 pt-3 border-t border-[rgba(138,43,226,0.1)]">
              <div class="flex items-center gap-2 text-[0.85rem]">
                <span class="font-semibold text-[#8a2be2] min-w-[50px]">Mode:</span>
                <span class="text-[#555] italic">{{ getModeLabel(preset.gameMode) }}</span>
              </div>
              <div v-if="preset.rules.length > 0" class="flex items-center gap-2 text-[0.85rem]">
                <span class="font-semibold text-[#8a2be2] min-w-[50px]">Rules:</span>
                <span class="text-[#555] italic">{{ getRulesLabel(preset.rules) }}</span>
              </div>
              <div v-if="preset.timeLimit" class="flex items-center gap-2 text-[0.85rem]">
                <span class="font-semibold text-[#8a2be2] min-w-[50px]">Time:</span>
                <span class="text-[#555] italic">{{ preset.timeLimit }}s per move</span>
              </div>
            </div>
            <div v-if="preset.disabled" class="absolute top-4 right-4 bg-gradient-to-br from-[#ff6b6b] to-[#ff4757] text-white py-1 px-3 rounded-xl text-xs font-semibold uppercase">Coming Soon</div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex justify-center gap-4 pt-4 border-t-2 border-[rgba(138,43,226,0.1)]">
        <button @click="$emit('close')" class="flex items-center gap-2 py-3 px-6 text-base font-semibold border-2 border-transparent rounded-xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white hover:-translate-y-0.5 hover:bg-gradient-to-br hover:from-[#7788ff] hover:to-[#8855cc] hover:shadow-[0_5px_15px_rgba(138,43,226,0.2)]">
          <span class="text-[1.2rem]">🚪</span>
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
/* Keyframe animations */
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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

/* State-based styling */
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

.favorite-btn.active {
  opacity: 1;
}
</style>
