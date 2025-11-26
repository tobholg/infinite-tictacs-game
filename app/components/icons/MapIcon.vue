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
      d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linejoin="round"
    />
    <path
      d="M9 4v14m6-12v14"
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
  size: 20,
  color: 'currentColor',
  strokeWidth: 1.6
})
</script>
