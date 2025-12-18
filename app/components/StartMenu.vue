<template>
  <div class="flex flex-col gap-3 max-w-[700px] mx-auto">
    <!-- Stage: Mode Selection -->
    <Transition name="slide-fade" mode="out-in">
      <div v-if="stage === 'mode-select'" key="mode-select" class="flex flex-col gap-3">
        <!-- Sound button only on main menu -->
        <div class="flex justify-end items-center gap-3 mb-2">
          <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="showSoundSettings = true">
            <span>🔊</span>
            <span>Sound</span>
          </button>
        </div>
        <section class="bg-surface border border-border rounded-lg py-3 px-4 bg-gradient-to-br from-surface to-[rgba(99,102,241,0.05)]">
          <div class="mb-3 text-center">
            <h2 class="m-0 font-display text-xl font-semibold text-text-primary">How do you want to play?</h2>
          </div>
          <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <button class="flex flex-col items-center gap-2 p-5 bg-surface-elevated border-2 border-border rounded-lg cursor-pointer transition-all duration-200 text-center hover:border-accent hover:-translate-y-1 hover:shadow-lg" @click="selectLocalMode">
              <span class="text-[2.5rem]">🎮</span>
              <span class="text-lg font-semibold text-text-primary">Local Game</span>
              <span class="text-xs text-text-tertiary">Play on this device</span>
            </button>
            <button class="flex flex-col items-center gap-2 p-5 bg-surface-elevated border-2 border-border rounded-lg cursor-pointer transition-all duration-200 text-center hover:border-accent hover:-translate-y-1 hover:shadow-lg" @click="selectOnlineMode">
              <span class="text-[2.5rem]">🌐</span>
              <span class="text-lg font-semibold text-text-primary">Online</span>
              <span class="text-xs text-text-tertiary">Play with friends via room code</span>
            </button>
            <button class="col-span-full flex flex-col items-center gap-2 p-5 bg-gradient-to-br from-[rgba(99,102,241,0.1)] to-[rgba(139,92,246,0.1)] border-2 border-[rgba(139,92,246,0.3)] rounded-lg cursor-pointer transition-all duration-200 text-center hover:border-[#8b5cf6] hover:-translate-y-1 hover:shadow-lg" @click="emit('openAITraining')">
              <span class="text-[2.5rem]">🤖</span>
              <span class="text-lg font-semibold text-text-primary">AI Training Lab</span>
              <span class="text-xs text-text-tertiary">Train and simulate AI players</span>
            </button>
          </div>
        </section>
      </div>

      <!-- Stage: Local Setup -->
      <div v-else-if="stage === 'local-setup'" key="local-setup" class="flex flex-col gap-3">
        <!-- Header with Back and Settings -->
        <div class="flex justify-between items-center gap-3 mb-2 max-sm:flex-wrap">
          <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="goBack">
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <div class="flex items-center gap-2">
            <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="showSoundSettings = true">
              <span>🔊</span>
              <span>Sound</span>
            </button>
            <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent hover:rotate-[15deg]" @click="showSettings = true">
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        <!-- Game Mode -->
        <section class="bg-surface border border-border rounded-lg py-3 px-4">
          <div class="mb-3">
            <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Game Mode</h3>
            <p class="mt-1 mb-0 text-xs text-text-secondary">Select your favorite mode</p>
          </div>
          <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <label v-for="preset in gamePresets" :key="preset.id"
                   class="preset-card relative flex flex-col gap-3 p-4 bg-bg-muted border-4 border-border rounded-lg cursor-pointer transition-all duration-200 hover:border-accent hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg"
                   :class="{ 'preset-selected': isPresetSelected(preset) }">
              <input type="radio"
                     :checked="isPresetSelected(preset)"
                     @change="selectPreset(preset)"
                     class="hidden" />
              <div class="text-[3.5rem] leading-none">{{ preset.icon }}</div>
              <div class="flex flex-col gap-1">
                <h4 class="m-0 text-base font-semibold text-text-primary">{{ preset.name }}</h4>
                <p class="m-0 text-xs text-text-secondary leading-relaxed">{{ preset.description }}</p>
                <div v-if="preset.rules.length > 0" class="flex flex-wrap gap-2">
                  <span v-for="rule in preset.rules" :key="rule" class="py-1 px-3 bg-[rgba(99,102,241,0.15)] text-accent text-xs font-semibold rounded-pill">
                    {{ getRuleLabel(rule) }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </section>

        <!-- Configure Players -->
        <section class="bg-surface border border-border rounded-lg py-3 px-4">
          <div class="mb-3">
            <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Players</h3>
            <p class="mt-1 mb-0 text-xs text-text-secondary">Set player names and symbols</p>
          </div>

          <div class="flex flex-col gap-3">
            <div v-for="(player, index) in players" :key="index"
                 class="player-row grid gap-3 items-center p-3 bg-[rgba(30,30,45,0.5)] dark:bg-[rgba(30,30,45,0.5)] light:bg-surface-elevated backdrop-blur-sm border-2 border-[rgba(99,102,241,0.3)] rounded-md transition-all duration-200 shadow-sm hover:border-[rgba(99,102,241,0.5)] hover:bg-[rgba(40,40,60,0.6)] hover:shadow-md hover:-translate-y-px"
                 :class="{ 'ai-player-row': player.isAI }">
              <div class="w-10 h-10 grid place-items-center bg-[rgba(99,102,241,0.2)] backdrop-blur-sm text-[rgba(167,139,250,0.95)] font-bold rounded-md border border-[rgba(99,102,241,0.3)] shadow-sm">{{ index + 1 }}</div>
              <CharacterPicker
                v-model="player.symbol"
                :used-symbols="getUsedSymbols(index)" />
              <input
                v-model="player.name"
                type="text"
                :placeholder="player.isAI ? `AI ${index + 1}` : `Player ${index + 1} name`"
                class="py-3 px-4 bg-[rgba(20,20,35,0.4)] dark:bg-[rgba(20,20,35,0.4)] light:bg-surface backdrop-blur-sm border border-[rgba(99,102,241,0.25)] light:border-border rounded-md text-[rgba(230,230,250,0.95)] dark:text-[rgba(230,230,250,0.95)] light:text-text-primary text-md transition-all duration-200 focus:outline-none focus:border-[rgba(99,102,241,0.6)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] focus:bg-[rgba(25,25,40,0.5)] placeholder:text-[rgba(150,150,170,0.6)]"
                :disabled="player.isAI"
                @input="handlePlayerNameInput(index)" />

              <!-- AI Toggle & Difficulty -->
              <div class="flex items-center gap-2">
                <button
                  @click="toggleAI(index)"
                  class="w-10 h-10 grid place-items-center bg-bg-muted border-2 border-border rounded-md cursor-pointer text-xl transition-all duration-200 hover:border-accent hover:scale-105"
                  :class="{ 'ai-toggle-active': player.isAI }"
                  :title="player.isAI ? 'Switch to Human' : 'Switch to AI'">
                  {{ player.isAI ? '🤖' : '👤' }}
                </button>
                <select
                  v-if="player.isAI"
                  v-model="player.aiDifficulty"
                  class="py-2 px-3 bg-bg-muted border border-border rounded-md text-text-primary text-sm cursor-pointer transition-all duration-200 focus:outline-none focus:border-accent">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <button
                v-if="players.length > 2"
                @click="removePlayer(index)"
                class="w-9 h-9 grid place-items-center bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-md text-critical cursor-pointer transition-all duration-200 hover:bg-[rgba(239,68,68,0.2)] hover:scale-110"
                title="Remove player">
                ✕
              </button>
            </div>

            <!-- AI Model Status -->
            <div v-if="hasAnyAI" class="p-3 bg-bg-muted rounded-md text-center text-sm">
              <span v-if="aiModelInfo" class="text-positive">
                🤖 AI trained with {{ aiModelInfo.gamesPlayed.toLocaleString() }} games
              </span>
              <span v-else class="text-warning">
                ⚠️ No AI trained for {{ players.length }} players yet.
              </span>
            </div>

            <button
              v-if="players.length < 10"
              @click="addPlayer"
              class="self-start inline-flex items-center justify-center gap-2 py-3 px-6 bg-surface border border-border rounded-pill font-semibold text-md text-text-primary transition-all duration-200 cursor-pointer hover:border-accent hover:-translate-y-0.5">
              <span>+</span>
              <span>Add Player</span>
            </button>
          </div>
        </section>

        <!-- Start Game Button -->
        <div class="flex flex-col gap-3 items-center">
          <button
            @click="handleStartGame"
            class="py-6 px-12 text-xl font-semibold bg-gradient-to-br from-positive to-[#059669] text-white border border-positive rounded-pill shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] hover:bg-gradient-to-br hover:from-[#059669] hover:to-[#047857] disabled:bg-gradient-to-br disabled:from-[#6b7280] disabled:to-[#4b5563] disabled:border-[#6b7280] disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="activePlayers.length < 2 || !selectedMode">
            <span>🎯 Start Game</span>
          </button>
          <p v-if="activePlayers.length < 2" class="m-0 py-3 px-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-md text-critical text-sm font-semibold">
            At least 2 players required to start
          </p>
          <p v-else-if="!selectedMode" class="m-0 py-3 px-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-md text-critical text-sm font-semibold">
            Please select a game mode
          </p>
        </div>
      </div>

      <!-- Stage: Online Selection -->
      <div v-else-if="stage === 'online-select'" key="online-select" class="flex flex-col gap-3">
        <!-- Header with Back and Sound -->
        <div class="flex justify-between items-center gap-3 mb-2">
          <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="goBack">
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="showSoundSettings = true">
            <span>🔊</span>
            <span>Sound</span>
          </button>
        </div>

        <section class="bg-surface border border-border rounded-lg py-3 px-4 bg-gradient-to-br from-surface to-[rgba(99,102,241,0.05)]">
          <div class="mb-3 text-center">
            <h2 class="m-0 font-display text-xl font-semibold text-text-primary">Online Multiplayer</h2>
          </div>
          <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <button class="flex flex-col items-center gap-2 p-5 bg-surface-elevated border-2 border-border rounded-lg cursor-pointer transition-all duration-200 text-center hover:border-accent hover:-translate-y-1 hover:shadow-lg" @click="selectHostMode">
              <span class="text-[2.5rem]">🎯</span>
              <span class="text-lg font-semibold text-text-primary">Host Game</span>
              <span class="text-xs text-text-tertiary">Create a room and invite friends</span>
            </button>
            <button class="flex flex-col items-center gap-2 p-5 bg-surface-elevated border-2 border-border rounded-lg cursor-pointer transition-all duration-200 text-center hover:border-accent hover:-translate-y-1 hover:shadow-lg" @click="handleJoinGameClick" :class="{ expanded: joinFormExpanded }">
              <span class="text-[2.5rem]">🔗</span>
              <span class="text-lg font-semibold text-text-primary">Join Game</span>
              <span class="text-xs text-text-tertiary">Enter a room code to join</span>
            </button>
          </div>
        </section>

        <!-- Join Form (inline) -->
        <Transition name="expand">
          <section v-if="joinFormExpanded" class="bg-surface border border-border rounded-lg py-3 px-4 mt-3">
            <div class="mb-3">
              <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Join a Room</h3>
            </div>
            <div class="flex flex-col gap-2">
              <div class="flex flex-col gap-2 mb-3">
                <label for="join-name" class="text-sm font-medium text-text-secondary">Your Name</label>
                <input
                  id="join-name"
                  v-model="joinName"
                  type="text"
                  placeholder="Enter your name"
                  maxlength="20"
                  class="py-3 px-4 bg-bg-muted border-2 border-border rounded-md text-text-primary text-base outline-none transition-colors duration-200 focus:border-accent placeholder:text-text-tertiary"
                />
              </div>
              <div class="flex flex-col gap-2 mb-3">
                <label for="join-code" class="text-sm font-medium text-text-secondary">Room Code</label>
                <input
                  id="join-code"
                  v-model="joinCode"
                  type="text"
                  placeholder="Enter 6-letter code"
                  maxlength="6"
                  class="py-3 px-4 bg-bg-muted border-2 border-border rounded-md text-text-primary text-lg outline-none transition-colors duration-200 focus:border-accent placeholder:text-text-tertiary uppercase tracking-widest font-mono text-center"
                  @keyup.enter="handleJoinRoom"
                />
              </div>
              <div class="flex flex-col gap-2 mb-3 mt-1">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" v-model="joinAsSpectator" class="w-[18px] h-[18px] accent-accent cursor-pointer" />
                  <span class="text-sm text-text-secondary">Join as spectator (watch only)</span>
                </label>
              </div>
              <button
                class="inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-br from-accent to-accent-strong text-white border border-accent rounded-pill font-semibold text-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!joinName.trim() || !joinCode.trim()"
                @click="handleJoinRoom"
              >
                {{ joinAsSpectator ? 'Join as Spectator' : 'Join Room' }}
              </button>
            </div>
          </section>
        </Transition>
      </div>

      <!-- Stage: Host Setup -->
      <div v-else-if="stage === 'host-setup'" key="host-setup" class="flex flex-col gap-3">
        <!-- Header with Back, Sound, and Settings -->
        <div class="flex justify-between items-center gap-3 mb-2">
          <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="goBack">
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <div class="flex items-center gap-2">
            <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="showSoundSettings = true">
              <span>🔊</span>
              <span>Sound</span>
            </button>
            <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent hover:rotate-[15deg]" @click="showOnlineSettings = true">
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        <section class="bg-surface border border-border rounded-lg py-3 px-4">
          <div class="mb-3 text-center">
            <h2 class="m-0 font-display text-xl font-semibold text-text-primary">Host Online Game</h2>
          </div>

          <!-- Host Name -->
          <div class="flex flex-col gap-2 mb-3">
            <label for="host-name" class="text-sm font-medium text-text-secondary">Your Name</label>
            <input
              id="host-name"
              v-model="hostName"
              type="text"
              placeholder="Enter your name"
              maxlength="20"
              class="py-3 px-4 bg-bg-muted border-2 border-border rounded-md text-text-primary text-base outline-none transition-colors duration-200 focus:border-accent placeholder:text-text-tertiary"
            />
          </div>
        </section>

        <!-- Game Mode -->
        <section class="bg-surface border border-border rounded-lg py-3 px-4">
          <div class="mb-3">
            <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Game Mode</h3>
            <p class="mt-1 mb-0 text-xs text-text-secondary">Select your favorite mode</p>
          </div>
          <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <label v-for="preset in gamePresets" :key="preset.id"
                   class="preset-card relative flex flex-col gap-3 p-4 bg-bg-muted border-4 border-border rounded-lg cursor-pointer transition-all duration-200 hover:border-accent hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg"
                   :class="{ 'preset-selected': isPresetSelected(preset) }">
              <input type="radio"
                     :checked="isPresetSelected(preset)"
                     @change="selectPreset(preset)"
                     class="hidden" />
              <div class="text-[3.5rem] leading-none">{{ preset.icon }}</div>
              <div class="flex flex-col gap-1">
                <h4 class="m-0 text-base font-semibold text-text-primary">{{ preset.name }}</h4>
                <p class="m-0 text-xs text-text-secondary leading-relaxed">{{ preset.description }}</p>
                <div v-if="preset.rules.length > 0" class="flex flex-wrap gap-2">
                  <span v-for="rule in preset.rules" :key="rule" class="py-1 px-3 bg-[rgba(99,102,241,0.15)] text-accent text-xs font-semibold rounded-pill">
                    {{ getRuleLabel(rule) }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </section>

        <!-- Create Room Button -->
        <div class="flex flex-col gap-3 items-center">
          <button
            @click="handleCreateRoom"
            class="py-6 px-12 text-xl font-semibold bg-gradient-to-br from-positive to-[#059669] text-white border border-positive rounded-pill shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] hover:bg-gradient-to-br hover:from-[#059669] hover:to-[#047857] disabled:bg-gradient-to-br disabled:from-[#6b7280] disabled:to-[#4b5563] disabled:border-[#6b7280] disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!hostName.trim() || !selectedMode">
            <span>🚀 Create Room</span>
          </button>
          <p v-if="!hostName.trim()" class="m-0 py-3 px-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-md text-critical text-sm font-semibold">
            Please enter your name
          </p>
          <p v-else-if="!selectedMode" class="m-0 py-3 px-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-md text-critical text-sm font-semibold">
            Please select a game mode
          </p>
        </div>
      </div>
    </Transition>

    <!-- Local Settings Modal -->
    <SettingsModal
      :is-open="showSettings"
      :cant-place-effects="cantPlaceEffects"
      @close="showSettings = false"
      @update:cant-place-effects="cantPlaceEffects = $event"
    />

    <!-- Online Settings Modal -->
    <OnlineSettingsPopup
      :is-open="showOnlineSettings"
      @close="showOnlineSettings = false"
    />

    <!-- Sound Settings Modal -->
    <SoundSettingsPopup
      :is-open="showSoundSettings"
      @close="showSoundSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CharacterPicker from './CharacterPicker.vue'
import SettingsModal from './SettingsModal.vue'
import OnlineSettingsPopup from './OnlineSettingsPopup.vue'
import SoundSettingsPopup from './SoundSettingsPopup.vue'
import { useQLearning, type AIDifficulty } from '~/composables/useQLearning'
import { useSound } from '~/composables/useSound'

interface GamePreset {
  id: string
  name: string
  icon: string
  description: string
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
}

export type PlayerSymbol = 'X' | 'O' | 'Square' | 'Star' | 'Triangle' | 'Diamond' | 'Circle' | 'Plus' | 'Heart' | 'Pentagon'

export interface Player {
  name: string
  symbol: PlayerSymbol
  active: boolean
  teamId?: number
  isAI?: boolean
  aiDifficulty?: AIDifficulty
}

export interface CantPlaceEffects {
  dimmedCells: boolean
  stripedPattern: boolean
  warningIcon: boolean
}

export interface GameSettings {
  players: Player[]
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
  cantPlaceEffects?: CantPlaceEffects
}

export interface OnlineHostSettings {
  hostName: string
  gameMode: 'classic'
  rules: string[]
  timeLimit?: number
  cantPlaceEffects?: CantPlaceEffects
}

// Get AI model info
const { getStoredModelInfo } = useQLearning()

// Sound effects
const { play: playSound } = useSound()

const emit = defineEmits<{
  startGame: [settings: GameSettings]
  createRoom: [settings: OnlineHostSettings]
  joinRoom: [code: string, name: string, asSpectator: boolean]
  openAITraining: []
}>()

// Stage management
type Stage = 'mode-select' | 'local-setup' | 'online-select' | 'host-setup'
const stage = ref<Stage>('mode-select')

// Settings modals
const showSettings = ref(false) // Local settings
const showOnlineSettings = ref(false) // Online settings
const showSoundSettings = ref(false) // Sound settings

// Game configuration
const selectedMode = ref<'classic'>('classic')
const selectedRules = ref<string[]>([])
const timePresetValue = ref<number>(10)

// Can't Place Effects settings
const cantPlaceEffects = ref<CantPlaceEffects>({
  dimmedCells: true,
  stripedPattern: false,
  warningIcon: false
})

// Game presets
const gamePresets: GamePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '🎯',
    description: 'Pure strategy with unlimited time and infinite expansion.',
    gameMode: 'classic',
    rules: []
  },
  {
    id: 'speed-classic',
    name: 'Speed Classic',
    icon: '⚡',
    description: 'Fast-paced classic. 5 seconds per move keeps the pressure on.',
    gameMode: 'classic',
    rules: ['timeLimit'],
    timeLimit: 5
  }
]

