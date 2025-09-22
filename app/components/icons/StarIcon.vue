<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20 6 L24 16 L34 16 L26 23 L29 33 L20 27 L11 33 L14 23 L6 16 L16 16 Z"
      :stroke="color"
      :stroke-width="strokeWidth"
      fill="none"
      stroke-linejoin="round"
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
  color: '#FF9800',
  strokeWidth: 2
})
</script>