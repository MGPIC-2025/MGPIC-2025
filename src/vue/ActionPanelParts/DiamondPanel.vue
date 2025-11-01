<script setup>
import { ref, onMounted } from 'vue';

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

const diamondPanelRef = ref(null);

// 动态加载边框图片并计算 slice 值
onMounted(async () => {
  if (!diamondPanelRef.value) return;
  
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = src;
    });
  }
  
  function setCssVar(name, value) {
    if (diamondPanelRef.value) {
      diamondPanelRef.value.style.setProperty(name, String(value));
    }
  }
  
  try {
    const [blueImg, greenImg, orangeRedImg] = await Promise.all([
      loadImage('/assets/border-blue.png'),
      loadImage('/assets/border-green.png'),
      loadImage('/assets/border-orange-red.png')
    ]);
    
    // 计算 slice 值（通常取图片高度的 1/4）
    const blueSlice = Math.max(3, Math.round(blueImg.naturalHeight / 4));
    const greenSlice = Math.max(3, Math.round(greenImg.naturalHeight / 4));
    const orangeRedSlice = Math.max(3, Math.round(orangeRedImg.naturalHeight / 4));
    
    setCssVar('--border-blue-slice', blueSlice);
    setCssVar('--border-green-slice', greenSlice);
    setCssVar('--border-orange-red-slice', orangeRedSlice);
  } catch {
    // 如果资源加载失败，设置默认值以确保边框可以显示
    setCssVar('--border-blue-slice', '8');
    setCssVar('--border-green-slice', '8');
    setCssVar('--border-orange-red-slice', '8');
  }
});
</script>

<template>
  <div ref="diamondPanelRef" class="diamond-panel">
    <div class="diamond-row diamond-row--top">
      <div class="diamond border-blue" @click="handleInventoryClick">
        <div class="diamond-content">
          <div class="diamond-text">
            <div class="diamond-label">背包</div>
            <div class="diamond-value">{{ inventoryItems.length }}/5</div>
          </div>
        </div>
      </div>
      <div class="diamond border-orange-red">
        <div class="diamond-content">
          <div class="diamond-text">
            <div class="diamond-label">位置</div>
            <div class="diamond-value">{{ copperInfo.position[0] }},{{ copperInfo.position[1] }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="diamond-row diamond-row--bottom">
      <div class="diamond border-orange-red">
        <div class="diamond-content">
          <div class="diamond-text">
            <div class="diamond-label">攻击</div>
            <div class="diamond-value">{{ copperInfo.attack }}</div>
          </div>
        </div>
      </div>
      <div class="diamond border-green">
        <div class="diamond-content">
          <div class="diamond-text">
            <div class="diamond-label">防御</div>
            <div class="diamond-value">{{ copperInfo.defense }}</div>
          </div>
        </div>
      </div>
      <div class="diamond border-blue">
        <div class="diamond-content">
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
  bottom: 70px;
  z-index: 6000;
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 边框切片默认值 */
  --border-blue-slice: 8;
  --border-green-slice: 8;
  --border-orange-red-slice: 8;
}

.diamond-row {
  display: flex;
  gap: 4px;
}

.diamond-row--top,
.diamond-row--bottom {
  justify-content: center;
}

.diamond {
  width: 60px;
  height: 60px;
  background: #2a2a2c;
  transform: rotate(45deg);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
  border-style: solid;
  border-image-outset: 0;
  border-image-repeat: stretch;
  image-rendering: pixelated;
}

.diamond.border-blue {
  border-width: var(--border-blue-slice, 8px);
  border-image-source: url('/assets/border-blue.png');
  border-image-slice: var(--border-blue-slice, 8) fill;
  border-image-width: var(--border-blue-slice, 8);
}

.diamond.border-green {
  border-width: var(--border-green-slice, 8px);
  border-image-source: url('/assets/border-green.png');
  border-image-slice: var(--border-green-slice, 8) fill;
  border-image-width: var(--border-green-slice, 8);
}

.diamond.border-orange-red {
  border-width: var(--border-orange-red-slice, 8px);
  border-image-source: url('/assets/border-orange-red.png');
  border-image-slice: var(--border-orange-red-slice, 8) fill;
  border-image-width: var(--border-orange-red-slice, 8);
}

.diamond:hover {
  background: #3a3a3c;
  transform: rotate(45deg) scale(1.05);
}

.diamond-content {
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.diamond-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

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
