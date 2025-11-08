<script setup>
import log from '../log.js';
import { ref, computed } from 'vue';
import { eventloop } from '../glue.js';
import { getItemName } from '../utils/resourceMeta.js';
import { getAssetUrl } from '../utils/resourceLoader.js';
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
  transferTargets: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close', 'action', 'selectCopper']);

// UI资源URL（CSS background-image需要url()包裹）
const swordImgSrc = computed(() => `url('${getAssetUrl('ui/sword.png')}')`);
const redPanelBg = computed(() => `url('${getAssetUrl('ui/red.png')}')`);
const bootImgSrc = computed(() => `url('${getAssetUrl('ui/boot.png')}')`);
const greenPanelBg = computed(() => `url('${getAssetUrl('ui/green.png')}')`);


// 三角操作面板已独立为组件 TriPanel

// 面板状态：'full' = 完整显示, 'minimized' = 最小化到底部
const panelMode = ref('full');
const actionMode = ref(null); // 'moving' = 等待选择移动位置, 'attacking' = 等待选择攻击目标

// 背包弹窗状态
const showInventory = ref(false);
// 当前传递的物品索引
const transferringItemIndex = ref(null);

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
    canSummon: props.copper.can_summon,
    position: props.copper.position,
    inventoryCapacity: props.copper.inventory?.capacity || 0,
  };
});

