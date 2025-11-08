<script setup>
import {
  RESOURCE_META,
  getItemIcon,
  getItemName,
} from '../../utils/resourceMeta.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  copperName: {
    type: String,
    default: '未知铜偶',
  },
  inventoryItems: {
    type: Array,
    default: () => [],
  },
  transferTargets: {
    type: Array,
    default: () => [],
  },
  transferringItemIndex: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['close', 'craft', 'drop', 'transfer', 'transferTo']);

// 合成配方物品类型
const recipeItems = [
  'HeartCrystalDust',
  'RecallGear',
  'ResonantCrystal',
  'RefinedCopper',
];

function close() {
  emit('close');
}

function handleCraft() {
  console.log('[InventoryModal] 合成物品');
  emit('craft');
}

function handleDrop(index) {
  console.log(`[InventoryModal] 丢弃物品: index=${index}`);
  emit('drop', index);
}

function handleTransfer(index) {
  // 验证物品数量
  if (
    !props.inventoryItems[index] ||
    (props.inventoryItems[index].count || 1) <= 0
  ) {
    console.log(`[InventoryModal] 物品数量不足，无法传递: index=${index}`);
    return;
  }
  console.log(`[InventoryModal] 传递物品: index=${index}`);
  emit('transfer', index);
}

function handleTransferTo(target) {
  console.log(
    `[InventoryModal] 传递到目标: ${target.name} (位置: ${target.position})`
  );
  emit('transferTo', target.position);
}
</script>

<template>
  <!-- 背包弹窗 -->
  <div v-if="visible" class="inventory-modal" @click.self="close">
    <div class="minecraft-inventory">
      <div class="inventory-header-mc">
        <h3>
          <span class="copper-name">{{ copperName }}</span> 的背包
        </h3>
        <button class="close-btn-mc" @click="close">✕</button>
      </div>

      <div class="inventory-layout">
        <!-- 合成区域 -->
        <div class="crafting-section">
          <div class="crafting-title">合成</div>
          <div class="crafting-grid">
            <!-- 2x2 合成网格 -->
            <div
              class="craft-slot"
              v-for="(itemType, i) in recipeItems"
              :key="i"
            >
              <img
                v-if="RESOURCE_META[itemType]?.icon"
                :src="RESOURCE_META[itemType].icon"
                class="craft-icon"
              />
            </div>
          </div>
          <div class="craft-arrow">→</div>
          <div class="craft-result">
            <div class="recipe-display">
              <img
                v-if="RESOURCE_META['SpiritalSpark']?.icon"
                :src="RESOURCE_META['SpiritalSpark'].icon"
                class="recipe-icon"
              />
            </div>
          </div>
          <button class="craft-button-mc" @click="handleCraft">合成</button>
        </div>

        <!-- 背包区域 -->
        <div class="inventory-section">
          <div class="inventory-grid">
            <!-- 5个格子 -->
            <div
              v-for="(item, index) in 5"
              :key="index"
              class="inv-slot"
              :class="{ 'has-item': index < inventoryItems.length }"
            >
              <template v-if="index < inventoryItems.length">
                <img
                  v-if="getItemIcon(inventoryItems[index])"
                  :src="getItemIcon(inventoryItems[index])"
                  class="slot-icon"
                />
                <div class="slot-count" :style="{ color: '#4488ff' }">
                  {{ inventoryItems[index].count || 1 }}
                </div>
                <!-- 传递模式下显示独立的目标选择区域 -->
                <div
                  v-if="
                    transferringItemIndex === index &&
                    transferTargets &&
                    transferTargets.length > 0
                  "
                  class="transfer-targets-panel"
                >
                  <div class="transfer-title">传递到：</div>
                  <div
                    v-for="target in transferTargets"
                    :key="target.id"
                    class="transfer-target-item"
                    @click.stop="handleTransferTo(target)"
                  >
                    {{ target.name }}
                  </div>
                </div>
                <!-- 普通tooltip（非传递模式） -->
                <div v-else class="slot-tooltip">
                  <div class="tooltip-name">
                    {{ getItemName(inventoryItems[index]) }}
                  </div>
                  <!-- 如果正在传递但没有目标，显示提示 -->
                  <template
                    v-if="
                      transferringItemIndex === index &&
                      transferTargets &&
                      transferTargets.length === 0
                    "
                  >
                    <div class="transfer-targets">
                      <div class="transfer-title" style="color: #ff4444">
                        无可传递目标
                      </div>
                    </div>
                  </template>
                  <!-- 否则显示操作按钮 -->
                  <template v-else>
                    <div class="tooltip-buttons">
                      <button
                        class="tooltip-transfer"
                        @click.stop="handleTransfer(index)"
                      >
                        传递
                      </button>
                      <button
                        class="tooltip-drop"
                        @click.stop="handleDrop(index)"
                      >
                        丢弃
                      </button>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Minecraft 风格背包弹窗 */
