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
            <svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges">
              <!-- 像素背包 -->
              <rect x="14" y="20" width="36" height="26" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <rect x="18" y="16" width="28" height="8" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <rect x="20" y="28" width="10" height="12" fill="#0a0a0a" opacity=".2"/>
              <rect x="34" y="28" width="10" height="12" fill="#0a0a0a" opacity=".2"/>
              <rect x="14" y="24" width="36" height="2" fill="#0a0a0a"/>
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
            <svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges">
              <!-- 像素定位菱形 + 十字中心 -->
              <polygon points="32,6 58,32 32,58 6,32" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <rect x="28" y="28" width="8" height="2" fill="#0a0a0a"/>
              <rect x="31" y="25" width="2" height="8" fill="#0a0a0a"/>
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
            <svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges">
              <!-- 像素短剑 -->
              <rect x="36" y="10" width="8" height="22" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <rect x="30" y="28" width="20" height="6" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <rect x="38" y="34" width="4" height="12" fill="#0a0a0a" opacity=".25"/>
              <rect x="34" y="46" width="12" height="6" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
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
            <svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges">
              <!-- 像素盾牌 -->
              <rect x="16" y="10" width="32" height="36" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <rect x="20" y="14" width="24" height="10" fill="#0a0a0a" opacity=".15"/>
              <rect x="26" y="28" width="12" height="12" fill="#0a0a0a" opacity=".2"/>
              <rect x="16" y="40" width="32" height="6" fill="#0a0a0a" opacity=".15"/>
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
            <svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges">
              <!-- 像素速度箭头 -->
              <rect x="10" y="30" width="28" height="6" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <polygon points="38,24 56,33 38,42" fill="currentColor" stroke="#0a0a0a" stroke-width="2"/>
              <rect x="14" y="24" width="12" height="4" fill="#0a0a0a" opacity=".15"/>
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
