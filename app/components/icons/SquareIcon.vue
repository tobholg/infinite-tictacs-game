<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="10"
      y="10"
      width="20"
      height="20"
      :stroke="color"
      :stroke-width="strokeWidth"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
  color?: string
  strokeWidth?: number
}

withDefaults(defineProps<Props>(), {
  size: 40,
  color: '#9C27B0',
  strokeWidth: 2
})
</script>