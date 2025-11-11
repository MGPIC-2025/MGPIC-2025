<script setup>
import { computed } from 'vue';
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
  equipment: {
    type: Array,
    default: () => [],
  },
});

// 装备数据（从 props 获取）
const equipmentItems = computed(() => {
  return props.equipment || [];
});

const emit = defineEmits(['close']);

function close() {
  emit('close');
}
</script>

<template>
  <!-- 资源弹窗 -->
  <div v-if="visible" class="inventory-modal" @click.self="close">
    <div class="minecraft-inventory">
      

      <div class="inventory-layout">
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
                    :src="getAssetUrl('@assets/ui/lock.png')"
                    alt="未解锁"
                    class="equipment-icon"
                  />
                  <!-- 空槽（加号图标） -->
                  <img
                    v-else-if="equipmentItems[index]?.icon === '＋'"
                    :src="getAssetUrl('@assets/ui/jia.png')"
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

/* 布局 */
.inventory-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 16px;
  place-items: center; /* 水平垂直居中单列项 */
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
