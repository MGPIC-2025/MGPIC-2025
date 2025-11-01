<script setup>
import { ref, computed } from 'vue';
import { eventloop } from '../glue.js';
import { getAssetUrl } from '../utils/resourceLoader.js';
import DiamondPanel from './ActionPanelParts/DiamondPanel.vue';
import InventoryModal from './ActionPanelParts/InventoryModal.vue';
import HealthBar from './ActionPanelParts/HealthBar.vue';

const props = defineProps({
  copper: {
    type: Object,
    default: null
  },
  resources: {
    type: Array,
    default: () => []
  },
  hasAttackTargets: {
    type: Boolean,
    default: true // 默认假设有目标
  },
  onSelectCopper: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(['close', 'action', 'selectCopper']);

// 资源元信息映射
const RESOURCE_META = {
  HeartCrystalDust: {
    name: '心晶尘',
    icon: getAssetUrl('resource/heart_crystal_dust.webp'),
  },
  RecallGear: {
    name: '回响齿轮',
    icon: getAssetUrl('resource/recall_gear.webp'),
  },
  ResonantCrystal: {
    name: '共鸣星晶',
    icon: getAssetUrl('resource/resonant_star_crystal/resonant_star_crystal.webp'),
  },
  RefinedCopper: {
    name: '精炼铜锭',
    icon: getAssetUrl('resource/refined_copper_ingot/refined_copper_ingot.webp'),
  },
  SpiritalSpark: {
    name: '灵性火花',
    icon: getAssetUrl('resource/spiritual_spark.webp'),
  },
};

// 三角图标资源
const hexSrc = new URL('../../assets/your-image.png', import.meta.url).href; // 六边形背景
const moveIconSrc = new URL('../../assets/boot.png', import.meta.url).href; // 移动图标（靴子）
const waitIconSrc = new URL('../../assets/mushroom.png', import.meta.url).href; // 等待图标（蘑菇）
const attackIconSrc = new URL('../../assets/sword.png', import.meta.url).href; // 攻击图标（剑）

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
  console.log('[ActionPanel] 请求移动范围');
  const message = JSON.stringify({
    type: 'on_move_start',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'moving';
  emit('action', { type: 'moveStart', copperId: copperInfo.value.id });
}

async function handleAttack() {
  console.log('[ActionPanel] 攻击按钮点击', {
    canAttack: copperInfo.value.canAttack,
    copperId: copperInfo.value.id,
    name: copperInfo.value.name
  });
  if (!copperInfo.value.canAttack) {
    console.warn('[ActionPanel] 攻击被阻止: 本回合已攻击');
    return;
  }
  console.log('[ActionPanel] 请求攻击范围');
  const message = JSON.stringify({
    type: 'on_attack_start',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'attacking';
  emit('action', { type: 'attackStart', copperId: copperInfo.value.id });
}

function handleInventory() {
  console.log('[ActionPanel] 打开背包');
  showInventory.value = true;
}

async function handlePickup(index) {
  console.log(`[ActionPanel] 拾取物品: index=${index}`);
  const message = JSON.stringify({
    type: 'on_copper_pick_up',
    content: { id: String(copperInfo.value.id), index: String(index) }
  });
  await eventloop(message);
  await refreshCopperState();
}

async function handleDrop(index) {
  console.log(`[ActionPanel] 丢弃物品: index=${index}`);
  const message = JSON.stringify({
    type: 'on_copper_drop_item',
    content: { id: String(copperInfo.value.id), index: String(index) }
  });
  await eventloop(message);
  await refreshCopperState();
}

async function handleCraft() {
  console.log('[ActionPanel] 合成物品');
  const message = JSON.stringify({
    type: 'on_copper_craft',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
  await refreshCopperState();
}

// 处理背包组件的事件
async function handleInventoryCraft() { await handleCraft(); }
async function handleInventoryDrop(index) { await handleDrop(index); }

async function refreshCopperState() {
  const message = JSON.stringify({
    type: 'on_click_copper',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
}

function handleWait() {
  console.log('[ActionPanel] 等待');
  emit('action', { type: 'wait', copperId: copperInfo.value.id });
}

function close() {
  panelMode.value = 'full';
  actionMode.value = null;
  showInventory.value = false;
  emit('close');
}

// 恢复完整显示
function restore() {
  panelMode.value = 'full';
  actionMode.value = null;
}

// 获取资源名称
function getResourceName(resource) {
  if (Array.isArray(resource.item_type) && resource.item_type[0] === 'Resource') {
    const resourceType = resource.item_type[1];
    return RESOURCE_META[resourceType]?.name || resourceType;
  } else if (Array.isArray(resource.item_type) && resource.item_type[0] === 'Equipment') {
    return '装备';
  }
  return '未知物品';
}

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

// 暴露方法给父组件
defineExpose({ restore, cancelAction, handleSelectCopper });
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
    <HealthBar 
      :hp="copperInfo?.hp || 0"
      :max-hp="copperInfo?.maxHp || 100"
    />

    <div class="copper-panel" :class="{ 'copper-panel--minimized': panelMode === 'minimized' }" @click.stop>
      <!-- 最小化状态 -->
      <div v-if="panelMode === 'minimized'" class="minimized-content">
      <div class="minimized-info">
        <span class="minimized-name">{{ copperInfo.name }}</span>
        <span class="minimized-action">
          {{ actionMode === 'moving' ? '🚶 选择移动位置...' : '⚔️ 选择攻击目标...' }}
        </span>
      </div>
      <div class="minimized-actions">
        <button class="mini-btn mini-btn--restore" @click="restore" title="展开">▲</button>
        <button class="mini-btn mini-btn--cancel" @click="cancelAction" title="取消">✕</button>
      </div>
    </div>

    <!-- 完整显示状态 -->
    <template v-else>
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="close" title="关闭">✕</button>

      

      <div class="panel-content">
        <!-- 铜偶信息 -->
        <div class="copper-info">
          <div class="info-top">
            <div class="copper-header">
              <h3 class="copper-name">{{ copperInfo.name }}</h3>
              <span class="copper-level">Lv.{{ copperInfo.level }}</span>
            </div>
          </div>
      </div>

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
            <span class="resource-name">{{ getResourceName(resource) }}</span>
            <span class="resource-count">x{{ resource.count || 1 }}</span>
            <span class="resource-pickup">⬆️</span>
          </div>
        </div>
      </div>
      </div>
      </template>
    </div>

    <!-- 操作三角图标 ！-->
    <div class="tri-panel">
      <div class="tri" aria-label="三角排列图像">
        <!-- 顶部：移动 -->
        <div
          class="hex top"
          :title="copperInfo?.canMove ? '移动' : '本回合已移动'"
          :class="{ 'is-locked': copperInfo && copperInfo.canMove === false }"
          @click="handleMove"
        >
          <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
          <img class="hex-icon" :src="waitIconSrc" alt="移动图标（蘑菇）" />
        </div>
        <!-- 左下：等待 -->
        <div
          class="hex left"
          title="等待"
          @click="handleWait"
        >
          <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
          <img class="hex-icon" :src="moveIconSrc" alt="等待图标（靴子）" />
        </div>
        <!-- 右下：攻击 -->
        <div
          class="hex right"
          :title="copperInfo?.canAttack ? '攻击' : '本回合已攻击'"
          :class="{ 'is-locked': copperInfo && copperInfo.canAttack === false }"
          @click="handleAttack"
        >
          <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
          <img class="hex-icon" :src="attackIconSrc" alt="攻击图标（剑）" />
        </div>
      </div>
    </div>
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
.copper-panel-parent{ position: relative; }

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


.panel-content{ padding-right:0; }

.copper-panel--minimized {
  bottom: 48px;
  width: min(300px, 75vw);
  padding: 12px 16px;
  border-radius: 12px;
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

.info-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
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

.resource-name { flex: 1; }
.resource-count { margin: 0 8px; color: rgba(255, 200, 100, 0.9); }
.resource-pickup { font-size: 14px; opacity: 0.7; }

/* ====== Tri icons (migrated from ClockPanel) ====== */
.tri-panel { position: absolute; right: 29px; bottom: 10px; z-index: 6000; }
.tri-panel { --gap: 0px; --size: 64px; --overlapY: 16px; --overlapX: 37px; --topDropY: -8px; }
@media (min-width: 640px) { .tri-panel { --size: 80px; } }
.tri { display: grid; grid-template-columns: repeat(3, max-content); grid-template-rows: repeat(2, max-content); gap: var(--gap); align-items: center; justify-items: center; }
.hex { 
  position: relative;
  width: var(--size); 
  height: var(--size); 
  image-rendering: pixelated; 
  image-rendering: crisp-edges; 
  user-select: none; 
  -webkit-user-drag: none; 
  transition: transform 120ms ease, opacity 120ms ease, filter 120ms ease; 
  cursor: pointer; 
}
.hex-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: none;
}
.hex-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 47%;
  height: 47%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: none;
}
.top { grid-column: 2; grid-row: 1; }
.left { grid-column: 1; grid-row: 2; }
.right { grid-column: 3; grid-row: 2; }
.top { transform: translateY(var(--topDropY)); }
.left { transform: translate(var(--overlapX), calc(-1 * var(--overlapY))); }
.right { transform: translate(calc(-1 * var(--overlapX)), calc(-1 * var(--overlapY))); }
.hex:is(.top, .left, .right):hover { filter: brightness(1.08); }
.is-locked { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.2); }
.hex.top:hover:not(.is-locked) { animation: float-top 1200ms ease-in-out infinite; }
.hex.left:hover:not(.is-locked) { animation: float-left 1200ms ease-in-out infinite; }
.hex.right:hover:not(.is-locked) { animation: float-right 1200ms ease-in-out infinite; }
@keyframes float-top { 0% { transform: translateY(var(--topDropY)) scale(1.00); } 50% { transform: translateY(calc(var(--topDropY) - 2px)) scale(1.06); } 100% { transform: translateY(var(--topDropY)) scale(1.00); } }
@keyframes float-left { 0% { transform: translate(var(--overlapX), calc(-1 * var(--overlapY))) scale(1.00); } 50% { transform: translate(calc(var(--overlapX) + 1px), calc(-1 * var(--overlapY) - 2px)) scale(1.06); } 100% { transform: translate(var(--overlapX), calc(-1 * var(--overlapY))) scale(1.00); } }
@keyframes float-right { 0% { transform: translate(calc(-1 * var(--overlapX)), calc(-1 * var(--overlapY))) scale(1.00); } 50% { transform: translate(calc(-1 * var(--overlapX) - 1px), calc(-1 * var(--overlapY) - 2px)) scale(1.06); } 100% { transform: translate(calc(-1 * var(--overlapX)), calc(-1 * var(--overlapY))) scale(1.00); } }
</style>


