<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  RESOURCE_META,
  getItemIcon,
  getItemName,
  getResourceName,
} from '../../utils/resourceMeta.js';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import { get_resource } from '../../glue.js';
import { onEvent, offEvent, EventTypes } from '../../utils/eventBus.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  copperName: {
    type: String,
    default: '未知铜偶',
  },
  equipment: {
    type: Array,
    default: () => [],
  },
});

// 后端资源数据（和 ResourcePanel 一样的后端绑定方式）
const resources = ref({
  SpiritalSpark: 0,
  RecallGear: 0,
  ResonantCrystal: 0,
  RefinedCopper: 0,
  HeartCrystalDust: 0,
});

// 获取资源数据（和 ResourcePanel 一样的后端绑定方式）
async function updateResources() {
  try {
    const resourceData = await get_resource();
    if (resourceData) {
      Object.keys(resources.value).forEach(key => {
        resources.value[key] = resourceData[key] || 0;
      });
    }
  } catch (error) {
    console.error('[InventoryModal] 获取资源失败:', error);
  }
}

// 装备数据（从 props 获取）
const equipmentItems = computed(() => {
  return props.equipment || [];
});

// 初始化时加载一次
onMounted(() => {
  updateResources();
  
  // 监听资源更新事件（和 ResourcePanel 一样的后端绑定方式）
  onEvent(EventTypes.UPDATE_RESOURCES, updateResources);
});

// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  offEvent(EventTypes.UPDATE_RESOURCES, updateResources);
});

const emit = defineEmits(['close', 'craft']);

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
</script>

<template>
  <!-- 资源弹窗 -->
  <div v-if="visible" class="inventory-modal" @click.self="close">
    <div class="minecraft-inventory">
      <div class="inventory-header-mc">
        <h3>全局资源</h3>
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
              <div class="craft-count">
                {{ resources[itemType] || 0 }}
              </div>
              <!-- 资源名称提示 -->
              <div class="craft-tooltip">
                {{ getResourceName(itemType) }}
              </div>
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
              <div class="craft-count">
                {{ resources.SpiritalSpark || 0 }}
              </div>
            </div>
            <!-- 资源名称提示（移到 craft-result 层级以避免被 overflow 裁剪） -->
            <div class="craft-tooltip">
              {{ getResourceName('SpiritalSpark') }}
            </div>
          </div>
          <button class="craft-button-mc" @click="handleCraft">合成</button>
        </div>

        <!-- 装备区域 -->
        <div class="inventory-section">
          <div class="equipment-header-mc">
            <h4>
              <span class="copper-name">{{ copperName }}</span> 的装备
            </h4>
          </div>
          <div class="inventory-grid">
            <!-- 2个格子 -->
            <div
              v-for="(item, index) in 2"
              :key="index"
              class="inv-slot"
              :class="{ 
                'has-item': index < equipmentItems.length && equipmentItems[index]?.equipped,
                'slot-locked': equipmentItems[index]?.locked
              }"
            >
              <template v-if="index < equipmentItems.length">
                <div class="slot-icon">
                  <!-- 已装备且有图标（URL路径） -->
                  <img
                    v-if="
                      equipmentItems[index]?.equipped &&
                      equipmentItems[index]?.icon &&
                      equipmentItems[index].icon !== '＋' &&
                      (equipmentItems[index].icon.startsWith('/') ||
                        equipmentItems[index].icon.startsWith('http') ||
                        equipmentItems[index].icon.includes('.'))
                    "
                    :src="equipmentItems[index].icon"
                    :alt="equipmentItems[index]?.name || '装备'"
                    class="equipment-icon"
                  />
                  <!-- 锁定状态 -->
                  <img
                    v-else-if="equipmentItems[index]?.locked"
                    src="/assets/lock.png"
                    alt="未解锁"
                    class="equipment-icon"
                  />
                  <!-- 空槽（加号图标） -->
                  <img
                    v-else-if="equipmentItems[index]?.icon === '＋'"
                    src="/assets/jia.png"
                    alt="空槽"
                    class="equipment-icon"
                  />
                  <!-- 其他情况显示文本图标 -->
                  <span v-else class="equipment-icon">{{ equipmentItems[index]?.icon || '＋' }}</span>
                </div>
                <!-- 装备名称提示 -->
                <div class="slot-tooltip">
                  <div class="tooltip-name">
                    {{ equipmentItems[index]?.name || (equipmentItems[index]?.locked ? '未解锁' : '空槽') }}
                  </div>
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
/* Minecraft 风格资源弹窗 */
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
  flex: 1;
  text-align: center;
  padding-left: 28px; /* 向右移动，与关闭按钮宽度对齐 */
}

.copper-name {
  color: #fff;
}

.equipment-header-mc {
  margin-bottom: 12px;
  text-align: center;
}

.equipment-header-mc h4 {
  margin: 0;
  font-size: 18px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
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
  transition: transform 0.2s ease, filter 0.2s ease;
}

.craft-slot:hover .craft-icon {
  transform: scale(1.1) rotate(5deg);
  filter: brightness(1.2);
}

.craft-count {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #4488ff;
  pointer-events: none;
  z-index: 2;
}

.craft-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #100010;
  border: 2px solid #555;
  padding: 6px 10px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 10;
  font-size: 12px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 1px;
}

.craft-slot:hover .craft-tooltip,
.craft-result:hover .craft-tooltip,
.recipe-display:hover .craft-tooltip {
  opacity: 1;
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
  overflow: visible;
  position: relative;
}

.recipe-display {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.recipe-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.craft-result:hover .recipe-icon {
  transform: scale(1.1) rotate(-5deg);
  filter: brightness(1.2);
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

/* 资源区域 */
.inventory-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(2, 40px);
  gap: 4px;
  justify-content: center;
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

.inv-slot.slot-locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.slot-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
}

.slot-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.equipment-icon {
  font-size: 28px;
}

.inv-slot img.equipment-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
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
