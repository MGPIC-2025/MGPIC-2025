<script setup>
import { ref, onMounted, defineExpose, nextTick } from "vue";
import { getAssetUrl } from "../utils/resourceLoader.js";
import DrawScreen from "./DrawScreen.vue";
import PuppetModelView from "./PuppetModelView.vue";
import {
  get_resource,
  get_copper_list,
  upgrade_copper,
  info_subscribe,
} from "../glue.js";

// 统一的资源键顺序与元信息
const ORDERED_RESOURCE_KEYS = [
  "SpiritalSpark",
  "RecallGear",
  "ResonantCrystal",
  "RefinedCopper",
  "HeartCrystalDust",
];

const RESOURCE_META = {
  SpiritalSpark: {
    name: "灵性火花",
    icon: getAssetUrl("resource/spiritual_spark.webp"),
  },
  RecallGear: {
    name: "回响齿轮",
    icon: getAssetUrl("resource/recall_gear.webp"),
  },
  ResonantCrystal: {
    name: "共鸣星晶",
    icon: getAssetUrl(
      "resource/resonant_star_crystal/resonant_star_crystal.webp"
    ),
  },
  RefinedCopper: {
    name: "精炼铜锭",
    icon: getAssetUrl(
      "resource/refined_copper_ingot/refined_copper_ingot.webp"
    ),
  },
  HeartCrystalDust: {
    name: "心晶尘",
    icon: getAssetUrl("resource/heart_crystal_dust.webp"),
  },
};

function mapResources(plain) {
  return ORDERED_RESOURCE_KEYS.map((k) => ({
    icon: RESOURCE_META[k].icon,
    name: RESOURCE_META[k].name,
    value: Number(plain?.[k] ?? 0),
  }));
}

// 职业映射（统一处）
const TYPE_MAP = {
  IronWall: "铁壁",
  Arcanist: "奥术",
  CraftsMan: "工匠",
  Mechanic: "机械",
  Resonator: "共振",
};

// 升级消耗统一计算
function getUpgradeCostByLevel(level) {
  const lv = Number(level ?? 1);
  if (lv === 1) return 5;
  if (lv === 2) return 10;
  if (lv === 3) return 20;
  if (lv === 4) return 30;
  return 0;
}

// 将后端铜偶数组映射为前端展示模型
function mapPuppets(arr) {
  return (arr || []).map((copper, idx) => {
    const info = copper?.copper_info || {};
    const skill = info?.skill || {};
    const equipmentSlot = copper?.equipment_slot || {};
    const slot1 = equipmentSlot?.slot1 || null;
    const slot2 = equipmentSlot?.slot2 || null;
    const attr = copper?.attribute || {};
    const equipAttr1 = slot1?.equipment_base?.attribute || {};
    const equipAttr2 = slot2?.equipment_base?.attribute || {};
    const bonusAttack =
      Number(equipAttr1.attack || 0) + Number(equipAttr2.attack || 0);
    const bonusDefense =
      Number(equipAttr1.defense || 0) + Number(equipAttr2.defense || 0);
    const bonusDodge =
      Number(equipAttr1.dodge || 0) + Number(equipAttr2.dodge || 0);
    const typeName = copper?.copper_type;
    const levelNum = copper?.level ?? 1;
    
    const modelUrlRaw = info?.model_url || "";
    const modelUrl = modelUrlRaw ? getAssetUrl(modelUrlRaw) : "";
    console.log(`[Warehouse] Copper ${info?.name || idx + 1}: model_url=${modelUrlRaw}, processed=${modelUrl}`);
    
    return {
      id: Number(copper?.id ?? idx + 1),
      name: info?.name ?? "未知铜偶",
      level: levelNum,
      suffix: copper?.suffix ?? 0,
      image: getAssetUrl(info?.icon_url || ""),
      modelUrl: modelUrl,
      quantity: 1,
      description: info?.description || "",
      stats: {
        level: `${levelNum}/5`,
        health: Number(attr.health || 0),
        live_left: Number(copper?.live_left ?? 0),
        attack: { base: Number(attr.attack || 0), bonus: bonusAttack },
        defense: { base: Number(attr.defense || 0), bonus: bonusDefense },
        dodge: { base: Number(attr.dodge || 0), bonus: bonusDodge },
        class: TYPE_MAP[typeName] || "未知",
      },
      equipment: [
        slot1
          ? {
              name: slot1.equipment_base?.name || "装备",
              icon: getAssetUrl(slot1.equipment_base?.resource_url || ""),
              equipped: true,
              locked: false,
            }
          : { name: "空槽", icon: "＋", equipped: false, locked: false },
        equipmentSlot?.is_slot2_locked
          ? { name: "未解锁", icon: "🔒", equipped: false, locked: true }
          : slot2
          ? {
              name: slot2.equipment_base?.name || "装备",
              icon: getAssetUrl(slot2.equipment_base?.resource_url || ""),
              equipped: true,
              locked: false,
            }
          : { name: "空槽", icon: "＋", equipped: false, locked: false },
      ],
      skill: {
        name: skill?.name || "——",
        cooldown: skill?.cool_down != null ? `${skill.cool_down}回合` : "——",
        effect: skill?.description || "——",
        icon: getAssetUrl(skill?.resource_url || ""),
      },
      upgradeCost: getUpgradeCostByLevel(levelNum),
    };
  });
}

