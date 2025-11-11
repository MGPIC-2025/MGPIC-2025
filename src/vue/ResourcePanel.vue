<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { get_resource, craft } from '../glue.js';
import { getResourceIcon, getResourceName, RESOURCE_META } from '../utils/resourceMeta.js';
import { onEvent, offEvent, emitEvent, EventTypes } from '../utils/eventBus.js';
import { getAssetUrl } from '../utils/resourceLoader.js';

const buildIconSrc = getAssetUrl('@assets/ui/panel5.png');
const panel5Src = `url('${buildIconSrc}')`;

const resources = ref({
  SpiritalSpark: 0,
  RecallGear: 0,
  ResonantCrystal: 0,
  RefinedCopper: 0,
  HeartCrystalDust: 0,
});

const recipeItems = [
  'HeartCrystalDust',
  'RecallGear',
  'ResonantCrystal',
  'RefinedCopper',
];

const isCrafting = ref(false);

// 合成结果提示
const toast = ref({
  visible: false,
  success: true,
  text: '',
});

function showToast(text, success = true, durationMs = 1500) {
  toast.value = {
    visible: true,
    success,
    text,
  };
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toast.value.visible = false;
  }, durationMs);
}

async function handleCraft() {
  if (isCrafting.value) return;
  isCrafting.value = true;
  try {
    const result = await craft();
    // 后端也会通过消息队列推送 craft_success / craft_failed
    // 这里主动刷新资源，确保数值及时更新
    emitEvent(EventTypes.UPDATE_RESOURCES);
    if (result?.type === 'error') {
      console.warn('[ResourcePanel] 合成失败:', result?.content || result);
      showToast('合成失败', false);
    } else {
      console.log('[ResourcePanel] 合成完成:', result);
      showToast('合成成功', true);
    }
  } catch (e) {
    console.error('[ResourcePanel] 合成调用出错:', e);
    showToast('合成出错', false);
  } finally {
    isCrafting.value = false;
  }
}


async function updateResources() {
  try {
    const resourceData = await get_resource();

    if (resourceData) {
      // 单次遍历完成：新值赋值 + 变化计算
      const changes = {};
      const newResources = {};

      Object.keys(resources.value).forEach(key => {
        const oldVal = resources.value[key];
        const newVal = resourceData[key] || 0;
        newResources[key] = newVal;

        // 只记录增加的资源（用于特效显示）
        const diff = newVal - oldVal;
        if (diff > 0) {
          changes[key] = diff;
        }
      });

      // 批量更新（减少响应式触发次数）
      resources.value = newResources;

      // 发送资源已更新事件（附带变化信息）
      emitEvent(EventTypes.RESOURCES_UPDATED, changes);

      return changes;
    }
  } catch (error) {
    console.error('[ResourcePanel] 获取资源失败:', error);
    // TODO: 添加用户可见的错误提示
  }
  return {};
}

// 初始化时加载一次
onMounted(() => {
  updateResources();

  // 监听资源更新事件（替代全局变量）
  onEvent(EventTypes.UPDATE_RESOURCES, updateResources);
});

// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  offEvent(EventTypes.UPDATE_RESOURCES, updateResources);
});

defineExpose({ updateResources });
</script>

<template>
  <div class="resource-panel">
    <div class="resource-header">
      <span class="header-text">资源</span>
    </div>
    <div class="resource-list">
      <div class="resource-layout">
        <div class="row row-top">
          <div class="resource-slot small" :title="getResourceName('RecallGear')">
            <img
              v-if="getResourceIcon('RecallGear')"
              :src="getResourceIcon('RecallGear')"
              :alt="getResourceName('RecallGear')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.RecallGear || 0 }}</div>
            <div class="resource-tooltip">{{ getResourceName('RecallGear') }}</div>
          </div>
          <div class="resource-slot small" :title="getResourceName('HeartCrystalDust')">
            <img
              v-if="getResourceIcon('HeartCrystalDust')"
              :src="getResourceIcon('HeartCrystalDust')"
              :alt="getResourceName('HeartCrystalDust')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.HeartCrystalDust || 0 }}</div>
            <div class="resource-tooltip">{{ getResourceName('HeartCrystalDust') }}</div>
          </div>
        </div>
        <div class="row row-middle">
          <div class="resource-slot large" :title="getResourceName('SpiritalSpark')">
            <img
              v-if="getResourceIcon('SpiritalSpark')"
              :src="getResourceIcon('SpiritalSpark')"
              :alt="getResourceName('SpiritalSpark')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.SpiritalSpark || 0 }}</div>
            <div class="resource-tooltip">{{ getResourceName('SpiritalSpark') }}</div>
          </div>
        </div>
        <div class="row row-bottom">
          <div class="resource-slot small" :title="getResourceName('ResonantCrystal')">
            <img
              v-if="getResourceIcon('ResonantCrystal')"
              :src="getResourceIcon('ResonantCrystal')"
              :alt="getResourceName('ResonantCrystal')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.ResonantCrystal || 0 }}</div>
            <div class="resource-tooltip">{{ getResourceName('ResonantCrystal') }}</div>
          </div>
          <div class="resource-slot small" :title="getResourceName('RefinedCopper')">
            <img
              v-if="getResourceIcon('RefinedCopper')"
              :src="getResourceIcon('RefinedCopper')"
              :alt="getResourceName('RefinedCopper')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.RefinedCopper || 0 }}</div>
            <div class="resource-tooltip">{{ getResourceName('RefinedCopper') }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="crafting-section">
      <div class="crafting-grid">
        <div
          class="craft-slot"
          v-for="(itemType, i) in recipeItems"
          :key="i"
        >
          <img
            v-if="RESOURCE_META[itemType]?.icon"
            :src="RESOURCE_META[itemType].icon"
            class="craft-icon"
          />
          <div class="craft-count">
            {{ resources[itemType] || 0 }}
          </div>
        </div>
      </div>
      <div class="craft-arrow-group">
        <img
          class="craft-arrow-img"
          :src="getAssetUrl('@assets/ui/upgrade.png')"
          :alt="isCrafting ? '合成中' : '合成'"
          @click="handleCraft"
          :class="{ disabled: isCrafting }"
        />
        <div
          v-if="toast.visible"
          class="craft-toast"
          :class="{ success: toast.success, error: !toast.success }"
        >
          {{ toast.text }}
        </div>
      </div>
      <div class="craft-result">
        <div class="recipe-display">
          <img
            v-if="RESOURCE_META['SpiritalSpark']?.icon"
            :src="RESOURCE_META['SpiritalSpark'].icon"
            class="recipe-icon"
          />
          <div class="craft-count">
            {{ resources.SpiritalSpark || 0 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resource-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-source: v-bind(panel5Src);
  border-image-slice: 8 fill;
  border-image-width: 12px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  padding: 16px;
  min-width: 220px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 8000;
  user-select: none;
}

.resource-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 200, 100, 0.2);
}

