<template>
  <div v-if="showSelector" class="parliament-overlay" @click="$emit('close')">
    <div class="parliament-popup" @click.stop>
      <!-- Book Icon for Catalog -->
      <button @click="showCatalog = true" class="catalog-btn" title="Open Mode Catalog">
        📖
      </button>

      <!-- Parliament Chamber -->
      <div class="parliament-chamber">
        <!-- Favorites Section -->
        <div class="favorites-section">
          <h3 class="section-title">⭐ Favorite Modes</h3>
          <div class="favorites-grid">
            <div v-for="(mode, index) in favoriteModesData" :key="mode.id"
                 class="mode-card favorite-card"
                 :class="{
                   'switch-mode': isSwitchMode,
                   'replaceable': isSwitchMode,
                   'selected': switchingModeId === mode.id
                 }"
                 @click="handleCardClick(mode)"
                 @mouseenter="showTooltip(mode, $event)"
                 @mouseleave="hideTooltip">
              <div class="card-header">
                <div class="mode-icon">{{ mode.icon }}</div>
                <div class="favorite-indicator">⭐</div>
              </div>
              <div class="card-body">
                <div class="mode-name">{{ mode.name }}</div>
                <div class="mode-description">{{ mode.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Available Modes by Category -->
        <div class="modes-section">
          <h3 class="section-title">📂 All Game Modes</h3>
          <div v-for="category in categories" :key="category" class="category-group">
            <div class="category-header" @click="toggleCategory(category)">
              <h4 class="category-title">
                <span class="category-icon">{{ isCategoryExpanded(category) ? '▼' : '▶' }}</span>
                {{ category }}
                <span class="category-count">({{ getModesByCategory(category).length }})</span>
              </h4>
            </div>
            <div v-if="isCategoryExpanded(category)" class="category-grid">
              <div v-for="mode in getModesByCategory(category)" :key="mode.id"
                   class="mode-card available-card"
                   :class="{
                     'disabled': mode.disabled,
                     'switch-mode': isSwitchMode && !mode.disabled,
                     'selectable': isSwitchMode && !mode.disabled && !favorites.includes(mode.id),
                     'selected': switchingModeId === mode.id
                   }"
                   @click="handleCardClick(mode)"
                   @mouseenter="showTooltip(mode, $event)"
                   @mouseleave="hideTooltip">
                <div class="card-header">
                  <div class="mode-icon">{{ mode.icon }}</div>
                  <div v-if="mode.disabled" class="status-badge">{{ mode.status }}</div>
                </div>
                <div class="card-body">
                  <div class="mode-name">{{ mode.name }}</div>
                  <div class="mode-description">{{ mode.description }}</div>
                  <div v-if="mode.timeLimit" class="mode-meta">⏱️ {{ mode.timeLimit }}s</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Control Panel -->
      <div class="parliament-controls">
        <button v-if="!isSwitchMode"
                @click="enterSwitchMode"
                class="control-btn switch-btn">
          <span class="btn-icon">🔄</span>
          <span>Switch Favorites</span>
        </button>
        <button v-if="isSwitchMode"
                @click="cancelSwitchMode"
                class="control-btn cancel-btn">
          <span class="btn-icon">✕</span>
          <span>Cancel</span>
        </button>
        <button @click="$emit('close')" class="control-btn close-btn">
          <span class="btn-icon">🚪</span>
          <span>Close</span>
        </button>
      </div>

      <!-- Tooltip -->
      <div v-if="hoveredMode && !isSwitchMode"
           class="mode-tooltip"
           :style="tooltipStyle">
        <div class="tooltip-content">
          <div class="tooltip-header">
            <span class="tooltip-icon">{{ hoveredMode.icon }}</span>
            <span class="tooltip-name">{{ hoveredMode.name }}</span>
          </div>
          <div class="tooltip-description">{{ hoveredMode.description }}</div>
        </div>
      </div>

      <!-- Switch Mode Instructions -->
      <div v-if="isSwitchMode" class="switch-instructions">
        <div class="instruction-text">
          {{ switchingModeId ? 'Click a favorite to replace it' : 'Click a mode to add to favorites' }}
        </div>
      </div>
    </div>

    <!-- Catalog Component -->
    <GameModeCatalog
      v-if="showCatalog"
      :all-modes="allModes"
      @close="showCatalog = false"
      @mode-selected="handleCatalogModeSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GameModeCatalog from './GameModeCatalog.vue'

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
const isSwitchMode = ref(false)
const switchingModeId = ref<string | null>(null)
const hoveredMode = ref<GameMode | null>(null)
const tooltipStyle = ref<any>({})
const showCatalog = ref(false)

// All available modes
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

const favoriteModesData = computed(() => {
  return favorites.value.map(id => allModes.find(mode => mode.id === id)).filter(Boolean) as GameMode[]
})

const availableModesData = computed(() => {
  return allModes.filter(mode => !favorites.value.includes(mode.id))
})

const categories = ref(['Core', 'Special Rules', 'Multiplayer', 'Board Variations', 'Power-ups'])
const expandedCategories = ref<Set<string>>(new Set(['Core', 'Special Rules'])) // Start with some categories expanded

const getModesByCategory = (category: string) => {
  return availableModesData.value.filter(mode => mode.category === category)
}

const toggleCategory = (category: string) => {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category)
  } else {
    expandedCategories.value.add(category)
  }
}

