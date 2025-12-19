<template>
  <div class="app-shell">
    <SnowEffect />
    <NuxtPage />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'
import SnowEffect from '~/components/SnowEffect.vue'

const { loadPreferences } = useTheme()

onMounted(() => {
  loadPreferences()
})
</script>
