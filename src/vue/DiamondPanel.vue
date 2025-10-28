<script setup>
const props = defineProps({
  copperInfo: {
    type: Object,
    required: true
  },
  inventoryItems: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['inventory-click']);

function handleInventoryClick() {
  emit('inventory-click');
}
</script>

<template>
  <div class="diamond-panel">
    <div class="diamond-row diamond-row--top">
      <div class="diamond tone-green" @click="handleInventoryClick">
        <div class="diamond-content">
          <div class="diamond-icon">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M12 20l20-12 20 12v24L32 56 12 44V20z" fill="currentColor"/>
              <path d="M24 24l8-4 8 4v16l-8 4-8-4V24z" fill="#0a0a0a" fill-opacity=".25"/>
            </svg>
          </div>
          <div class="diamond-text">
            <div class="diamond-label">背包</div>
            <div class="diamond-value">{{ inventoryItems.length }}/5</div>
          </div>
        </div>
      </div>
      <div class="diamond tone-purple">
        <div class="diamond-content">
          <div class="diamond-icon">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M32 4L58 32 32 60 6 32 32 4z" fill="currentColor"/>
              <circle cx="32" cy="32" r="9" fill="#0a0a0a" fill-opacity=".25"/>
            </svg>
          </div>
          <div class="diamond-text">
            <div class="diamond-label">位置</div>
            <div class="diamond-value">{{ copperInfo.position[0] }},{{ copperInfo.position[1] }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="diamond-row diamond-row--bottom">
      <div class="diamond tone-orange-red">
        <div class="diamond-content">
          <div class="diamond-icon">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M6 50l8 8 18-18 16-26-6-6-26 16L6 50z" fill="currentColor"/>
              <path d="M25 31l8 8" stroke="#0a0a0a" stroke-opacity=".35" stroke-width="3"/>
            </svg>
          </div>
          <div class="diamond-text">
            <div class="diamond-label">攻击</div>
            <div class="diamond-value">{{ copperInfo.attack }}</div>
          </div>
        </div>
      </div>
      <div class="diamond tone-golden-yellow">
        <div class="diamond-content">
          <div class="diamond-icon">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M32 6c8 0 18 10 18 20 0 10-6 12-18 26C20 38 14 36 14 26S24 6 32 6z" fill="currentColor"/>
              <circle cx="26" cy="28" r="4" fill="#0a0a0a"/>
              <circle cx="38" cy="28" r="4" fill="#0a0a0a"/>
            </svg>
          </div>
          <div class="diamond-text">
            <div class="diamond-label">防御</div>
            <div class="diamond-value">{{ copperInfo.defense }}</div>
          </div>
        </div>
      </div>
      <div class="diamond tone-cyan">
        <div class="diamond-content">
          <div class="diamond-icon">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M36 6L22 30h10l-4 28 18-32H36z" fill="currentColor"/>
            </svg>
          </div>
          <div class="diamond-text">
            <div class="diamond-label">速度</div>
            <div class="diamond-value">{{ copperInfo.speed }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 菱形属性面板 */
.diamond-panel {
  position: absolute;
  left: 20px;
  bottom: 50px;
  z-index: 6000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diamond-row {
  display: flex;
  gap: 4px;
}

.diamond-row--top {
  justify-content: center;
}

.diamond-row--bottom {
  justify-content: center;
}

.diamond {
  width: 60px;
  height: 60px;
  background: #2a2a2c;
  border: 1px solid #4a4a4c;
  transform: rotate(45deg);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.diamond:hover {
  background: #3a3a3c;
  border-color: #5a5a5c;
  transform: rotate(45deg) scale(1.05);
}

.diamond-content {
  transform: rotate(-45deg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  width: 100%;
  height: 100%;
  position: relative;
}

.diamond-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.diamond-icon svg {
  width: 32px;
  height: 32px;
  display: block;
  filter: drop-shadow(0 0 12px currentColor) 
          drop-shadow(0 0 24px currentColor) 
          drop-shadow(0 0 40px currentColor);
}

.diamond-text {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
  width: 100%;
  height: 100%;
}

.diamond:hover .diamond-icon {
  opacity: 0;
  transform: scale(0);
}

.diamond:hover .diamond-text {
  opacity: 1;
  transform: scale(1);
}

/* 颜色主题 */
.diamond.tone-orange-red { color: #ff6b35; }
.diamond.tone-golden-yellow { color: #ffd700; }
.diamond.tone-cyan { color: #7bd3ff; }
.diamond.tone-green { color: #67f3a4; }
.diamond.tone-purple { color: #c57bff; }

.diamond-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.diamond-value {
  font-size: 11px;
  color: #fff;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
