<script setup>
import { ref, computed } from 'vue';
import { eventloop } from '../glue.js';

const props = defineProps({
  currentCopperId: {
    type: Number,
    default: null
  },
  copperList: {
    type: Array,
    default: () => []
  },
  roundNumber: {
    type: Number,
    default: 1
  }
});

const emit = defineEmits(['nextCopper', 'endRound']);

const currentCopperInfo = computed(() => {
  if (!props.currentCopperId) return null;
  return props.copperList.find(c => c.id === props.currentCopperId);
});

async function handleNextCopper() {
  console.log('[TurnSystem] 切换到下一个铜偶');
  emit('nextCopper');
}

async function handleEndRound() {
  console.log('[TurnSystem] 结束回合');
  // 发送回合结束消息
  const message = JSON.stringify({
    type: 'on_game_round_pass'
  });
  await eventloop(message);
  emit('endRound');
}
</script>

<template>
  <div class="turn-system">
    <div class="turn-info">
      <div class="round-badge">
        <span class="round-label">回合</span>
        <span class="round-number">{{ roundNumber }}</span>
      </div>
      
      <div v-if="currentCopperInfo" class="current-copper">
        <span class="current-label">当前:</span>
        <span class="current-name">{{ currentCopperInfo.name || `铜偶 #${currentCopperId}` }}</span>
      </div>

      <div class="copper-queue">
        <div 
          v-for="copper in copperList" 
          :key="copper.id"
          class="queue-item"
          :class="{ 'queue-item--active': copper.id === currentCopperId, 'queue-item--done': copper.turnDone }"
          :title="copper.name || `铜偶 #${copper.id}`"
        >
          <div class="queue-dot"></div>
        </div>
      </div>
    </div>

    <div class="turn-actions">
      <button 
        class="turn-btn turn-btn--next" 
        @click="handleNextCopper"
        :disabled="!currentCopperId"
        title="下一个铜偶 (Space)"
      >
        <span class="btn-icon">▶</span>
        <span class="btn-label">下一个</span>
      </button>
      
      <button 
        class="turn-btn turn-btn--end" 
        @click="handleEndRound"
        title="结束回合 (Enter)"
      >
        <span class="btn-icon">⏭</span>
        <span class="btn-label">结束回合</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.turn-system {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(43, 26, 17, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 200, 100, 0.3);
  z-index: 4000;
  color: #fff;
  min-width: 280px;
}

.turn-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.round-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%);
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.round-label {
  font-size: 14px;
  opacity: 0.9;
}

.round-number {
  font-size: 24px;
  font-weight: 800;
  color: #ffd700;
}

.current-copper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.current-label {
  font-size: 13px;
  opacity: 0.7;
}

.current-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffd700;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.copper-queue {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  justify-content: center;
}

.queue-item {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  position: relative;
}

.queue-item--active {
  background: rgba(255, 215, 0, 0.3);
  border-color: #ffd700;
  transform: scale(1.2);
}

.queue-item--active::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #ffd700;
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.queue-item--done {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.5);
}

.queue-item--done .queue-dot {
  background: #22c55e;
}

.queue-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.queue-item--active .queue-dot {
  background: #ffd700;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.turn-actions {
  display: flex;
  gap: 10px;
}

.turn-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(58, 37, 25, 0.8);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.turn-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.turn-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.turn-btn--next {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.turn-btn--next:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.7);
}

.turn-btn--end {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.turn-btn--end:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.7);
}

.btn-icon {
  font-size: 20px;
}

.btn-label {
  font-size: 11px;
}
</style>