async function handleMove() {
  if (!copperInfo.value.canMove) return;
  log('[ActionPanel] 请求移动范围');

  // 判断是铜偶还是友方召唤物
  const isOwnedEnemy = props.copper.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_enemy_move_start' : 'on_move_start';

  log(
    `[ActionPanel] 单位类型: ${isOwnedEnemy ? '友方召唤物' : '铜偶'}, 事件: ${eventType}`
  );

  const message = JSON.stringify({
    type: eventType,
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

  // 判断是铜偶还是友方召唤物
  const isOwnedEnemy = props.copper.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_enemy_attack_start' : 'on_attack_start';

  log(
    `[ActionPanel] 单位类型: ${isOwnedEnemy ? '友方召唤物' : '铜偶'}, 事件: ${eventType}`
  );

  const message = JSON.stringify({
    type: eventType,
    content: { id: String(copperInfo.value.id) },
  });
  await eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'attacking';
  emit('action', { type: 'attackStart', copperId: copperInfo.value.id });
}

async function handleSummon() {
  log('[ActionPanel] 召唤按钮点击', {
    canSummon: copperInfo.value.canSummon,
    copperId: copperInfo.value.id,
    name: copperInfo.value.name,
  });
  if (!copperInfo.value.canSummon) {
    log('[ActionPanel] 召唤被阻止: 本回合已召唤');
    return;
  }
  log('[ActionPanel] 请求召唤范围');
  const message = JSON.stringify({
    type: 'on_summon_start',
    content: { id: String(copperInfo.value.id) },
  });
  await eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'summoning';
  emit('action', { type: 'summonStart', copperId: copperInfo.value.id });
}

function handleInventory() {
  // 检查背包容量，如果为0则不允许打开
  if (copperInfo.value.inventoryCapacity === 0) {
    log('[ActionPanel] 背包容量为0，无法打开');
    return;
  }
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
async function handleInventoryTransfer(index) {
  if (!copperInfo.value || !inventoryItems.value[index]) return;

  const item = inventoryItems.value[index];
  const count = item.count || 1;

  // 验证物品数量，防止传递数量为0或负数的物品
  if (count <= 0) {
    log(`[ActionPanel] 物品数量不足，无法传递: index=${index}, count=${count}`);
    return;
  }

  log(`[ActionPanel] 请求传递物品: index=${index}, count=${count}`);

  // 保存当前传递的物品索引（确保背包保持打开）
  transferringItemIndex.value = index;
  actionMode.value = 'transferring';
  // 确保背包保持打开状态
  if (!showInventory.value) {
    showInventory.value = true;
  }

  // 先通知父组件开始传递，让其设置传递模式（这样 onSetAttackBlock 才能正确识别）
  emit('action', {
    type: 'transferStart',
    copperId: copperInfo.value.id,
    itemIndex: index,
  });

  // 等待一小段时间让父组件设置传递模式
  await new Promise(resolve => setTimeout(resolve, 50));

  // 调用后端获取可传递位置
  const message = JSON.stringify({
    type: 'on_transfer_start',
    content: {
      id: String(copperInfo.value.id),
      index: String(index),
      count: String(count),
    },
  });
  await eventloop(message);

  // 等待后端发送 set_attack_block 消息并收集目标
  await new Promise(resolve => setTimeout(resolve, 200));

  log(
    `[ActionPanel] 传递目标数量: ${props.transferTargets?.length || 0}, transferringItemIndex=${transferringItemIndex.value}`
  );

  // 更新视图
  if (props.transferTargets && props.transferTargets.length > 0) {
    log(
      `[ActionPanel] 传递目标列表:`,
      props.transferTargets.map(t => t.name)
    );
  }
}

async function refreshCopperState() {
  // 判断是铜偶还是友方召唤物，发送不同的事件
  const isOwnedEnemy = props.copper.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_click_enemy' : 'on_click_copper';

  const message = JSON.stringify({
    type: eventType,
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

function handleCloseInventory() {
  // 关闭背包时，如果正在传递，取消传递
  if (actionMode.value === 'transferring') {
    transferringItemIndex.value = null;
    actionMode.value = null;
    emit('action', { type: 'cancel', copperId: copperInfo.value.id });
  }
  showInventory.value = false;
}

async function handleTransferTo(targetPosition) {
  if (
    transferringItemIndex.value !== null &&
    transferringItemIndex.value !== undefined
  ) {
    log(`[ActionPanel] 传递到位置: ${targetPosition}`);

    const message = JSON.stringify({
      type: 'on_transfer_apply',
      content: {
        position: {
          x: String(targetPosition[0]),
          y: String(targetPosition[1]),
        },
      },
    });
    await eventloop(message);

    // 发送传递结束消息，清除范围显示
    const endMessage = JSON.stringify({ type: 'on_transfer_end' });
    await eventloop(endMessage);

    // 重置传递状态
    transferringItemIndex.value = null;
    actionMode.value = null;

    // 通知父组件传递完成，清除传递目标
    emit('action', { type: 'transferComplete', copperId: copperInfo.value.id });

    // 等待一小段时间确保消息处理完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 静默刷新铜偶状态（更新背包数量）
    await refreshCopperState();

    // 保持背包打开，让用户可以继续传递或手动关闭
    log('[ActionPanel] 传递完成，背包保持打开');
  }
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
      :inventory-capacity="copperInfo?.inventoryCapacity || 0"
      @inventory-click="handleInventory"
    />

    <!-- 血条 -->
    <HealthBar :hp="copperInfo?.hp || 0" :max-hp="copperInfo?.maxHp || 100" />

    <div
      v-if="
        panelMode === 'minimized' ||
        (resources && resources.length > 0 && panelMode === 'full')
      "
      class="copper-panel"
      :class="{
        'copper-panel--minimized': panelMode === 'minimized',
        'copper-panel--min-attack':
          panelMode === 'minimized' &&
          (actionMode === 'attacking' || actionMode === 'transferring'),
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
              actionMode === 'moving'
                ? '选择移动位置...'
                : actionMode === 'attacking'
                  ? '选择攻击目标...'
                  : actionMode === 'summoning'
                    ? '选择召唤位置...'
                    : actionMode === 'transferring'
                      ? '选择传递目标...'
                      : ''
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

    <!-- 操作三角图标（野生敌人不显示操作按钮） -->
    <TriPanel
      v-if="!props.copper.isEnemy"
      :can-move="copperInfo?.canMove !== false"
      :can-attack="copperInfo?.canAttack !== false"
      :can-summon="copperInfo?.canSummon !== false"
      @move="handleMove"
      @wait="handleWait"
      @attack="handleAttack"
      @summon="handleSummon"
    />

    <!-- 野生敌人提示 -->
    <div v-if="props.copper.isEnemy" class="enemy-info-tip">
      <span>🔍 查看模式（敌人单位）</span>
    </div>
  </div>

  <!-- 背包弹窗 -->
  <InventoryModal
    :visible="showInventory"
    :copper-name="copperInfo?.name || '未知铜偶'"
    :inventory-items="inventoryItems"
    :transfer-targets="props.transferTargets || []"
    :transferring-item-index="transferringItemIndex"
    @close="handleCloseInventory"
    @craft="handleInventoryCraft"
    @drop="handleInventoryDrop"
    @transfer="handleInventoryTransfer"
    @transfer-to="handleTransferTo"
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
  background-image: v-bind(swordImgSrc), v-bind(redPanelBg);
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
  background-image: v-bind(bootImgSrc), v-bind(greenPanelBg);
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
