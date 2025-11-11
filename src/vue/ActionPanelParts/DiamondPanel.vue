<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import { get_resource } from '../../glue.js';
import { onEvent, offEvent, EventTypes } from '../../utils/eventBus.js';

// 边框资源（返回完整的url()格式）
const borderBlueSrc = `url('${getAssetUrl('ui/border-blue.png')}')`;
const borderGreenSrc = `url('${getAssetUrl('ui/border-green.png')}')`;
const borderOrangeRedSrc = `url('${getAssetUrl('ui/border-orange-red.png')}')`;

const props = defineProps({
  copperInfo: {
    type: Object,
    required: true,
  },
  inventoryItems: {
    type: Array,
    default: () => [],
  },
  inventoryCapacity: {
    type: Number,
    default: 5,
  },
});

const emit = defineEmits(['inventory-click']);

const copperName = computed(() => (props.copperInfo?.name || '').trim());
const isEnemyUnit = computed(
  () =>
    props.copperInfo?.isOwnedEnemy === true || props.copperInfo?.isEnemy === true
);
const shouldShowCopperName = computed(
  () => isEnemyUnit.value && copperName.value !== ''
);
const positionText = computed(() => {
  const position = props.copperInfo?.position;
  if (!Array.isArray(position) || position.length < 2) {
    return '--';
  }
  return `${position[0]},${position[1]}`;
});

// 敌人单位时禁用资源与装备入口
const isInventoryDisabled = computed(() => isEnemyUnit.value === true);

// 名称背景面板资源（使用本地 /assets 路径，避免走 R2 CDN）
const namePanelSrc = `url('${getAssetUrl('@assets/ui/panel4.png')}')`;
// 后端资源数据（和 ResourcePanel 一样的后端绑定方式）
const resources = ref({
  SpiritalSpark: 0,
  RecallGear: 0,
  ResonantCrystal: 0,
  RefinedCopper: 0,
  HeartCrystalDust: 0,
});

// 获取资源数据（和 ResourcePanel 一样的后端绑定方式）
async function updateResources() {
  try {
    const resourceData = await get_resource();
    if (resourceData) {
      Object.keys(resources.value).forEach(key => {
        resources.value[key] = resourceData[key] || 0;
      });
    }
  } catch (error) {
    console.error('[DiamondPanel] 获取资源失败:', error);
  }
}

// 计算全局资源数量（非零资源的数量）
const globalResourceCount = computed(() => {
  return Object.values(resources.value).filter(count => count > 0).length;
});

function handleInventoryClick() {
  if (isInventoryDisabled.value) {
    return;
  }
  emit('inventory-click');
}

const diamondPanelRef = ref(null);

// 初始化时加载资源和边框图片
onMounted(async () => {
  // 加载资源数据
  updateResources();
  
  // 监听资源更新事件（和 ResourcePanel 一样的后端绑定方式）
  onEvent(EventTypes.UPDATE_RESOURCES, updateResources);

  // 动态加载边框图片并计算 slice 值
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
      loadImage(getAssetUrl('ui/border-blue.png')),
      loadImage(getAssetUrl('ui/border-green.png')),
      loadImage(getAssetUrl('ui/border-orange-red.png')),
    ]);

    // 计算 slice 值（通常取图片高度的 1/4）
    const blueSlice = Math.max(3, Math.round(blueImg.naturalHeight / 4));
    const greenSlice = Math.max(3, Math.round(greenImg.naturalHeight / 4));
    const orangeRedSlice = Math.max(
      3,
      Math.round(orangeRedImg.naturalHeight / 4)
    );

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
    <div v-if="shouldShowCopperName" class="diamond-name">
      {{ copperName }}
    </div>
    <div class="diamond-row diamond-row--top">
      <div
        :class="['diamond', 'border-blue', { 'diamond--disabled': isInventoryDisabled }]"
        @click="handleInventoryClick"
        :title="isInventoryDisabled ? '敌人单位，无法查看资源与装备' : '打开资源面板（全局资源）'"
        :aria-disabled="isInventoryDisabled ? 'true' : 'false'"
      >
        <div class="diamond-content">
          <div class="diamond-text">
            <div class="diamond-label">装备</div>
          </div>
        </div>
      </div>
      <div class="diamond border-orange-red">
        <div class="diamond-content">
          <div class="diamond-text">
            <div class="diamond-label">位置</div>
            <div class="diamond-value">
              {{ positionText }}
            </div>
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
  position: fixed;
  left: 20px;
  bottom: 80px;
  z-index: 6000;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transform: scale(1.15);
  transform-origin: left bottom;
  /* 边框切片默认值 */
  --border-blue-slice: 8;
  --border-green-slice: 8;
  --border-orange-red-slice: 8;
}

.diamond-name {
  color: #fff3ef;
  font-weight: 900;
  letter-spacing: 2px;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
  text-align: center;
  font-size: 14px;
  padding: 4px 10px;
  margin-bottom: 2px;
  transform: translateY(-8px);
  align-self: center;
  min-width: 120px;
  box-sizing: border-box;
  border-style: solid;
  border-width: 8px;
  border-image-source: v-bind(namePanelSrc);
  border-image-slice: 8 fill;
  border-image-width: 8px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  border-image-source: v-bind(borderBlueSrc);
  border-image-slice: var(--border-blue-slice, 8) fill;
  border-image-width: var(--border-blue-slice, 8);
}

.diamond.border-green {
  border-width: var(--border-green-slice, 8px);
  border-image-source: v-bind(borderGreenSrc);
  border-image-slice: var(--border-green-slice, 8) fill;
  border-image-width: var(--border-green-slice, 8);
}

.diamond.border-orange-red {
  border-width: var(--border-orange-red-slice, 8px);
  border-image-source: v-bind(borderOrangeRedSrc);
  border-image-slice: var(--border-orange-red-slice, 8) fill;
  border-image-width: var(--border-orange-red-slice, 8);
}

.diamond:hover {
  background: #3a3a3c;
  transform: rotate(45deg) scale(1.05);
}

.diamond--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.diamond--disabled:hover {
  background: #2a2a2c;
  transform: rotate(45deg);
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
  color: #ffffff;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.diamond-value {
  font-size: 11px;
  color: #ffffff;
  font-weight: 900;
  letter-spacing: 2px;
}
</style>
