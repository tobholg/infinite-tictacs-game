<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { isChristmasTheme } = useTheme()
</script>

<template>
  <div v-if="isChristmasTheme" class="christmas-decorations" aria-hidden="true">
    <!-- Top-left holly -->
    <svg class="decoration top-left" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.35">
        <!-- Holly leaves -->
        <path d="M20 40 C15 35, 10 25, 20 15 C25 20, 30 25, 35 30 C30 35, 25 40, 20 40Z" fill="#2d5a27"/>
        <path d="M40 20 C35 15, 25 10, 15 20 C20 25, 25 30, 30 35 C35 30, 40 25, 40 20Z" fill="#3d7a37"/>
        <path d="M35 45 C30 40, 20 35, 25 25 C30 30, 35 35, 40 40 C35 45, 30 50, 35 45Z" fill="#2d5a27"/>
        <!-- Berries -->
        <circle cx="28" cy="32" r="5" fill="#c41e3a"/>
        <circle cx="22" cy="28" r="4" fill="#e63946"/>
        <circle cx="32" cy="26" r="4" fill="#c41e3a"/>
      </g>
    </svg>

    <!-- Top-right holly (mirrored) -->
    <svg class="decoration top-right" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.35" transform="scale(-1, 1) translate(-80, 0)">
        <!-- Holly leaves -->
        <path d="M20 40 C15 35, 10 25, 20 15 C25 20, 30 25, 35 30 C30 35, 25 40, 20 40Z" fill="#2d5a27"/>
        <path d="M40 20 C35 15, 25 10, 15 20 C20 25, 25 30, 30 35 C35 30, 40 25, 40 20Z" fill="#3d7a37"/>
        <path d="M35 45 C30 40, 20 35, 25 25 C30 30, 35 35, 40 40 C35 45, 30 50, 35 45Z" fill="#2d5a27"/>
        <!-- Berries -->
        <circle cx="28" cy="32" r="5" fill="#c41e3a"/>
        <circle cx="22" cy="28" r="4" fill="#e63946"/>
        <circle cx="32" cy="26" r="4" fill="#c41e3a"/>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.christmas-decorations {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.decoration {
  position: absolute;
  width: 60px;
  height: 60px;
}

.top-left {
  top: 8px;
  left: 8px;
}

.top-right {
  top: 8px;
  right: 8px;
}

@media (min-width: 768px) {
  .decoration {
    width: 80px;
    height: 80px;
  }

  .top-left {
    top: 12px;
    left: 12px;
  }

  .top-right {
    top: 12px;
    right: 12px;
  }
}
</style>
