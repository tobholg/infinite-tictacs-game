<script setup lang="ts">
import { Motion } from '@motionone/vue'
import { useSound, type SoundCategory } from '~/composables/useSound'
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/vue/24/outline'

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
      <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4" @click="handleOverlayClick">
        <Motion
          :initial="{ opacity: 0, scale: 0.95, y: 20 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.3, easing: 'ease-out' }"
          class="modal-container bg-surface border-2 border-border rounded-lg max-w-[420px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          <!-- Header -->
          <div class="modal-header flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-10">
            <h2 class="m-0 font-display text-xl font-bold text-text-primary">Sound Settings</h2>
            <button class="modal-close-btn w-9 h-9 grid place-items-center bg-bg-muted border border-border rounded-md cursor-pointer text-2xl text-text-secondary transition-all duration-200 leading-none hover:border-critical hover:text-critical hover:rotate-90" @click="handleClose" title="Close">
              &times;
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body p-4 flex flex-col gap-4">
            <!-- Master Volume -->
            <div class="volume-control master flex flex-col gap-2 p-3 bg-gradient-to-br from-[rgba(99,102,241,0.1)] to-[rgba(139,92,246,0.1)] border border-[rgba(99,102,241,0.3)] rounded-md">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-sm text-text-primary">Master Volume</span>
                <button
                  class="mute-btn w-8 h-8 grid place-items-center bg-transparent border border-border rounded-sm cursor-pointer text-[1.1rem] transition-all duration-200 hover:border-accent hover:bg-accent-soft"
                  :class="{ muted: soundSettings.muted }"
                  @click="toggleMute"
                  :title="soundSettings.muted ? 'Unmute' : 'Mute'"
                >
                  <SpeakerXMarkIcon v-if="soundSettings.muted" class="w-5 h-5" />
                  <SpeakerWaveIcon v-else class="w-5 h-5" />
                </button>
              </div>
              <div class="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  :value="soundSettings.masterVolume * 100"
                  @input="handleVolumeChange('master', $event)"
                  class="volume-slider flex-1 h-1.5 appearance-none bg-border rounded-sm outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="soundSettings.muted"
                />
                <span class="min-w-[40px] text-xs text-text-secondary text-right tabular-nums">{{ Math.round(soundSettings.masterVolume * 100) }}%</span>
              </div>
            </div>

            <!-- Category Volumes -->
            <div class="flex flex-col gap-3">
              <!-- UI Sounds -->
              <div class="volume-control flex flex-col gap-2 p-3 bg-bg-muted border border-border rounded-md">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-sm text-text-primary">UI Sounds</span>
                  <span class="text-xs text-text-tertiary">Buttons, modals</span>
                </div>
                <div class="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="soundSettings.uiVolume * 100"
                    @input="handleVolumeChange('ui', $event)"
                    class="volume-slider flex-1 h-1.5 appearance-none bg-border rounded-sm outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="soundSettings.muted"
                  />
                  <span class="min-w-[40px] text-xs text-text-secondary text-right tabular-nums">{{ Math.round(soundSettings.uiVolume * 100) }}%</span>
                </div>
              </div>

              <!-- Game Sounds -->
              <div class="volume-control flex flex-col gap-2 p-3 bg-bg-muted border border-border rounded-md">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-sm text-text-primary">Game Sounds</span>
                  <span class="text-xs text-text-tertiary">Moves, wins, board</span>
                </div>
                <div class="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="soundSettings.gameVolume * 100"
                    @input="handleVolumeChange('game', $event)"
                    class="volume-slider flex-1 h-1.5 appearance-none bg-border rounded-sm outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="soundSettings.muted"
                  />
                  <span class="min-w-[40px] text-xs text-text-secondary text-right tabular-nums">{{ Math.round(soundSettings.gameVolume * 100) }}%</span>
                </div>
              </div>

              <!-- Notification Sounds -->
              <div class="volume-control flex flex-col gap-2 p-3 bg-bg-muted border border-border rounded-md">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-sm text-text-primary">Notifications</span>
                  <span class="text-xs text-text-tertiary">Join, leave, countdown</span>
                </div>
                <div class="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="soundSettings.notificationVolume * 100"
                    @input="handleVolumeChange('notification', $event)"
                    class="volume-slider flex-1 h-1.5 appearance-none bg-border rounded-sm outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="soundSettings.muted"
                  />
                  <span class="min-w-[40px] text-xs text-text-secondary text-right tabular-nums">{{ Math.round(soundSettings.notificationVolume * 100) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer flex justify-end p-4 border-t border-border sticky bottom-0 bg-surface z-10">
            <button class="btn btn-primary inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full font-semibold text-base transition-all duration-200 cursor-pointer border border-transparent bg-gradient-to-br from-accent to-accent-strong text-white hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(99,102,241,0.3)]" @click="handleClose">Done</button>
          </div>
        </Motion>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Slider thumb styling - cannot be done with Tailwind */
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  transition: transform 0.2s;
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

.volume-slider:disabled::-webkit-slider-thumb {
  background: var(--color-text-tertiary);
}

/* Muted button state */
.mute-btn.muted {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
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
