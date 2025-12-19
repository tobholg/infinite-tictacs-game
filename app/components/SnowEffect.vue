<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { isChristmasTheme } = useTheme()
const prefersReducedMotion = ref(false)

// Generate stable snowflake configs ONCE - prevents "jumping" on re-render
interface SnowflakeConfig {
  left: number      // 0-100 (%)
  size: number      // 4-8 (px)
  duration: number  // 8-15 (s)
  delay: number     // 0-10 (s)
  drift: number     // -30 to 30 (px horizontal movement)
  opacity: number   // 0.4-0.9
}

const snowflakes = ref<SnowflakeConfig[]>([])

onMounted(() => {
  // Check reduced motion preference
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Generate 18 stable snowflake configs
  snowflakes.value = Array.from({ length: 18 }, () => ({
    left: Math.random() * 100,
    size: 4 + Math.random() * 4,
    duration: 8 + Math.random() * 7,
    delay: Math.random() * 10,
    drift: -30 + Math.random() * 60,
    opacity: 0.4 + Math.random() * 0.5
  }))
})

const getFlakeStyle = (config: SnowflakeConfig) => ({
  left: `${config.left}%`,
  width: `${config.size}px`,
  height: `${config.size}px`,
  '--flake-opacity': config.opacity,
  '--duration': `${config.duration}s`,
  '--delay': `${config.delay}s`,
  '--drift': `${config.drift}px`
})
</script>

<template>
  <div v-if="isChristmasTheme && !prefersReducedMotion" class="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
    <div
      v-for="(flake, i) in snowflakes"
      :key="i"
      class="snowflake absolute -top-[10px] bg-[rgba(255,255,255,0.85)] rounded-full pointer-events-none will-change-transform"
      :style="getFlakeStyle(flake)"
    />
  </div>
</template>

<style scoped>
/* Dynamic animation - must stay as CSS (uses runtime variables) */
@keyframes snowfall {
  0% {
    transform: translateY(-10px) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: var(--flake-opacity, 0.7);
  }
  90% {
    opacity: var(--flake-opacity, 0.7);
  }
  100% {
    transform: translateY(100vh) translateX(var(--drift)) rotate(360deg);
    opacity: 0;
  }
}

.snowflake {
  animation: snowfall var(--duration) linear infinite;
  animation-delay: var(--delay);
}
</style>
