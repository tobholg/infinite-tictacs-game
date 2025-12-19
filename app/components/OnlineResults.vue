<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from '@motionone/vue'
import { useOnlineGame } from '~/composables/useOnlineGame'
import { useSound } from '~/composables/useSound'

// Icon Components
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

const emit = defineEmits<{
  backToMenu: []
}>()

// Online game state
const {
  players,
  myPlayer,
  isHost,
  scoreboard,
  lastRoundWinner,
  lastRoundWinnerId,
  lastRoundWinnerSymbol,
  lastRoundIsDraw,
  roomPhase,
  startGame,
  leaveRoom,
  returnToLobby,
} = useOnlineGame()

// Sound effects
const { play: playSound } = useSound()

// Local UI state for rematch button feedback
const isStartingNextRound = ref(false)

// Symbol components map
const symbolComponents: Record<string, any> = {
  X: XIcon,
  O: OIcon,
  Square: SquareIcon,
  Star: StarIcon,
  Triangle: TriangleIcon,
  Diamond: DiamondIcon,
  Circle: CircleIcon,
  Plus: PlusIcon,
  Heart: HeartIcon,
  Pentagon: PentagonIcon,
}

// Animation constants
const livelySpringEasing = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Computed
const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => {
    const scoreA = scoreboard.value[a.id] || 0
    const scoreB = scoreboard.value[b.id] || 0
    return scoreB - scoreA
  })
})

const isWinner = computed(() => lastRoundWinnerId.value === myPlayer.value?.id)
const isLoser = computed(() => !lastRoundIsDraw.value && lastRoundWinnerId.value && lastRoundWinnerId.value !== myPlayer.value?.id)

// Play result sound when component mounts
onMounted(() => {
  // Small delay to let WIN_REVEAL sounds finish
  setTimeout(() => {
    if (lastRoundIsDraw.value) {
      playSound('gameDraw')
    } else if (isWinner.value) {
      playSound('gameWin')
    } else if (isLoser.value) {
      playSound('gameLose')
    }
  }, 200)
})

// Get symbol component
function getSymbolComponent(symbol: string) {
  return symbolComponents[symbol] || XIcon
}

// Reset isStartingNextRound when countdown phase starts
watch(roomPhase, (newPhase) => {
  if (newPhase === 'COUNTDOWN') {
    isStartingNextRound.value = false
  }
})

// Actions
function handlePlayAgain() {
  if (isStartingNextRound.value) return // Prevent double clicks
  isStartingNextRound.value = true
  startGame()
}

function handleBackToLobby() {
  playSound('buttonClick')
  returnToLobby()
}

function handleLeave() {
  leaveRoom()
  emit('backToMenu')
}
</script>

