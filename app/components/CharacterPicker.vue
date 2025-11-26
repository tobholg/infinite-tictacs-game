<template>
  <div class="character-picker">
    <div class="picker-button" @click="toggleDropdown" :class="{ open: isOpen, disabled: disabled }">
      <div class="selected-symbol">
        <component :is="getSymbolComponent(modelValue)" :size="28" :stroke-width="3" />
      </div>
      <span class="picker-arrow" v-if="!disabled">▼</span>
    </div>
    <div v-if="isOpen" class="picker-dropdown">
      <div v-for="symbol in availableSymbols" :key="symbol"
           class="symbol-option"
           :class="{ selected: symbol === modelValue, disabled: !isSymbolAvailable(symbol) }"
           @click="selectSymbol(symbol)">
        <component :is="getSymbolComponent(symbol)" :size="24" :stroke-width="3" />
        <span class="symbol-name">{{ symbol }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
import type { PlayerSymbol } from './StartMenu.vue'

interface Props {
  modelValue: PlayerSymbol
  usedSymbols: PlayerSymbol[]  // Symbols already taken by other players
  disabled?: boolean  // Disable picker in team mode
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [symbol: PlayerSymbol]
}>()

const isOpen = ref(false)

const allSymbols: PlayerSymbol[] = ['X', 'O', 'Square', 'Star', 'Triangle', 'Diamond', 'Circle', 'Plus', 'Heart', 'Pentagon']

const availableSymbols = computed(() => {
  return allSymbols
})

const isSymbolAvailable = (symbol: PlayerSymbol) => {
  return !props.usedSymbols.includes(symbol) || symbol === props.modelValue
}

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

const selectSymbol = (symbol: PlayerSymbol) => {
  if (!isSymbolAvailable(symbol)) return
  emit('update:modelValue', symbol)
  isOpen.value = false
}

const getSymbolComponent = (symbol: PlayerSymbol) => {
  const components: Record<PlayerSymbol, any> = {
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

// Close dropdown when clicking outside
if (typeof window !== 'undefined') {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.character-picker')) {
      isOpen.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
}
</script>

<style scoped>
.character-picker {
  position: relative;
}

.picker-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(30, 30, 45, 0.6);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(99, 102, 241, 0.4);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.picker-button:hover {
  border-color: rgba(99, 102, 241, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  background: rgba(40, 40, 60, 0.7);
}

.picker-button.open {
  border-color: rgba(99, 102, 241, 0.8);
  background: rgba(45, 45, 65, 0.8);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.picker-button.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

.picker-button.disabled:hover {
  transform: none;
  box-shadow: none;
  border-color: rgba(138, 43, 226, 0.3);
}

.selected-symbol {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.picker-arrow {
  font-size: 0.7rem;
  color: rgba(167, 139, 250, 0.9);
  transition: transform 0.3s ease;
}

.picker-button.open .picker-arrow {
  transform: rotate(180deg);
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  min-width: 200px;
  background: rgba(25, 25, 40, 0.85);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(99, 102, 241, 0.4);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.2);
  z-index: 100;
  padding: 0.5rem;
  animation: dropdownSlide 0.2s ease;
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

.symbol-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.symbol-option:hover:not(.disabled) {
  background: rgba(99, 102, 241, 0.15);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

.symbol-option.selected {
  background: rgba(99, 102, 241, 0.25);
  border: 1px solid rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
}

.symbol-option.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.symbol-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(230, 230, 250, 0.95);
}

.symbol-option.disabled .symbol-name {
  color: rgba(150, 150, 170, 0.6);
}

/* Light Mode Overrides */
@media (prefers-color-scheme: light) {
  .picker-button {
    background: rgba(248, 250, 252, 0.9);
    border: 2px solid rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .picker-button:hover {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
    background: rgba(241, 245, 249, 0.95);
  }

  .picker-button.open {
    border-color: rgba(99, 102, 241, 0.6);
    background: rgba(237, 242, 247, 0.95);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.25);
  }

  .picker-arrow {
    color: rgba(67, 56, 202, 0.8);
  }

  .picker-dropdown {
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid rgba(99, 102, 241, 0.3);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 20px rgba(99, 102, 241, 0.15);
  }

  .symbol-option:hover:not(.disabled) {
    background: rgba(99, 102, 241, 0.1);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }

  .symbol-option.selected {
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
  }

  .symbol-name {
    color: rgba(30, 41, 59, 0.95);
  }

  .symbol-option.disabled .symbol-name {
    color: rgba(100, 116, 139, 0.5);
  }
}
</style>
