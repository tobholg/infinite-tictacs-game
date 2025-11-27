<template>
  <div class="app-shell">
    <SnowEffect />
    <TicTacToe />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import SnowEffect from '~/components/SnowEffect.vue'

const { loadPreference } = useTheme()

onMounted(() => {
  loadPreference()
})
</script>