// Player setup
const allSymbols: PlayerSymbol[] = ['X', 'O', 'Square', 'Star', 'Triangle', 'Diamond', 'Circle', 'Plus', 'Heart', 'Pentagon']

const players = ref<Player[]>([
  { name: 'Player 1', symbol: 'X', active: true },
  { name: 'Player 2', symbol: 'O', active: true }
])

const activePlayers = computed(() => players.value.filter(p => p.active && (p.name.trim() !== '' || p.isAI)))

// AI-related computed properties
const hasAnyAI = computed(() => players.value.some(p => p.isAI))

const aiModelInfo = computed(() => {
  if (!hasAnyAI.value) return null
  return getStoredModelInfo(players.value.length)
})

// Online flow state
const joinFormExpanded = ref(false)
const joinName = ref('')
const joinCode = ref('')
const joinAsSpectator = ref(false)
const hostName = ref('')

// Stage navigation
function selectLocalMode() {
  playSound('buttonClick')
  resetLocalState()
  stage.value = 'local-setup'
}

function selectOnlineMode() {
  playSound('buttonClick')
  resetOnlineState()
  stage.value = 'online-select'
}

function selectHostMode() {
  playSound('buttonClick')
  stage.value = 'host-setup'
}

function handleJoinGameClick() {
  playSound('buttonClick')
  joinFormExpanded.value = true
}

