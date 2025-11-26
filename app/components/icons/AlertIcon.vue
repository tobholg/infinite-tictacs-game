<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 4.5 3 19h18L12 4.5Z"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <path
      d="M12 10v4"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />
    <circle :cx="12" :cy="16.5" r="1" :fill="color" />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number | string
  color?: string
  strokeWidth?: number
}

withDefaults(defineProps<Props>(), {
  size: 18,
  color: 'currentColor',
  strokeWidth: 1.6
})
</script>

