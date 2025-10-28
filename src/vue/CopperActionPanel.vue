<script setup>
import { ref, computed } from 'vue';
import { eventloop } from '../glue.js';
import { getAssetUrl } from '../utils/resourceLoader.js';
import DiamondPanel from './DiamondPanel.vue';
import ClockPanel from './ClockPanel.vue';
import InventoryModal from './InventoryModal.vue';

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
  }
});

const emit = defineEmits(['close', 'action']);

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

const hpPercentage = computed(() => {
  if (!copperInfo.value) return 0;
  return (copperInfo.value.hp / copperInfo.value.maxHp) * 100;
});

async function handleMove() {
  if (!copperInfo.value.canMove) return;
  
  console.log('[CopperActionPanel] 请求移动范围');
  const message = JSON.stringify({
    type: 'on_move_start',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
  
  // 最小化面板，等待用户点击移动位置
  panelMode.value = 'minimized';
  actionMode.value = 'moving';
  emit('action', { type: 'moveStart', copperId: copperInfo.value.id });
}

async function handleAttack() {
  console.log('[CopperActionPanel] 攻击按钮点击', {
    canAttack: copperInfo.value.canAttack,
    copperId: copperInfo.value.id,
    name: copperInfo.value.name
  });
  
  if (!copperInfo.value.canAttack) {
    console.warn('[CopperActionPanel] 攻击被阻止: 本回合已攻击');
    return;
  }
  
  console.log('[CopperActionPanel] 请求攻击范围');
  const message = JSON.stringify({
    type: 'on_attack_start',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
  
  // 最小化面板，等待用户点击攻击位置
  panelMode.value = 'minimized';
  actionMode.value = 'attacking';
  emit('action', { type: 'attackStart', copperId: copperInfo.value.id });
}

function handleInventory() {
  console.log('[CopperActionPanel] 打开背包');
  showInventory.value = true;
}

async function handlePickup(index) {
  console.log(`[CopperActionPanel] 拾取物品: index=${index}`);
  const message = JSON.stringify({
    type: 'on_copper_pick_up',
    content: { id: String(copperInfo.value.id), index: String(index) }
  });
  await eventloop(message);
  
  // 重新点击铜偶以刷新状态
  await refreshCopperState();
}

async function handleDrop(index) {
  console.log(`[CopperActionPanel] 丢弃物品: index=${index}`);
  const message = JSON.stringify({
    type: 'on_copper_drop_item',
    content: { id: String(copperInfo.value.id), index: String(index) }
  });
  await eventloop(message);
  
  // 重新点击铜偶以刷新状态
  await refreshCopperState();
}

async function handleCraft() {
  console.log('[CopperActionPanel] 合成物品');
  const message = JSON.stringify({
    type: 'on_copper_craft',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
  
  // 重新点击铜偶以刷新状态
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
  // 重新点击当前铜偶以刷新状态
  const message = JSON.stringify({
    type: 'on_click_copper',
    content: { id: String(copperInfo.value.id) }
  });
  await eventloop(message);
}

function handleWait() {
  console.log('[CopperActionPanel] 等待');
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
  // MoonBit 枚举序列化为数组: ["Resource", "RefinedCopper"]
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

// 暴露方法给父组件
defineExpose({
  restore,
  cancelAction
});
</script>

<template>
  <div v-if="copper" class="copper-panel-parent">
    <!-- 菱形属性面板 -->
    <DiamondPanel 
      :copper-info="copperInfo"
      :inventory-items="inventoryItems"
      @inventory-click="handleInventory"
    />

    <!-- 底部 HP 条 -->
    <div class="screen-hp" aria-label="copper health">
      <div class="screen-hp__track">
        <div class="screen-hp__fill" :style="{ width: hpPercentage + '%' }"></div>
        <div class="screen-hp__text">{{ Math.round(copperInfo.hp) }} / {{ copperInfo.maxHp }}</div>
      </div>
    </div>

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

    <!-- 钟表操作面板 -->
    <ClockPanel 
      :copper-info="copperInfo"
      @move-click="handleMove"
      @attack-click="handleAttack"
      @wait-click="handleWait"
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

/* 底部左侧屏幕 HP 条样式 */
.screen-hp{ position:absolute; left:20px; bottom:20px; width:min(540px, 60vw); z-index: 6000; }

.screen-hp__track{
  position: relative;
  height: 18px;
  background: #0f0f10; /* 深色底 */
  border: 2px solid #2a2a2c; /* 深灰描边 */
  border-radius: 8px 18px 8px 8px; /* 右端更圆润 */
  overflow: hidden;
  box-shadow:
    0 1px 0 rgba(255,255,255,.05) inset,
    0 -1px 0 rgba(0,0,0,.6) inset,
    0 6px 16px rgba(0,0,0,.35);
}

.screen-hp__track::after{
  /* 右侧斜切尖角 */
  content: "";
  position: absolute;
  right: -16px;
  top: 0; bottom: 0;
  width: 32px;
  background: linear-gradient(90deg, rgba(255, 120, 130, 0.6), rgba(255, 120, 130, 0.15));
  transform: skewX(-25deg);
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  pointer-events: none;
}

.screen-hp__fill{
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: linear-gradient(180deg, #d35a4d 0%, #c45145 45%, #b4453a 100%);
  box-shadow:
    inset 0 -2px 0 rgba(0,0,0,.25),
    inset 0 0 0 1px rgba(0,0,0,.15);
  transition: width .25s ease;
}

.screen-hp__fill::before{
  /* 顶部高光条，增强质感 */
  content: "";
  position: absolute;
  left: 8px; right: 12px;
  top: 2px; height: 6px;
  background: linear-gradient(to bottom, rgba(255,170,170,.65), rgba(255,170,170,0));
  border-radius: 4px;
  pointer-events: none;
}

.screen-hp__text{
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  text-shadow: 0 1px 2px rgba(0,0,0,.6);
  pointer-events: none;
}

/* 主内容无需为右侧 HP 让位 */
.panel-content{ padding-right:0; }

.copper-panel--minimized {
  bottom: 20px;
  width: min(500px, 90vw);
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

/* 最小化状态样式 */
.minimized-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.minimized-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.minimized-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
}

.minimized-action {
  font-size: 14px;
  color: #fff;
  opacity: 0.9;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.minimized-actions {
  display: flex;
  gap: 8px;
}

.mini-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-btn:hover {
  transform: scale(1.1);
}

.mini-btn--restore {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.5);
}

.mini-btn--restore:hover {
  background: rgba(34, 197, 94, 0.5);
}

.mini-btn--cancel {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.5);
}

.mini-btn--cancel:hover {
  background: rgba(239, 68, 68, 0.5);
}
</style>

