<script setup>
import log from '../log.js';
import { ref, computed, watch, nextTick } from 'vue';
import { getAssetUrl } from '../utils/resourceLoader.js';
import { getItemName } from '../utils/resourceMeta.js';

const props = defineProps({
  structure: {
    type: Object,
    required: true,
  },
  resources: {
    type: Array,
    default: () => [],
  },
  actionMode: {
    type: String,
    default: null, // 'extract', 'transfer', null
  },
});

const emit = defineEmits(['close', 'action', 'cancel']);

// 计算属性
const structureName = computed(() => props.structure.structure_base?.name || '建筑');
const isOwned = computed(() => props.structure.owned || false);
const hasStorage = computed(() => props.structure.structure_base?.has_storage || false);
const storage = computed(() => props.structure.storage || null);
const canMove = computed(() => props.structure.can_move || false);
const canAttack = computed(() => props.structure.can_attack || false);

// 血量计算
const nowHealth = computed(() => props.structure.now_health || 0);
const maxHealth = computed(() => props.structure.structure_base?.health || 100);
const healthPercent = computed(() => {
  if (maxHealth.value === 0) return 0;
  return Math.max(0, Math.min(100, (nowHealth.value / maxHealth.value) * 100));
});

// 健康状态颜色
const healthColor = computed(() => {
  const percent = healthPercent.value;
  if (percent > 60) return '#4ade80'; // 绿色
  if (percent > 30) return '#facc15'; // 黄色
  return '#ef4444'; // 红色
});

// UI 资源
const panelSrc = getAssetUrl('ui/panel.png');

// 计算是否处于操作模式（最小化）
const isInActionMode = computed(() => props.actionMode !== null);

// 操作模式描述
const actionModeText = computed(() => {
  if (props.actionMode === 'move') return '选择移动位置...';
  if (props.actionMode === 'attack') return '选择攻击目标...';
  if (props.actionMode === 'extract') return '选择提取目标...';
  if (props.actionMode === 'transfer') return '选择传递目标...';
  return '';
});

// 处理动作
function handleAction(actionType) {
  log(`[StructurePanel] 触发动作: ${actionType}`);
  emit('action', { type: actionType });
}

// 取消操作
function handleCancel() {
  log('[StructurePanel] 取消操作');
  emit('cancel');
}

