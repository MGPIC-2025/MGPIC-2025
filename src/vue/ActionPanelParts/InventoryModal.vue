<script setup>
import log from '../../log.js';
import { getAssetUrl } from '../../utils/resourceLoader.js';

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
});

const emit = defineEmits(['close', 'craft', 'drop']);

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
    icon: getAssetUrl(
      'resource/resonant_star_crystal/resonant_star_crystal.webp'
    ),
  },
  RefinedCopper: {
    name: '精炼铜锭',
    icon: getAssetUrl(
      'resource/refined_copper_ingot/refined_copper_ingot.webp'
    ),
  },
  SpiritalSpark: {
    name: '灵性火花',
    icon: getAssetUrl('resource/spiritual_spark.webp'),
  },
};

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

// 获取物品名称
function getItemName(item) {
  // MoonBit 枚举序列化为数组: ["Resource", "RefinedCopper"]
  if (Array.isArray(item.item_type) && item.item_type[0] === 'Resource') {
    const resourceType = item.item_type[1];
    return RESOURCE_META[resourceType]?.name || resourceType;
  } else if (
    Array.isArray(item.item_type) &&
    item.item_type[0] === 'Equipment'
  ) {
    return '装备';
  }
  return '未知物品';
}

// 获取物品图标
function getItemIcon(item) {
  // MoonBit 枚举序列化为数组: ["Resource", "RefinedCopper"]
  if (Array.isArray(item.item_type) && item.item_type[0] === 'Resource') {
    const resourceType = item.item_type[1];
    return RESOURCE_META[resourceType]?.icon || '';
  }
  return '';
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
                <div class="slot-count" v-if="inventoryItems[index].count > 1">
                  {{ inventoryItems[index].count }}
                </div>
                <div class="slot-tooltip">
                  <div class="tooltip-name">
                    {{ getItemName(inventoryItems[index]) }}
                  </div>
                  <button class="tooltip-drop" @click.stop="handleDrop(index)">
                    丢弃
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部快捷栏 -->
      <div class="hotbar-section">
        <div class="hotbar-grid">
          <div
            v-for="(item, index) in Math.min(9, inventoryItems.length)"
            :key="index"
            class="hotbar-slot"
          >
            <img
              v-if="getItemIcon(item)"
              :src="getItemIcon(item)"
              class="slot-icon"
            />
            <div class="slot-count" v-if="item.count > 1">{{ item.count }}</div>
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
  z-index: 6000;
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
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
}

.copper-name {
  color: #cd7f32;
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
  font-weight: bold;
  color: #fff;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
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
  color: #8b8b8b;
  text-align: center;
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
  color: #fff;
  border: 2px solid #8b8b8b;
  border-top-color: #555;
  border-left-color: #555;
  cursor: pointer;
  font-weight: bold;
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
  font-weight: bold;
  color: #fff;
  text-shadow:
    1px 1px 0 rgba(0, 0, 0, 0.8),
    -1px -1px 0 rgba(0, 0, 0, 0.8);
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
  color: #fff;
  margin-bottom: 4px;
}

.tooltip-drop {
  background: #8b1414;
  border: 1px solid #666;
  color: #fff;
  padding: 4px 8px;
  font-size: 10px;
  cursor: pointer;
  width: 100%;
}

.tooltip-drop:hover {
  background: #a41a1a;
}

/* 快捷栏 */
.hotbar-section {
  border-top: 4px solid #555;
  padding-top: 8px;
}

.hotbar-grid {
  display: grid;
  grid-template-columns: repeat(9, 36px);
  gap: 4px;
  justify-content: center;
}

.hotbar-slot {
  width: 36px;
  height: 36px;
  background: #8b7d6b;
  border: 2px solid #6b5d4a;
  border-right-color: #a0896b;
  border-bottom-color: #a0896b;
  position: relative;
  cursor: pointer;
}

.hotbar-slot:hover {
  background: #9d8771;
  transform: scale(1.1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
