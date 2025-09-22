<template>
  <div class="start-screen">
    <div class="menu-header">
      <h2 class="menu-title">Assemble Your Creative Collective</h2>
      <p class="menu-subtitle">Each mind brings a unique perspective to the infinite canvas</p>
    </div>
    <div class="player-setup">
      <div v-for="(player, index) in allPlayerSlots" :key="index" class="player-input">
        <div class="player-icon">
          <XIcon v-if="player.symbol === 'X'" :size="30" :stroke-width="3" />
          <OIcon v-else-if="player.symbol === 'O'" :size="30" :stroke-width="3" :radius="10" />
          <SquareIcon v-else-if="player.symbol === 'Square'" :size="30" :stroke-width="3" />
          <StarIcon v-else-if="player.symbol === 'Star'" :size="30" :stroke-width="3" />
        </div>
        <input v-model="player.name" type="text" :placeholder="`Player ${index + 1} name`" class="name-input"
          @input="handlePlayerNameInput(index)" />
        <button v-if="index >= 2 && player.name" @click="clearPlayer(index)" class="remove-btn" title="Remove player">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
    <button @click="handleStartGame" class="start-btn" :disabled="activePlayers.length < 2">
      <span class="btn-text">Ignite the Game</span>
      <span class="player-count">{{ activePlayers.length }} Creative Minds</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import XIcon from './icons/XIcon.vue'
import OIcon from './icons/OIcon.vue'
import SquareIcon from './icons/SquareIcon.vue'
import StarIcon from './icons/StarIcon.vue'

export interface Player {
  name: string
  symbol: 'X' | 'O' | 'Square' | 'Star'
  active: boolean
}

const emit = defineEmits<{
  startGame: [players: Player[]]
}>()

const players = ref<Player[]>([
  { name: 'Player 1', symbol: 'X', active: true },
  { name: 'Player 2', symbol: 'O', active: true },
  { name: '', symbol: 'Square', active: false },
  { name: '', symbol: 'Star', active: false },
])

const allPlayerSlots = computed(() => {
  const filledPlayers = players.value.filter((_, index) => index < 2 || players.value[index].name)
  const nextEmptySlot = players.value.find((p, index) => index >= 2 && !p.name)

  if (nextEmptySlot && filledPlayers.length < 4) {
    return [...filledPlayers, nextEmptySlot]
  }
  return filledPlayers
})

const activePlayers = computed(() => players.value.filter(p => p.active))

const handlePlayerNameInput = (index: number) => {
  const player = players.value[index]
  player.active = player.name.trim() !== ''

  if (index >= 2 && player.active) {
    const hasEmptySlot = players.value.some((p, i) => i >= 2 && !p.name)
    if (!hasEmptySlot && players.value.length < 4) {
      const availableSymbols: Array<'Square' | 'Star'> = ['Square', 'Star']
      const usedSymbols = players.value.map(p => p.symbol)
      const nextSymbol = availableSymbols.find(s => !usedSymbols.includes(s))
      if (nextSymbol) {
        players.value.push({
          name: '',
          symbol: nextSymbol,
          active: false
        })
      }
    }
  }
}

const clearPlayer = (index: number) => {
  if (index >= 2) {
    players.value[index].name = ''
    players.value[index].active = false
  }
}

const handleStartGame = () => {
  if (activePlayers.value.length >= 2) {
    emit('startGame', [...activePlayers.value])
  }
}
</script>

<style scoped>
.start-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  margin-top: 2rem;
  padding: 3rem 3rem 4rem 3rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow:
    0 20px 60px rgba(138, 43, 226, 0.2),
    0 10px 30px rgba(255, 119, 48, 0.1),
    inset 0 0 60px rgba(255, 255, 255, 0.5);
  min-width: 450px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  animation: menuFloat 6s ease-in-out infinite;
}

@keyframes menuFloat {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

.menu-header {
  text-align: center;
  margin-bottom: 0.5rem;
}

.menu-title {
  background: linear-gradient(90deg, #8a2be2, #ff7730, #ff1493);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  animation: titlePulse 3s ease-in-out infinite;
}

@keyframes titlePulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.02);
  }
}

.menu-subtitle {
  color: #666;
  font-size: 0.95rem;
  margin: 0.5rem 0 0 0;
  font-style: italic;
  opacity: 0.9;
}

.player-setup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.player-input {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 240, 255, 0.7));
  border-radius: 16px;
  border: 2px solid transparent;
  background-clip: padding-box;
  position: relative;
  transition: all 0.3s ease;
  z-index: 1;
}

.player-input::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px;
  padding: 2px;
  background: linear-gradient(45deg, #ff6ec4, #7873f5, #4fc3f7);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: -1;
}

.player-input:hover::before {
  opacity: 1;
}

.player-input:hover {
  transform: translateX(5px);
  box-shadow: 0 5px 20px rgba(138, 43, 226, 0.2);
}

.player-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(255, 119, 48, 0.1));
  border-radius: 12px;
  animation: iconPulse 4s ease-in-out infinite;
}

@keyframes iconPulse {

  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }

  50% {
    transform: scale(1.1) rotate(5deg);
  }
}

.name-input {
  flex: 1;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(138, 43, 226, 0.2);
  border-radius: 10px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.name-input::placeholder {
  color: rgba(138, 43, 226, 0.5);
  font-style: italic;
}

.name-input:focus {
  outline: none;
  border-color: transparent;
  box-shadow:
    0 0 0 2px rgba(138, 43, 226, 0.3),
    0 0 20px rgba(138, 43, 226, 0.1);
  background: white;
}

.remove-btn {
  padding: 0;
  background: linear-gradient(135deg, #ff6b6b, #ff4757);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(255, 71, 87, 0.3);
}

.remove-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff5252, #ff2e3f);
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
}

.remove-btn:disabled {
  background: linear-gradient(135deg, #ddd, #bbb);
  cursor: not-allowed;
  opacity: 0.5;
}

.start-btn {
  padding: 1.2rem 2.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  background-size: 200% 200%;
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 700;
  transition: all 0.4s ease;
  box-shadow:
    0 10px 30px rgba(138, 43, 226, 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  animation: btnGradient 3s ease infinite;
}

@keyframes btnGradient {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.btn-text {
  font-size: 1.2rem;
  font-weight: 800;
}

.player-count {
  font-size: 0.85rem;
  opacity: 0.95;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0.5px;
}

.start-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

.start-btn:hover:not(:disabled)::before {
  left: 100%;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.05);
  box-shadow:
    0 15px 40px rgba(138, 43, 226, 0.4),
    inset 0 0 30px rgba(255, 255, 255, 0.3);
}

.start-btn:active:not(:disabled) {
  transform: translateY(-1px) scale(1.02);
}

.start-btn:disabled {
  background: linear-gradient(135deg, #ccc, #999);
  cursor: not-allowed;
  box-shadow: none;
  animation: none;
  opacity: 0.6;
}
</style>