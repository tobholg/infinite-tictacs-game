import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export type ThemePreference = 'auto' | 'christmas' | 'default'
export type ThemeName = 'default' | 'christmas'

const STORAGE_KEY = 'theme-preference'

// Shared state (singleton pattern for composable)
const themePreference = ref<ThemePreference>('auto')
const currentMonth = ref(new Date().getMonth())
let intervalId: ReturnType<typeof setInterval> | null = null
let mountCount = 0

export function useTheme() {
  const isDecember = computed(() => currentMonth.value === 11)

  const effectiveTheme = computed<ThemeName>(() => {
    if (themePreference.value === 'christmas') return 'christmas'
    if (themePreference.value === 'default') return 'default'
    // 'auto' - use December detection
    return isDecember.value ? 'christmas' : 'default'
  })

  const isChristmasTheme = computed(() => effectiveTheme.value === 'christmas')

  const loadPreference = () => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'christmas' || stored === 'default' || stored === 'auto') {
      themePreference.value = stored
    }
  }

  const setPreference = (pref: ThemePreference) => {
    themePreference.value = pref
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, pref)
    }
  }

  // Apply data-theme attribute reactively
  watch(effectiveTheme, (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, { immediate: true })

  // Set up hourly check for month changes (handles Nov→Dec, Dec→Jan transitions)
  onMounted(() => {
    mountCount++
    if (mountCount === 1) {
      // First mount - set up interval
      const checkMonth = () => {
        currentMonth.value = new Date().getMonth()
      }
      intervalId = setInterval(checkMonth, 60 * 60 * 1000) // hourly
    }
  })

  onUnmounted(() => {
    mountCount--
    if (mountCount === 0 && intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  return {
    themePreference,
    effectiveTheme,
    isChristmasTheme,
    isDecember,
    setPreference,
    loadPreference
  }
}
