<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 15L45 45M15 45L45 15"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number | string
  color?: string
  strokeWidth?: number
}

withDefaults(defineProps<Props>(), {
  size: 60,
  color: '#2196F3',
  strokeWidth: 4
})
</script>