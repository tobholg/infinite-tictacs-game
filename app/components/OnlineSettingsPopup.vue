<script setup lang="ts">
import { Motion } from '@motionone/vue'
import { useTheme } from '~/composables/useTheme'
import { useOnlineSettings, type ExpansionAnimationMode } from '~/composables/useOnlineSettings'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// Theme settings
const { themePreference, setPreference, isDecember } = useTheme()

// Online-specific settings
const { expansionAnimationMode, setExpansionAnimationMode, cantPlaceEffects, updateCantPlaceEffect } = useOnlineSettings()

// Animation mode options
const animationModes = [
  {
    value: 'A_slideOut' as ExpansionAnimationMode,
    label: 'Slide Out',
    icon: '↔️',
    description: 'New rows/columns slide in from edges (default)',
  },
  {
    value: 'B_popInTiles' as ExpansionAnimationMode,
    label: 'Pop In',
    icon: '✨',
    description: 'New tiles pop in with a gentle settle',
  },
  {
    value: 'C_stretchSettle' as ExpansionAnimationMode,
    label: 'Stretch',
    icon: '📐',
    description: 'Board stretches and settles with new tiles',
  },
]

function handleClose() {
  emit('close')
}

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
        <Motion
          :initial="{ opacity: 0, scale: 0.95, y: 20 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.3, easing: 'ease-out' }"
          class="modal-container"
        >
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">Online Settings</h2>
            <button class="modal-close-btn" @click="handleClose" title="Close">
              &times;
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Theme Selector -->
            <section class="settings-section">
              <h3 class="section-title">Theme</h3>
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
            </section>

            <!-- Expansion Animation Selector -->
            <section class="settings-section">
              <h3 class="section-title">Board Expansion Animation</h3>
              <p class="section-description">Choose how new rows and columns animate when the board expands</p>
              <div class="animation-options">
                <label
                  v-for="mode in animationModes"
                  :key="mode.value"
                  class="animation-option"
                  :class="{ active: expansionAnimationMode === mode.value }"
                >
                  <input
                    type="radio"
                    name="expansion-animation"
                    :value="mode.value"
                    :checked="expansionAnimationMode === mode.value"
                    @change="setExpansionAnimationMode(mode.value)"
                  />
                  <span class="animation-icon">{{ mode.icon }}</span>
                  <div class="animation-info">
                    <span class="animation-label">{{ mode.label }}</span>
                    <span class="animation-hint">{{ mode.description }}</span>
                  </div>
                </label>
              </div>
            </section>

            <!-- Blocked Cells Appearance -->
            <section class="settings-section">
              <h3 class="section-title">Blocked Cells Appearance</h3>
              <p class="section-description">Choose how unavailable cells are displayed during gameplay</p>
              <div class="effects-grid">
                <label class="effect-card" :class="{ active: cantPlaceEffects.dimmedCells }">
                  <input
                    type="checkbox"
                    :checked="cantPlaceEffects.dimmedCells"
                    @change="updateCantPlaceEffect('dimmedCells', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="effect-icon">🌘</span>
                  <div class="effect-info">
                    <h4 class="effect-name">Dimmed Cells</h4>
                    <p class="effect-description">Lower opacity on unavailable cells for subtle depth</p>
                  </div>
                </label>

                <label class="effect-card" :class="{ active: cantPlaceEffects.stripedPattern }">
                  <input
                    type="checkbox"
                    :checked="cantPlaceEffects.stripedPattern"
                    @change="updateCantPlaceEffect('stripedPattern', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="effect-icon">▧</span>
                  <div class="effect-info">
                    <h4 class="effect-name">Striped Pattern</h4>
                    <p class="effect-description">Diagonal lines to clearly mark blocked zones</p>
                  </div>
                </label>

                <label class="effect-card" :class="{ active: cantPlaceEffects.warningIcon }">
                  <input
                    type="checkbox"
                    :checked="cantPlaceEffects.warningIcon"
                    @change="updateCantPlaceEffect('warningIcon', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="effect-icon">⚠️</span>
                  <div class="effect-info">
                    <h4 class="effect-name">Warning Badge</h4>
                    <p class="effect-description">Show indicator icon on non-playable cells</p>
                  </div>
                </label>
              </div>
            </section>

          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn-primary" @click="handleClose">Done</button>
          </div>
        </Motion>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.modal-container {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
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
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  transition: all var(--transition-base);
  line-height: 1;
}

.modal-close-btn:hover {
  border-color: var(--color-critical);
  color: var(--color-critical);
  transform: rotate(90deg);
}

.modal-body {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Theme Options */
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

.section-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* Animation Options */
.animation-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.animation-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.animation-option input {
  display: none;
}

.animation-option:hover {
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.animation-option.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.animation-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.animation-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.animation-label {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.animation-hint {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Effects Grid (Blocked Cells) */
.effects-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.effect-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
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
  line-height: 1.4;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
  z-index: 10;
}

/* Button */
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

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
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

/* Responsive */
@media (max-width: 600px) {
  .theme-options {
    grid-template-columns: 1fr;
  }
}
</style>