.header-icon {
  font-size: 20px;
}

.header-text {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
}

.row-top,
.row-bottom {
  justify-content: center;
  gap: 90px;
}

.row-middle {
  justify-content: center;
}

.resource-slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.resource-slot.small {
  width: 44px;
  height: 44px;
}

.resource-slot.large {
  width: 56px;
  height: 56px;
}

.resource-slot.small .resource-icon {
  width: 44px;
  height: 44px;
}

.resource-slot.large .resource-icon {
  width: 56px;
  height: 56px;
}

.resource-slot:hover .resource-icon {
  transform: scale(1.05) rotate(3deg);
  filter: brightness(1.1);
}

.resource-slot.large:hover .resource-icon {
  transform: scale(1.05) rotate(-3deg);
  filter: brightness(1.1);
}

.resource-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.85);
  border: 2px solid rgba(255, 200, 100, 0.4);
  padding: 6px 10px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 10;
  font-size: 12px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
}

.resource-slot:hover .resource-tooltip {
  opacity: 1;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
  width: 36px;
  height: 36px;
  justify-content: center;
}

.resource-item:hover {
  background: transparent;
}

.resource-icon {
  width: 36px;
  height: 36px;
  image-rendering: pixelated;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.resource-name {
  flex: 1;
  font-size: 14px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
}

.resource-count {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.85);
  border: 2px solid rgba(255, 200, 100, 0.4);
  padding: 0 4px;
  border-radius: 4px;
  z-index: 2;
}

/* 合成区域样式（保持与 InventoryModal 一致的视觉风格，适配面板尺寸） */
.crafting-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  justify-content: center;
  width: 100%;
  margin-top: 12px;
}

.crafting-grid {
  display: grid;
  grid-template-columns: repeat(2, 44px);
  grid-template-rows: repeat(2, 44px);
  gap: 6px;
}

.craft-slot {
  width: 44px;
  height: 44px;
  background: #c6c6c6;
  border: 2px solid #8b8b8b;
  border-top-color: #555;
  border-left-color: #555;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.craft-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
  box-sizing: border-box;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.craft-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
  pointer-events: none;
  z-index: 2;
}

.craft-arrow {
  font-size: 20px;
  color: #6a4931;
  text-align: center;
  font-weight: 900;
  letter-spacing: 2px;
}

.craft-arrow-img {
  width: 28px;
  height: 28px;
  image-rendering: pixelated;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease, opacity 0.15s ease;
  transform: rotate(90deg);
}
.craft-arrow-img:hover {
  transform: rotate(90deg) scale(1.05);
  filter: brightness(1.1);
}
.craft-arrow-img.disabled {
  opacity: 0.5;
  pointer-events: none;
  filter: none;
  transform: rotate(90deg);
}

.craft-arrow-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.craft-result {
  background: #c6c6c6;
  border: 2px solid #8b8b8b;
  border-top-color: #555;
  border-left-color: #555;
  width: 72px;
  height: 72px;
  padding: 4px;
  overflow: visible;
  position: relative;
}

.recipe-display {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.recipe-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.craft-button-mc {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  color: #6a4931;
  border: 2px solid rgba(255, 200, 100, 0.4);
  cursor: pointer;
  font-weight: 900;
  letter-spacing: 2px;
  font-size: 12px;
  transition: all 0.2s;
  white-space: nowrap;
  border-radius: 6px;
}

.craft-button-mc:hover {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 220, 140, 0.6);
}

.craft-toast {
  position: static;
  align-self: center;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
  white-space: nowrap;
  z-index: 9000;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  margin-top: 6px;
}
.craft-toast.success {
  background: rgba(20, 120, 20, 0.7);
  border-color: rgba(120, 220, 120, 0.6);
}
.craft-toast.error {
  background: rgba(160, 30, 30, 0.75);
  border-color: rgba(255, 150, 150, 0.5);
}
</style>
