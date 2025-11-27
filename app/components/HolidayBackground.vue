<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

defineProps<{
  isVisible: boolean
}>()

const { isChristmasTheme } = useTheme()
</script>

<template>
  <div
    v-if="isChristmasTheme"
    class="holiday-bg"
    :class="{ 'holiday-bg--active': isVisible }"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.holiday-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url('/img/bg_christmas.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(.5px);
  /* Hidden by default - pre-rendered but invisible */
  visibility: hidden;
}

.holiday-bg--active {
  visibility: visible;
}
</style>
