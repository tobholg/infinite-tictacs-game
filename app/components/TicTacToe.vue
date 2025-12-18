<template>
  <div class="experience-shell min-h-screen grid place-items-center p-4" :class="{ 'game-active': gameStarted || isOnlineMode }">
    <!-- Pre-render holiday background (hidden until game starts) -->
    <HolidayBackground :is-visible="gameStarted || isOnlineMode" />

    <!-- AI Training View -->
    <AITraining v-if="showAITraining" @close="showAITraining = false" />

    <!-- Online Mode -->
    <template v-else-if="isOnlineMode">
      <!-- Online Lobby -->
      <OnlineLobby
        v-if="isOnlineLobbyOrCountdown || !onlineGame.isInRoom.value"
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
    </template>

    <!-- Local Mode -->
    <div v-else class="experience-content w-[min(1400px,96vw)] flex flex-col gap-4 items-center text-center">
      <header class="mb-2 shrink-0">
        <h1 class="m-0 heading-display">Infinite Tic-Tacs</h1>
        <p class="mt-1 mb-0 text-sm text-text-tertiary">
          <span v-if="!gameStarted">Start a match and watch the board grow.</span>
          <span v-else>Match in progress — keep every move intentional.</span>
        </p>
      </header>

      <!-- Start Menu -->
      <Motion
        v-if="!gameStarted"
        tag="div"
        class="w-full flex justify-center"
        :initial="{ opacity: 0, y: 20, scale: 0.95 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: -20, scale: 0.95 }"
        :transition="{ duration: 0.4, easing: 'ease-out' }"
      >
        <StartMenu
          @start-game="handleStartGame"
          @create-room="handleCreateRoom"
          @join-room="handleJoinRoom"
          @open-a-i-training="showAITraining = true"
        />
      </Motion>

      <!-- Game Board -->
      <Motion
        v-else
        tag="div"
        class="flex flex-col flex-1 min-h-0 w-full relative"
        :initial="{ opacity: 0, y: 30, scale: 0.95 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: -20, scale: 0.95 }"
        :transition="{ duration: 0.5, easing: 'ease-out' }"
      >
        <div class="flex flex-col items-center gap-3 flex-1 justify-center min-h-0 pt-2">
          <GameBoard
            ref="gameBoardRef"
            :players="activePlayers"
            :game-mode="gameMode"
            :rules="gameRules"
            :time-limit="timeLimit"
            :cant-place-effects="cantPlaceEffects"
            @back-to-menu="handleBackToMenu"
          />
        </div>
        <div class="flex gap-2 justify-center py-2 shrink-0">
          <button class="btn btn-secondary" @click="handleRestart">
            <RefreshIcon class="w-[18px] h-[18px]" />
            <span>Restart</span>
          </button>
          <button class="btn btn-ghost" @click="handleBackToMenu">
            <ExitIcon class="w-[18px] h-[18px]" />
            <span>Menu</span>
          </button>
        </div>
      </Motion>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Motion } from '@motionone/vue'
import StartMenu from './StartMenu.vue'
import GameBoard from './GameBoard.vue'
import HolidayBackground from './HolidayBackground.vue'
import AITraining from './AITraining.vue'
import OnlineLobby from './OnlineLobby.vue'
import OnlineGameBoard from './OnlineGameBoard.vue'
import OnlineResults from './OnlineResults.vue'
import { useOnlineGame } from '~/composables/useOnlineGame'
import type { Player, GameSettings, CantPlaceEffects, OnlineHostSettings } from './StartMenu.vue'
import RefreshIcon from './icons/RefreshIcon.vue'
import ExitIcon from './icons/ExitIcon.vue'
import XIcon from './icons/XIcon.vue'
import OIcon from './icons/OIcon.vue'
import SquareIcon from './icons/SquareIcon.vue'
import StarIcon from './icons/StarIcon.vue'
import TriangleIcon from './icons/TriangleIcon.vue'
import DiamondIcon from './icons/DiamondIcon.vue'
import CircleIcon from './icons/CircleIcon.vue'
import PlusIcon from './icons/PlusIcon.vue'
import HeartIcon from './icons/HeartIcon.vue'
import PentagonIcon from './icons/PentagonIcon.vue'

// Game mode: 'local' | 'online'
const isOnlineMode = ref(false)

// Local game state
const gameStarted = ref(false)
const showAITraining = ref(false)
const activePlayers = ref<Player[]>([])
const gameMode = ref<'classic'>('classic')
const gameRules = ref<string[]>([])
const timeLimit = ref<number | undefined>(undefined)
const cantPlaceEffects = ref<CantPlaceEffects>({
  dimmedCells: true,
  stripedPattern: false,
  warningIcon: false
})
const gameBoardRef = ref<InstanceType<typeof GameBoard> | null>(null)

// Online game state
const onlineGame = useOnlineGame()

// Computed for online routing
const onlinePhase = computed(() => onlineGame.roomPhase.value)
const isInWinReveal = computed(() => onlineGame.isInWinReveal.value)
// Show board during active play OR during win reveal (showing winning cells before results)
const isOnlineGameActive = computed(() => onlinePhase.value === 'ROUND_ACTIVE' || isInWinReveal.value)
const isOnlineResults = computed(() => onlinePhase.value === 'ROUND_RESULTS' && !isInWinReveal.value)
const isOnlineLobbyOrCountdown = computed(() =>
  onlinePhase.value === 'LOBBY' || onlinePhase.value === 'COUNTDOWN'
)

const handleStartGame = (settings: GameSettings) => {
  activePlayers.value = settings.players
  gameMode.value = settings.gameMode
  gameRules.value = settings.rules
  timeLimit.value = settings.timeLimit
  cantPlaceEffects.value = settings.cantPlaceEffects || {
    dimmedCells: true,
    stripedPattern: false,
    warningIcon: false
  }
  gameStarted.value = true
}

const handleCreateRoom = async (settings: OnlineHostSettings) => {
  isOnlineMode.value = true
  // Initialize and create room with the host name
  onlineGame.initialize()
  await onlineGame.createRoom(settings.hostName)
}

const handleJoinRoom = async (code: string, name: string, asSpectator: boolean) => {
  isOnlineMode.value = true
  // Initialize and join the room
  onlineGame.initialize()
  await onlineGame.joinRoom(code, name, asSpectator)
}

const handleBackToMenu = () => {
  // Reset local game state
  gameStarted.value = false
  timeLimit.value = undefined
  gameBoardRef.value?.resetGame()

  // Reset online mode
  isOnlineMode.value = false
  onlineGame.destroy()
}

const handleRestart = () => {
  gameBoardRef.value?.resetGame()
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
