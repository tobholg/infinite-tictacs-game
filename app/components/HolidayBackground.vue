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
    class="holiday-bg fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat blur-[0.5px] invisible"
    :class="{ 'holiday-bg--active': isVisible }"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.holiday-bg {
  background-image: url('/img/bg_christmas.png');
}

.holiday-bg--active {
  visibility: visible;
}
</style>
