<template>
  <div class="player-turn-bar">
    <div class="turn-segments">
      <div
        v-for="(player, index) in players"
        :key="player.symbol"
        class="turn-segment"
        :class="{
          active: currentPlayerIndex === index && !winner,
          winner: winner === player.symbol
        }"
        :style="{
          backgroundColor: PLAYER_COLOR_MAP[player.symbol],
          '--glow-color': PLAYER_COLOR_MAP[player.symbol]
        }"
        :title="player.name"
      >
        <component
          :is="getSymbolComponent(player.symbol)"
          :size="14"
          :stroke-width="3"
          class="segment-icon"
        />
      </div>
    </div>

    <div class="active-player-display">
      <div
        class="active-indicator"
        :style="{ backgroundColor: currentPlayerColor }"
      ></div>
      <span class="active-player-name">{{ displayText }}</span>
      <div v-if="showTimer && timeLeft !== undefined" class="timer-compact" :class="{ warning: timeLeft <= 3 }">
        {{ timeLeft.toFixed(1) }}s
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
import type { Player, PlayerSymbol } from '../../shared/types'

const PLAYER_COLOR_MAP: Record<string, string> = {
  X: '#2196F3',      // Blue
  O: '#F44336',      // Red
  Square: '#9C27B0', // Purple
  Star: '#FF9800',   // Orange
  Triangle: '#4CAF50', // Green
  Diamond: '#00BCD4',  // Cyan
  Circle: '#FFEB3B',   // Yellow
  Plus: '#E91E63',     // Pink
  Heart: '#FF5722',    // Deep Orange
  Pentagon: '#795548'  // Brown
}

const props = defineProps<{
  players: Player[]
  currentPlayerIndex: number
  winner: string | null
  isAIThinking?: boolean
  timeLeft?: number
  showTimer?: boolean
}>()

const currentPlayer = computed(() => props.players[props.currentPlayerIndex])

const currentPlayerColor = computed(() => {
  if (props.winner) {
    return PLAYER_COLOR_MAP[props.winner]
  }
  return PLAYER_COLOR_MAP[currentPlayer.value?.symbol] || '#666'
})

const displayText = computed(() => {
  if (props.winner) {
    const winnerPlayer = props.players.find(p => p.symbol === props.winner)
    return `${winnerPlayer?.name || props.winner} wins!`
  }
  if (props.isAIThinking) {
    return `${currentPlayer.value?.name} thinking...`
  }
  return `${currentPlayer.value?.name}'s turn`
})

const getSymbolComponent = (symbol: PlayerSymbol) => {
  const components: Record<PlayerSymbol, unknown> = {
    X: XIcon,
    O: OIcon,
    Square: SquareIcon,
    Star: StarIcon,
    Triangle: TriangleIcon,
    Diamond: DiamondIcon,
    Circle: CircleIcon,
    Plus: PlusIcon,
    Heart: HeartIcon,
    Pentagon: PentagonIcon
  }
  return components[symbol]
}
</script>

<style scoped>
.player-turn-bar {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
}

.turn-segments {
  display: flex;
  width: 100%;
  max-width: 320px;
  height: 10px;
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  gap: 2px;
}

.turn-segment {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.35;
  transition: all 0.3s ease;
  position: relative;
}

.turn-segment.active {
  opacity: 1;
  box-shadow: 0 0 12px var(--glow-color), 0 0 20px var(--glow-color);
  animation: segmentPulse 1.5s ease-in-out infinite;
}

.turn-segment.winner {
  opacity: 1;
  box-shadow: 0 0 16px var(--glow-color), 0 0 24px var(--glow-color);
  animation: winnerGlow 1s ease-in-out infinite;
}

.segment-icon {
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
  color: white;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

.turn-segment.active .segment-icon,
.turn-segment.winner .segment-icon {
  opacity: 1;
  transform: scale(1);
}

.active-player-display {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.active-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  animation: indicatorPulse 1.5s ease-in-out infinite;
}

.active-player-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.timer-compact {
  padding: 0.15rem 0.5rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.timer-compact.warning {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  animation: timerWarning 0.5s ease-in-out infinite;
}

@keyframes segmentPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes winnerGlow {
  0%, 100% {
    box-shadow: 0 0 16px var(--glow-color), 0 0 24px var(--glow-color);
  }
  50% {
    box-shadow: 0 0 24px var(--glow-color), 0 0 36px var(--glow-color);
  }
}

@keyframes indicatorPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

@keyframes timerWarning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
