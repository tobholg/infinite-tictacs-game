<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="{ 'icon-glow': glow }"
  >
    <defs>
      <filter id="glow-triangle" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path
      d="M12 4L21 20H3L12 4Z"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      :filter="glow ? 'url(#glow-triangle)' : undefined"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
  color?: string
  strokeWidth?: number
  glow?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 24,
  color: '#00FF9F',
  strokeWidth: 2,
  glow: true
})
</script>

<style scoped>
.icon-glow {
  filter: drop-shadow(0 0 8px currentColor);
}
</style>
