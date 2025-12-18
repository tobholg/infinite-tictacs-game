import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// Color mode types
export type ColorMode = 'light' | 'dark' | 'system'
export type EffectiveColorMode = 'light' | 'dark'

// Seasonal theme types
export type SeasonalTheme = 'auto' | 'christmas' | 'default'
export type EffectiveSeasonalTheme = 'default' | 'christmas'

// Storage keys
const COLOR_MODE_KEY = 'color-mode-preference'
const SEASONAL_KEY = 'seasonal-theme-preference'

// Shared state (singleton pattern for composable)
const colorMode = ref<ColorMode>('system')
const seasonalTheme = ref<SeasonalTheme>('auto')
const systemPrefersDark = ref(true)
const currentMonth = ref(new Date().getMonth())

let mediaQuery: MediaQueryList | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let mountCount = 0

export function useTheme() {
  const isDecember = computed(() => currentMonth.value === 11)

  // Effective color mode based on preference and system
  const effectiveColorMode = computed<EffectiveColorMode>(() => {
    if (colorMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return colorMode.value
  })

  const isDarkMode = computed(() => effectiveColorMode.value === 'dark')
  const isLightMode = computed(() => effectiveColorMode.value === 'light')

  // Effective seasonal theme
  const effectiveSeasonalTheme = computed<EffectiveSeasonalTheme>(() => {
    if (seasonalTheme.value === 'christmas') return 'christmas'
    if (seasonalTheme.value === 'default') return 'default'
    // 'auto' - use December detection
    return isDecember.value ? 'christmas' : 'default'
  })

  const isChristmasTheme = computed(() => effectiveSeasonalTheme.value === 'christmas')

  // Apply theme classes to document
  const applyTheme = () => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Handle dark/light mode class
    if (effectiveColorMode.value === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }

    // Handle seasonal theme data attribute
    root.setAttribute('data-theme', effectiveSeasonalTheme.value)
  }

  const loadPreferences = () => {
    if (typeof window === 'undefined') return

    // Load color mode preference
    const storedColorMode = localStorage.getItem(COLOR_MODE_KEY)
    if (storedColorMode === 'light' || storedColorMode === 'dark' || storedColorMode === 'system') {
      colorMode.value = storedColorMode
    }

    // Load seasonal theme preference
    const storedSeasonal = localStorage.getItem(SEASONAL_KEY)
    if (storedSeasonal === 'christmas' || storedSeasonal === 'default' || storedSeasonal === 'auto') {
      seasonalTheme.value = storedSeasonal
    }

    // Set up system preference listener
    if (typeof window !== 'undefined' && !mediaQuery) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDark.value = mediaQuery.matches

      const handleChange = (e: MediaQueryListEvent) => {
        systemPrefersDark.value = e.matches
      }
      mediaQuery.addEventListener('change', handleChange)
    }
  }

  const setColorMode = (mode: ColorMode) => {
    colorMode.value = mode
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLOR_MODE_KEY, mode)
    }
  }

  const setSeasonalTheme = (theme: SeasonalTheme) => {
    seasonalTheme.value = theme
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEASONAL_KEY, theme)
    }
  }

  // Toggle between light/dark (cycles through: system -> light -> dark -> system)
  const toggleColorMode = () => {
    const modes: ColorMode[] = ['system', 'light', 'dark']
    const currentIndex = modes.indexOf(colorMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    setColorMode(modes[nextIndex]!)
  }

  // Watch and apply changes
  watch([effectiveColorMode, effectiveSeasonalTheme], applyTheme, { immediate: true })

  // Set up hourly check for month changes (handles Nov→Dec, Dec→Jan transitions)
  onMounted(() => {
    mountCount++
    if (mountCount === 1) {
      loadPreferences()
      // Hourly check for month changes
      const checkMonth = () => {
        currentMonth.value = new Date().getMonth()
      }
      intervalId = setInterval(checkMonth, 60 * 60 * 1000)
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
    // Color mode
    colorMode,
    effectiveColorMode,
    isDarkMode,
    isLightMode,
    setColorMode,
    toggleColorMode,

    // Seasonal theme
    seasonalTheme,
    effectiveSeasonalTheme,
    isChristmasTheme,
    isDecember,
    setSeasonalTheme,

    // Utility
    loadPreferences,

    // Legacy aliases (for backwards compatibility)
    themePreference: seasonalTheme,
    effectiveTheme: effectiveSeasonalTheme,
    setPreference: setSeasonalTheme,
    loadPreference: loadPreferences
  }
}