function findKeyPath(root, targetKey, path = []) {
  if (!root || typeof root !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(root, targetKey))
    return [...path, targetKey];
  if (Array.isArray(root)) {
    for (let i = 0; i < root.length; i++) {
      const p = findKeyPath(root[i], targetKey, [...path, i]);
      if (p) return p;
    }
    return null;
  }
  for (const k of Object.keys(root)) {
    const p = findKeyPath(root[k], targetKey, [...path, k]);
    if (p) return p;
  }
  return null;
}

function getByPath(root, path) {
  return path.reduce((acc, key) => (acc != null ? acc[key] : undefined), root);
}

const resources = ref([]);

onMounted(async () => {
  try {
    const plain = await get_resource();
    resources.value = mapResources(plain);
  } catch (_) {
    resources.value = mapResources({});
  }
});

// 订阅后端广播信息（如升级错误等）
function handleGlobalInfo(raw) {
  let msg = raw;
  if (typeof raw === "string") {
    try {
      msg = JSON.parse(raw);
    } catch (_) {}
  }
  if (msg && msg.type_msg) {
    if (msg.type_msg === "upgrade_cost_error") {
      alert(msg.content || "升级等级错误");
    } else {
      console.log("[GlobalInfo]", msg);
    }
  }
}

onMounted(() => {
  try {
    info_subscribe(handleGlobalInfo);
  } catch (_) {
    /* ignore */
  }
});

const puppets = ref([]);

// 拉取铜偶列表
onMounted(async () => {
  try {
    const plainCopper = await get_copper_list();
    let arr =
      plainCopper && Array.isArray(plainCopper.coppers)
        ? plainCopper.coppers
        : [];
    if (!Array.isArray(arr)) {
      const p = findKeyPath(plainCopper, "coppers");
      console.log("[Warehouse] copper key path:", p);
      if (p) {
        const found = getByPath(plainCopper, p);
        console.log("[Warehouse] copper found by path:", found);
        if (Array.isArray(found)) arr = found;
      }
      if (!Array.isArray(arr) && plainCopper && plainCopper.entries) {
        console.log("[Warehouse] copper entries sample:", plainCopper.entries);
      }
    }
    console.log(
      "[Warehouse] copper array length:",
      Array.isArray(arr) ? arr.length : "not array"
    );
    puppets.value = mapPuppets(arr);
    if (Array.isArray(puppets.value) && puppets.value.length > 0) {
      selectedPuppet.value = puppets.value[0];
    }
    if (
      !selectedPuppet.value &&
      Array.isArray(puppets.value) &&
      puppets.value.length > 0
    ) {
      selectedPuppet.value = puppets.value[0];
    }
  } catch (_) {
    puppets.value = [];
  }
});

