<script setup>
import { ref, computed } from 'vue';
import { eventloop } from '../glue.js';

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
    const nameMap = {
      'HeartCrystalDust': '💎 心源水晶尘',
      'RecallGear': '⚙️ 回忆齿轮',
      'ResonantCrystal': '🔮 共鸣水晶',
      'RefinedCopper': '🔶 精炼铜锭',
      'SpiritalSpark': '✨ 灵光火花'
    };
    return nameMap[resourceType] || resourceType;
  } else if (Array.isArray(resource.item_type) && resource.item_type[0] === 'Equipment') {
    return '🗡️ 装备';
  }
  return '未知物品';
}

// 获取物品名称
function getItemName(item) {
  // MoonBit 枚举序列化为数组: ["Resource", "RefinedCopper"]
  if (Array.isArray(item.item_type) && item.item_type[0] === 'Resource') {
    const resourceType = item.item_type[1];
    const nameMap = {
      'HeartCrystalDust': '💎 心源水晶尘',
      'RecallGear': '⚙️ 回忆齿轮',
      'ResonantCrystal': '🔮 共鸣水晶',
      'RefinedCopper': '🔶 精炼铜锭',
      'SpiritalSpark': '✨ 灵光火花'
    };
    return nameMap[resourceType] || resourceType;
  } else if (Array.isArray(item.item_type) && item.item_type[0] === 'Equipment') {
    return '🗡️ 装备';
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
  <div v-if="copper" class="copper-panel" :class="{ 'copper-panel--minimized': panelMode === 'minimized' }" @click.stop>
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

    <!-- 铜偶信息 -->
    <div class="copper-info">
      <div class="copper-header">
        <h3 class="copper-name">{{ copperInfo.name }}</h3>
        <span class="copper-level">Lv.{{ copperInfo.level }}</span>
      </div>

      <!-- HP条 -->
      <div class="hp-bar">
        <div class="hp-fill" :style="{ width: hpPercentage + '%' }"></div>
        <span class="hp-text">{{ Math.round(copperInfo.hp) }} / {{ copperInfo.maxHp }}</span>
      </div>

      <!-- 属性 -->
      <div class="attributes">
        <div class="attr-item">
          <span class="attr-label">⚔️ 攻击</span>
          <span class="attr-value">{{ copperInfo.attack }}</span>
        </div>
        <div class="attr-item">
          <span class="attr-label">🛡️ 防御</span>
          <span class="attr-value">{{ copperInfo.defense }}</span>
        </div>
        <div class="attr-item">
          <span class="attr-label">⚡ 速度</span>
          <span class="attr-value">{{ copperInfo.speed }}</span>
        </div>
      </div>

      <!-- 位置 -->
      <div class="position">
        <span class="position-label">📍 位置:</span>
        <span class="position-value">({{ copperInfo.position[0] }}, {{ copperInfo.position[1] }})</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button 
        class="action-btn action-btn--move" 
        @click="handleMove"
        :disabled="!copperInfo.canMove"
        :title="copperInfo.canMove ? '移动' : '本回合已移动'"
      >
        <span class="btn-icon">🚶</span>
        <span class="btn-text">移动</span>
      </button>

      <button 
        class="action-btn action-btn--attack" 
        @click="handleAttack"
        :disabled="!copperInfo.canAttack"
        :title="copperInfo.canAttack ? '攻击' : '本回合已攻击'"
      >
        <span class="btn-icon">⚔️</span>
        <span class="btn-text">攻击</span>
      </button>

      <button 
        class="action-btn action-btn--inventory" 
        @click="handleInventory"
        title="背包"
      >
        <span class="btn-icon">🎒</span>
        <span class="btn-text">背包</span>
      </button>

      <button 
        class="action-btn action-btn--wait" 
        @click="handleWait"
        title="等待"
      >
        <span class="btn-icon">⏸️</span>
        <span class="btn-text">等待</span>
      </button>
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
    </template>
  </div>

  <!-- 背包弹窗 -->
  <div v-if="showInventory" class="inventory-modal" @click.self="showInventory = false">
    <div class="inventory-panel">
      <div class="inventory-header">
        <h3>🎒 {{ copperInfo?.name }} 的背包</h3>
        <button class="close-btn" @click="showInventory = false">✕</button>
      </div>

      <div class="inventory-content">
        <!-- 背包物品列表 -->
        <div class="inventory-items">
          <div class="items-header">背包物品 ({{ inventoryItems.length }}/5)</div>
          <div v-if="inventoryItems.length === 0" class="empty-state">
            背包是空的
          </div>
          <div v-else class="items-list">
            <div 
              v-for="(item, index) in inventoryItems" 
              :key="index" 
              class="inv-item"
            >
              <div class="inv-item-info">
                <span class="inv-item-name">{{ getItemName(item) }}</span>
                <span class="inv-item-count">x{{ item.count || 1 }}</span>
              </div>
              <button 
                class="inv-item-drop" 
                @click="handleDrop(index)"
                title="丢弃物品"
              >
                🗑️ 丢弃
              </button>
            </div>
          </div>
        </div>

        <!-- 合成面板 -->
        <div class="craft-panel">
          <div class="craft-header">⚗️ 合成</div>
          <div class="craft-recipe">
            <div class="recipe-title">灵光火花配方：</div>
            <div class="recipe-items">
              <div class="recipe-item">💎 心源水晶尘 x1</div>
              <div class="recipe-item">⚙️ 回忆齿轮 x1</div>
              <div class="recipe-item">🔮 共鸣水晶 x1</div>
              <div class="recipe-item">🔶 精炼铜锭 x1</div>
            </div>
            <div class="recipe-result">→ ✨ 灵光火花 x1</div>
            <button class="craft-btn" @click="handleCraft">
              🔨 合成
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.hp-bar {
  position: relative;
  height: 28px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hp-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #ff4444 0%, #ff6b6b 50%, #ff8888 100%);
  transition: width 0.3s ease;
}

.hp-text {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  z-index: 1;
}

.attributes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.attr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.attr-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.attr-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
}

.position {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 14px;
}

.position-label {
  opacity: 0.8;
}

.position-value {
  font-weight: 700;
  color: #ffd700;
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(58, 37, 25, 0.8);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn--move {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
}

.action-btn--move:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.7);
}