.inventory-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.minecraft-inventory {
  background: #8b6914;
  border: 4px solid #555;
  border-radius: 8px;
  padding: 20px;
  width: 92%;
  max-width: 560px;
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -4px 0 rgba(0, 0, 0, 0.3);
}

.inventory-header-mc {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.inventory-header-mc h3 {
  margin: 0;
  font-size: 18px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
}

.copper-name {
  color: #fff;
}

.close-btn-mc {
  background: #8b6914;
  border: 2px solid #666;
  color: #fff;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s;
}

.close-btn-mc:hover {
  background: #a0801c;
  border-color: #777;
}

/* 布局 */
.inventory-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 16px;
  place-items: center; /* 水平垂直居中单列项 */
}

/* 合成区域 */
.crafting-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  justify-content: center; /* 水平居中合成内容 */
  width: 100%;
}

.crafting-title {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
  margin-right: 12px;
}

.crafting-grid {
  display: grid;
  grid-template-columns: repeat(2, 44px);
  grid-template-rows: repeat(2, 44px);
  gap: 6px;
}

.craft-slot {
  width: 44px;
  height: 44px;
  background: #c6c6c6;
  border: 2px solid #8b8b8b;
  border-top-color: #555;
  border-left-color: #555;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.craft-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
  box-sizing: border-box;
}

.craft-arrow {
  font-size: 24px;
  color: #6a4931;
  text-align: center;
  font-weight: 900;
  letter-spacing: 2px;
}

.craft-result {
  background: #c6c6c6;
  border: 2px solid #8b8b8b;
  border-top-color: #555;
  border-left-color: #555;
  width: 80px;
  height: 80px;
  padding: 4px;
  overflow: hidden;
}

.recipe-display {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recipe-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.craft-button-mc {
  padding: 8px 16px;
  background: #4a4a4a;
  color: #fef7f5;
  border: 2px solid #8b8b8b;
  border-top-color: #555;
  border-left-color: #555;
  cursor: pointer;
  font-weight: 900;
  letter-spacing: 2px;
  font-size: 12px;
  transition: all 0.2s;
  white-space: nowrap;
}

.craft-button-mc:hover {
  background: #5a5a5a;
  border-color: #999;
}

/* 背包区域 */
.inventory-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(5, 40px);
  gap: 4px;
}

.inv-slot {
  width: 40px;
  height: 40px;
  background: #8b7d6b;
  border: 2px solid #6b5d4a;
  border-right-color: #a0896b;
  border-bottom-color: #a0896b;
  cursor: pointer;
  position: relative;
  transition: all 0.1s;
}

.inv-slot:hover {
  background: #9d8771;
  transform: scale(1.05);
}

.inv-slot.has-item {
  background: #8b7d6b;
}

.slot-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
  box-sizing: border-box;
}

.slot-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #4488ff;
  pointer-events: none;
}

.slot-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #100010;
  border: 2px solid #555;
  padding: 8px 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
}

.inv-slot:hover .slot-tooltip {
  opacity: 1;
}

.tooltip-name {
  font-size: 12px;
  color: #6a4931;
  margin-bottom: 4px;
  font-weight: 900;
  letter-spacing: 1px;
}

.tooltip-buttons {
  display: flex;
  gap: 4px;
}

.tooltip-transfer {
  background: #148b8b;
  border: 1px solid #666;
  color: #fef7f5;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
  flex: 1;
  pointer-events: auto;
}

.tooltip-transfer:hover {
  background: #1aa4a4;
}

.tooltip-drop {
  background: #8b1414;
  border: 1px solid #666;
  color: #fef7f5;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
  flex: 1;
  pointer-events: auto;
}

.tooltip-drop:hover {
  background: #a41a1a;
}

.transfer-targets {
  margin-top: 8px;
}

/* 传递目标选择面板（独立显示，不依赖hover） */
.transfer-targets-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #100010;
  border: 2px solid #555;
  padding: 12px 16px;
  white-space: nowrap;
  z-index: 20;
  pointer-events: auto;
  min-width: 150px;
}

.transfer-title {
  font-size: 11px;
  color: #6a4931;
  margin-bottom: 8px;
  font-weight: 700;
}

.transfer-target-item {
  background: #148b8b;
  border: 1px solid #666;
  color: #fef7f5;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  margin-top: 6px;
  border-radius: 4px;
  transition: all 0.2s;
  pointer-events: auto;
  text-align: center;
}

.transfer-target-item:first-child {
  margin-top: 0;
}

.transfer-target-item:hover {
  background: #1aa4a4;
  transform: translateX(2px);
}

/* 确保传递目标列表可以被点击 */
.transfer-targets {
  pointer-events: auto;
}

/* 快捷栏 */

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