function goBack() {
  playSound('buttonClick')
  if (stage.value === 'local-setup' || stage.value === 'online-select') {
    stage.value = 'mode-select'
  } else if (stage.value === 'host-setup') {
    stage.value = 'online-select'
  }
}

// Reset state when switching modes
function resetLocalState() {
  players.value = [
    { name: 'Player 1', symbol: 'X', active: true },
    { name: 'Player 2', symbol: 'O', active: true }
  ]
  selectedMode.value = 'classic'
  selectedRules.value = []
  timePresetValue.value = 10
}

function resetOnlineState() {
  joinFormExpanded.value = false
  joinName.value = ''
  joinCode.value = ''
  joinAsSpectator.value = false
  hostName.value = ''
  selectedMode.value = 'classic'
  selectedRules.value = []
  timePresetValue.value = 10
}

// AI functions
function toggleAI(index: number) {
  const player = players.value[index]
  player.isAI = !player.isAI
  if (player.isAI) {
    player.name = `AI ${index + 1}`
    player.aiDifficulty = 'medium'
    player.active = true
  } else {
    player.name = `Player ${index + 1}`
    player.aiDifficulty = undefined
  }
}

// Preset selection
const arraysEqual = (arr1: string[], arr2: string[]) => {
  if (arr1.length !== arr2.length) return false
  const sorted1 = [...arr1].sort()
  const sorted2 = [...arr2].sort()
  return sorted1.every((val, index) => val === sorted2[index])
}

