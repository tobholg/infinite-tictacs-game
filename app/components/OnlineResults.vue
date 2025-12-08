<script setup lang="ts">
import { computed } from 'vue'
import { Motion } from '@motionone/vue'
import { useOnlineGame } from '~/composables/useOnlineGame'

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
  startGame,
  leaveRoom,
} = useOnlineGame()

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

// Get symbol component
function getSymbolComponent(symbol: string) {
  return symbolComponents[symbol] || XIcon
}

// Actions
function handlePlayAgain() {
  startGame()
}

function handleLeave() {
  leaveRoom()
  emit('backToMenu')
}
</script>

<template>
  <div class="results-wrapper">
    <!-- Result Header -->
    <Motion
      :initial="{ opacity: 0, y: -20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, easing: livelySpringEasing }"
      class="result-header"
    >
      <div v-if="lastRoundIsDraw" class="result-banner draw">
        <span class="result-icon">&#129309;</span>
        <h1 class="result-title">It's a Draw!</h1>
        <p class="result-subtitle">No winner this round</p>
      </div>
      <div v-else class="result-banner victory" :class="{ 'is-me': isWinner }">
        <div v-if="lastRoundWinnerSymbol" class="winner-symbol" :class="`symbol-${lastRoundWinnerSymbol.toLowerCase()}`">
          <component :is="getSymbolComponent(lastRoundWinnerSymbol)" :size="48" :stroke-width="3" />
        </div>
        <h1 class="result-title">
          {{ isWinner ? 'You Win!' : `${lastRoundWinner} Wins!` }}
        </h1>
        <p class="result-subtitle">4 in a row achieved!</p>
      </div>
    </Motion>

    <!-- Scoreboard -->
    <Motion
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.2, easing: livelySpringEasing }"
      class="scoreboard-section"
    >
      <h2 class="section-title">Scoreboard</h2>
      <div class="scoreboard">
        <Motion
          v-for="(player, index) in sortedPlayers"
          :key="player.id"
          :initial="{ opacity: 0, x: -20 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.3, delay: 0.3 + index * 0.1, easing: livelySpringEasing }"
          class="score-row"
          :class="{
            'is-winner': player.id === lastRoundWinnerId,
            'is-me': player.id === myPlayer?.id
          }"
        >
          <span class="rank">{{ index + 1 }}</span>
          <div class="player-info">
            <div class="player-symbol" :class="`symbol-${player.symbol.toLowerCase()}`">
              <component :is="getSymbolComponent(player.symbol)" :size="24" :stroke-width="3" />
            </div>
            <span class="player-name">{{ player.name }}</span>
            <span v-if="player.id === myPlayer?.id" class="you-badge">You</span>
          </div>
          <span class="score">{{ scoreboard[player.id] || 0 }}</span>
        </Motion>
      </div>
    </Motion>

    <!-- Action Buttons -->
    <Motion
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.5, easing: livelySpringEasing }"
      class="actions-section"
    >
      <button v-if="isHost" class="primary-btn" @click="handlePlayAgain">
        Play Again
      </button>
      <p v-else class="waiting-text">
        Waiting for host to start next round...
      </p>
      <button class="secondary-btn" @click="handleLeave">
        Leave Game
      </button>
    </Motion>
  </div>
</template>

<style scoped>
.results-wrapper {
  min-height: 100vh;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  max-width: 500px;
  margin: 0 auto;
}

/* Result Header */
.result-header {
  text-align: center;
  width: 100%;
}

.result-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.result-banner.victory {
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.1), rgba(251, 146, 60, 0.1));
  border-color: rgba(250, 204, 21, 0.3);
}

.result-banner.victory.is-me {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
  border-color: rgba(34, 197, 94, 0.3);
}

.result-banner.draw {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border-color: rgba(99, 102, 241, 0.3);
}

.result-icon {
  font-size: 3rem;
}

.winner-symbol {
  padding: var(--space-4);
  border-radius: 50%;
  background: rgba(250, 204, 21, 0.15);
}

.winner-symbol.symbol-x { color: var(--glow-x); }
.winner-symbol.symbol-o { color: var(--glow-o); }
.winner-symbol.symbol-square { color: var(--glow-square); }
.winner-symbol.symbol-star { color: var(--glow-star); }
.winner-symbol.symbol-triangle { color: var(--glow-triangle); }
.winner-symbol.symbol-diamond { color: var(--glow-diamond); }
.winner-symbol.symbol-circle { color: var(--glow-circle); }
.winner-symbol.symbol-plus { color: var(--glow-plus); }
.winner-symbol.symbol-heart { color: var(--glow-heart); }
.winner-symbol.symbol-pentagon { color: var(--glow-pentagon); }

.result-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.result-banner.victory .result-title {
  color: #fcd34d;
}

.result-banner.victory.is-me .result-title {
  color: var(--color-success);
}

.result-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-muted);
  margin: 0;
}

/* Scoreboard Section */
.scoreboard-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  margin: 0;
}

.scoreboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.score-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.score-row.is-winner {
  background: rgba(250, 204, 21, 0.1);
  border-color: rgba(250, 204, 21, 0.3);
}

.score-row.is-me {
  border-color: var(--color-primary);
}

.rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-elevated);
  border-radius: 50%;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}

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

.player-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.player-symbol {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-symbol.symbol-x { color: var(--glow-x); }
.player-symbol.symbol-o { color: var(--glow-o); }
.player-symbol.symbol-square { color: var(--glow-square); }
.player-symbol.symbol-star { color: var(--glow-star); }
.player-symbol.symbol-triangle { color: var(--glow-triangle); }
.player-symbol.symbol-diamond { color: var(--glow-diamond); }
.player-symbol.symbol-circle { color: var(--glow-circle); }
.player-symbol.symbol-plus { color: var(--glow-plus); }
.player-symbol.symbol-heart { color: var(--glow-heart); }
.player-symbol.symbol-pentagon { color: var(--glow-pentagon); }

.player-name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-primary);
}

.you-badge {
  padding: 2px 6px;
  background: rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  color: #a5b4fc;
}

.score {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 40px;
  text-align: right;
}

/* Actions Section */
.actions-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
}

.primary-btn {
  width: 100%;
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--text-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.secondary-btn {
  padding: var(--space-3) var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-btn:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
}

.waiting-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
