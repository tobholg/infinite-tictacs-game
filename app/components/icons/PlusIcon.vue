<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="{ 'drop-shadow-[0_0_8px_currentColor]': glow }"
  >
    <defs>
      <filter id="glow-plus" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path
      d="M12 5V19M5 12H19"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      :filter="glow ? 'url(#glow-plus)' : undefined"
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
  color: '#F44336',
  strokeWidth: 2,
  glow: true
})
</script>

