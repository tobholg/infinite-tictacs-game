<template>
  <div class="experience-shell min-h-screen grid place-items-center p-4">
    <HolidayBackground :is-visible="false" />

    <div class="experience-content w-[min(700px,96vw)] flex flex-col gap-4 items-center">
      <StartMenu
        @create-room="handleCreateRoom"
        @join-room="handleJoinRoom"
      />

      <div v-if="statusMessage" class="w-full max-w-[640px] text-center py-3 px-4 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] rounded-md text-text-secondary text-sm">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import StartMenu from '~/components/StartMenu.vue'
import HolidayBackground from '~/components/HolidayBackground.vue'
import { useOnlineGame } from '~/composables/useOnlineGame'
import type { OnlineHostSettings } from '~/components/StartMenu.vue'

const router = useRouter()
const statusMessage = ref('')

const {
  roomCode,
  isInRoom,
  isLoading,
  error,
  initialize,
  createRoom,
  joinRoom,
} = useOnlineGame()

const navigateToRoom = async (): Promise<void> => {
  if (roomCode.value) {
    await router.push(`/game/${roomCode.value}`)
  }
}

const waitForRoom = () => new Promise<string>((resolve, reject) => {
  const timeout = setTimeout(() => {
    stop()
    reject(new Error('Timed out waiting for room'))
  }, 8000)

  const stop = watch(roomCode, (code) => {
    if (code) {
      clearTimeout(timeout)
      stop()
      resolve(code)
    }
  })
})

const handleCreateRoom = async (settings: OnlineHostSettings) => {
  statusMessage.value = 'Creating room...'
  initialize()
  createRoom(settings.hostName, settings.hostSpectating, settings.allowSpectators)

  try {
    await waitForRoom()
    await navigateToRoom()
  } catch (e) {
    statusMessage.value = 'Could not create room. Please try again.'
  }
}

const handleJoinRoom = async (code: string) => {
  statusMessage.value = 'Joining room...'
  initialize()
  joinRoom(code, '', false)

  try {
    await waitForRoom()
    await navigateToRoom()
  } catch (e) {
    statusMessage.value = 'Could not join room. Please check the code.'
  }
}

// Keep UI status in sync with loading/error
watch(isLoading, (loading) => {
  if (!loading && statusMessage.value.includes('...')) {
    statusMessage.value = ''
  }
})

watch(error, (err) => {
  if (err) {
    statusMessage.value = err
  }
})

// If already in a room (e.g., refresh on /), redirect to the game route
if (isInRoom.value && roomCode.value) {
  navigateToRoom()
}
</script>
