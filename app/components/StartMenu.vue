<template>
  <div class="flex flex-col gap-3 max-w-[700px] mx-auto">
    <Transition name="slide-fade" mode="out-in">
      <!-- Stage: Online Selection (Home) -->
      <div v-if="stage === 'online-select'" key="online-select" class="flex flex-col gap-3">
        <!-- Header with Sound only (no back button - this is home) -->
        <div class="flex justify-end items-center gap-3 mb-2">
          <button class="flex items-center gap-2 py-2 px-3 bg-surface border border-border rounded-md text-text-secondary text-sm cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary hover:border-accent" @click="showSoundSettings = true">
            <span>🔊</span>
            <span>Sound</span>
          </button>
        </div>

        <section class="bg-surface border border-border rounded-lg py-3 px-4 bg-gradient-to-br from-surface to-[rgba(99,102,241,0.05)]">
          <div class="mb-3 text-center">
            <h1 class="m-0 heading-display">Infinite Tic-Tacs</h1>
            <p class="mt-1 mb-0 text-sm text-text-tertiary">Play with friends via room code</p>
          </div>
          <div class="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <button class="flex flex-col items-center gap-2 p-5 bg-surface-elevated border-2 border-border rounded-lg cursor-pointer transition-all duration-200 text-center shadow-sm hover:border-accent hover:-translate-y-1 hover:shadow-lg" @click="selectHostMode">
              <span class="text-[2.5rem]">🎯</span>
              <span class="text-lg font-semibold text-text-primary">Host Game</span>
              <span class="text-xs text-text-tertiary">Create a room and invite friends</span>
            </button>
            <button class="flex flex-col items-center gap-2 p-5 bg-surface-elevated border-2 border-border rounded-lg cursor-pointer transition-all duration-200 text-center shadow-sm hover:border-accent hover:-translate-y-1 hover:shadow-lg" @click="handleJoinGameClick" :class="{ expanded: joinFormExpanded }">
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
              <p class="mt-1 mb-0 text-xs text-text-secondary">You'll pick your name after joining</p>
            </div>
            <div class="flex flex-col gap-2">
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
              <button
                class="inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-br from-accent to-accent-strong text-white border border-accent rounded-pill font-semibold text-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!joinCode.trim()"
                @click="handleJoinRoom"
              >
                Join Room
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

        <!-- Host Role -->
        <section class="bg-surface border border-border rounded-lg py-3 px-4">
          <div class="mb-3">
            <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Your Role</h3>
            <p class="mt-1 mb-0 text-xs text-text-secondary">Choose how you want to participate</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="role-btn flex flex-col items-center gap-2 p-4 bg-bg-muted border-3 border-border rounded-lg cursor-pointer transition-all duration-200"
              :class="{ 'role-selected': !hostSpectating }"
              @click="hostSpectating = false; playSound('buttonClick')"
            >
              <span class="text-3xl">🎮</span>
              <span class="text-base font-semibold text-text-primary">Play</span>
              <span class="text-xs text-text-secondary text-center">Join the game as a player</span>
            </button>
            <button
              type="button"
              class="role-btn flex flex-col items-center gap-2 p-4 bg-bg-muted border-3 border-border rounded-lg cursor-pointer transition-all duration-200"
              :class="{ 'role-selected': hostSpectating }"
              @click="hostSpectating = true; playSound('buttonClick')"
            >
              <span class="text-3xl">👀</span>
              <span class="text-base font-semibold text-text-primary">Spectate</span>
              <span class="text-xs text-text-secondary text-center">Watch the game unfold</span>
            </button>
          </div>
        </section>

        <!-- Room Settings -->
        <section class="bg-surface border border-border rounded-lg py-3 px-4">
          <div class="mb-3">
            <h3 class="m-0 font-display text-lg font-semibold text-text-primary">Room Settings</h3>
            <p class="mt-1 mb-0 text-xs text-text-secondary">These settings are locked after room creation</p>
          </div>
          <label class="flex items-center gap-3 p-3 bg-bg-muted rounded-lg cursor-pointer hover:bg-surface-elevated transition-colors duration-200">
            <input
              type="checkbox"
              v-model="allowSpectators"
              class="w-5 h-5 accent-accent cursor-pointer"
            />
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-text-primary">Allow Spectators</span>
              <span class="text-xs text-text-secondary">Let others watch the game without playing</span>
            </div>
          </label>
        </section>

        <!-- Create Room Button -->
        <div class="flex flex-col gap-3 items-center">
          <button
            @click="handleCreateRoom"
            class="py-6 px-12 text-xl font-semibold bg-gradient-to-br from-positive to-[#059669] text-white border border-positive rounded-pill shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] hover:bg-gradient-to-br hover:from-[#059669] hover:to-[#047857] disabled:bg-gradient-to-br disabled:from-[#6b7280] disabled:to-[#4b5563] disabled:border-[#6b7280] disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!hostName.trim()">
            <span>🚀 Create Room</span>
          </button>
          <p v-if="!hostName.trim()" class="m-0 py-3 px-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-md text-critical text-sm font-semibold">
            Please enter your name
          </p>
        </div>
      </div>
    </Transition>

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
import { ref } from 'vue'
import OnlineSettingsPopup from './OnlineSettingsPopup.vue'
import SoundSettingsPopup from './SoundSettingsPopup.vue'
import { useSound } from '~/composables/useSound'

export interface OnlineHostSettings {
  hostName: string
  hostSpectating: boolean
  allowSpectators: boolean
}

// Sound effects
const { play: playSound } = useSound()

const emit = defineEmits<{
  createRoom: [settings: OnlineHostSettings]
  joinRoom: [code: string]
}>()

// Stage management (only 2 stages now)
type Stage = 'online-select' | 'host-setup'
const stage = ref<Stage>('online-select')

// Settings modals
const showOnlineSettings = ref(false)
const showSoundSettings = ref(false)

// Host settings (locked after room creation)
const hostSpectating = ref(false)
const allowSpectators = ref(true)

// Online flow state
const joinFormExpanded = ref(false)
const joinCode = ref('')
const hostName = ref('')

// Stage navigation
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
  if (stage.value === 'host-setup') {
    stage.value = 'online-select'
  }
}

// Actions
const handleCreateRoom = () => {
  if (hostName.value.trim()) {
    playSound('buttonClick')
    const settings: OnlineHostSettings = {
      hostName: hostName.value.trim(),
      hostSpectating: hostSpectating.value,
      allowSpectators: allowSpectators.value,
    }
    emit('createRoom', settings)
  }
}

const handleJoinRoom = () => {
  if (joinCode.value.trim()) {
    playSound('buttonClick')
    emit('joinRoom', joinCode.value.trim().toUpperCase())
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

/* Role button styles */
.role-btn {
  border-width: 3px;
}

.role-btn:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.role-selected {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(129, 140, 248, 0.15)) !important;
  border-color: var(--color-accent) !important;
  box-shadow:
    0 8px 20px rgba(99, 102, 241, 0.25),
    0 0 0 2px rgba(99, 102, 241, 0.2) !important;
  transform: translateY(-2px) !important;
}
</style>