const isPresetSelected = (preset: GamePreset) => {
  return selectedMode.value === preset.gameMode && arraysEqual(selectedRules.value, preset.rules)
}

const getRuleLabel = (ruleId: string) => {
  const labels: Record<string, string> = {
    gravity: 'Gravity',
    timeLimit: 'Timer',
    surrounded: 'Surrounded',
    mirror: 'Mirror',
    decay: 'Decay'
  }
  return labels[ruleId] || ruleId
}

const selectPreset = (preset: GamePreset) => {
  playSound('buttonClick')
  selectedMode.value = preset.gameMode
  selectedRules.value = [...preset.rules]
  if (preset.timeLimit) {
    timePresetValue.value = preset.timeLimit
  } else {
    if (!preset.rules.includes('timeLimit')) {
      timePresetValue.value = 10
    }
  }
}

// Player management
const handlePlayerNameInput = (index: number) => {
  const player = players.value[index]
  if (!player) return
  player.active = player.name.trim() !== ''
}

const getUsedSymbols = (currentIndex: number): PlayerSymbol[] => {
  return players.value
    .filter((_, index) => index !== currentIndex)
    .map(p => p.symbol)
}

const addPlayer = () => {
  if (players.value.length >= 10) return

  const usedSymbols = players.value.map(p => p.symbol)
  const availableSymbol = allSymbols.find(s => !usedSymbols.includes(s)) || 'Circle'
  const playerNumber = players.value.length + 1

  players.value.push({
    name: `Player ${playerNumber}`,
    symbol: availableSymbol,
    active: true
  })
}

