<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { get_resource, craft } from '../glue.js';
import {
  getResourceIcon,
  getResourceName,
  RESOURCE_META,
} from '../utils/resourceMeta.js';
import { onEvent, offEvent, emitEvent, EventTypes } from '../utils/eventBus.js';
import { getAssetUrl } from '../utils/resourceLoader.js';
import './ResourcePanel.css';

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
    const result = craft();
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
    const resourceData = get_resource();

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
          <div
            class="resource-slot small"
            :title="getResourceName('RecallGear')"
          >
            <img
              v-if="getResourceIcon('RecallGear')"
              :src="getResourceIcon('RecallGear')"
              :alt="getResourceName('RecallGear')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.RecallGear || 0 }}</div>
            <div class="resource-tooltip">
              {{ getResourceName('RecallGear') }}
            </div>
          </div>
          <div
            class="resource-slot small"
            :title="getResourceName('HeartCrystalDust')"
          >
            <img
              v-if="getResourceIcon('HeartCrystalDust')"
              :src="getResourceIcon('HeartCrystalDust')"
              :alt="getResourceName('HeartCrystalDust')"
              class="resource-icon"
            />
            <div class="resource-count">
              {{ resources.HeartCrystalDust || 0 }}
            </div>
            <div class="resource-tooltip">
              {{ getResourceName('HeartCrystalDust') }}
            </div>
          </div>
        </div>
        <div class="row row-middle">
          <div
            class="resource-slot large"
            :title="getResourceName('SpiritalSpark')"
          >
            <img
              v-if="getResourceIcon('SpiritalSpark')"
              :src="getResourceIcon('SpiritalSpark')"
              :alt="getResourceName('SpiritalSpark')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.SpiritalSpark || 0 }}</div>
            <div class="resource-tooltip">
              {{ getResourceName('SpiritalSpark') }}
            </div>
          </div>
        </div>
        <div class="row row-bottom">
          <div
            class="resource-slot small"
            :title="getResourceName('ResonantCrystal')"
          >
            <img
              v-if="getResourceIcon('ResonantCrystal')"
              :src="getResourceIcon('ResonantCrystal')"
              :alt="getResourceName('ResonantCrystal')"
              class="resource-icon"
            />
            <div class="resource-count">
              {{ resources.ResonantCrystal || 0 }}
            </div>
            <div class="resource-tooltip">
              {{ getResourceName('ResonantCrystal') }}
            </div>
          </div>
          <div
            class="resource-slot small"
            :title="getResourceName('RefinedCopper')"
          >
            <img
              v-if="getResourceIcon('RefinedCopper')"
              :src="getResourceIcon('RefinedCopper')"
              :alt="getResourceName('RefinedCopper')"
              class="resource-icon"
            />
            <div class="resource-count">{{ resources.RefinedCopper || 0 }}</div>
            <div class="resource-tooltip">
              {{ getResourceName('RefinedCopper') }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="crafting-section">
      <div class="crafting-grid">
        <div class="craft-slot" v-for="(itemType, i) in recipeItems" :key="i">
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
  border-image-source: v-bind(panel5Src);
}
</style>
