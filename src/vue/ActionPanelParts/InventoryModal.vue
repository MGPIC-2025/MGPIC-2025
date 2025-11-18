<script setup>
import { computed } from 'vue';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import './InventoryModal.css';

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
                'has-item':
                  index < equipmentItems.length &&
                  equipmentItems[index]?.equipped,
                'slot-locked': equipmentItems[index]?.locked,
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
                  <span v-else class="equipment-icon">{{
                    equipmentItems[index]?.icon || '＋'
                  }}</span>
                </div>
                <!-- 装备名称提示 -->
                <div class="slot-tooltip">
                  <div class="tooltip-name">
                    {{
                      equipmentItems[index]?.name ||
                      (equipmentItems[index]?.locked ? '未解锁' : '空槽')
                    }}
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
