<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { get_resource } from '../glue.js';
import { getResourceIcon, getResourceName } from '../utils/resourceMeta.js';
import { onEvent, offEvent, emitEvent, EventTypes } from '../utils/eventBus.js';

const resources = ref({
  SpiritalSpark: 0,
  RecallGear: 0,
  ResonantCrystal: 0,
  RefinedCopper: 0,
  HeartCrystalDust: 0,
});

// 获取资源数据（优化：单次遍历 + 批量更新）
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
      <span class="header-icon">💎</span>
      <span class="header-text">资源</span>
    </div>
    <div class="resource-list">
      <div
        v-for="(value, key) in resources"
        :key="key"
        class="resource-item"
        :title="getResourceName(key)"
      >
        <img
          v-if="getResourceIcon(key)"
          :src="getResourceIcon(key)"
          :alt="getResourceName(key)"
          class="resource-icon"
        />
        <span class="resource-name">{{ getResourceName(key) }}</span>
        <span class="resource-count">{{ value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resource-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(43, 26, 17, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  min-width: 220px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 200, 100, 0.3);
  z-index: 8000;
  user-select: none;
}

.resource-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 200, 100, 0.2);
}

.header-icon {
  font-size: 20px;
}

.header-text {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.resource-item:hover {
  background: rgba(0, 0, 0, 0.5);
  transform: translateX(-2px);
}

.resource-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}

.resource-name {
  flex: 1;
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

.resource-count {
  font-size: 14px;
  font-weight: bold;
  color: #4ade80;
  min-width: 40px;
  text-align: right;
}
</style>