const removePlayer = (index: number) => {
  if (players.value.length <= 2) return
  players.value.splice(index, 1)
}

// Actions
const handleStartGame = () => {
  if (activePlayers.value.length >= 2) {
    playSound('buttonClick')
    const settings: GameSettings = {
      players: [...activePlayers.value],
      gameMode: selectedMode.value,
      rules: [...selectedRules.value],
      timeLimit: selectedRules.value.includes('timeLimit') ? timePresetValue.value : undefined,
      cantPlaceEffects: { ...cantPlaceEffects.value }
    }
    emit('startGame', settings)
  }
}

const handleCreateRoom = () => {
  if (hostName.value.trim() && selectedMode.value) {
    playSound('buttonClick')
    const settings: OnlineHostSettings = {
      hostName: hostName.value.trim(),
      gameMode: selectedMode.value,
      rules: [...selectedRules.value],
      timeLimit: selectedRules.value.includes('timeLimit') ? timePresetValue.value : undefined,
      cantPlaceEffects: { ...cantPlaceEffects.value }
    }
    emit('createRoom', settings)
  }
}

const handleJoinRoom = () => {
  if (joinName.value.trim() && joinCode.value.trim()) {
    playSound('buttonClick')
    emit('joinRoom', joinCode.value.trim().toUpperCase(), joinName.value.trim(), joinAsSpectator.value)
  }
}
</script>

<style scoped>
/* Transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

/* Preset selected state */
.preset-selected {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(129, 140, 248, 0.22)) !important;
  border-color: var(--color-accent) !important;
  border-width: 5px !important;
  box-shadow:
    0 20px 40px rgba(99, 102, 241, 0.35),
    0 0 0 4px rgba(99, 102, 241, 0.3),
    0 0 60px rgba(99, 102, 241, 0.2) !important;
  transform: translateY(-6px) scale(1.03) !important;
  color: #eef2ff !important;
}

.preset-selected p {
  color: rgba(238, 242, 255, 0.85) !important;
}

.preset-selected h4 {
  color: #ffffff !important;
  font-size: 1.1rem !important;
}

/* AI toggle active */
.ai-toggle-active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2)) !important;
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.3) !important;
}

/* AI player row */
.ai-player-row {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08)) !important;
  border-color: rgba(99, 102, 241, 0.4) !important;
}

.ai-player-row input {
  opacity: 0.7;
}

/* Player row grid */
.player-row {
  grid-template-columns: 40px auto 1fr auto auto;
}

@media (max-width: 600px) {
  .player-row {
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
  }

  .player-row > :nth-child(3) {
    grid-column: span 2;
  }
}
</style>