.action-btn--attack {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.action-btn--attack:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.7);
}

.action-btn--inventory {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.action-btn--inventory:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.7);
}

.action-btn--wait {
  background: rgba(156, 163, 175, 0.2);
  border-color: rgba(156, 163, 175, 0.5);
}

.action-btn--wait:hover:not(:disabled) {
  background: rgba(156, 163, 175, 0.3);
  border-color: rgba(156, 163, 175, 0.7);
}

.btn-icon {
  font-size: 24px;
}

.btn-text {
  font-size: 12px;
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

/* 背包弹窗样式 */
.inventory-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.inventory-panel {
  background: rgba(43, 26, 17, 0.98);
  border-radius: 16px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 2px solid rgba(255, 200, 100, 0.4);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(255, 200, 100, 0.3);
}

.inventory-header h3 {
  margin: 0;
  font-size: 20px;
  color: #ffd700;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.inventory-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.inventory-items {
  background: rgba(0, 0, 0, 0.3);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 200, 100, 0.2);
}

.items-header {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: rgba(255, 200, 100, 0.9);
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inv-item {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.inv-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 200, 100, 0.3);
}

.inv-item-info {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
}

.inv-item-name {
  font-size: 14px;
  color: #fff;
}

.inv-item-count {
  font-size: 13px;
  color: rgba(255, 200, 100, 0.8);
}

.inv-item-drop {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.inv-item-drop:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.6);
}

/* 合成面板 */
.craft-panel {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.craft-header {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #c4b5fd;
}

.craft-recipe {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
}

.recipe-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(255, 200, 100, 0.9);
}

.recipe-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}

.recipe-item {
  font-size: 12px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.recipe-result {
  font-size: 14px;
  font-weight: 600;
  margin: 12px 0;
  text-align: center;
  color: #ffd700;
}

.craft-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.3));
  border: 2px solid rgba(139, 92, 246, 0.5);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.craft-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(99, 102, 241, 0.4));
  border-color: rgba(139, 92, 246, 0.7);
  transform: translateY(-1px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

