<template>
  <div class="progress-indicator">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      <div class="progress-stages">
        <div v-for="(stage, index) in stages" :key="index"
             class="progress-stage"
             :class="{ active: index < currentStage, current: index === currentStage - 1 }">
          <div class="stage-dot"></div>
          <div class="stage-label">{{ stage }}</div>
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
.progress-indicator {
  width: 100%;
  padding: 1rem 0 2rem 0;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, rgba(138, 43, 226, 0.2), rgba(255, 119, 48, 0.2));
  border-radius: 2px;
  margin-bottom: 0.5rem;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #8a2be2, #ff7730);
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-stages {
  position: absolute;
  top: -8px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.progress-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 3px solid rgba(138, 43, 226, 0.3);
  transition: all 0.3s ease;
  z-index: 2;
}

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

.stage-label {
  position: absolute;
  top: 30px;
  white-space: nowrap;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(138, 43, 226, 0.5);
  transition: all 0.3s ease;
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
