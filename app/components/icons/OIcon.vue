<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="30"
      cy="30"
      :r="radius"
      :stroke="color"
      :stroke-width="strokeWidth"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number | string
  color?: string
  strokeWidth?: number
  radius?: number
}

withDefaults(defineProps<Props>(), {
  size: 60,
  color: '#F44336',
  strokeWidth: 4,
  radius: 22
})
</script>