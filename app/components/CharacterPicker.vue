<template>
  <div class="character-picker relative">
    <div class="picker-button flex items-center gap-2 py-2 px-3 bg-[rgba(30,30,45,0.6)] backdrop-blur-[10px] border-2 border-[rgba(99,102,241,0.4)] rounded-[10px] cursor-pointer transition-all duration-300 min-w-[80px] shadow-[0_2px_8px_rgba(0,0,0,0.2)]" @click="toggleDropdown" :class="{ open: isOpen, disabled: disabled }">
      <div class="flex items-center justify-center flex-1">
        <component :is="getSymbolComponent(modelValue)" :size="28" :stroke-width="3" />
      </div>
      <ChevronDownIcon v-if="!disabled" class="picker-arrow w-4 h-4 text-[rgba(167,139,250,0.9)] transition-transform duration-300" />
    </div>
    <div v-if="isOpen" class="picker-dropdown absolute top-[calc(100%+0.5rem)] left-0 min-w-[200px] bg-[rgba(25,25,40,0.85)] backdrop-blur-[20px] border-2 border-[rgba(99,102,241,0.4)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(99,102,241,0.2)] z-[100] p-2">
      <div v-for="symbol in availableSymbols" :key="symbol"
           class="symbol-option flex items-center gap-3 py-3 px-3 rounded-lg cursor-pointer transition-all duration-200"
           :class="{ selected: symbol === modelValue, disabled: !isSymbolAvailable(symbol) }"
           @click="selectSymbol(symbol)">
        <component :is="getSymbolComponent(symbol)" :size="24" :stroke-width="3" />
        <span class="symbol-name text-[0.9rem] font-semibold text-[rgba(230,230,250,0.95)]">{{ symbol }}</span>
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
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import type { PlayerSymbol } from '../../shared/types'

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
/* State classes for picker button */
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

.picker-button.open .picker-arrow {
  transform: rotate(180deg);
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

/* Dropdown animation */
.picker-dropdown {
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

/* Symbol option states */
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

.symbol-option.disabled .symbol-name {
  color: rgba(150, 150, 170, 0.6);
}

/* Light Mode Overrides */
:root.light .picker-button {
  background: rgba(248, 250, 252, 0.9);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

:root.light .picker-button:hover {
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
  background: rgba(241, 245, 249, 0.95);
}

:root.light .picker-button.open {
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(237, 242, 247, 0.95);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.25);
}

:root.light .picker-arrow {
  color: rgba(67, 56, 202, 0.8);
}

:root.light .picker-dropdown {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 20px rgba(99, 102, 241, 0.15);
}

:root.light .symbol-option:hover:not(.disabled) {
  background: rgba(99, 102, 241, 0.1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

:root.light .symbol-option.selected {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
}

:root.light .symbol-name {
  color: rgba(30, 41, 59, 0.95);
}

:root.light .symbol-option.disabled .symbol-name {
  color: rgba(100, 116, 139, 0.5);
}
</style>