const selectedPuppet = ref(null);
const puppetItemRefs = ref([]);
const highlightedIndex = ref(null);
const detailWrap = ref(null);
const hoveredIndex = ref(null);
function setPuppetItemRef(el, index) {
  if (el) puppetItemRefs.value[index] = el;
}
async function selectPuppet(puppet, index) {
  selectedPuppet.value = puppet;
  await nextTick();
  const el = puppetItemRefs.value[index];
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }
  highlightedIndex.value = index;
  if (detailWrap.value) {
    try {
      detailWrap.value.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) {
      detailWrap.value.scrollTop = 0;
    }
  }
  setTimeout(() => {
    if (highlightedIndex.value === index) highlightedIndex.value = null;
  }, 320);
}

const showDrawScreen = ref(false);
function drawMore() {
  showDrawScreen.value = true;
}
function closeDrawScreen() {
  showDrawScreen.value = false;
}

// 结果展示仅在子组件 DrawScreen 中进行

function drawTen() {
  const costIndex = Math.max(0, resources.value.length - 1);
  const store = resources.value;
  if (!store[costIndex] || store[costIndex].value < 10) {
    alert("资源不足");
    return;
  }
  store[costIndex].value -= 10;

  const list = puppets.value;
  const idx = Math.floor(Math.random() * list.length);
  const got = list[idx];
  got.quantity = (got.quantity || 0) + 1;
  selectedPuppet.value = got;
  drawResult.value = { name: got.name, image: got.image };
}

// 提供给父组件的返回键处理：若抽卡界面打开，优先关闭抽卡界面
function handleBack() {
  if (showDrawScreen.value) {
    showDrawScreen.value = false;
    return true;
  }
  return false;
}

defineExpose({ handleBack });
// 后端抽卡结果回调：刷新资源与铜偶列表，展示结果
async function onGachaResult(payload) {
  try {
    // 刷新资源
    const resPlain = await get_resource();
    resources.value = mapResources(resPlain);

    // 刷新铜偶列表
    const listPlain = await get_copper_list();
    const arr = Array.isArray(listPlain?.coppers) ? listPlain.coppers : [];
    puppets.value = mapPuppets(arr);

    // 子组件内展示结果，这里不再弹窗
  } catch (_) {}
}

// 升级当前选中铜偶并刷新数据
async function upgradeSelected() {
  if (!selectedPuppet.value) return;
  if (Number(selectedPuppet.value.level || 0) >= 5) {
    alert("已达满级");
    return;
  }
  const id = selectedPuppet.value.id;
  const res = await upgrade_copper(id);
  if (!res || res.type !== "success") {
    alert(res && res.content ? res.content : "升级失败");
    return;
  }

  try {
    // 刷新资源（升级消耗的是灵性火花）
    const resPlain = await get_resource();
    resources.value = mapResources(resPlain);

    // 刷新铜偶列表
    const listPlain = await get_copper_list();
    const arr = Array.isArray(listPlain?.coppers) ? listPlain.coppers : [];
    puppets.value = mapPuppets(arr);

    // 维持选中项（按 id 匹配）
    const updated = puppets.value.find((p) => p.id === id);
    if (updated) selectedPuppet.value = updated;
  } catch (_) {}
}

// 3D 渲染已抽离到 PuppetModelView 组件
</script>

