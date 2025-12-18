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

// Initialize theme system - loadPreferences is called in onMounted within useTheme
const { loadPreferences } = useTheme()

// Ensure preferences are loaded on mount (handles localStorage + system preference)
onMounted(() => {
  loadPreferences()
})
</script>
