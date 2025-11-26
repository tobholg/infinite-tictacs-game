<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="{ 'icon-glow': glow }"
  >
    <defs>
      <filter id="glow-x" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path
      d="M15 15L45 45M15 45L45 15"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      :filter="glow ? 'url(#glow-x)' : undefined"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number | string
  color?: string
  strokeWidth?: number
  glow?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 60,
  color: '#00D9FF',
  strokeWidth: 4,
  glow: true
})
</script>

<style scoped>
.icon-glow {
  filter: drop-shadow(0 0 8px currentColor);
}
</style>