const isCategoryExpanded = (category: string) => {
  return expandedCategories.value.has(category)
}


const handleCardClick = (mode: GameMode) => {
  if (mode.disabled) return

  if (!isSwitchMode.value) {
    // Normal mode - select and close
    emit('modeSelected', mode)
    emit('close')
  } else {
    // Switch mode
    if (favorites.value.includes(mode.id)) {
      // Clicked a favorite - set it as the one to replace
      switchingModeId.value = mode.id
    } else {
      // Clicked a non-favorite - add to favorites or replace selected
      if (switchingModeId.value) {
        // Replace the selected favorite
        const index = favorites.value.indexOf(switchingModeId.value)
        if (index !== -1) {
          favorites.value[index] = mode.id
        }
        exitSwitchMode()
      } else if (favorites.value.length < 3) {
        // Add to favorites if under limit
        favorites.value.push(mode.id)
        exitSwitchMode()
      }
    }
  }
}

const enterSwitchMode = () => {
  isSwitchMode.value = true
  switchingModeId.value = null
}

const cancelSwitchMode = () => {
  exitSwitchMode()
}

const exitSwitchMode = () => {
  isSwitchMode.value = false
  switchingModeId.value = null
  // Save to localStorage
  localStorage.setItem('favoriteModes', JSON.stringify(favorites.value))
}

const showTooltip = (mode: GameMode, event: MouseEvent) => {
  if (isSwitchMode.value) return

  hoveredMode.value = mode
  tooltipStyle.value = {
    left: `${event.clientX + 10}px`,
    top: `${event.clientY - 10}px`,
  }
}

const hideTooltip = () => {
  hoveredMode.value = null
}

const handleCatalogModeSelected = (mode: GameMode) => {
  showCatalog.value = false
  emit('modeSelected', mode)
  emit('close')
}

// Load favorites from localStorage
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
.parliament-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
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

.parliament-popup {
  background: linear-gradient(135deg,
    rgba(139, 69, 19, 0.95) 0%,      /* Rich brown - parliament wood */
    rgba(160, 82, 45, 0.9) 25%,      /* Saddle brown */
    rgba(205, 133, 63, 0.85) 50%,    /* Peru */
    rgba(222, 184, 135, 0.9) 75%,    /* Burlywood */
    rgba(245, 222, 179, 0.95) 100%   /* Light wheat */
  );
  backdrop-filter: blur(20px);
  border-radius: 30px;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.4),
    inset 0 0 40px rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(222, 184, 135, 0.6);
  width: 90vw;
  max-width: 900px;
  height: 85vh; /* Reduced height to ensure better fit */
  max-height: 650px; /* Reduced max height */
  min-height: 500px; /* Ensure minimum height for usability */
  position: relative;
  overflow: hidden;
  animation: slideUp 0.4s ease-out;
  box-sizing: border-box;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.catalog-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(139, 69, 19, 0.8);
  border: 2px solid rgba(222, 184, 135, 0.8);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.catalog-btn:hover {
  background: rgba(160, 82, 45, 0.9);
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(222, 184, 135, 0.6);
}

.parliament-chamber {
  width: 100%;
  height: calc(100% - 120px);
  padding: 20px;
  overflow-y: auto;
  box-sizing: border-box;
}

.favorites-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  margin: 0 0 1rem 0;
  font-family: 'Serif', serif;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  max-width: 100%;
}

.modes-section {
  margin-top: 2rem;
}

