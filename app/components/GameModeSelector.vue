<template>
  <div v-if="showSelector" class="mode-selector-overlay" @click="$emit('close')">
    <div class="mode-selector-popup" @click.stop>
      <div class="popup-header">
        <h3 class="popup-title">🎮 Game Modes</h3>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>

      <div class="popup-content">
        <!-- Favorites Section -->
        <div class="favorites-section">
          <h4 class="section-title">⭐ Favorites</h4>
          <div class="mode-grid">
            <div v-for="mode in favoriteModesData" :key="mode.id"
                 class="mode-card favorite-mode"
                 @click="selectMode(mode)">
              <div class="mode-icon">{{ mode.icon }}</div>
              <div class="mode-info">
                <div class="mode-name">{{ mode.name }}</div>
                <div class="mode-description">{{ mode.description }}</div>
              </div>
              <button @click.stop="toggleFavorite(mode.id)" class="favorite-btn active">
                ⭐
              </button>
            </div>
          </div>
        </div>

        <!-- All Modes Section -->
        <div class="all-modes-section">
          <h4 class="section-title">🎯 All Game Modes</h4>
          <div class="categories">
            <div v-for="category in categorizedModes" :key="category.name" class="category">
              <h5 class="category-title">{{ category.name }}</h5>
              <div class="mode-grid">
                <div v-for="mode in category.modes" :key="mode.id"
                     class="mode-card"
                     :class="{ disabled: mode.disabled }"
                     @click="!mode.disabled && selectMode(mode)">
                  <div class="mode-icon">{{ mode.icon }}</div>
                  <div class="mode-info">
                    <div class="mode-name">{{ mode.name }}</div>
                    <div class="mode-description">{{ mode.description }}</div>
                    <div v-if="mode.disabled" class="mode-status">{{ mode.status }}</div>
                  </div>
                  <button v-if="!mode.disabled"
                          @click.stop="toggleFavorite(mode.id)"
                          class="favorite-btn"
                          :class="{ active: favorites.includes(mode.id) }">
                    {{ favorites.includes(mode.id) ? '⭐' : '☆' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface GameMode {
  id: string
  name: string
  icon: string
  description: string
  category: string
  disabled?: boolean
  status?: string
  timeLimit?: number
}

const props = defineProps<{
  showSelector: boolean
}>()

const emit = defineEmits<{
  close: []
  modeSelected: [mode: GameMode]
}>()

const favorites = ref<string[]>(['classic', 'speed', 'gravity'])

const allModes: GameMode[] = [
  // Core Game Modes
  { id: 'classic', name: 'Classic Mode', icon: '🎯', description: 'Unlimited time to strategize', category: 'Core' },
  { id: 'speed', name: 'Speed Mode', icon: '⚡', description: '15 seconds per move', category: 'Core', timeLimit: 15 },
  { id: 'blitz', name: 'Blitz Mode', icon: '⚡⚡', description: '5 seconds per move', category: 'Core', disabled: true, status: 'Skipped' },
  { id: 'marathon', name: 'Marathon Mode', icon: '🏃', description: 'No time limits, save/resume', category: 'Core', disabled: true, status: 'Future' },

  // Special Rule Modes
  { id: 'gravity', name: 'Gravity Mode', icon: '⬇️', description: 'Pieces fall down like Connect 4', category: 'Special Rules' },
  { id: 'kingofthehill', name: 'King of the Hill', icon: '👑', description: 'Control center area to win', category: 'Special Rules' },
  { id: 'territory', name: 'Territory Mode', icon: '🗺️', description: 'Capture most board area', category: 'Special Rules', disabled: true, status: 'Next' },
  { id: 'chainreaction', name: 'Chain Reaction', icon: '💥', description: 'Adjacent pieces create combos', category: 'Special Rules', disabled: true, status: 'Coming Soon' },
  { id: 'surrounded', name: 'Surrounded Cell Deletion', icon: '🔴', description: 'Surrounded pieces disappear', category: 'Special Rules', disabled: true, status: 'Coming Soon' },
  { id: 'emptytrigger', name: 'Empty Cell Trigger', icon: '🕳️', description: 'Clicking empty cell deletes adjacent', category: 'Special Rules', disabled: true, status: 'Coming Soon' },
  { id: 'collapse', name: 'Collapse Mode', icon: '📦', description: 'Board edges shrink inward', category: 'Special Rules', disabled: true, status: 'Coming Soon' },
  { id: 'mirror', name: 'Mirror Mode', icon: '🪞', description: 'Moves are mirrored across axis', category: 'Special Rules', disabled: true, status: 'Coming Soon' },
  { id: 'decay', name: 'Decay Mode', icon: '⏳', description: 'Symbols fade after X turns', category: 'Special Rules', disabled: true, status: 'Coming Soon' },

  // Multiplayer Variants
  { id: 'team', name: 'Team Mode', icon: '👥', description: '2v2 with shared symbols', category: 'Multiplayer', disabled: true, status: 'Coming Soon' },
  { id: 'elimination', name: 'Elimination', icon: '🏆', description: 'Last player standing wins', category: 'Multiplayer', disabled: true, status: 'Coming Soon' },
  { id: 'roundrobin', name: 'Round Robin', icon: '🔄', description: 'Tournament style rounds', category: 'Multiplayer', disabled: true, status: 'Coming Soon' },
  { id: 'relay', name: 'Relay Mode', icon: '🏃‍♂️', description: 'Teams alternate turns', category: 'Multiplayer', disabled: true, status: 'Coming Soon' },

  // Board Variations
  { id: 'hexagonal', name: 'Hexagonal Grid', icon: '⬡', description: '6-directional movement', category: 'Board Variations', disabled: true, status: 'Coming Soon' },
  { id: '3d', name: '3D Mode', icon: '📦', description: 'Multi-layer boards', category: 'Board Variations', disabled: true, status: 'Coming Soon' },
  { id: 'wraparound', name: 'Wraparound', icon: '🌍', description: 'Board edges connect', category: 'Board Variations', disabled: true, status: 'Coming Soon' },
  { id: 'obstacle', name: 'Obstacle Mode', icon: '🚧', description: 'Pre-placed blocking pieces', category: 'Board Variations', disabled: true, status: 'Coming Soon' },
  { id: 'void', name: 'Void Mode', icon: '🕳️', description: 'Random cells disappear', category: 'Board Variations', disabled: true, status: 'Coming Soon' },
  { id: 'blackhole', name: 'Black Hole Mode', icon: '⚫', description: 'Overloaded areas collapse', category: 'Board Variations', disabled: true, status: 'Coming Soon' },

  // Power-up Modes
  { id: 'powerpieces', name: 'Power Pieces', icon: '✨', description: 'Special symbols with abilities', category: 'Power-ups', disabled: true, status: 'Coming Soon' },
  { id: 'bomb', name: 'Bomb Mode', icon: '💣', description: 'Destroy surrounding pieces', category: 'Power-ups', disabled: true, status: 'Coming Soon' },
  { id: 'shield', name: 'Shield Mode', icon: '🛡️', description: 'Protect pieces from removal', category: 'Power-ups', disabled: true, status: 'Coming Soon' },
  { id: 'swap', name: 'Swap Mode', icon: '🔄', description: 'Exchange positions', category: 'Power-ups', disabled: true, status: 'Coming Soon' },
  { id: 'wildcard', name: 'Wildcard Mode', icon: '🃏', description: 'Random wildcards appear', category: 'Power-ups', disabled: true, status: 'Coming Soon' }
]

const categorizedModes = computed(() => {
  const categories = ['Core', 'Special Rules', 'Multiplayer', 'Board Variations', 'Power-ups']
  return categories.map(categoryName => ({
    name: categoryName,
    modes: allModes.filter(mode => mode.category === categoryName)
  }))
})

const favoriteModesData = computed(() => {
  return allModes.filter(mode => favorites.value.includes(mode.id) && !mode.disabled)
})

const toggleFavorite = (modeId: string) => {
  const index = favorites.value.indexOf(modeId)
  if (index > -1) {
    favorites.value.splice(index, 1)
  } else if (favorites.value.length < 3) {
    favorites.value.push(modeId)
  }
  // Save to localStorage
  localStorage.setItem('favoriteModes', JSON.stringify(favorites.value))
}

const selectMode = (mode: GameMode) => {
  if (!mode.disabled) {
    emit('modeSelected', mode)
    emit('close')
  }
}

// Load favorites from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('favoriteModes')
  if (saved) {
    try {
      favorites.value = JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to parse saved favorites')
    }
  }
})
</script>

