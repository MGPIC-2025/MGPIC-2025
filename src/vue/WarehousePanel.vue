<script setup>
import { ref } from 'vue'
import { getAssetUrl } from '../utils/resourceLoader.js'

// 铜偶仓库：资源与铜偶数据（响应式）
const resources = ref([
  { icon: getAssetUrl('img/warehouse/goods/2ec8cf838cb33e421005058d17ff555b82cebf83.webp'), name: '蓝晶', value: 88 },
  { icon: getAssetUrl('img/warehouse/goods/04681f25cc1debaf94214a7e09f44efbc7eb2963.webp'), name: '木箱', value: 88 },
  { icon: getAssetUrl('img/warehouse/goods/1331f319af1e23fc301b7253ca5dca71e9c19e0f.webp'), name: '紫球', value: 88 },
  { icon: getAssetUrl('img/warehouse/goods/ea74bce606c59ac4ab84ab117375c0de813cea49.webp'), name: '蓝片', value: 88 }
])

// 铜偶列表（响应式）
const puppets = ref([
  { 
    id: 1, 
    name: '阿磐01', 
    level: 1, 
    image: getAssetUrl('img/warehouse/character/a93e15a01fcbf3cfb088956aedc63e86b94d4019.webp'), 
    quantity: 1,
    description: '阿磐01是皇宫的守卫，在"大沉睡"事件中，他坚守岗位，保护着皇宫的安全。现在，他将继续履行自己的职责，守护着这片土地。',
    stats: {
      level: '1/5',
      attack: { base: 10, bonus: 5 },
      defense: { base: 10, bonus: 5 },
      dodge: { base: 10, bonus: 2 },
      class: '铁壁'
    },
    equipment: [
      { name: '钢盾', icon: getAssetUrl('img/warehouse/equip/3579e09f8cf4063c7d94f9f1d1a6db6fe746923f.webp'), equipped: true },
      { name: '空槽', icon: '🔒', equipped: false }
    ],
    skill: {
      name: '钢盾',
      cooldown: '10回合',
      effect: '保护相邻8格的单位2回合不受伤害(自己增加属性50%的防御力但仍会受到伤害)',
      icon: getAssetUrl('img/warehouse/skill/9ae9fd092931138c37c47a30f463011e7f4301d8.webp')
    },
    upgradeCost: 10
  },
  { 
    id: 2, 
    name: '卫斯理01', 
    level: 1, 
    image: getAssetUrl('img/warehouse/character/b2207275b74545d9fae68b985b2998de3672e0af.webp'), 
    quantity: 1,
    description: '卫斯理01最初是皇宫厨房的助手，在"大沉睡"事件中，他的高性能合金锅和出现在前线的原因至今仍是个谜。现在，他将继续为团队提供支持。',
    stats: {
      level: '1/5',
      attack: { base: 10, bonus: 5 },
      defense: { base: 10, bonus: 5 },
      dodge: { base: 10, bonus: 2 },
      class: '铁壁'
    },
    equipment: [
      { name: '合金锅', icon: getAssetUrl('img/warehouse/equip/3579e09f8cf4063c7d94f9f1d1a6db6fe746923f.webp'), equipped: true },
      { name: '空槽', icon: '🔒', equipped: false }
    ],
    skill: {
      name: '锅炉过热',
      cooldown: '10回合',
      effect: '自己受到最大生命值20%的伤害,对周围的敌人都造成无视防御力、无法被闪避的、数值为自己最大生命值15%的伤害。',
      icon: getAssetUrl('img/warehouse/skill/7b7cb41dbb1b9dae0bc4e7d030386f6d7d2e7da0.webp')
    },
    upgradeCost: 10
  }
])

const selectedPuppet = ref(null)
function selectPuppet(puppet) { selectedPuppet.value = puppet }

// 抽卡界面开关（全屏界面）
const showDrawScreen = ref(false)
function drawMore() { showDrawScreen.value = true }
function closeDrawScreen() { showDrawScreen.value = false }

// 抽卡结果
const drawResult = ref(null)
function closeDrawResult() { drawResult.value = null }

