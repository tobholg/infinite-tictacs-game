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
      d="M13.5 3a8.5 8.5 0 1 0 8.5 8.5c0-2.1-1.4-3-3-3h-1.5a1.5 1.5 0 1 1 0-3H18"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle :cx="7.5" :cy="10.5" r="1" :fill="color" />
    <circle :cx="9.5" :cy="15.5" r="1" :fill="color" />
    <circle :cx="13.5" :cy="16.5" r="1" :fill="color" />
    <circle :cx="15.5" :cy="11.5" r="1" :fill="color" />
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
