<script setup>
import { ref, onMounted } from 'vue';
import { get_resource } from '../glue.js';
import { getResourceIcon, getResourceName } from '../utils/resourceMeta.js';

const resources = ref({
  SpiritalSpark: 0,
  RecallGear: 0,
  ResonantCrystal: 0,
  RefinedCopper: 0,
  HeartCrystalDust: 0,
});

// 获取资源数据
async function updateResources() {
  try {
    console.log('[ResourcePanel] 开始获取资源...');
    const resourceData = await get_resource();
    console.log('[ResourcePanel] 后端返回资源数据:', resourceData);
    
    if (resourceData) {
      // 后端返回简单的 JSON 对象：{ SpiritalSpark: 100, ... }
      const oldResources = { ...resources.value };
      Object.keys(resources.value).forEach(key => {
        resources.value[key] = resourceData[key] || 0;
      });
      
      console.log('[ResourcePanel] 旧资源:', oldResources);
      console.log('[ResourcePanel] 新资源:', resources.value);
      
      // 返回资源变化信息
      const changes = {};
      Object.keys(resources.value).forEach(key => {
        const diff = resources.value[key] - oldResources[key];
        if (diff > 0) {
          changes[key] = diff;
        }
      });
      
      console.log('[ResourcePanel] 资源变化:', changes);
      return changes;
    }
  } catch (error) {
    console.error('[ResourcePanel] 获取资源失败:', error);
  }
  return {};
}

// 初始化时加载一次
onMounted(() => {
  updateResources();
  
  // 注册到全局，供外部调用
  if (typeof window !== 'undefined') {
    window.__UPDATE_RESOURCES__ = updateResources;
    console.log('[ResourcePanel] 已注册全局资源更新函数');
  }
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

