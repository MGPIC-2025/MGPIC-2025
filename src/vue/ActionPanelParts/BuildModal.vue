<script setup>
import { ref, computed } from 'vue';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import { getItemName, RESOURCE_META } from '../../utils/resourceMeta.js';
import log from '../../log.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  copperName: { type: String, default: '工匠' },
  structureList: { type: Array, default: () => [] },
  position: { type: Array, default: null }, // 建造位置 [x, z]
});

const emit = defineEmits(['close', 'build']);

const selectedStructure = ref(null);

// 计算可用的建筑列表
const sortedStructures = computed(() => {
  return [...props.structureList].sort((a, b) => {
    // 按成本排序，处理后端格式: { cost: [["RefinedCopper", 10], ...] }
    const getCost = item => {
      const costArray = item.cost?.cost || item.cost;
      if (!Array.isArray(costArray) || costArray.length === 0) return 0;
      // 取第一个资源的数量作为排序依据
      return Array.isArray(costArray[0]) ? costArray[0][1] : costArray[0].count;
    };
    return getCost(a) - getCost(b);
  });
});

function selectStructure(structure) {
  selectedStructure.value = structure;
}

function handleConfirm() {
  if (!selectedStructure.value) {
    log('[BuildModal] 未选择建筑');
    return;
  }
  log('[BuildModal] 确认建造:', selectedStructure.value.name);
  emit('build', selectedStructure.value.name);
  handleClose();
}

function handleClose() {
  selectedStructure.value = null;
  emit('close');
}

// 获取建筑类型的中文描述
function getStructureTypeLabel(name) {
  const typeMap = {
    心源矿钻: '资源采集',
    矿车: '资源运输',
    炮塔: '防御建筑',
    充能线圈: '能量建筑',
  };
  return typeMap[name] || '建筑';
}

// 格式化资源成本
function formatCost(costData) {
  if (!costData) return '无消耗';

  // 处理后端的格式: { cost: [["RefinedCopper", 10], ...] }
  const costArray = costData.cost || costData;
  if (!Array.isArray(costArray) || costArray.length === 0) return '无消耗';

  return costArray
    .map(item => {
      // 如果是数组格式 ["RefinedCopper", 10]
      if (Array.isArray(item)) {
        const resourceType = item[0];
        const count = item[1];
        // 直接从 RESOURCE_META 获取中文名
        const resourceName = RESOURCE_META[resourceType]?.name || resourceType;
        return `${resourceName} x${count}`;
      }
      // 如果是对象格式 { item_type: "RefinedCopper", count: 10 }
      return `${getItemName(item)} x${item.count}`;
    })
    .join(', ');
}

// 背景图片路径（CSS border-image 需要 url() 包裹）
const panel11Src = `url('/assets/panel11.png')`;
const panel7Src = `url('/assets/panel7.png')`;
const panel8Src = `url('/assets/panel8.png')`;
const panel5Src = `url('/assets/panel5.png')`;
const panel12Src = `url('/assets/panel12.png')`;
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="build-modal" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">🔨 选择建造目标</h2>
          <button class="close-btn" @click="handleClose" title="关闭">✕</button>
        </div>

        <div class="modal-info">
          <p class="info-text">
            <span class="copper-name">{{ copperName }}</span> 准备建造建筑
          </p>
          <p class="tip-text">
            💡 提示：心源矿钻只能建在矿物上，其他建筑建在空地上
          </p>
        </div>

        <div class="modal-body">
          <div class="structure-list">
            <div
              v-for="structure in sortedStructures"
              :key="structure.name"
              class="structure-card"
              :class="{ selected: selectedStructure?.name === structure.name }"
              @click="selectStructure(structure)"
            >
              <div class="structure-header">
                <div class="structure-name-row">
                  <span class="structure-name">{{ structure.name }}</span>
                </div>
                <span class="structure-type">{{
                  getStructureTypeLabel(structure.name)
                }}</span>
              </div>

              <div class="structure-stats">
                <div class="stat">
                  <span class="stat-label">❤️</span>
                  <span class="stat-value">{{ structure.health }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">⚔️</span>
                  <span class="stat-value">{{
                    structure.attribute?.attack || '无'
                  }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">📦</span>
                  <span class="stat-value">{{
                    structure.has_storage ? '有' : '无'
                  }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">📍</span>
                  <span class="stat-value">{{
                    structure.attack_range || '无'
                  }}</span>
                </div>
              </div>

              <div class="structure-cost">
                <span class="cost-label">💰 成本：</span>
                <span class="cost-value">{{ formatCost(structure.cost) }}</span>
              </div>

              <div class="structure-desc">{{ structure.description }}</div>

              <div
                v-if="selectedStructure?.name === structure.name"
                class="selected-badge"
              >
                ✓
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-cancel" @click="handleClose">取消</button>
          <button
            class="btn btn-confirm"
            :disabled="!selectedStructure"
            @click="handleConfirm"
          >
            确认建造
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.build-modal {
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-source: v-bind(panel11Src);
  border-image-slice: 8 fill;
  border-image-width: 12px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  width: min(900px, 95vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 2px solid rgba(100, 200, 100, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  color: #fff3ef;
  letter-spacing: 2px;
  text-shadow: 0 2px 0 rgba(120, 0, 0, 0.35);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
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

.modal-info {
  padding: 16px 24px;
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-source: v-bind(panel5Src);
  border-image-slice: 8 fill;
  border-image-width: 12px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  width: fit-content;
  max-width: 80%;
  margin: 0 auto;
}

.info-text {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
}

.copper-name {
  font-weight: 900;
  color: #fff3ef;
  letter-spacing: 2px;
  text-shadow: 0 2px 0 rgba(120, 0, 0, 0.35);
}

.tip-text {
  margin: 0;
  font-size: 12px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 1px;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.structure-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.structure-card {
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-source: v-bind(panel8Src);
  border-image-slice: 8 fill;
  border-image-width: 12px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.structure-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(100, 200, 100, 0.2);
}

.structure-card.selected {
  border-image-source: v-bind(panel7Src);
  box-shadow: 0 0 20px rgba(144, 238, 144, 0.3);
}

.structure-header {
  margin-bottom: 12px;
}

.structure-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.structure-name {
  font-size: 18px;
  font-weight: 900;
  color: #fff3ef;
  letter-spacing: 2px;
  text-shadow: 0 2px 0 rgba(120, 0, 0, 0.35);
}

.structure-type {
  font-size: 12px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
}

.structure-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.stat-label {
  font-size: 16px;
}

.stat-value {
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 1px;
}

.structure-cost {
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
}

.cost-label {
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
}

.cost-value {
  color: #1a0f00;
  font-weight: 900;
  letter-spacing: 1px;
  margin-left: 4px;
}

.structure-desc {
  font-size: 12px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1.5;
  margin-top: 8px;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.selected-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-source: v-bind(panel12Src);
  border-image-slice: 8 fill;
  border-image-width: 12px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  color: #1a0f00;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 2px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 2px solid rgba(100, 200, 100, 0.2);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #fff3ef;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-shadow: 0 2px 0 rgba(120, 0, 0, 0.35);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-confirm {
  background: linear-gradient(135deg, #90ee90, #60d060);
  color: #1a0f00;
  box-shadow: 0 4px 12px rgba(144, 238, 144, 0.4);
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #a0ffa0, #90ee90);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(144, 238, 144, 0.6);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(100, 200, 100, 0.3);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 200, 100, 0.5);
}
</style>
