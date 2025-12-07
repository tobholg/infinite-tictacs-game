<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { isChristmasTheme } = useTheme()
</script>

<template>
  <div v-if="isChristmasTheme" class="snow-ground" aria-hidden="true">
    <svg viewBox="0 0 1440 40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="snow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.95)" />
          <stop offset="100%" stop-color="rgba(240,240,250,0.85)" />
        </linearGradient>
      </defs>
      <path
        d="M0,40 C200,30 400,38 600,32 C800,26 1000,35 1200,30 C1400,25 1440,33 1440,40 L1440,40 L0,40 Z"
        fill="url(#snow-gradient)"
      />
    </svg>
  </div>
</template>

<style scoped>
.snow-ground {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 25px;
  pointer-events: none;
  z-index: 5;
}

.snow-ground svg {
  width: 100%;
  height: 100%;
}
</style>