<template>
  <div class="min-h-screen p-6 flex flex-col items-center gap-8 max-w-[500px] mx-auto">
    <!-- Result Header -->
    <Motion
      :initial="{ opacity: 0, y: -20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, easing: livelySpringEasing }"
      class="text-center w-full"
    >
      <div v-if="lastRoundIsDraw" class="result-banner draw flex flex-col items-center gap-3 p-6 bg-surface border-2 border-border rounded-xl bg-gradient-to-br from-[rgba(99,102,241,0.1)] to-[rgba(139,92,246,0.1)] border-[rgba(99,102,241,0.3)]">
        <span class="text-[3rem]">&#129309;</span>
        <h1 class="text-2xl font-bold text-text-primary m-0">It's a Draw!</h1>
        <p class="text-base text-text-muted m-0">No winner this round</p>
      </div>
      <div v-else class="result-banner victory flex flex-col items-center gap-3 p-6 bg-surface border-2 rounded-xl" :class="{ 'is-me': isWinner }">
        <div v-if="lastRoundWinnerSymbol" class="winner-symbol p-4 rounded-full bg-[rgba(250,204,21,0.15)]" :class="`symbol-${lastRoundWinnerSymbol.toLowerCase()}`">
          <component :is="getSymbolComponent(lastRoundWinnerSymbol)" :size="48" :stroke-width="3" />
        </div>
        <h1 class="result-title text-2xl font-bold m-0">
          {{ isWinner ? 'You Win!' : `${lastRoundWinner} Wins!` }}
        </h1>
        <p class="text-base text-text-muted m-0">4 in a row achieved!</p>
      </div>
    </Motion>

    <!-- Scoreboard -->
    <Motion
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.2, easing: livelySpringEasing }"
      class="w-full flex flex-col gap-4"
    >
      <h2 class="text-lg font-semibold text-text-primary text-center m-0">Scoreboard</h2>
      <div class="flex flex-col gap-2">
        <Motion
          v-for="(player, index) in sortedPlayers"
          :key="player.id"
          :initial="{ opacity: 0, x: -20 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.3, delay: 0.3 + index * 0.1, easing: livelySpringEasing }"
          class="score-row flex items-center gap-3 py-3 px-4 bg-surface border border-border rounded-md transition-all duration-200"
          :class="{
            'is-winner': player.id === lastRoundWinnerId,
            'is-me': player.id === myPlayer?.id
          }"
        >
          <span class="rank w-7 h-7 flex items-center justify-center bg-surface-elevated rounded-full text-sm font-semibold text-text-muted">{{ index + 1 }}</span>
          <div class="flex-1 flex items-center gap-2">
            <div class="player-symbol w-8 h-8 flex items-center justify-center" :class="`symbol-${player.symbol.toLowerCase()}`">
              <component :is="getSymbolComponent(player.symbol)" :size="24" :stroke-width="3" />
            </div>
            <span class="text-base font-medium text-text-primary">{{ player.name }}</span>
            <span v-if="player.id === myPlayer?.id" class="py-[2px] px-1.5 bg-[rgba(99,102,241,0.2)] rounded-sm text-xs font-semibold text-[#a5b4fc]">You</span>
          </div>
          <span class="text-xl font-bold text-text-primary min-w-[40px] text-right">{{ scoreboard[player.id] || 0 }}</span>
        </Motion>
      </div>
    </Motion>

    <!-- Action Buttons -->
    <Motion
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.5, easing: livelySpringEasing }"
      class="flex flex-col items-center gap-4 w-full"
    >
      <button
        v-if="isHost"
        class="primary-btn w-full p-4 bg-gradient-to-br from-primary to-[#4f46e5] border-none rounded-md text-white text-lg font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.3)] disabled:cursor-not-allowed disabled:opacity-80"
        :class="{ 'is-starting': isStartingNextRound }"
        :disabled="isStartingNextRound"
        @click="handlePlayAgain"
      >
        {{ isStartingNextRound ? 'Resetting...' : 'Play Again' }}
      </button>
      <p v-else class="waiting-text text-sm text-text-muted">
        Waiting for host to start next round...
      </p>
      <button v-if="isHost" class="w-full py-3 px-5 bg-transparent border border-border rounded-md text-text-secondary text-base cursor-pointer transition-all duration-200 hover:bg-surface hover:border-primary hover:text-primary" @click="handleBackToLobby">
        Back to Lobby
      </button>
      <button class="py-3 px-5 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary" @click="handleLeave">
        Leave Game
      </button>
    </Motion>
  </div>
</template>

<style scoped>
/* Victory/Result banner states */
.result-banner.victory {
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.1), rgba(251, 146, 60, 0.1));
  border-color: rgba(250, 204, 21, 0.3);
}

.result-banner.victory.is-me {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
  border-color: rgba(34, 197, 94, 0.3);
}

.result-banner.victory .result-title {
  color: #fcd34d;
}

.result-banner.victory.is-me .result-title {
  color: var(--color-success);
}

/* Winner symbol colors */
.winner-symbol.symbol-x { color: var(--neon-cyan); }
.winner-symbol.symbol-o { color: var(--neon-pink); }
.winner-symbol.symbol-square { color: var(--neon-purple); }
.winner-symbol.symbol-star { color: var(--neon-orange); }
.winner-symbol.symbol-triangle { color: var(--neon-green); }
.winner-symbol.symbol-diamond { color: var(--neon-blue); }
.winner-symbol.symbol-circle { color: var(--neon-yellow); }
.winner-symbol.symbol-plus { color: var(--neon-red); }
.winner-symbol.symbol-heart { color: var(--neon-teal); }
.winner-symbol.symbol-pentagon { color: var(--neon-lime); }

/* Player symbol colors */
.player-symbol.symbol-x { color: var(--neon-cyan); }
.player-symbol.symbol-o { color: var(--neon-pink); }
.player-symbol.symbol-square { color: var(--neon-purple); }
.player-symbol.symbol-star { color: var(--neon-orange); }
.player-symbol.symbol-triangle { color: var(--neon-green); }
.player-symbol.symbol-diamond { color: var(--neon-blue); }
.player-symbol.symbol-circle { color: var(--neon-yellow); }
.player-symbol.symbol-plus { color: var(--neon-red); }
.player-symbol.symbol-heart { color: var(--neon-teal); }
.player-symbol.symbol-pentagon { color: var(--neon-lime); }

/* Score row states */
.score-row.is-winner {
  background: rgba(250, 204, 21, 0.1);
  border-color: rgba(250, 204, 21, 0.3);
}

.score-row.is-me {
  border-color: var(--color-primary);
}

/* Rank styling for top 3 */
.score-row:nth-child(1) .rank {
  background: linear-gradient(135deg, #fcd34d, #f59e0b);
  color: #1f2937;
}

.score-row:nth-child(2) .rank {
  background: linear-gradient(135deg, #d1d5db, #9ca3af);
  color: #1f2937;
}

.score-row:nth-child(3) .rank {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: white;
}

/* Primary button starting state */
.primary-btn.is-starting {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(79, 70, 229, 0.7));
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Waiting text animation */
.waiting-text {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
