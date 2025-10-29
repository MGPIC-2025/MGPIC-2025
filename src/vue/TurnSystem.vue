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
  background: #B87333;
  border: 4px solid #8B6914;
  padding: 16px 20px;
  box-shadow: 
    5px 0 15px rgba(0,0,0,0.5),
    inset -2px 0 5px rgba(255,255,255,0.1),
    inset 0 -2px 5px rgba(0,0,0,0.2);
  z-index: 4000;
  color: #1a0f00;
  min-width: 280px;
  font-family: "Press Start 2P", "Courier New", monospace;
  
  /* 像素化效果 */
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  
  /* 古铜色金属纹理 */
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.05) 2px,
      rgba(255,255,255,0.05) 4px
    ),
    linear-gradient(
      135deg,
      rgba(184, 115, 51, 1) 0%,
      rgba(205, 127, 50, 1) 50%,
      rgba(184, 115, 51, 1) 100%
    );
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
  background: #D4A574;
  border: 2px solid #8B6914;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 1px rgba(255,255,255,0.2);
}

.round-label {
  font-size: 11px;
  color: #6B4423;
  font-weight: bold;
}

.round-number {
  font-size: 14px;
  color: #1a0f00;
}

.current-copper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #D4A574;
  border: 2px solid #8B6914;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 1px rgba(255,255,255,0.2);
}

.current-label {
  font-size: 10px;
  color: #6B4423;
  font-weight: bold;
}

.current-name {
  font-size: 9px;
  color: #1a0f00;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.copper-queue {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #C9A961;
  border: 2px solid #8B6914;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 1px rgba(255,255,255,0.2);
  justify-content: center;
}

.queue-item {
  width: 20px;
  height: 20px;
  background: #fff;
  border: 2px solid #8b6f47;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.queue-item--active {
  background: #e8d4a3;
  border-color: #6a5a3a;
  transform: scale(1.1);
}

.queue-item--active::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 2px solid #2d1b0e;
}

.queue-item--done {
  background: #c8e6c9;
  border-color: #5a7a3a;
}

.queue-item--done .queue-dot {
  background: #2d1b0e;
}

.queue-dot {
  width: 6px;
  height: 6px;
  background: #2d1b0e;
}

.queue-item--active .queue-dot {
  background: #2d1b0e;
}

.turn-actions {
  display: flex;
  gap: 10px;
}

.turn-btn {
  flex: 1;
  font-family: "Press Start 2P", monospace;
  font-size: 8px;
  padding: 10px 8px;
  background: #5a9a4a;
  color: #fff;
  border: 3px solid #3a6a2a;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  position: relative;
  box-shadow: 
    0 4px 0 #3a6a2a,
    inset 0 1px 0 rgba(255,255,255,0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.turn-btn:hover:not(:disabled) {
  background: #6aaa5a;
  transform: translateY(1px);
  box-shadow: 
    0 3px 0 #3a6a2a,
    inset 0 1px 0 rgba(255,255,255,0.2);
}

.turn-btn:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 
    0 1px 0 #3a6a2a,
    inset 0 1px 0 rgba(255,255,255,0.2);
}

.turn-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.turn-btn--next {
  background: #5a9a4a;
  border-color: #3a6a2a;
  box-shadow: 
    0 4px 0 #3a6a2a,
    inset 0 1px 0 rgba(255,255,255,0.2);
}

.turn-btn--next:hover:not(:disabled) {
  background: #6aaa5a;
  box-shadow: 
    0 3px 0 #3a6a2a,
    inset 0 1px 0 rgba(255,255,255,0.2);
}

.turn-btn--end {
  background: #aa4a4a;
  border-color: #6a2a2a;
  box-shadow: 
    0 4px 0 #6a2a2a,
    inset 0 1px 0 rgba(255,255,255,0.2);
}

.turn-btn--end:hover:not(:disabled) {
  background: #ba5a5a;
  box-shadow: 
    0 3px 0 #6a2a2a,
    inset 0 1px 0 rgba(255,255,255,0.2);
}

.btn-icon {
  font-size: 12px;
  line-height: 1;
}

.btn-label {
  font-size: 7px;
  line-height: 1;
}
</style>



