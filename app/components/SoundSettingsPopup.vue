<script setup lang="ts">
import { Motion } from '@motionone/vue'
import { useSound, type SoundCategory } from '~/composables/useSound'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// Sound settings
const { soundSettings, setMasterVolume, setCategoryVolume, toggleMute, play } = useSound()

function handleVolumeChange(type: 'master' | SoundCategory, event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber / 100
  if (type === 'master') {
    setMasterVolume(value)
  } else {
    setCategoryVolume(type, value)
  }
  // Play a test sound on volume change
  play('buttonClick')
}

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
            <h2 class="modal-title">Sound Settings</h2>
            <button class="modal-close-btn" @click="handleClose" title="Close">
              &times;
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Master Volume -->
            <div class="volume-control master">
              <div class="volume-header">
                <span class="volume-label">Master Volume</span>
                <button
                  class="mute-btn"
                  :class="{ muted: soundSettings.muted }"
                  @click="toggleMute"
                  :title="soundSettings.muted ? 'Unmute' : 'Mute'"
                >
                  {{ soundSettings.muted ? '🔇' : '🔊' }}
                </button>
              </div>
              <div class="slider-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="soundSettings.masterVolume * 100"
                  @input="handleVolumeChange('master', $event)"
                  class="volume-slider"
                  :disabled="soundSettings.muted"
                />
                <span class="volume-value">{{ Math.round(soundSettings.masterVolume * 100) }}%</span>
              </div>
            </div>

            <!-- Category Volumes -->
            <div class="volume-categories">
              <!-- UI Sounds -->
              <div class="volume-control">
                <div class="volume-header">
                  <span class="volume-label">UI Sounds</span>
                  <span class="volume-hint">Buttons, modals</span>
                </div>
                <div class="slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="soundSettings.uiVolume * 100"
                    @input="handleVolumeChange('ui', $event)"
                    class="volume-slider"
                    :disabled="soundSettings.muted"
                  />
                  <span class="volume-value">{{ Math.round(soundSettings.uiVolume * 100) }}%</span>
                </div>
              </div>

              <!-- Game Sounds -->
              <div class="volume-control">
                <div class="volume-header">
                  <span class="volume-label">Game Sounds</span>
                  <span class="volume-hint">Moves, wins, board</span>
                </div>
                <div class="slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="soundSettings.gameVolume * 100"
                    @input="handleVolumeChange('game', $event)"
                    class="volume-slider"
                    :disabled="soundSettings.muted"
                  />
                  <span class="volume-value">{{ Math.round(soundSettings.gameVolume * 100) }}%</span>
                </div>
              </div>

              <!-- Notification Sounds -->
              <div class="volume-control">
                <div class="volume-header">
                  <span class="volume-label">Notifications</span>
                  <span class="volume-hint">Join, leave, countdown</span>
                </div>
                <div class="slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="soundSettings.notificationVolume * 100"
                    @input="handleVolumeChange('notification', $event)"
                    class="volume-slider"
                    :disabled="soundSettings.muted"
                  />
                  <span class="volume-value">{{ Math.round(soundSettings.notificationVolume * 100) }}%</span>
                </div>
              </div>
            </div>
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
  max-width: 420px;
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
  gap: var(--space-4);
}

.volume-categories {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Volume Controls */
.volume-control {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.volume-control.master {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border-color: rgba(99, 102, 241, 0.3);
}

.volume-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.volume-label {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.volume-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.mute-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1.1rem;
  transition: all var(--transition-base);
}

.mute-btn:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.mute-btn.muted {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.volume-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  transition: transform var(--transition-base);
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  border: none;
}

.volume-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-slider:disabled::-webkit-slider-thumb {
  background: var(--color-text-tertiary);
}

.volume-value {
  min-width: 40px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
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
</style>
