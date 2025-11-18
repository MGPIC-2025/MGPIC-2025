<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import { get_resource } from '../../glue.js';
import { onEvent, offEvent, EventTypes } from '../../utils/eventBus.js';
import './DiamondPanel.css';

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
    props.copperInfo?.isOwnedEnemy === true ||
    props.copperInfo?.isEnemy === true
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
    const resourceData = get_resource();
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
        :class="[
          'diamond',
          'border-blue',
          { 'diamond--disabled': isInventoryDisabled },
        ]"
        @click="handleInventoryClick"
        :title="
          isInventoryDisabled
            ? '敌人单位，无法查看资源与装备'
            : '打开资源面板（全局资源）'
        "
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
.diamond-name {
  border-image-source: v-bind(namePanelSrc);
}
.diamond.border-blue {
  border-image-source: v-bind(borderBlueSrc);
}
.diamond.border-orange-red {
  border-image-source: v-bind(borderOrangeRedSrc);
}
</style>