.category-group {
  margin-bottom: 1.5rem;
}

.category-header {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  padding: 0.5rem;
  margin-bottom: 0.75rem;
}

.category-header:hover {
  background: rgba(255, 215, 0, 0.1);
}

.category-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 215, 0, 0.9);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.category-icon {
  font-size: 0.8rem;
  transition: transform 0.2s ease;
  color: rgba(255, 215, 0, 0.7);
}

.category-count {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
  margin-left: auto;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.5rem;
}

.mode-card {
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 90px;
}

.favorite-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 193, 7, 0.9));
  border: 3px solid rgba(255, 215, 0, 0.9);
  box-shadow:
    0 8px 25px rgba(255, 215, 0, 0.4),
    0 0 20px rgba(255, 215, 0, 0.2),
    inset 0 0 15px rgba(255, 255, 255, 0.1);
  animation: favoriteGlow 3s ease-in-out infinite;
}

.available-card {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.6), rgba(160, 82, 45, 0.5));
  border: 2px solid rgba(222, 184, 135, 0.5);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.available-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.available-card.disabled:hover {
  transform: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  padding: 0 0.5rem 0.5rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mode-card:not(.disabled):hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.favorite-card:hover {
  box-shadow: 0 12px 30px rgba(255, 215, 0, 0.6);
}

.card-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.mode-icon {
  font-size: 1.8rem;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.favorite-indicator {
  font-size: 0.8rem;
  opacity: 0.9;
  filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5));
}

.status-badge {
  background: rgba(255, 69, 69, 0.8);
  border: 1px solid rgba(255, 69, 69, 0.9);
  border-radius: 8px;
  padding: 0.15rem 0.35rem;
  font-size: 0.6rem;
  color: #fff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.mode-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

.mode-description {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.2;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mode-meta {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.2);
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
  align-self: flex-start;
}


/* Switch Mode Styles */
.switch-mode {
  animation: pulse 2s infinite;
}

.replaceable {
  border-color: #ff6b6b !important;
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.6) !important;
}

.selectable {
  border-color: #4ecdc4 !important;
  box-shadow: 0 0 20px rgba(78, 205, 196, 0.6) !important;
}

.selected {
  border-color: #45b7d1 !important;
  box-shadow: 0 0 25px rgba(69, 183, 209, 0.8) !important;
  transform: scale(1.15) !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes favoriteGlow {
  0%, 100% {
    box-shadow:
      0 12px 35px rgba(255, 215, 0, 0.5),
      0 0 30px rgba(255, 215, 0, 0.3),
      inset 0 0 20px rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow:
      0 15px 45px rgba(255, 215, 0, 0.7),
      0 0 50px rgba(255, 215, 0, 0.5),
      inset 0 0 30px rgba(255, 255, 255, 0.3);
  }
}

.parliament-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  z-index: 10;
}

.control-btn {
  padding: 12px 20px;
  border: 2px solid rgba(222, 184, 135, 0.8);
  border-radius: 25px;
  background: rgba(139, 69, 19, 0.8);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.control-btn:hover {
  background: rgba(160, 82, 45, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.switch-btn {
  border-color: rgba(78, 205, 196, 0.8);
  background: rgba(78, 205, 196, 0.2);
}

.cancel-btn {
  border-color: rgba(255, 107, 107, 0.8);
  background: rgba(255, 107, 107, 0.2);
}

.mode-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 250px;
  z-index: 1001;
  animation: tooltipFade 0.2s ease-out;
  pointer-events: none;
}

@keyframes tooltipFade {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tooltip-icon {
  font-size: 1.2rem;
}

.tooltip-name {
  font-weight: 600;
  font-size: 1rem;
}

.tooltip-description {
  font-size: 0.85rem;
  opacity: 0.9;
  line-height: 1.3;
}

.switch-instructions {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 10;
  animation: pulse 2s infinite;
}

.instruction-text {
  font-weight: 600;
  text-align: center;
}

/* Scrollbar styling for parliament chamber */
.parliament-chamber::-webkit-scrollbar {
  width: 8px;
}

.parliament-chamber::-webkit-scrollbar-track {
  background: rgba(139, 69, 19, 0.2);
  border-radius: 10px;
}

.parliament-chamber::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.6), rgba(139, 69, 19, 0.6));
  border-radius: 10px;
}

.parliament-chamber::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.8), rgba(139, 69, 19, 0.8));
}
</style>