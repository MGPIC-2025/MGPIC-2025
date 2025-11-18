<script setup>
import log from '../log.js';
import { ref, computed, watch, nextTick } from 'vue';
import { getAssetUrl } from '../utils/resourceLoader.js';
import { getItemName } from '../utils/resourceMeta.js';
import './StructurePanel.css';

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
const structureName = computed(
  () => props.structure.structure_base?.name || '建筑'
);
const isOwned = computed(() => props.structure.owned || false);
const hasStorage = computed(
  () => props.structure.structure_base?.has_storage || false
);
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
const panelSrc = getAssetUrl('@assets/ui/panel.png');
// 背景图片路径（CSS border-image 需要 url() 包裹）
const panel11Src = `url('${getAssetUrl('@assets/ui/panel11.png')}')`;

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
  <div
    class="structure-panel"
    :class="{ 'structure-panel--minimized': isInActionMode }"
  >
    <!-- 最小化状态 -->
    <div v-if="isInActionMode" class="minimized-content">
      <div class="minimized-info">
        <span class="minimized-name">{{ structureName }}</span>
        <span class="minimized-action">{{ actionModeText }}</span>
      </div>
      <div class="minimized-actions">
        <button
          class="mini-btn mini-btn--cancel"
          @click="handleCancel"
          title="取消"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 完整状态 -->
    <div v-else>
      <div class="structure-panel__header">
        <div class="structure-panel__title">
          {{ structureName }}
          <span
            class="structure-panel__badge"
            :class="{ 'structure-panel__badge--owned': isOwned }"
          >
            {{ isOwned ? '玩家' : '中立' }}
          </span>
        </div>
        <button
          class="structure-panel__close"
          @click="handleClose"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      <div class="structure-panel__body">
        <!-- 血量信息 -->
        <div class="structure-panel__health">
          <div class="structure-panel__health-label">血量</div>
          <div class="structure-panel__health-bar">
            <div
              class="structure-panel__health-fill"
              :style="{
                width: healthPercent + '%',
                backgroundColor: healthColor,
              }"
            ></div>
          </div>
          <div class="structure-panel__health-text">
            {{ Math.ceil(nowHealth) }} / {{ Math.ceil(maxHealth) }}
          </div>
        </div>

        <!-- 储物空间 -->
        <div v-if="hasStorage" class="structure-panel__storage">
          <div class="structure-panel__storage-label">储物空间</div>
          <div class="structure-panel__storage-content">
            <div v-if="storage" class="structure-panel__storage-item">
              <span class="structure-panel__storage-name">{{
                getItemName(storage)
              }}</span>
              <span class="structure-panel__storage-count"
                >x{{ storage.count || 0 }}</span
              >
            </div>
            <div v-else class="structure-panel__storage-empty">空</div>
          </div>
        </div>

        <!-- 地面资源 -->
        <div
          v-if="resources && resources.length > 0"
          class="structure-panel__ground-resources"
        >
          <div class="structure-panel__ground-label">地面资源</div>
          <div class="structure-panel__ground-list">
            <div
              v-for="(resource, index) in resources"
              :key="index"
              class="structure-panel__ground-item"
            >
              <span class="structure-panel__resource-name">{{
                resource.name || '未知资源'
              }}</span>
              <span class="structure-panel__resource-count"
                >x{{ resource.count || 0 }}</span
              >
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
  border-image-source: v-bind(panel11Src);
}
</style>