<style scoped>
.mode-selector-overlay {
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
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mode-selector-popup {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.6);
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(138, 43, 226, 0.2);
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(255, 119, 48, 0.05));
}

.popup-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #8a2be2, #ff7730);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(138, 43, 226, 0.3);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: bold;
  color: #666;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(138, 43, 226, 0.6);
  transform: scale(1.1);
}

.popup-content {
  padding: 2rem;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.favorites-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 240, 255, 0.7));
  border: 2px solid rgba(138, 43, 226, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.mode-card:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(250, 240, 255, 0.9));
  border-color: rgba(138, 43, 226, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(138, 43, 226, 0.2);
}

.mode-card.favorite-mode {
  border-color: rgba(255, 215, 0, 0.6);
  background: linear-gradient(135deg, rgba(255, 248, 220, 0.9), rgba(255, 245, 157, 0.3));
}

.mode-card.favorite-mode:hover {
  border-color: rgba(255, 215, 0, 0.8);
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
}

.mode-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: linear-gradient(135deg, rgba(200, 200, 200, 0.5), rgba(180, 180, 180, 0.3));
}

.mode-card.disabled:hover {
  transform: none;
  box-shadow: none;
}

.mode-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(255, 119, 48, 0.1));
  border-radius: 12px;
  flex-shrink: 0;
}

.mode-info {
  flex: 1;
}

.mode-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.mode-description {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.3;
}

.mode-status {
  font-size: 0.8rem;
  color: #999;
  font-style: italic;
  margin-top: 0.25rem;
}

.favorite-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.favorite-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.favorite-btn.active {
  opacity: 1;
  color: #ffd700;
}

.categories {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.category-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: #555;
  padding-left: 0.5rem;
  border-left: 3px solid rgba(138, 43, 226, 0.5);
}

/* Scrollbar styling */
.popup-content::-webkit-scrollbar {
  width: 8px;
}

.popup-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.6), rgba(255, 119, 48, 0.6));
  border-radius: 10px;
}

.popup-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.8), rgba(255, 119, 48, 0.8));
}
</style>