// 扣除第4个资源（蓝片）10点，随机获得一个铜偶并+1数量
function drawTen() {
  const costIndex = 3
  const store = resources.value
  if (!store[costIndex] || store[costIndex].value < 10) {
    alert('资源不足')
    return
  }
  store[costIndex].value -= 10

  const list = puppets.value
  const idx = Math.floor(Math.random() * list.length)
  const got = list[idx]
  got.quantity = (got.quantity || 0) + 1
  selectedPuppet.value = got
  drawResult.value = { name: got.name, image: got.image }
}
</script>

<template>
  <div class="warehouse">
    <!-- 顶部资源栏 -->
    <div class="warehouse__resources">
      <div class="resource-item" v-for="resource in resources" :key="resource.name">
        <div class="resource-icon">
          <img :src="resource.icon" :alt="resource.name" />
        </div>
        <div class="resource-value">{{ resource.value }}</div>
      </div>
    </div>
    
    <!-- 主内容区（两种视图：仓库/抽卡） -->
    <div v-if="!showDrawScreen" class="warehouse__main">
      <!-- 左侧铜偶列表 -->
      <div class="warehouse__sidebar">
        <div class="warehouse__title">铜偶仓库</div>
        <div class="puppet-list">
          <div class="puppet-card" v-for="puppet in puppets" :key="puppet.id" 
               :class="{ 'puppet-card--selected': selectedPuppet?.id === puppet.id }"
               @click="selectPuppet(puppet)">
            <div class="puppet-card__quantity">{{ puppet.quantity }}</div>
            <div class="puppet-card__image">
              <img :src="puppet.image" :alt="puppet.name" />
            </div>
            <div class="puppet-card__info">
              <div class="puppet-card__name">{{ puppet.name }}</div>
              <div class="puppet-card__level">{{ puppet.level }}级</div>
            </div>
          </div>
          
          <!-- 抽取更多按钮 -->
          <div class="puppet-card puppet-card--add" @click="drawMore">
            <div class="puppet-card__add-icon">+</div>
            <div class="puppet-card__add-text">抽取更多</div>
          </div>
        </div>
      </div>

      <!-- 右侧详情面板 -->
      <div class="warehouse__detail">
        <div v-if="selectedPuppet" class="puppet-detail">
          <div class="puppet-detail__header">
            <h2 class="puppet-detail__name">{{ selectedPuppet.name }}</h2>
          </div>
          
          <div class="puppet-detail__content">
            <!-- 第一行：模型展示 + 描述 -->
            <div class="puppet-detail__row">
              <!-- 模型展示区域 -->
              <div class="puppet-detail__model">
                <div class="model-placeholder">为模型展示预留</div>
              </div>
              
              <!-- 描述区域 -->
              <div class="puppet-detail__description">
                {{ selectedPuppet.description }}
              </div>
            </div>
            
            <!-- 第二行：属性 + 装备 -->
            <div class="puppet-detail__row">
              <!-- 属性面板 -->
              <div class="puppet-detail__stats">
                <div class="stats-section">
                  <div class="stat-item">
                    <span class="stat-label">等级:</span>
                    <span class="stat-value">{{ selectedPuppet.stats.level }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">攻击力:</span>
                    <span class="stat-value">{{ selectedPuppet.stats.attack.base }} <span class="stat-bonus">(+{{ selectedPuppet.stats.attack.bonus }})</span></span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">防御力:</span>
                    <span class="stat-value">{{ selectedPuppet.stats.defense.base }} <span class="stat-bonus">(+{{ selectedPuppet.stats.defense.bonus }})</span></span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">闪避:</span>
                    <span class="stat-value">{{ selectedPuppet.stats.dodge.base }}% <span class="stat-bonus">(+{{ selectedPuppet.stats.dodge.bonus }}%)</span></span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">职业:</span>
                    <span class="stat-value">{{ selectedPuppet.stats.class }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 装备区域 -->
              <div class="equipment-section">
                <h4 class="section-title">装备</h4>
                <div class="equipment-slots">
                  <div v-for="(item, index) in selectedPuppet.equipment" :key="index" class="equipment-slot" :class="{ 'equipment-slot--empty': !item.equipped }">
                    <img v-if="item.equipped && item.icon.startsWith('/')" :src="item.icon" :alt="item.name" class="equipment-icon" />
                    <span v-else class="equipment-icon">{{ item.icon }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 第三行：技能 -->
            <div class="skill-section">
              <h4 class="section-title">技能</h4>
              <div class="skill-info">
                <div class="skill-name">{{ selectedPuppet.skill.name }}</div>
                <div class="skill-cooldown">冷却: {{ selectedPuppet.skill.cooldown }}</div>
                <div class="skill-effect">{{ selectedPuppet.skill.effect }}</div>
                <div class="skill-icon">
                  <img v-if="selectedPuppet.skill.icon && selectedPuppet.skill.icon.startsWith('/')" :src="selectedPuppet.skill.icon" :alt="selectedPuppet.skill.name" class="skill-icon-img" />
                  <span v-else>{{ selectedPuppet.skill.icon }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 升级按钮 -->
          <div class="puppet-detail__upgrade">
            <div class="upgrade-cost">
              <img class="cost-icon-img" :src="getAssetUrl('img/warehouse/goods/ea74bce606c59ac4ab84ab117375c0de813cea49.webp')" alt="cost" />
              <span class="cost-amount">X {{ selectedPuppet.upgradeCost }}</span>
            </div>
            <button class="upgrade-btn">
              <span class="upgrade-icon">⏫</span>
            </button>
          </div>
        </div>
        <div v-else class="warehouse__placeholder">
          <p>请选择英雄以浏览</p>
        </div>
      </div>
    </div>

    <!-- 抽卡全屏界面（保留顶部资源栏） -->
    <div v-if="showDrawScreen" class="draw-screen">
      <div class="draw-screen__body">
        <div class="draw-card">
          <img class="draw-card__img" :src="getAssetUrl('img/warehouse/goods/04681f25cc1debaf94214a7e09f44efbc7eb2963.webp')" alt="card" />
        </div>
        <div class="draw-cost">
          <img class="draw-cost__icon" :src="getAssetUrl('img/warehouse/goods/ea74bce606c59ac4ab84ab117375c0de813cea49.webp')" alt="cost" />
          <span class="draw-cost__times">X 10</span>
        </div>
        <button class="draw-action" @click="drawTen">抽取卡牌</button>
      </div>
    </div>

  </div>

  <!-- 抽卡结果提示 -->
  <div v-if="drawResult" class="draw-result" @click="closeDrawResult">
    <div class="draw-result__panel">
      <div class="draw-result__img-wrap">
        <img :src="drawResult.image" :alt="drawResult.name" />
      </div>
      <div class="draw-result__name">{{ drawResult.name }}</div>
      <div class="draw-result__hint">点击任意位置关闭</div>
    </div>
  </div>
  
</template>

<style scoped>
/* Warehouse panel */
.warehouse { position: absolute; inset: 0; background: #a7a7a7; color: #fff; display: flex; flex-direction: column; }

/* 顶部资源栏 */
.warehouse__resources { height: 80px; background: #a7a7a7; display: flex; align-items: center; gap: 32px; padding: 0 40px; margin-left: 120px; margin-top: 20px; }
.resource-item { display: flex; align-items: center; gap: 16px; background: #3a2519; padding: 16px 24px; border-radius: 12px; min-width: 160px; }
.resource-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; }
.resource-icon img { width: 130%; height: 130%; object-fit: contain; }
.resource-value { font-size: 24px; font-weight: 700; color: #fff; }

/* 主内容区 */
.warehouse__main { flex: 1; display: flex; margin-top: 20px; }

/* 左侧铜偶列表 */
.warehouse__sidebar { width: 70%; background: #3a2519; padding: 20px; overflow-y: auto; }
.warehouse__title { font-size: 24px; font-weight: 900; margin-bottom: 20px; color: #fff; }
.puppet-list { display: flex; flex-wrap: wrap; gap: 20px; }

.puppet-card { position: relative; background: #4b2e1f; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.2s ease; width: 200px; height: 200px; display: flex; flex-direction: column; }
.puppet-card:hover { background: #5a3525; }
.puppet-card--selected { background: #6a3f2f; border: 2px solid #f59e0b; }
.puppet-card--add { background: #3a2519; border: 2px dashed #666; display: flex; flex-direction: column; align-items: center; justify-content: center; }

.puppet-card__quantity { position: absolute; top: 8px; left: 8px; width: 24px; height: 24px; background: #2b1a11; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; }
.puppet-card__image { height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.puppet-card__image img { max-width: 100%; max-height: 100%; object-fit: contain; }
.puppet-card__info { text-align: center; }
.puppet-card__name { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #fff; }
.puppet-card__level { font-size: 14px; color: #ccc; }

.puppet-card__add-icon { font-size: 48px; color: #999; margin-bottom: 8px; }
.puppet-card__add-text { font-size: 16px; color: #999; }

/* 右侧详情面板 */
.warehouse__detail { width: 30%; background: #3a2519; margin: 20px; border-radius: 12px; display: flex; flex-direction: column; overflow-y: auto; max-height: calc(100vh - 140px); }
.warehouse__placeholder { text-align: center; color: #ccc; font-size: 18px; padding: 40px; }

.puppet-detail { padding: 20px; color: #fff; min-height: 100%; display: flex; flex-direction: column; }
.puppet-detail__header { margin-bottom: 20px; }
.puppet-detail__name { font-size: 28px; font-weight: 900; color: #fff; margin: 0; }

.puppet-detail__content { flex: 1; display: flex; flex-direction: column; gap: 20px; }
.puppet-detail__row { display: flex; gap: 20px; }
.puppet-detail__model { background: #4b2e1f; border-radius: 8px; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.model-placeholder { color: #999; font-size: 16px; }

.puppet-detail__description { flex: 1; color: #ccc; font-size: 14px; line-height: 1.6; }

.puppet-detail__stats { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.stats-section { display: flex; flex-direction: column; gap: 8px; }
.stat-item { display: flex; justify-content: space-between; align-items: center; }
.stat-label { color: #ccc; font-size: 14px; }
.stat-value { color: #fff; font-weight: 600; }
.stat-bonus { color: #4ade80; font-size: 12px; }

.equipment-section { flex: 1; }
.section-title { color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 12px; }
.equipment-slots { display: flex; gap: 8px; }
.equipment-slot { width: 40px; height: 40px; background: #4b2e1f; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.equipment-slot--empty { background: #2b1a11; border: 1px solid #666; }
.equipment-icon { font-size: 20px; }
/* 让装备图片严格限制在槽位内，避免溢出 */
.equipment-slot img { width: 100%; height: 100%; object-fit: contain; display: block; }

.skill-info { background: #4b2e1f; padding: 12px; border-radius: 8px; }
.skill-name { color: #fff; font-weight: 700; font-size: 16px; margin-bottom: 4px; }
.skill-cooldown { color: #ccc; font-size: 12px; margin-bottom: 8px; }
.skill-effect { color: #ccc; font-size: 12px; line-height: 1.4; margin-bottom: 8px; }
.skill-icon { font-size: 24px; text-align: right; }
.skill-icon-img { width: 48px; height: 48px; object-fit: contain; display: inline-block; }

.puppet-detail__upgrade { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 20px; }
.upgrade-cost { display: flex; align-items: center; gap: 8px; color: #fbbf24; font-weight: 600; }
.cost-icon { font-size: 18px; }
.cost-icon-img { width: 20px; height: 20px; object-fit: contain; display: inline-block; }
.upgrade-btn { width: 50px; height: 50px; background: #4b2e1f; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.upgrade-btn:hover { background: #5a3525; }
.upgrade-icon { font-size: 20px; color: #fff; }

/* 抽卡全屏界面 */
.draw-screen { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 8px; }
.draw-screen__header { display: none; }
.draw-back { display: none; }
.draw-screen__body { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.draw-card { width: 520px; height: 520px; display: flex; align-items: center; justify-content: center; }
.draw-card__img { width: 100%; height: 100%; object-fit: contain; }
.draw-cost { display: flex; align-items: center; gap: 8px; }
.draw-cost__icon { width: 48px; height: 48px; object-fit: contain; }
.draw-cost__times { color: #fff; font-size: 22px; font-weight: 700; }
.draw-action { margin-top: 6px; background: #3a2519; color: #fff; border: none; border-radius: 16px; padding: 12px 44px; font-size: 26px; cursor: pointer; }
.draw-action:hover { background: #5a3525; }

/* 抽卡结果 */
.draw-result { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); z-index: 1100; }
.draw-result__panel { background: #3a2519; color: #fff; padding: 20px 28px; border-radius: 12px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
.draw-result__img-wrap { width: 200px; height: 200px; margin: 0 auto 12px; }
.draw-result__img-wrap img { width: 100%; height: 100%; object-fit: contain; }
.draw-result__name { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.draw-result__hint { color: #ccc; font-size: 12px; }
</style>
