<template>
  <div class="w-full py-4 pb-8">
    <div class="progress-bar relative w-full h-1 bg-gradient-to-r from-[rgba(138,43,226,0.2)] to-[rgba(255,119,48,0.2)] rounded-sm mb-2">
      <div class="progress-fill absolute top-0 left-0 h-full bg-gradient-to-r from-[#8a2be2] to-[#ff7730] rounded-sm transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" :style="{ width: progressPercent + '%' }"></div>
      <div class="absolute -top-2 left-0 w-full flex justify-between">
        <div v-for="(stage, index) in stages" :key="index"
             class="progress-stage relative flex flex-col items-center"
             :class="{ active: index < currentStage, current: index === currentStage - 1 }">
          <div class="stage-dot w-5 h-5 rounded-full bg-white border-[3px] border-[rgba(138,43,226,0.3)] transition-all duration-300 z-[2]"></div>
          <div class="stage-label absolute top-[30px] whitespace-nowrap text-[0.85rem] font-semibold text-[rgba(138,43,226,0.5)] transition-all duration-300">{{ stage }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentStage: number  // 1 or 2
  stages: string[]      // ['Game Setup', 'Player Setup']
}

const props = withDefaults(defineProps<Props>(), {
  currentStage: 1,
  stages: () => ['Game Setup', 'Player Setup']
})

const progressPercent = computed(() => {
  const totalStages = props.stages.length
  return ((props.currentStage - 1) / (totalStages - 1)) * 100
})
</script>

<style scoped>
/* Active and current state styling */
.progress-stage.active .stage-dot {
  background: linear-gradient(135deg, #8a2be2, #ff7730);
  border-color: transparent;
  box-shadow: 0 0 15px rgba(138, 43, 226, 0.5);
}

.progress-stage.current .stage-dot {
  background: linear-gradient(135deg, #8a2be2, #ff7730);
  border-color: transparent;
  box-shadow: 0 0 20px rgba(138, 43, 226, 0.7);
  transform: scale(1.2);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(138, 43, 226, 0.7);
  }
  50% {
    box-shadow: 0 0 30px rgba(138, 43, 226, 0.9);
  }
}

.progress-stage.active .stage-label,
.progress-stage.current .stage-label {
  color: #8a2be2;
}

.progress-stage.current .stage-label {
  font-size: 0.9rem;
  font-weight: 700;
}
</style>
