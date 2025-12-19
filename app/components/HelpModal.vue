<script setup lang="ts">
import { Motion } from '@motionone/vue'
import {
  ArrowPathIcon,
  MapPinIcon,
  SparklesIcon,
  GlobeAltIcon,
  LightBulbIcon
} from '@heroicons/vue/24/outline'
import TargetIcon from './icons/TargetIcon.vue'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

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
          class="modal-container bg-surface border-2 border-border rounded-lg max-w-[480px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          <!-- Header -->
          <div class="modal-header flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-10">
            <h2 class="m-0 font-display text-xl font-bold text-text-primary">How to Play</h2>
            <button class="modal-close-btn w-9 h-9 grid place-items-center bg-bg-muted border border-border rounded-md cursor-pointer text-2xl text-text-secondary transition-all duration-200 leading-none hover:border-critical hover:text-critical hover:rotate-90" @click="handleClose" title="Close">
              &times;
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body p-4 flex flex-col gap-3">

            <!-- Goal -->
            <div class="help-section p-3 bg-gradient-to-br from-[rgba(34,197,94,0.1)] to-[rgba(22,163,74,0.05)] border border-[rgba(34,197,94,0.3)] rounded-md">
              <h3 class="m-0 mb-2 text-sm font-bold text-[#4ade80] uppercase tracking-wide flex items-center gap-2">
                <TargetIcon :size="18" :stroke-width="2.5" class="text-[#4ade80]" /> Goal
              </h3>
              <p class="m-0 text-sm text-text-secondary leading-relaxed">
                Take turns placing your symbol. Get <strong class="text-text-primary">4 in a row</strong> to win — horizontal, vertical, or diagonal!
              </p>
            </div>

            <!-- Infinite Board -->
            <div class="help-section p-3 bg-gradient-to-br from-[rgba(99,102,241,0.1)] to-[rgba(139,92,246,0.05)] border border-[rgba(99,102,241,0.3)] rounded-md">
              <h3 class="m-0 mb-2 text-sm font-bold text-[#a5b4fc] uppercase tracking-wide flex items-center gap-2">
                <ArrowPathIcon class="w-[18px] h-[18px]" /> Infinite Board
              </h3>
              <p class="m-0 text-sm text-text-secondary leading-relaxed">
                The board <strong class="text-text-primary">grows infinitely!</strong> Place on any edge and the board expands in that direction. No boundaries!
              </p>
            </div>

            <!-- Placement Rules -->
            <div class="help-section p-3 bg-gradient-to-br from-[rgba(251,191,36,0.1)] to-[rgba(245,158,11,0.05)] border border-[rgba(251,191,36,0.3)] rounded-md">
              <h3 class="m-0 mb-2 text-sm font-bold text-[#fcd34d] uppercase tracking-wide flex items-center gap-2">
                <MapPinIcon class="w-[18px] h-[18px]" /> Placement
              </h3>
              <p class="m-0 text-sm text-text-secondary leading-relaxed">
                You can only place <strong class="text-text-primary">adjacent to existing pieces</strong> — next to any filled cell horizontally, vertically, or diagonally.
              </p>
            </div>

            <!-- Your Pieces -->
            <div class="help-section p-3 bg-gradient-to-br from-[rgba(236,72,153,0.1)] to-[rgba(219,39,119,0.05)] border border-[rgba(236,72,153,0.3)] rounded-md">
              <h3 class="m-0 mb-2 text-sm font-bold text-[#f9a8d4] uppercase tracking-wide flex items-center gap-2">
                <SparklesIcon class="w-[18px] h-[18px]" /> Your Pieces
              </h3>
              <p class="m-0 text-sm text-text-secondary leading-relaxed">
                Your pieces have a <strong class="text-text-primary">subtle pulse animation</strong> so you can easily spot them on the board.
              </p>
            </div>

            <!-- Multiplayer -->
            <div class="help-section p-3 bg-gradient-to-br from-[rgba(6,182,212,0.1)] to-[rgba(8,145,178,0.05)] border border-[rgba(6,182,212,0.3)] rounded-md">
              <h3 class="m-0 mb-2 text-sm font-bold text-[#67e8f9] uppercase tracking-wide flex items-center gap-2">
                <GlobeAltIcon class="w-[18px] h-[18px]" /> Multiplayer
              </h3>
              <p class="m-0 text-sm text-text-secondary leading-relaxed">
                Play online! Create a room and share the <strong class="text-text-primary">6-letter code</strong> with friends. Supports up to <strong class="text-text-primary">10 players</strong> and AI opponents!
              </p>
            </div>

            <!-- Tips -->
            <div class="help-section p-3 bg-bg-muted border border-border rounded-md">
              <h3 class="m-0 mb-2 text-sm font-bold text-text-muted uppercase tracking-wide flex items-center gap-2">
                <LightBulbIcon class="w-[18px] h-[18px]" /> Tips
              </h3>
              <ul class="m-0 pl-4 text-sm text-text-secondary leading-relaxed list-disc flex flex-col gap-1">
                <li>Recent moves are <strong class="text-text-primary">brighter</strong> — older pieces fade</li>
                <li>Pinch to zoom and drag to pan on mobile</li>
                <li>Win length varies by game mode (3-5 in a row)</li>
              </ul>
            </div>

          </div>
        </Motion>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
