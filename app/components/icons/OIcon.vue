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
      <filter id="glow-o" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle
      cx="30"
      cy="30"
      :r="radius"
      :stroke="color"
      :stroke-width="strokeWidth"
      :filter="glow ? 'url(#glow-o)' : undefined"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number | string
  color?: string
  strokeWidth?: number
  radius?: number
  glow?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 60,
  color: '#FF3366',
  strokeWidth: 4,
  radius: 22,
  glow: true
})
</script>

<style scoped>
.icon-glow {
  filter: drop-shadow(0 0 8px currentColor);
}
</style>