// 关闭面板
function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="structure-panel" :class="{ 'structure-panel--minimized': isInActionMode }">
    <!-- 最小化状态 -->
    <div v-if="isInActionMode" class="minimized-content">
      <div class="minimized-info">
        <span class="minimized-name">{{ structureName }}</span>
        <span class="minimized-action">{{ actionModeText }}</span>
      </div>
      <div class="minimized-actions">
        <button class="mini-btn mini-btn--cancel" @click="handleCancel" title="取消">
          ✕
        </button>
      </div>
    </div>
    
    <!-- 完整状态 -->
    <div v-else>
      <div class="structure-panel__header">
        <div class="structure-panel__title">
          {{ structureName }}
          <span class="structure-panel__badge" :class="{ 'structure-panel__badge--owned': isOwned }">
            {{ isOwned ? '玩家' : '中立' }}
          </span>
        </div>
        <button class="structure-panel__close" @click="handleClose" aria-label="关闭">✕</button>
      </div>

      <div class="structure-panel__body">
      <!-- 血量信息 -->
      <div class="structure-panel__health">
        <div class="structure-panel__health-label">血量</div>
        <div class="structure-panel__health-bar">
          <div class="structure-panel__health-fill" :style="{ width: healthPercent + '%', backgroundColor: healthColor }"></div>
        </div>
        <div class="structure-panel__health-text">{{ Math.ceil(nowHealth) }} / {{ Math.ceil(maxHealth) }}</div>
      </div>

      <!-- 储物空间 -->
      <div v-if="hasStorage" class="structure-panel__storage">
        <div class="structure-panel__storage-label">储物空间</div>
        <div class="structure-panel__storage-content">
          <div v-if="storage" class="structure-panel__storage-item">
            <span class="structure-panel__storage-name">{{ getItemName(storage) }}</span>
            <span class="structure-panel__storage-count">x{{ storage.count || 0 }}</span>
          </div>
          <div v-else class="structure-panel__storage-empty">空</div>
        </div>
      </div>

      <!-- 地面资源 -->
      <div v-if="resources && resources.length > 0" class="structure-panel__ground-resources">
        <div class="structure-panel__ground-label">地面资源</div>
        <div class="structure-panel__ground-list">
          <div
            v-for="(resource, index) in resources"
            :key="index"
            class="structure-panel__ground-item"
          >
            <span class="structure-panel__resource-name">{{ resource.name || '未知资源' }}</span>
            <span class="structure-panel__resource-count">x{{ resource.count || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮（仅玩家建筑） -->
      <div v-if="isOwned" class="structure-panel__actions">
        <button
          v-if="canMove"
          class="structure-panel__action-btn structure-panel__action-btn--move"
          @click="handleAction('move')"
        >
          移动
        </button>
        <button
          v-if="canAttack"
          class="structure-panel__action-btn structure-panel__action-btn--attack"
          @click="handleAction('attack')"
        >
          攻击
        </button>
        <button
          v-if="hasStorage && storage"
          class="structure-panel__action-btn structure-panel__action-btn--transfer"
          @click="handleAction('transfer')"
        >
          传递
        </button>
        <button
          v-if="hasStorage"
          class="structure-panel__action-btn structure-panel__action-btn--extract"
          @click="handleAction('extract')"
        >
          提取
        </button>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.structure-panel {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: min(520px, 90vw);
  background: rgba(43, 26, 17, 0.95);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  color: #fff;
  z-index: 1000;
  border: 2px solid rgba(139, 92, 246, 0.3);
}

.structure-panel--minimized {
  bottom: 48px;
  width: min(300px, 170vw);
  background: rgba(239, 68, 68, 0.95);
  border: 2px solid rgba(239, 68, 68, 0.5);
}

/* 最小化内容 */
.minimized-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.minimized-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.minimized-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.minimized-action {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.minimized-actions {
  display: flex;
  gap: 8px;
}

.mini-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.mini-btn--cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.mini-btn--cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.structure-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.structure-panel__title {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.structure-panel__badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.structure-panel__badge--owned {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.structure-panel__close {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.structure-panel__close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.structure-panel__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 血量 */
.structure-panel__health {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.structure-panel__health-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.structure-panel__health-bar {
  width: 100%;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.structure-panel__health-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 10px;
}

.structure-panel__health-text {
  font-size: 13px;
  text-align: right;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

/* 储物空间 */
.structure-panel__storage {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.structure-panel__storage-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.structure-panel__storage-content {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
}

.structure-panel__storage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.structure-panel__storage-name {
  font-size: 14px;
  color: #fbbf24;
}

.structure-panel__storage-count {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.structure-panel__storage-empty {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

/* 地面资源 */
.structure-panel__ground-resources {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.structure-panel__ground-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.structure-panel__ground-list {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.structure-panel__ground-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.structure-panel__resource-name {
  font-size: 13px;
  color: #a78bfa;
}

.structure-panel__resource-count {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

/* 操作按钮 */
.structure-panel__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.structure-panel__action-btn {
  flex: 1;
  min-width: 100px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.structure-panel__action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.structure-panel__action-btn:active {
  transform: translateY(0);
}

.structure-panel__action-btn--move {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.structure-panel__action-btn--attack {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.structure-panel__action-btn--transfer {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.structure-panel__action-btn--extract {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

@media (max-width: 768px) {
  .structure-panel {
    width: 95vw;
    bottom: 10px;
  }

  .structure-panel__actions {
    flex-direction: column;
  }

  .structure-panel__action-btn {
    width: 100%;
  }
}
</style>

