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
      <filter id="glow-star" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path
      d="M20 6 L24 16 L34 16 L26 23 L29 33 L20 27 L11 33 L14 23 L6 16 L16 16 Z"
      :stroke="color"
      :stroke-width="strokeWidth"
      fill="none"
      stroke-linejoin="round"
      :filter="glow ? 'url(#glow-star)' : undefined"
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
  color: '#FFB800',
  strokeWidth: 2,
  glow: true
})
</script>

