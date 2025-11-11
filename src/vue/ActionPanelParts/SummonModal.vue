<script setup>
import { ref, computed } from 'vue';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import log from '../../log.js';

// 背景图片路径（CSS border-image 需要 url() 包裹）
const panel6Src = `url('${getAssetUrl('@assets/ui/panel6.png')}')`;

const props = defineProps({
  visible: { type: Boolean, default: false },
  copperName: { type: String, default: '共鸣者' },
  enemyList: { type: Array, default: () => [] },
  position: { type: Array, default: null }, // 召唤位置 [x, z]
});

const emit = defineEmits(['close', 'summon']);

const selectedEnemy = ref(null);

// 计算可用的敌人列表（根据等级排序）
const sortedEnemies = computed(() => {
  return [...props.enemyList].sort((a, b) => a.level - b.level);
});

function selectEnemy(enemy) {
  selectedEnemy.value = enemy;
}

function handleConfirm() {
  if (!selectedEnemy.value) {
    log('[SummonModal] 未选择敌人');
    return;
  }
  log('[SummonModal] 确认召唤:', selectedEnemy.value.name);
  emit('summon', selectedEnemy.value.name);
  handleClose();
}

function handleClose() {
  selectedEnemy.value = null;
  emit('close');
}

// 获取敌人类型的中文名称
function getEnemyTypeLabel(type) {
  const typeMap = {
    goblin: '拾荒者',
    cruiser: '巡游者',
    scout: '斥候',
    boxer: '拳手',
    horn: '号手',
    assassin: '刺客',
    devourer: '吞噬者',
    mirror: '编织者',
    guard: '守卫',
    demon: '机妖',
    variant: '畸变体',
    shatra: 'BOSS',
    glutton: 'BOSS',
  };
  return typeMap[type] || type;
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="summon-modal" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">🔮 选择召唤目标</h2>
          <button class="close-btn" @click="handleClose" title="关闭">✕</button>
        </div>

        <div class="modal-info">
          <p class="info-text">
            <span class="copper-name">{{ copperName }}</span> 正在施展召唤术
          </p>
          <p class="cost-text">
            <img
              class="cost-icon"
              :src="getAssetUrl('resource/spiritual_spark.png')"
              alt="心源火花"
            />
            消耗：<strong>1 个心源火花</strong>
          </p>
        </div>

        <div class="modal-body">
          <div class="enemy-list">
            <div
              v-for="enemy in sortedEnemies"
              :key="enemy.name"
              class="enemy-card"
              :class="{ selected: selectedEnemy?.name === enemy.name }"
              @click="selectEnemy(enemy)"
            >
              <div class="enemy-header">
                <div class="enemy-name-row">
                  <span class="enemy-name">{{ enemy.name }}</span>
                  <span class="enemy-level">Lv.{{ enemy.level }}</span>
                </div>
                <span class="enemy-type">{{
                  getEnemyTypeLabel(enemy.enemy_type)
                }}</span>
              </div>

              <div class="enemy-stats">
                <div class="stat">
                  <span class="stat-label">❤️</span>
                  <span class="stat-value">{{ enemy.health }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">⚔️</span>
                  <span class="stat-value">{{ enemy.attack }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">🛡️</span>
                  <span class="stat-value">{{ enemy.defense }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">📍</span>
                  <span class="stat-value">{{ enemy.attack_range }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">👟</span>
                  <span class="stat-value">{{ enemy.move_range }}</span>
                </div>
              </div>

              <div class="enemy-desc">{{ enemy.description }}</div>

              <div
                v-if="selectedEnemy?.name === enemy.name"
                class="selected-badge"
              >
                ✓ 已选择
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-cancel" @click="handleClose">取消</button>
          <button
            class="btn btn-confirm"
            :disabled="!selectedEnemy"
            @click="handleConfirm"
          >
            确认召唤
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

.summon-modal {
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-source: v-bind(panel6Src);
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
  border-bottom: 2px solid rgba(255, 200, 100, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #fff3ef;
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
  background: rgba(255, 215, 0, 0.05);
  border-bottom: 1px solid rgba(255, 200, 100, 0.1);
}

.info-text {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
}

.copper-name {
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
}

.cost-text {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cost-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.enemy-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.enemy-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 200, 100, 0.2);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.enemy-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 200, 100, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 200, 100, 0.2);
}

.enemy-card.selected {
  background: rgba(255, 215, 0, 0.15);
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.enemy-header {
  margin-bottom: 12px;
}

.enemy-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.enemy-name {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
}

.enemy-level {
  font-size: 14px;
  padding: 2px 8px;
  background: rgba(255, 100, 100, 0.3);
  border-radius: 8px;
  color: #6a4931;
  font-weight: 900;
  letter-spacing: 2px;
}

.enemy-type {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
}

.enemy-stats {
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
  letter-spacing: 2px;
}

.enemy-desc {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
  line-height: 1.5;
  margin-top: 8px;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.selected-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ffd700;
  color: #1a0f0a;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 2px solid rgba(255, 200, 100, 0.2);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  color: #fff3ef;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-confirm {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: #1a0f0a;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffed4e, #ffd700);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 215, 0, 0.6);
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
  background: rgba(255, 200, 100, 0.3);
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 200, 100, 0.5);
}
</style>
