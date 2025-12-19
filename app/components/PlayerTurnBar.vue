<template>
  <div class="player-turn-bar w-full flex flex-col items-center gap-2 py-2 px-3">
    <div class="turn-segments flex w-full max-w-[320px] h-[10px] rounded-full overflow-hidden bg-surface border border-border gap-[2px]">
      <div
        v-for="(player, index) in players"
        :key="player.symbol"
        class="turn-segment flex-1 flex items-center justify-center opacity-35 transition-all duration-300 relative"
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
          class="segment-icon opacity-0 scale-50 transition-all duration-200 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
        />
      </div>
    </div>

    <div class="active-player-display flex items-center gap-2">
      <div
        class="active-indicator w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] animate-[indicatorPulse_1.5s_ease-in-out_infinite]"
        :style="{ backgroundColor: currentPlayerColor }"
      ></div>
      <span class="active-player-name font-display text-base font-semibold text-text-primary">{{ displayText }}</span>
      <div v-if="showTimer && timeLeft !== undefined" class="timer-compact py-[0.15rem] px-2 bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.3)] rounded-sm font-semibold text-sm text-text-secondary tabular-nums" :class="{ warning: timeLeft <= 3 }">
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
/* Dynamic glow effects - must stay as CSS (uses runtime --glow-color variable) */
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

.turn-segment.active .segment-icon,
.turn-segment.winner .segment-icon {
  opacity: 1;
  transform: scale(1);
}

/* Timer warning state */
.timer-compact.warning {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  animation: timerWarning 0.5s ease-in-out infinite;
}

/* Keyframe animations */
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
