<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="{ 'drop-shadow-[0_0_8px_currentColor]': glow }"
  >
    <defs>
      <filter id="glow-square" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect
      x="10"
      y="10"
      width="20"
      height="20"
      :stroke="color"
      :stroke-width="strokeWidth"
      fill="none"
      :filter="glow ? 'url(#glow-square)' : undefined"
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
  size: 40,
  color: '#A855F7',
  strokeWidth: 2,
  glow: true
})
</script>

