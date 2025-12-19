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
      <div v-if="isOpen" class="modal-overlay fixed inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4" @click="handleOverlayClick">
        <Motion
          :initial="{ opacity: 0, scale: 0.95, y: 20 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.3, easing: 'ease-out' }"
          class="modal-container bg-surface border-2 border-border rounded-lg max-w-[500px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          <!-- Header -->
          <div class="modal-header flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-10">
            <h2 class="m-0 font-display text-xl font-bold text-text-primary">Online Settings</h2>
            <button class="modal-close-btn w-9 h-9 grid place-items-center bg-bg-muted border border-border rounded-md cursor-pointer text-2xl text-text-secondary transition-all duration-200 leading-none hover:border-critical hover:text-critical hover:rotate-90" @click="handleClose" title="Close">
              &times;
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body p-4 flex flex-col gap-5">
            <!-- Theme Selector -->
            <section class="flex flex-col gap-3">
              <h3 class="m-0 text-sm font-semibold text-text-secondary uppercase tracking-wider">Theme</h3>
              <div class="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
                <label class="theme-option flex flex-col items-center gap-1 p-3 bg-bg-muted border-2 border-border rounded-md cursor-pointer transition-all duration-200 text-center hover:border-accent hover:-translate-y-0.5" :class="{ active: themePreference === 'auto' }">
                  <input type="radio" name="theme" value="auto" :checked="themePreference === 'auto'" @change="setPreference('auto')" class="hidden" />
                  <span class="text-[1.75rem]">🎄</span>
                  <span class="font-semibold text-sm text-text-primary">Auto</span>
                  <span class="text-xs text-text-tertiary">{{ isDecember ? 'Christmas active' : 'Default active' }}</span>
                </label>
                <label class="theme-option flex flex-col items-center gap-1 p-3 bg-bg-muted border-2 border-border rounded-md cursor-pointer transition-all duration-200 text-center hover:border-accent hover:-translate-y-0.5" :class="{ active: themePreference === 'christmas' }">
                  <input type="radio" name="theme" value="christmas" :checked="themePreference === 'christmas'" @change="setPreference('christmas')" class="hidden" />
                  <span class="text-[1.75rem]">❄️</span>
                  <span class="font-semibold text-sm text-text-primary">Christmas</span>
                  <span class="text-xs text-text-tertiary">Always festive</span>
                </label>
                <label class="theme-option flex flex-col items-center gap-1 p-3 bg-bg-muted border-2 border-border rounded-md cursor-pointer transition-all duration-200 text-center hover:border-accent hover:-translate-y-0.5" :class="{ active: themePreference === 'default' }">
                  <input type="radio" name="theme" value="default" :checked="themePreference === 'default'" @change="setPreference('default')" class="hidden" />
                  <span class="text-[1.75rem]">🌙</span>
                  <span class="font-semibold text-sm text-text-primary">Default</span>
                  <span class="text-xs text-text-tertiary">Classic neon</span>
                </label>
              </div>
            </section>

            <!-- Expansion Animation Selector -->
            <section class="flex flex-col gap-3">
              <h3 class="m-0 text-sm font-semibold text-text-secondary uppercase tracking-wider">Board Expansion Animation</h3>
              <p class="m-0 text-xs text-text-muted">Choose how new rows and columns animate when the board expands</p>
              <div class="flex flex-col gap-2">
                <label
                  v-for="mode in animationModes"
                  :key="mode.value"
                  class="animation-option flex items-center gap-3 p-3 bg-bg-muted border-2 border-border rounded-md cursor-pointer transition-all duration-200 hover:border-accent hover:-translate-y-px"
                  :class="{ active: expansionAnimationMode === mode.value }"
                >
                  <input
                    type="radio"
                    name="expansion-animation"
                    :value="mode.value"
                    :checked="expansionAnimationMode === mode.value"
                    @change="setExpansionAnimationMode(mode.value)"
                    class="hidden"
                  />
                  <span class="text-2xl flex-shrink-0">{{ mode.icon }}</span>
                  <div class="flex flex-col gap-[2px]">
                    <span class="font-semibold text-sm text-text-primary">{{ mode.label }}</span>
                    <span class="text-xs text-text-secondary">{{ mode.description }}</span>
                  </div>
                </label>
              </div>
            </section>

            <!-- Blocked Cells Appearance -->
            <section class="flex flex-col gap-3">
              <h3 class="m-0 text-sm font-semibold text-text-secondary uppercase tracking-wider">Blocked Cells Appearance</h3>
              <p class="m-0 text-xs text-text-muted">Choose how unavailable cells are displayed during gameplay</p>
              <div class="flex flex-col gap-2">
                <label class="effect-card relative flex items-start gap-3 p-3 bg-bg-muted border-2 border-border rounded-md cursor-pointer transition-all duration-200 hover:border-[rgba(168,85,247,0.5)] hover:-translate-y-0.5" :class="{ active: cantPlaceEffects.dimmedCells }">
                  <input
                    type="checkbox"
                    :checked="cantPlaceEffects.dimmedCells"
                    @change="updateCantPlaceEffect('dimmedCells', ($event.target as HTMLInputElement).checked)"
                    class="hidden"
                  />
                  <span class="text-2xl flex-shrink-0">🌘</span>
                  <div class="flex-1 flex flex-col gap-1">
                    <h4 class="m-0 text-sm font-semibold text-text-primary">Dimmed Cells</h4>
                    <p class="m-0 text-xs text-text-secondary leading-[1.4]">Lower opacity on unavailable cells for subtle depth</p>
                  </div>
                </label>

                <label class="effect-card relative flex items-start gap-3 p-3 bg-bg-muted border-2 border-border rounded-md cursor-pointer transition-all duration-200 hover:border-[rgba(168,85,247,0.5)] hover:-translate-y-0.5" :class="{ active: cantPlaceEffects.stripedPattern }">
                  <input
                    type="checkbox"
                    :checked="cantPlaceEffects.stripedPattern"
                    @change="updateCantPlaceEffect('stripedPattern', ($event.target as HTMLInputElement).checked)"
                    class="hidden"
                  />
                  <span class="text-2xl flex-shrink-0">▧</span>
                  <div class="flex-1 flex flex-col gap-1">
                    <h4 class="m-0 text-sm font-semibold text-text-primary">Striped Pattern</h4>
                    <p class="m-0 text-xs text-text-secondary leading-[1.4]">Diagonal lines to clearly mark blocked zones</p>
                  </div>
                </label>

                <label class="effect-card relative flex items-start gap-3 p-3 bg-bg-muted border-2 border-border rounded-md cursor-pointer transition-all duration-200 hover:border-[rgba(168,85,247,0.5)] hover:-translate-y-0.5" :class="{ active: cantPlaceEffects.warningIcon }">
                  <input
                    type="checkbox"
                    :checked="cantPlaceEffects.warningIcon"
                    @change="updateCantPlaceEffect('warningIcon', ($event.target as HTMLInputElement).checked)"
                    class="hidden"
                  />
                  <span class="text-2xl flex-shrink-0">⚠️</span>
                  <div class="flex-1 flex flex-col gap-1">
                    <h4 class="m-0 text-sm font-semibold text-text-primary">Warning Badge</h4>
                    <p class="m-0 text-xs text-text-secondary leading-[1.4]">Show indicator icon on non-playable cells</p>
                  </div>
                </label>
              </div>
            </section>

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
/* Active states for options */
.theme-option.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.animation-option.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.effect-card.active {
  background: rgba(168, 85, 247, 0.1);
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
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
