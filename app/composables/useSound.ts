// Sound effects composable for online multiplayer
// Uses Howler.js with Web Audio API placeholder sounds

import { ref, readonly, watch } from 'vue'
import { Howl } from 'howler'
import {
  type SoundType,
  generatePlaceholderSound,
  audioBufferToDataUrl,
  unlockAudioContext,
} from '~/utils/placeholderSounds'

export type SoundCategory = 'ui' | 'game' | 'notification'

export interface SoundSettings {
  masterVolume: number
  uiVolume: number
  gameVolume: number
  notificationVolume: number
  muted: boolean
}

// Map sounds to their categories
const soundCategories: Record<SoundType, SoundCategory> = {
  buttonClick: 'ui',
  buttonHover: 'ui',
  modalOpen: 'ui',
  modalClose: 'ui',
  piecePlaced: 'game',
  invalidMove: 'game',
  boardExpand: 'game',
  turnChange: 'game',
  winReveal: 'game',
  gameWin: 'game',
  gameLose: 'game',
  gameDraw: 'game',
  playerJoin: 'notification',
  playerLeave: 'notification',
  countdown: 'notification',
}

// All available sound types
const allSoundTypes: SoundType[] = [
  'buttonClick',
  'buttonHover',
  'modalOpen',
  'modalClose',
  'piecePlaced',
  'invalidMove',
  'boardExpand',
  'turnChange',
  'winReveal',
  'gameWin',
  'gameLose',
  'gameDraw',
  'playerJoin',
  'playerLeave',
  'countdown',
]

// Default settings
const DEFAULTS: SoundSettings = {
  masterVolume: 0.7,
  uiVolume: 0.8,
  gameVolume: 1.0,
  notificationVolume: 0.9,
  muted: false,
}

// Storage key
const STORAGE_KEY = 'infinite_tictacs_online_soundSettings'

// Singleton state
const soundSettings = ref<SoundSettings>({ ...DEFAULTS })
const sounds = ref<Map<SoundType, Howl>>(new Map())
const initialized = ref(false)
const audioUnlocked = ref(false)

function loadSettingsFromStorage(): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      soundSettings.value = {
        masterVolume: parsed.masterVolume ?? DEFAULTS.masterVolume,
        uiVolume: parsed.uiVolume ?? DEFAULTS.uiVolume,
        gameVolume: parsed.gameVolume ?? DEFAULTS.gameVolume,
        notificationVolume: parsed.notificationVolume ?? DEFAULTS.notificationVolume,
        muted: parsed.muted ?? DEFAULTS.muted,
      }
    }
  } catch {
    // Ignore localStorage errors
  }
}

function saveSettingsToStorage(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(soundSettings.value))
  } catch {
    // Ignore localStorage errors
  }
}

function initializeSounds(): void {
  if (typeof window === 'undefined') return

  // Generate placeholder sounds and create Howl instances
  for (const soundType of allSoundTypes) {
    try {
      const buffer = generatePlaceholderSound(soundType)
      const dataUrl = audioBufferToDataUrl(buffer)

      const howl = new Howl({
        src: [dataUrl],
        format: ['wav'],
        preload: true,
        volume: getEffectiveVolume(soundType),
      })

      sounds.value.set(soundType, howl)
    } catch (error) {
      console.warn(`Failed to initialize sound: ${soundType}`, error)
    }
  }
}

function getEffectiveVolume(soundType: SoundType): number {
  if (soundSettings.value.muted) return 0

  const category = soundCategories[soundType]
  let categoryVolume = 1

  switch (category) {
    case 'ui':
      categoryVolume = soundSettings.value.uiVolume
      break
    case 'game':
      categoryVolume = soundSettings.value.gameVolume
      break
    case 'notification':
      categoryVolume = soundSettings.value.notificationVolume
      break
  }

  return soundSettings.value.masterVolume * categoryVolume
}

function updateAllVolumes(): void {
  for (const [soundType, howl] of sounds.value) {
    howl.volume(getEffectiveVolume(soundType))
  }
}

function setupAudioUnlock(): void {
  if (typeof window === 'undefined') return

  const unlock = () => {
    if (!audioUnlocked.value) {
      unlockAudioContext()
      audioUnlocked.value = true
    }
  }

  document.addEventListener('touchstart', unlock, { once: true })
  document.addEventListener('click', unlock, { once: true })
  document.addEventListener('keydown', unlock, { once: true })
}

export function useSound() {
  // Initialize once
  if (!initialized.value && typeof window !== 'undefined') {
    loadSettingsFromStorage()
    initializeSounds()
    setupAudioUnlock()
    initialized.value = true

    // Watch settings changes and persist
    watch(
      soundSettings,
      () => {
        updateAllVolumes()
        saveSettingsToStorage()
      },
      { deep: true }
    )
  }

  function play(soundType: SoundType): void {
    if (soundSettings.value.muted) return

    const howl = sounds.value.get(soundType)
    if (howl) {
      // Update volume before playing in case settings changed
      howl.volume(getEffectiveVolume(soundType))
      howl.play()
    }
  }

  function setMasterVolume(volume: number): void {
    soundSettings.value.masterVolume = Math.max(0, Math.min(1, volume))
  }

  function setCategoryVolume(category: SoundCategory, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    switch (category) {
      case 'ui':
        soundSettings.value.uiVolume = clampedVolume
        break
      case 'game':
        soundSettings.value.gameVolume = clampedVolume
        break
      case 'notification':
        soundSettings.value.notificationVolume = clampedVolume
        break
    }
  }

  function setMuted(muted: boolean): void {
    soundSettings.value.muted = muted
  }

  function toggleMute(): void {
    soundSettings.value.muted = !soundSettings.value.muted
  }

  return {
    soundSettings: readonly(soundSettings),
    play,
    setMasterVolume,
    setCategoryVolume,
    setMuted,
    toggleMute,
  }
}
