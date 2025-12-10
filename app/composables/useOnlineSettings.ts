// Online-scoped settings (stored in localStorage with 'online_' prefix)

import { ref, watch } from 'vue'

export type ExpansionAnimationMode = 'A_slideOut' | 'B_popInTiles' | 'C_stretchSettle'

export interface CantPlaceEffects {
  dimmedCells: boolean
  stripedPattern: boolean
  warningIcon: boolean
}

// Default settings
const DEFAULTS = {
  expansionAnimationMode: 'A_slideOut' as ExpansionAnimationMode,
  cantPlaceEffects: {
    dimmedCells: true,
    stripedPattern: false,
    warningIcon: false,
  } as CantPlaceEffects,
}

// Storage key prefix to scope these settings to online mode
const STORAGE_PREFIX = 'infinite_tictacs_online_'

// Singleton state
const expansionAnimationMode = ref<ExpansionAnimationMode>(DEFAULTS.expansionAnimationMode)
const cantPlaceEffects = ref<CantPlaceEffects>({ ...DEFAULTS.cantPlaceEffects })
const initialized = ref(false)

function loadFromStorage() {
  if (typeof window === 'undefined') return

  try {
    const storedMode = localStorage.getItem(`${STORAGE_PREFIX}expansionAnimationMode`)
    if (storedMode && ['A_slideOut', 'B_popInTiles', 'C_stretchSettle'].includes(storedMode)) {
      expansionAnimationMode.value = storedMode as ExpansionAnimationMode
    }

    const storedEffects = localStorage.getItem(`${STORAGE_PREFIX}cantPlaceEffects`)
    if (storedEffects) {
      const parsed = JSON.parse(storedEffects)
      cantPlaceEffects.value = {
        dimmedCells: parsed.dimmedCells ?? DEFAULTS.cantPlaceEffects.dimmedCells,
        stripedPattern: parsed.stripedPattern ?? DEFAULTS.cantPlaceEffects.stripedPattern,
        warningIcon: parsed.warningIcon ?? DEFAULTS.cantPlaceEffects.warningIcon,
      }
    }
  } catch {
    // Ignore localStorage errors
  }
}

function saveToStorage() {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(`${STORAGE_PREFIX}expansionAnimationMode`, expansionAnimationMode.value)
    localStorage.setItem(`${STORAGE_PREFIX}cantPlaceEffects`, JSON.stringify(cantPlaceEffects.value))
  } catch {
    // Ignore localStorage errors
  }
}

export function useOnlineSettings() {
  // Initialize once
  if (!initialized.value) {
    loadFromStorage()
    initialized.value = true

    // Watch for changes and persist
    watch(expansionAnimationMode, () => {
      saveToStorage()
    })
    watch(cantPlaceEffects, () => {
      saveToStorage()
    }, { deep: true })
  }

  function setExpansionAnimationMode(mode: ExpansionAnimationMode) {
    expansionAnimationMode.value = mode
  }

  function setCantPlaceEffects(effects: CantPlaceEffects) {
    cantPlaceEffects.value = { ...effects }
  }

  function updateCantPlaceEffect(key: keyof CantPlaceEffects, value: boolean) {
    cantPlaceEffects.value[key] = value
  }

  return {
    expansionAnimationMode,
    setExpansionAnimationMode,
    cantPlaceEffects,
    setCantPlaceEffects,
    updateCantPlaceEffect,
  }
}
