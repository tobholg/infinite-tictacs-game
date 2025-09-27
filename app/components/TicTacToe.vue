<template>
  <div class="cosmos-container">
    <div class="creative-aura"></div>

    <div class="tic-tac-toe">
      <div class="title-container">
        <h1 class="main-title">
          <span class="title-word">Infinite</span>
          <span class="title-word">Tic-Tacs</span>
        </h1>
        <p class="subtitle" v-if="!gameStarted">Where Strategy Meets Imagination</p>
      </div>

      <StartMenu v-if="!gameStarted" @start-game="handleStartGame" />

      <GameBoard v-else ref="gameBoardRef" :players="activePlayers" :game-mode="gameMode" :time-limit="timeLimit" @back-to-menu="handleBackToMenu" />

      <!-- Top Menu Dropdown -->
      <div class="dropdown-container" v-if="gameStarted">
        <button @click="toggleDropdown" class="dropdown-toggle" :class="{ active: dropdownOpen }">
          <span class="dropdown-icon">☰</span>
          <span class="dropdown-text">Menu</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div v-if="dropdownOpen" class="dropdown-menu">
          <button @click="handleRestart" class="dropdown-item">
            <span class="item-icon">🎨</span>
            <span>Restart</span>
          </button>
          <button @click="handleBackToMenuFromDropdown" class="dropdown-item">
            <span class="item-icon">✨</span>
            <span>Start Menu</span>
          </button>
        </div>
      </div>


      <div class="creative-quote" v-if="!gameStarted">
        "Every move expands the universe of possibility"
      </div>
    </div>
    <div class="floating-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="orb orb-4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import StartMenu from './StartMenu.vue'
import GameBoard from './GameBoard.vue'
import type { Player, GameSettings } from './StartMenu.vue'

const gameStarted = ref(false)
const activePlayers = ref<Player[]>([])
const gameMode = ref<'classic' | 'speed' | 'gravity' | 'kingofthehill'>('classic')
const timeLimit = ref<number | undefined>(undefined)
const dropdownOpen = ref(false)
const gameBoardRef = ref<any>(null)

const handleStartGame = (settings: GameSettings) => {
  activePlayers.value = settings.players
  gameMode.value = settings.mode
  timeLimit.value = settings.timeLimit
  gameStarted.value = true
}

const handleBackToMenu = () => {
  gameStarted.value = false
  dropdownOpen.value = false
}

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const handleRestart = () => {
  // Emit restart event to GameBoard component
  if (gameBoardRef.value) {
    gameBoardRef.value.resetGame()
  }
  dropdownOpen.value = false
}

const handleBackToMenuFromDropdown = () => {
  handleBackToMenu()
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.dropdown-container')) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Grotesk:wght@300;400;600&display=swap');

.cosmos-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #feca57 75%, #48dbfb 100%);
  background-size: 400% 400%;
  animation: cosmicShift 20s ease infinite;
  position: relative;
  overflow: hidden;
}

@keyframes cosmicShift {
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

.creative-aura {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(255, 119, 48, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(120, 119, 255, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%);
  animation: auraFlow 15s ease-in-out infinite;
  pointer-events: none;
}

@keyframes auraFlow {

  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }

  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.tic-tac-toe {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  z-index: 10;
}

.title-container {
  text-align: center;
  margin-bottom: 2rem;
  animation: titleGlow 3s ease-in-out infinite;
}

@keyframes titleGlow {

  0%,
  100% {
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
  }

  50% {
    filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.9));
  }
}

.main-title {
  font-family: 'Orbitron', monospace;
  font-size: 4rem;
  font-weight: 900;
  margin: 0;
  line-height: 1.2;
  background: linear-gradient(45deg, #fff, #ffd700, #ff69b4, #00ffff, #fff);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textShimmer 3s ease infinite;
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
}

.title-word {
  display: inline-block;
  animation: floatWord 4s ease-in-out infinite;
}

.title-word:nth-child(2) {
  animation-delay: 0.2s;
}

@keyframes floatWord {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

@keyframes textShimmer {
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

.subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 300;
  letter-spacing: 2px;
  margin-top: 0.5rem;
  text-transform: uppercase;
  animation: subtitlePulse 2s ease-in-out infinite;
}

@keyframes subtitlePulse {

  0%,
  100% {
    opacity: 0.8;
  }

  50% {
    opacity: 1;
  }
}

.creative-quote {
  position: absolute;
  bottom: 2rem;
  font-style: italic;
  font-size: 1.1rem;
  color: rgba(138, 43, 226, 0.9);
  text-align: center;
  max-width: 500px;
  padding: 1rem 2rem;
  background: transparent;
  backdrop-filter: blur(10px);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: quoteFloat 6s ease-in-out infinite;
}

@keyframes quoteFloat {

  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-5px) scale(1.02);
  }
}

.floating-orbs {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.6;
  animation: orbFloat 20s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 119, 48, 0.8), transparent);
  top: 10%;
  left: 10%;
  animation-duration: 25s;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(120, 119, 255, 0.8), transparent);
  top: 60%;
  right: 10%;
  animation-duration: 30s;
  animation-delay: -5s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(255, 119, 198, 0.8), transparent);
  bottom: 20%;
  left: 20%;
  animation-duration: 22s;
  animation-delay: -10s;
}

.orb-4 {
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(72, 219, 251, 0.8), transparent);
  top: 30%;
  right: 30%;
  animation-duration: 28s;
  animation-delay: -15s;
}

@keyframes orbFloat {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  25% {
    transform: translate(30px, -50px) scale(1.1);
  }

  50% {
    transform: translate(-20px, 30px) scale(0.9);
  }

  75% {
    transform: translate(-40px, -20px) scale(1.05);
  }
}

.dropdown-container {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 1000;
}

.dropdown-toggle {
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: space-between;
}

.dropdown-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.dropdown-toggle.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}

.dropdown-icon {
  font-size: 1.2rem;
}

.dropdown-text {
  flex: 1;
  text-align: left;
}

.dropdown-arrow {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}

.dropdown-toggle.active .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.3);
  animation: dropdownSlide 0.3s ease;
  min-width: 200px;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.dropdown-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(138, 43, 226, 0.1), transparent);
  transition: left 0.5s ease;
}

.dropdown-item:hover::before {
  left: 100%;
}

.dropdown-item:hover {
  background: rgba(138, 43, 226, 0.1);
  color: #6c3ab5;
  padding-left: 2rem;
}

.dropdown-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.item-icon {
  font-size: 1.2rem;
}
</style>