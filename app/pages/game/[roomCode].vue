<template>
  <div class="experience-shell min-h-screen grid place-items-center p-4" :class="{ 'game-active': isInRoom }">
    <HolidayBackground :is-visible="isInRoom" />

    <div v-if="reconnecting" class="experience-content w-[min(700px,96vw)] flex flex-col gap-4 items-center text-center">
      <div class="py-4 px-5 bg-surface border border-border rounded-lg text-text-secondary">
        <p class="m-0 text-base font-semibold text-text-primary">Reconnecting to your game...</p>
        <p class="m-0 text-sm text-text-muted">If this takes too long, you can go back and rejoin.</p>
      </div>
    </div>

    <div v-else-if="reconnectError" class="experience-content w-[min(700px,96vw)] flex flex-col gap-4 items-center text-center">
      <div class="py-4 px-5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-critical">
        <p class="m-0 text-base font-semibold">Could not rejoin this room.</p>
        <p class="m-0 text-sm text-text-secondary mt-1">{{ reconnectError }}</p>
      </div>
      <button class="inline-flex items-center justify-center gap-2 py-2 px-4 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="goHome">
        Back to home
      </button>
    </div>

    <div v-else class="experience-content w-[min(700px,96vw)] flex flex-col gap-4 items-center">
      <OnlineLobby
        v-if="isOnlineLobbyOrCountdown"
        @back-to-menu="handleBackToMenu"
      />

      <OnlineGameBoard
        v-else-if="isOnlineGameActive"
        @back-to-menu="handleBackToMenu"
      />

      <OnlineResults
        v-else-if="isOnlineResults"
        @back-to-menu="handleBackToMenu"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HolidayBackground from '~/components/HolidayBackground.vue'
import OnlineLobby from '~/components/OnlineLobby.vue'
import OnlineGameBoard from '~/components/OnlineGameBoard.vue'
import OnlineResults from '~/components/OnlineResults.vue'
import { useOnlineGame } from '~/composables/useOnlineGame'

const route = useRoute()
const router = useRouter()

const onlineGame = useOnlineGame()

const reconnecting = ref(true)
const reconnectError = ref<string | null>(null)

const isInRoom = computed(() => onlineGame.isInRoom.value)
const onlinePhase = computed(() => onlineGame.roomPhase.value)
const isInWinReveal = computed(() => onlineGame.isInWinReveal.value)

const isOnlineGameActive = computed(() => onlinePhase.value === 'ROUND_ACTIVE' || isInWinReveal.value)
const isOnlineResults = computed(() => onlinePhase.value === 'ROUND_RESULTS' && !isInWinReveal.value)
const isOnlineLobbyOrCountdown = computed(() =>
  onlinePhase.value === 'LOBBY' || onlinePhase.value === 'COUNTDOWN'
)

const goHome = async () => {
  await router.push('/')
}

const ensureRouteMatchesRoom = async () => {
  if (onlineGame.roomCode.value && onlineGame.roomCode.value !== route.params.roomCode) {
    await router.replace(`/game/${onlineGame.roomCode.value}`)
  }
}

const attemptResumeSession = async () => {
  reconnecting.value = true
  reconnectError.value = null

  onlineGame.initialize()

  // If we already have a room (navigated from index), just ensure URL matches
  if (isInRoom.value && onlineGame.roomCode.value) {
    await ensureRouteMatchesRoom()
    reconnecting.value = false
    return
  }

  const success = await onlineGame.attemptReconnect()

  // Wait a moment for server to confirm
  setTimeout(async () => {
    if (isInRoom.value && onlineGame.roomCode.value) {
      await ensureRouteMatchesRoom()
      reconnecting.value = false
      return
    }

    reconnectError.value = success
      ? 'Reconnect did not complete. Please rejoin from home.'
      : 'No saved session found for this room.'
    reconnecting.value = false
  }, 600)
}

const handleBackToMenu = () => {
  onlineGame.destroy()
  goHome()
}

onMounted(() => {
  attemptResumeSession()
})
</script>
