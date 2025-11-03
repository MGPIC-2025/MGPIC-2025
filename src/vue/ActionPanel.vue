<script setup>
import log from '../log.js';
import { ref, computed } from 'vue';
import { eventloop } from '../glue.js';
import { getItemName } from '../utils/resourceMeta.js';
import DiamondPanel from './ActionPanelParts/DiamondPanel.vue';
import InventoryModal from './ActionPanelParts/InventoryModal.vue';
import HealthBar from './ActionPanelParts/HealthBar.vue';
import TriPanel from './ActionPanelParts/TriPanel.vue';

const props = defineProps({
  copper: {
    type: Object,
    default: null,
  },
  resources: {
    type: Array,
    default: () => [],
  },
  hasAttackTargets: {
    type: Boolean,
    default: true, // 默认假设有目标
  },
  onSelectCopper: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(['close', 'action', 'selectCopper']);

// 三角操作面板已独立为组件 TriPanel

// 面板状态：'full' = 完整显示, 'minimized' = 最小化到底部
const panelMode = ref('full');
const actionMode = ref(null); // 'moving' = 等待选择移动位置, 'attacking' = 等待选择攻击目标

// 背包弹窗状态
const showInventory = ref(false);

// 铜偶背包物品
const inventoryItems = computed(() => {
  if (!props.copper || !props.copper.inventory) return [];
  return props.copper.inventory.items || [];
});

const copperInfo = computed(() => {
  if (!props.copper) return null;
  return {
    id: props.copper.id,
    name: props.copper.copper?.copper_info?.name || '未知铜偶',
    level: props.copper.copper?.level || 1,
    hp: props.copper.now_health,
    maxHp: props.copper.copper?.attribute?.health || 100,
    attack: props.copper.copper?.attribute?.attack || 0,
    defense: props.copper.copper?.attribute?.defense || 0,
    speed: props.copper.copper?.attribute?.speed || 0,
    canMove: props.copper.can_move,
    canAttack: props.copper.can_attack,
    position: props.copper.position,
  };
});

async function handleMove() {
  if (!copperInfo.value.canMove) return;
  log('[ActionPanel] 请求移动范围');
  const message = JSON.stringify({
    type: 'on_move_start',
    content: { id: String(copperInfo.value.id) },
  });
  await eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'moving';
  emit('action', { type: 'moveStart', copperId: copperInfo.value.id });
}

async function handleAttack() {
  log('[ActionPanel] 攻击按钮点击', {
    canAttack: copperInfo.value.canAttack,
    copperId: copperInfo.value.id,
    name: copperInfo.value.name,
  });
  if (!copperInfo.value.canAttack) {
    log('[ActionPanel] 攻击被阻止: 本回合已攻击');
    return;
  }
  log('[ActionPanel] 请求攻击范围');
  const message = JSON.stringify({
    type: 'on_attack_start',
    content: { id: String(copperInfo.value.id) },
  });
  await eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'attacking';
  emit('action', { type: 'attackStart', copperId: copperInfo.value.id });
}

function handleInventory() {
  log('[ActionPanel] 打开背包');
  showInventory.value = true;
}

async function handlePickup(index) {
  log(`[ActionPanel] 拾取物品: index=${index}`);
  const message = JSON.stringify({
    type: 'on_copper_pick_up',
    content: { id: String(copperInfo.value.id), index: String(index) },
  });
  await eventloop(message);
  await refreshCopperState();
}

async function handleDrop(index) {
  log(`[ActionPanel] 丢弃物品: index=${index}`);
  const message = JSON.stringify({
    type: 'on_copper_drop_item',
    content: { id: String(copperInfo.value.id), index: String(index) },
  });
  await eventloop(message);
  await refreshCopperState();
}

async function handleCraft() {
  log('[ActionPanel] 合成物品');
  const message = JSON.stringify({
    type: 'on_copper_craft',
    content: { id: String(copperInfo.value.id) },
  });
  await eventloop(message);
  await refreshCopperState();
}

// 处理背包组件的事件
async function handleInventoryCraft() {
  await handleCraft();
}
async function handleInventoryDrop(index) {
  await handleDrop(index);
}

async function refreshCopperState() {
  const message = JSON.stringify({
    type: 'on_click_copper',
    content: { id: String(copperInfo.value.id) },
  });
  await eventloop(message);
}

function handleWait() {
  log('[ActionPanel] 等待');
  emit('action', { type: 'wait', copperId: copperInfo.value.id });
}

function close() {
  panelMode.value = 'full';
  actionMode.value = null;
  showInventory.value = false;
  emit('close');
}

// 恢复完整显示逻辑已移除

// 使用共享工具获取资源名称

// 取消当前操作
function cancelAction() {
  panelMode.value = 'full';
  actionMode.value = null;
  emit('action', { type: 'cancel', copperId: copperInfo.value.id });
}

// 处理选择铜偶（如果提供了回调函数）
async function handleSelectCopper(copperId) {
  if (props.onSelectCopper) {
    await props.onSelectCopper(copperId);
  } else {
    emit('selectCopper', copperId);
  }
}

// 暴露方法给父组件（不再暴露 restore）
defineExpose({ cancelAction, handleSelectCopper });
</script>

<template>
  <div v-if="copper" class="copper-panel-parent">
    <!-- 菱形属性面板 -->
    <DiamondPanel
      :copper-info="copperInfo"
      :inventory-items="inventoryItems"
      @inventory-click="handleInventory"
    />

    <!-- 血条 -->
    <HealthBar :hp="copperInfo?.hp || 0" :max-hp="copperInfo?.maxHp || 100" />

    <div
      v-if="panelMode === 'minimized' || (resources && resources.length > 0)"
      class="copper-panel"
      :class="{
        'copper-panel--minimized': panelMode === 'minimized',
        'copper-panel--min-attack':
          panelMode === 'minimized' && actionMode === 'attacking',
        'copper-panel--min-move':
          panelMode === 'minimized' && actionMode === 'moving',
      }"
      @click.stop
    >
      <!-- 最小化状态 -->
      <div v-if="panelMode === 'minimized'" class="minimized-content">
        <div class="minimized-info">
          <span class="minimized-name">{{ copperInfo.name }}</span>
          <span class="minimized-action">
            {{
              actionMode === 'moving' ? '选择移动位置...' : '选择攻击目标...'
            }}
          </span>
        </div>
        <div class="minimized-actions">
          <button
            class="mini-btn mini-btn--cancel"
            @click="cancelAction"
            title="取消"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 完整显示状态 -->
      <template v-else>
        <!-- 关闭按钮 -->
        <button class="close-btn" @click="close" title="关闭">✕</button>

        <div class="panel-content">
          <!-- 铜偶信息（已移除不再展示） -->

          <!-- 地面资源（如果有） -->
          <div v-if="resources && resources.length > 0" class="resources">
            <div class="resources-header">📦 地面物品</div>
            <div class="resources-list">
              <div
                v-for="(resource, index) in resources"
                :key="index"
                class="resource-item"
                @click="handlePickup(index)"
                title="点击拾取"
              >
                <span class="resource-name">{{ getItemName(resource) }}</span>
                <span class="resource-count">x{{ resource.count || 1 }}</span>
                <span class="resource-pickup">⬆️</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 操作三角图标 -->
    <TriPanel
      :can-move="copperInfo?.canMove !== false"
      :can-attack="copperInfo?.canAttack !== false"
      @move="handleMove"
      @wait="handleWait"
      @attack="handleAttack"
    />
  </div>

  <!-- 背包弹窗 -->
  <InventoryModal
    :visible="showInventory"
    :copper-name="copperInfo?.name || '未知铜偶'"
    :inventory-items="inventoryItems"
    @close="showInventory = false"
    @craft="handleInventoryCraft"
    @drop="handleInventoryDrop"
  />
</template>

<style scoped>
.copper-panel-parent {
  position: relative;
}

.copper-panel {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: min(400px, 90vw);
  background: rgba(43, 26, 17, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 200, 100, 0.3);
  z-index: 5000;
  color: #fff;
  animation: slideUp 0.3s ease;
  transition: all 0.3s ease;
}

.panel-content {
  padding-right: 0;
}

.copper-panel--minimized {
  bottom: 48px;
  /* Use 320px (10x of 32px) to keep pixel-art crisp */
  width: min(300px, 170vw);
  /* Increase height in 32px multiples for pixel-art clarity */
  min-height: 100px; /* 32 * 6 */
  padding: 12px 16px;
  border-radius: 12px;
}

/* 边框：攻击 = 红色；移动 = 绿色（仅在最小化时生效） */
.copper-panel--minimized.copper-panel--min-attack {
  border: none;
  /* Two-layer background: top = sword badge, bottom = red panel */
  background-image: url('/assets/sword.png'), url('/assets/red.png');
  background-repeat: no-repeat, no-repeat;
  background-position:
    8px 8px,
    center;
  /* keep red panel slightly expanded to compensate asset margins */
  background-size:
    32px 32px,
    130% 122%;
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  image-rendering: pixelated;
}

.copper-panel--minimized.copper-panel--min-move {
  border: none;
  /* Two-layer background: top = boot badge, bottom = green panel */
  background-image: url('/assets/boot.png'), url('/assets/green.png');
  background-repeat: no-repeat, no-repeat;
  background-position:
    8px 8px,
    center;
  /* keep green panel slightly expanded to compensate asset margins */
  background-size:
    32px 32px,
    130% 122%;
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  image-rendering: pixelated;
}

/* 居中最小化面板文字 */
.minimized-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.minimized-info {
  width: 100%;
  text-align: center;
  margin-top: 30px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 107, 107, 0.8);
  transform: scale(1.1);
}

.copper-info {
  margin-bottom: 16px;
}

.info-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.copper-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.copper-name {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #ffd700;
}

.copper-level {
  padding: 4px 12px;
  background: rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #ffd700;
}

.resources {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.resources-header {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #ffd700;
}

.resources-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.resource-item {
  padding: 8px 12px;
  background: rgba(255, 200, 100, 0.15);
  border: 1px solid rgba(255, 200, 100, 0.3);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}

.resource-item:hover {
  background: rgba(255, 200, 100, 0.25);
  border-color: rgba(255, 200, 100, 0.5);
  transform: translateY(-1px);
}

.resource-name {
  flex: 1;
}
.resource-count {
  margin: 0 8px;
  color: rgba(255, 200, 100, 0.9);
}
.resource-pickup {
  font-size: 14px;
  opacity: 0.7;
}

/* TriPanel styles moved into the component */
</style>
