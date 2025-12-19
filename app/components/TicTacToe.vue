<template>
  <div class="experience-shell min-h-screen grid place-items-center p-4" :class="{ 'game-active': isInRoom }">
    <!-- Pre-render holiday background (hidden until in game) -->
    <HolidayBackground :is-visible="isInRoom" />

    <!-- Start Menu (not in a room yet) -->
    <div v-if="!isInRoom" class="experience-content w-[min(700px,96vw)] flex flex-col gap-4 items-center">
      <StartMenu
        @create-room="handleCreateRoom"
        @join-room="handleJoinRoom"
      />
    </div>

    <!-- Online Lobby (in room, waiting for game to start) -->
    <OnlineLobby
      v-else-if="isOnlineLobbyOrCountdown"
      @back-to-menu="handleBackToMenu"
    />

    <!-- Online Game Board -->
    <OnlineGameBoard
      v-else-if="isOnlineGameActive"
      @back-to-menu="handleBackToMenu"
    />

    <!-- Online Results -->
    <OnlineResults
      v-else-if="isOnlineResults"
      @back-to-menu="handleBackToMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HolidayBackground from './HolidayBackground.vue'
import StartMenu from './StartMenu.vue'
import OnlineLobby from './OnlineLobby.vue'
import OnlineGameBoard from './OnlineGameBoard.vue'
import OnlineResults from './OnlineResults.vue'
import { useOnlineGame } from '~/composables/useOnlineGame'
import type { OnlineHostSettings } from './StartMenu.vue'

// Online game state
const onlineGame = useOnlineGame()

// Computed for routing
const isInRoom = computed(() => onlineGame.isInRoom.value)
const onlinePhase = computed(() => onlineGame.roomPhase.value)
const isInWinReveal = computed(() => onlineGame.isInWinReveal.value)

// Show board during active play OR during win reveal (showing winning cells before results)
const isOnlineGameActive = computed(() => onlinePhase.value === 'ROUND_ACTIVE' || isInWinReveal.value)
const isOnlineResults = computed(() => onlinePhase.value === 'ROUND_RESULTS' && !isInWinReveal.value)
const isOnlineLobbyOrCountdown = computed(() =>
  onlinePhase.value === 'LOBBY' || onlinePhase.value === 'COUNTDOWN'
)

const handleCreateRoom = async (settings: OnlineHostSettings) => {
  onlineGame.initialize()
  await onlineGame.createRoom(
    settings.hostName,
    settings.hostSpectating,
    settings.allowSpectators
  )
}

const handleJoinRoom = async (code: string) => {
  onlineGame.initialize()
  // Join with empty name - player will set name in lobby popup
  await onlineGame.joinRoom(code, '', false)
}

const handleBackToMenu = () => {
  onlineGame.destroy()
}
</script>

<style scoped>
/* When game is active, use full viewport layout */
.experience-shell.game-active {
  place-items: stretch;
  padding: 0;
}

/* Full-screen layout when game is active */
.experience-shell.game-active .experience-content {
  width: 100%;
  max-width: 100%;
  height: 100vh;
  gap: 0;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
}

/* Compact header when game is active */
.experience-shell.game-active header {
  margin-bottom: 0;
  padding: var(--space-2) 0;
}

/* Shrink title dramatically in game mode */
.experience-shell.game-active .heading-display {
  font-size: var(--text-lg);
  line-height: 1.2;
}

/* Shrink subtitle in game mode */
.experience-shell.game-active header p {
  font-size: var(--text-xs);
  margin-top: var(--space-1);
}

/* Let players strip flow naturally in game layout */
.experience-shell.game-active :deep(.players-strip) {
  width: 100%;
  max-width: 90vw;
}

@media (max-width: 720px) {
  .experience-shell {
    padding: var(--space-5) var(--space-3);
  }

  .experience-shell.game-active > div:last-child > div:last-child {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