<template>
  <div class="warehouse">
    <div class="warehouse__resources">
      <div
        class="resource-item"
        v-for="resource in resources"
        :key="resource.name"
      >
        <div class="resource-icon">
          <img :src="resource.icon" :alt="resource.name" />
        </div>
        <div class="resource-value">{{ resource.value }}</div>
      </div>
    </div>

    <div v-if="!showDrawScreen" class="warehouse__main">
      <div class="warehouse__sidebar">
        <div class="warehouse__title">铜偶仓库</div>
        <div class="puppet-list">
          <div
            class="puppet-card"
            v-for="(puppet, i) in puppets"
            :key="puppet.id"
            :class="{
              'puppet-card--selected': selectedPuppet?.id === puppet.id,
              'puppet-card--pulse': highlightedIndex === i,
              'puppet-card--hover': hoveredIndex === i,
            }"
            :ref="(el) => setPuppetItemRef(el, i)"
            @click="selectPuppet(puppet, i)"
            @mouseenter="hoveredIndex = i"
            @mouseleave="hoveredIndex = null"
          >
            <!-- ？ -->
            <div class="puppet-card__quantity">{{ puppet.level }}</div>
            <div class="puppet-card__image">
              <img :src="puppet.image" :alt="puppet.name" />
            </div>
            <div class="puppet-card__info">
              <div class="puppet-card__name">
                {{ puppet.name }}{{ puppet.suffix }}
              </div>
              <div class="puppet-card__level">{{ puppet.level }}级</div>
            </div>
          </div>

          <div class="puppet-card puppet-card--add" @click="drawMore">
            <div class="puppet-card__add-icon">+</div>
            <div class="puppet-card__add-text">抽取更多</div>
          </div>
        </div>
      </div>

      <div class="warehouse__detail" ref="detailWrap">
        <transition name="fade-slide" mode="out-in">
          <div
            v-if="selectedPuppet"
            class="puppet-detail"
            :key="selectedPuppet?.id || 'none'"
          >
            <div class="puppet-detail__header">
              <h2 class="puppet-detail__name">{{ selectedPuppet.name }}</h2>
            </div>

            <div class="puppet-detail__content">
              <div class="puppet-detail__row">
                <div class="puppet-detail__model">
                  <PuppetModelView :puppet="selectedPuppet" />
                </div>

                <div class="puppet-detail__description">
                  {{ selectedPuppet.description }}
                </div>
              </div>

              <div class="puppet-detail__row">
                <div class="puppet-detail__stats">
                  <div class="stats-section">
                    <div class="stat-item">
                      <span class="stat-label">生命:</span>
                      <span class="stat-value">{{
                        selectedPuppet.stats.health
                      }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">等级:</span>
                      <span class="stat-value">{{
                        selectedPuppet.stats.level
                      }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">剩余上场次数:</span>
                      <span class="stat-value">{{
                        selectedPuppet.stats.live_left
                      }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">攻击力:</span>
                      <span class="stat-value"
                        >{{ selectedPuppet.stats.attack.base }}
                        <!-- <span class="stat-bonus">(+{{ selectedPuppet.stats.attack.bonus }})</span> -->
                      </span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">防御力:</span>
                      <span class="stat-value"
                        >{{ selectedPuppet.stats.defense.base }}
                        <!-- <span class="stat-bonus">(+{{ selectedPuppet.stats.defense.bonus }})</span> -->
                      </span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">闪避:</span>
                      <span class="stat-value"
                        >{{ selectedPuppet.stats.dodge.base }}%
                        <!-- <span class="stat-bonus">(+{{ selectedPuppet.stats.dodge.bonus }}%)</span> -->
                      </span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">职业:</span>
                      <span class="stat-value">{{
                        selectedPuppet.stats.class
                      }}</span>
                    </div>
                  </div>
                </div>

                <div class="equipment-section">
                  <h4 class="section-title">装备</h4>
                  <div class="equipment-slots">
                    <div
                      v-for="(item, index) in selectedPuppet.equipment"
                      :key="index"
                      class="equipment-slot"
                      :class="{
                        'equipment-slot--empty': !item.equipped && !item.locked,
                        'equipment-slot--locked': item.locked,
                      }"
                    >
                      <img
                        v-if="
                          item.equipped &&
                          item.icon &&
                          (item.icon.startsWith('/') ||
                            item.icon.startsWith('http'))
                        "
                        :src="item.icon"
                        :alt="item.name"
                        class="equipment-icon"
                      />
                      <span v-else class="equipment-icon">{{
                        item.locked ? "🔒" : item.icon
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="skill-section"
                v-if="selectedPuppet?.stats?.class !== '工匠'"
              >
                <h4 class="section-title">技能</h4>
                <div class="skill-info">
                  <div class="skill-text">
                    <div class="skill-name">
                      {{ selectedPuppet.skill.name }}
                    </div>
                    <div class="skill-cooldown">
                      冷却: {{ selectedPuppet.skill.cooldown }}
                    </div>
                    <div class="skill-effect">
                      {{ selectedPuppet.skill.effect }}
                    </div>
                  </div>
                  <div class="skill-icon">
                    <img
                      v-if="
                        selectedPuppet.skill.icon &&
                        (selectedPuppet.skill.icon.startsWith('/') ||
                          selectedPuppet.skill.icon.startsWith('http'))
                      "
                      :src="selectedPuppet.skill.icon"
                      :alt="selectedPuppet.skill.name"
                      class="skill-icon-img"
                    />
                    <span v-else>{{ selectedPuppet.skill.icon }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="puppet-detail__upgrade">
              <div class="upgrade-cost">
                <span class="cost-amount">{{
                  selectedPuppet.level >= 5
                    ? "已满级"
                    : "X " + selectedPuppet.upgradeCost
                }}</span>
              </div>
              <button
                class="upgrade-btn"
                @click="upgradeSelected"
                :disabled="selectedPuppet?.level >= 5"
              >
                <span class="upgrade-icon">⏫</span>
              </button>
            </div>
          </div>
          <div v-else class="warehouse__placeholder" key="placeholder">
            <p>请选择英雄以浏览</p>
          </div>
        </transition>
      </div>
    </div>

    <DrawScreen v-if="showDrawScreen" @draw="onGachaResult" />
  </div>
</template>

<style scoped>
.warehouse {
  position: absolute;
  inset: 0;
  background: #a7a7a7;
  color: #fff;
  display: flex;
  flex-direction: column;
}
.warehouse__resources {
  height: 80px;
  background: #a7a7a7;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 40px;
  margin-left: 120px;
  margin-top: 20px;
}
.resource-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #3a2519;
  padding: 16px 24px;
  border-radius: 12px;
  min-width: 160px;
}
.resource-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.resource-icon img {
  width: 130%;
  height: 130%;
  object-fit: contain;
}
.resource-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}
.warehouse__main {
  flex: 1;
  display: flex;
  margin-top: 20px;
  min-height: 0;
}
.warehouse__sidebar {
  width: 70%;
  background: #3a2519;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-radius: 12px;
}
.warehouse__title {
  font-size: 24px;
  font-weight: 900;
  margin-bottom: 20px;
  color: #fff;
}
.puppet-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  overflow-y: auto;
  flex: 1;
  padding-right: 8px;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}
.puppet-card {
  position: relative;
  background: transparent;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 200px;
  height: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.puppet-card:hover {
  background: transparent;
}
.puppet-card--selected {
  background: transparent;
  border: 2px solid #f59e0b;
}
.puppet-card--add {
  background: #3a2519;
  border: 2px dashed #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.puppet-card__quantity {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  background: #2b1a11;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  z-index: 2;
}
.puppet-card__image {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0;
  z-index: 1;
}
.puppet-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.puppet-card__info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  text-align: center;
  background: transparent;
  padding: 6px 8px;
  z-index: 2;
}
.puppet-card__name {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #fff;
}
.puppet-card__level {
  font-size: 14px;
  color: #ccc;
}
.puppet-card__add-icon {
  font-size: 48px;
  color: #999;
  margin-bottom: 8px;
}
.puppet-card__add-text {
  font-size: 16px;
  color: #999;
}
.warehouse__detail {
  width: 30%;
  background: #3a2519;
  margin: 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
}
.warehouse__placeholder {
  text-align: center;
  color: #ccc;
  font-size: 18px;
  padding: 40px;
}
.puppet-detail {
  padding: 20px;
  color: #fff;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.puppet-detail__header {
  margin-bottom: 20px;
}
.puppet-detail__name {
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  margin: 0;
}
.puppet-detail__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.puppet-detail__row {
  display: flex;
  gap: 20px;
}
.puppet-detail__model {
  position: relative;
  background: #4b2e1f;
  border-radius: 8px;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.model-placeholder {
  color: #999;
  font-size: 16px;
}
.model-canvas {
  width: 100%;
  height: 100%;
}
.model-canvas canvas {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  display: block;
}
.puppet-detail__description {
  flex: 1;
  color: #ccc;
  font-size: 12px;
  line-height: 1.6;
}
.puppet-detail__stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stats-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-label {
  color: #ccc;
  font-size: 14px;
}
.stat-value {
  color: #fff;
  font-weight: 600;
}
.stat-bonus {
  color: #4ade80;
  font-size: 12px;
}
.equipment-section {
  flex: 0 0 96px;
}
.section-title {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  padding: 0;
}
.equipment-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}
.equipment-slot {
  width: 75px;
  height: 75px;
  background: #4b2e1f;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.equipment-slot--empty {
  background: #2b1a11;
  border: 1px solid #666;
}
.equipment-slot--locked {
  background: #1a1410;
  border: 1px dashed #8a6b52;
  opacity: 0.7;
}
.equipment-icon {
  font-size: 28px;
}
.equipment-slot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.skill-info {
  background: #4b2e1f;
  padding: 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.skill-name {
  color: #fff;
  font-weight: 700;
  font-size: 20px;
  margin-bottom: 6px;
}
.skill-cooldown {
  color: #ccc;
  font-size: 14px;
  margin-bottom: 10px;
}
.skill-effect {
  color: #ccc;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 8px;
}
.skill-text {
  flex: 1;
  min-width: 0;
}
.skill-icon {
  flex-shrink: 0;
  font-size: 24px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: center;
}
.skill-icon-img {
  width: 96px;
  height: 96px;
  object-fit: contain;
  display: inline-block;
}
.puppet-detail__upgrade {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0px;
}
.upgrade-cost {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fbbf24;
  font-weight: 600;
}
.cost-icon {
  font-size: 18px;
}
.cost-icon-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: inline-block;
}
.upgrade-btn {
  width: 50px;
  height: 50px;
  background: #4b2e1f;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.upgrade-btn:hover {
  background: #5a3525;
}
.upgrade-icon {
  font-size: 20px;
  color: #fff;
}
.draw-result {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1100;
}
.draw-result__panel {
  background: #3a2519;
  color: #fff;
  padding: 20px 28px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}
.draw-result__img-wrap {
  width: 200px;
  height: 200px;
  margin: 0 auto 12px;
}
.draw-result__img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.draw-result__name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
}
.draw-result__hint {
  color: #ccc;
  font-size: 12px;
}

/* 结果卡片翻转 */
.result-card {
  position: relative;
  width: 220px;
  height: 320px;
  margin: 0 auto 12px;
  transform-style: preserve-3d;
  perspective: 1000px;
  cursor: pointer;
}
.result-card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 12px;
}
.result-card__back {
  background: #4b2e1f;
  transform: rotateY(180deg);
}
.result-card__front {
  background: linear-gradient(135deg, #ffd39a, #ffb347);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #3a2519;
  font-weight: 800;
}
.result-card.flipped .result-card__back {
  transform: rotateY(0deg);
}
.result-card.flipped .result-card__front {
  transform: rotateY(180deg);
}

/* 选择卡片时的细微缩放反馈 */
.puppet-card {
  transition: transform 0.15s ease;
}
.puppet-card:active {
  transform: scale(0.98);
}
.puppet-card--selected {
  box-shadow: 0 0 0 2px #f59e0b inset;
}
.puppet-card--hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

/* 选中时短暂脉冲高亮 */
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.8);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
}
.puppet-card--pulse {
  animation: pulse-ring 0.32s ease-out 1;
}

/* 详情面板过渡 */
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.fade-slide-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.fade-slide-enter-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.fade-slide-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
</style>
