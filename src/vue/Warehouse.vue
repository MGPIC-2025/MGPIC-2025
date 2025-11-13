<script setup>
import log from '../log.js';
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  defineExpose,
  nextTick,
  computed,
} from 'vue';
import { getAssetUrl } from '../utils/resourceLoader.js';
import { RESOURCE_META } from '../utils/resourceMeta.js';
import DrawScreen from './DrawScreen.vue';
import PuppetModelView from './PuppetModelView.vue';
import {
  get_resource,
  get_copper_list,
  upgrade_copper,
  info_subscribe,
} from '../glue.js';
import { onEvent, offEvent, EventTypes } from '../utils/eventBus.js';

const props = defineProps({
  musicOn: {
    type: Boolean,
    default: true,
  },
});

// 统一的资源键顺序与元信息
const ORDERED_RESOURCE_KEYS = [
  'SpiritalSpark',
  'RecallGear',
  'ResonantCrystal',
  'RefinedCopper',
  'HeartCrystalDust',
];

function mapResources(plain) {
  return ORDERED_RESOURCE_KEYS.map(k => ({
    icon: RESOURCE_META[k].icon,
    name: RESOURCE_META[k].name,
    value: Number(plain?.[k] ?? 0),
  }));
}

// 职业映射（统一处）
const TYPE_MAP = {
  IronWall: '铁壁',
  Arcanist: '奥术',
  CraftsMan: '工匠',
  Mechanic: '机械',
  Resonator: '共振',
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

    const modelUrlRaw = info?.model_url || '';
    const modelUrl = modelUrlRaw ? getAssetUrl(modelUrlRaw) : '';
    // 记录模型URL解析

    return {
      id: Number(copper?.id ?? idx + 1),
      name: info?.name ?? '未知铜偶',
      level: levelNum,
      suffix: copper?.suffix ?? 0,
      image: getAssetUrl(info?.icon_url || ''),
      modelUrl: modelUrl,
      quantity: 1,
      description: info?.description || '',
      stats: {
        level: `${levelNum}/5`,
        health: Number(attr.health || 0),
        live_left: Number(copper?.live_left ?? 0),
        attack: { base: Number(attr.attack || 0), bonus: bonusAttack },
        defense: { base: Number(attr.defense || 0), bonus: bonusDefense },
        dodge: { base: Number(attr.dodge || 0), bonus: bonusDodge },
        class: TYPE_MAP[typeName] || '未知',
      },
      equipment: [
        slot1
          ? {
              name: slot1.equipment_base?.name || '装备',
              icon: getAssetUrl(slot1.equipment_base?.resource_url || ''),
              equipped: true,
              locked: false,
            }
          : { name: '空槽', icon: '＋', equipped: false, locked: false },
        equipmentSlot?.is_slot2_locked
          ? { name: '未解锁', icon: '🔒', equipped: false, locked: true }
          : slot2
            ? {
                name: slot2.equipment_base?.name || '装备',
                icon: getAssetUrl(slot2.equipment_base?.resource_url || ''),
                equipped: true,
                locked: false,
              }
            : { name: '空槽', icon: '＋', equipped: false, locked: false },
      ],
      skill: {
        name: skill?.name || '——',
        cooldown: skill?.cool_down != null ? `${skill.cool_down}回合` : '——',
        effect: skill?.description || '——',
        icon: getAssetUrl(skill?.resource_url || ''),
      },
      upgradeCost: getUpgradeCostByLevel(levelNum),
    };
  });
}

function findKeyPath(root, targetKey, path = []) {
  if (!root || typeof root !== 'object') return null;
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

async function updateResources() {
  try {
    const resourceData = get_resource();
    if (resourceData) {
      resources.value = mapResources(resourceData);
    }
  } catch (error) {
    console.error('[Warehouse] 获取资源失败:', error);
    resources.value = mapResources({});
  }
}

// 初始化时加载一次
onMounted(() => {
  updateResources();
  onEvent(EventTypes.UPDATE_RESOURCES, updateResources);
});

// 订阅后端广播信息（如升级错误等）
function handleGlobalInfo(raw) {
  let msg = raw;
  if (typeof raw === 'string') {
    try {
      msg = JSON.parse(raw);
    } catch (_) {}
  }
  if (msg && msg.type_msg) {
    if (msg.type_msg === 'upgrade_cost_error') {
      alert(msg.content || '升级等级错误');
    } else {
      log('[GlobalInfo]', msg);
    }
  }
}

onMounted(() => {
  try {
    info_subscribe(handleGlobalInfo);
  } catch (_) {
    /* ignore */
  }

  // 自动播放音乐（如果音乐开关是开启的）
  if (props.musicOn && audioRef.value) {
    const tryPlay = () => {
      if (audioRef.value.readyState >= 2) {
        audioRef.value
          .play()
          .then(() => {
            log('[Warehouse] 音乐播放成功');
          })
          .catch(err => {
            log('[Warehouse] 自动播放失败（可能浏览器阻止）:', err);
          });
      } else {
        const onCanPlay = () => {
          audioRef.value
            .play()
            .then(() => {
              log('[Warehouse] 音频加载完成，播放成功');
            })
            .catch(err => {
              log('[Warehouse] 播放失败:', err);
            });
          audioRef.value.removeEventListener('canplay', onCanPlay);
        };
        audioRef.value.addEventListener('canplay', onCanPlay, { once: true });
      }
    };
    setTimeout(tryPlay, 200);
  }
});

// 监听 musicOn 变化
watch(
  () => props.musicOn,
  newVal => {
    if (!audioRef.value) return;

    if (newVal) {
      if (audioRef.value.readyState >= 2) {
        audioRef.value.play().catch(err => {
          log('[Warehouse] 播放音乐失败:', err);
        });
      } else {
        const playWhenReady = () => {
          audioRef.value.play().catch(err => {
            log('[Warehouse] 播放音乐失败:', err);
          });
          audioRef.value.removeEventListener('canplay', playWhenReady);
        };
        audioRef.value.addEventListener('canplay', playWhenReady);
      }
    } else {
      audioRef.value.pause();
    }
  }
);

onBeforeUnmount(() => {
  // 停止音乐播放
  if (audioRef.value) {
    audioRef.value.pause();
  }

  // 清理资源更新事件监听（和 ResourcePanel 一样的后端绑定方式）
  offEvent(EventTypes.UPDATE_RESOURCES, updateResources);
});

const puppets = ref([]);

// 拉取铜偶列表
onMounted(async () => {
  try {
    const plainCopper = get_copper_list();
    let arr =
      plainCopper && Array.isArray(plainCopper.coppers)
        ? plainCopper.coppers
        : [];
    if (!Array.isArray(arr)) {
      const p = findKeyPath(plainCopper, 'coppers');
      log('[Warehouse] copper key path:', p);
      if (p) {
        const found = getByPath(plainCopper, p);
        log('[Warehouse] copper found by path:', found);
        if (Array.isArray(found)) arr = found;
      }
      if (!Array.isArray(arr) && plainCopper && plainCopper.entries) {
        log('[Warehouse] copper entries sample:', plainCopper.entries);
      }
    }
    // 简化日志：仅在数组不可用时记录
    if (!Array.isArray(arr)) {
      log('[Warehouse] copper list not array');
    }
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
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }
  highlightedIndex.value = index;
  if (detailWrap.value) {
    try {
      detailWrap.value.scrollTo({ top: 0, behavior: 'smooth' });
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
    alert('资源不足');
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
    // 刷新资源（通过事件总线自动更新，这里可以手动触发一次确保及时更新）
    await updateResources();

    // 刷新铜偶列表
    const listPlain = get_copper_list();
    const arr = Array.isArray(listPlain?.coppers) ? listPlain.coppers : [];
    puppets.value = mapPuppets(arr);

    // 子组件内展示结果，这里不再弹窗
  } catch (_) {}
}

// 升级当前选中铜偶并刷新数据
async function upgradeSelected() {
  if (!selectedPuppet.value) return;
  if (Number(selectedPuppet.value.level || 0) >= 5) {
    alert('已达满级');
    return;
  }
  const id = selectedPuppet.value.id;
  const res = upgrade_copper(id);
  if (!res || res.type !== 'success') {
    alert(res && res.content ? res.content : '升级失败');
    return;
  }

  try {
    // 刷新资源（通过事件总线自动更新，这里可以手动触发一次确保及时更新）
    await updateResources();

    // 刷新铜偶列表
    const listPlain = get_copper_list();
    const arr = Array.isArray(listPlain?.coppers) ? listPlain.coppers : [];
    puppets.value = mapPuppets(arr);

    // 维持选中项（按 id 匹配）
    const updated = puppets.value.find(p => p.id === id);
    if (updated) selectedPuppet.value = updated;
  } catch (_) {}
}

const panel2Src = `url('${getAssetUrl('@assets/ui/panel2.png')}')`;
const panel3Src = `url('${getAssetUrl('@assets/ui/panel3.png')}')`;
const panel4Src = `url('${getAssetUrl('@assets/ui/panel4.png')}')`;
const panel5Src = `url('${getAssetUrl('@assets/ui/panel5.png')}')`;
const warehouseBgSrc = `url('${getAssetUrl('@assets/frontend_resource/Gemini_Generated_Image_e03q5oe03q5oe03q.png')}')`;

const warehouseStyleVars = computed(() => ({
  '--warehouse-bg': warehouseBgSrc,
  '--panel2-src': panel2Src,
  '--panel3-src': panel3Src,
  '--panel4-src': panel4Src,
  '--panel5-src': panel5Src,
}));

// 音乐播放相关
const audioRef = ref(null);
const musicUrl = import.meta.env.DEV
  ? '/assets/warehouse.mp3' // 开发环境使用本地路径
  : getAssetUrl('assets/warehouse.mp3'); // 生产环境使用 R2 CDN
</script>

<template>
  <div class="warehouse" :style="warehouseStyleVars">
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
        <div class="resource-tooltip">{{ resource.name }}</div>
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
            :ref="el => setPuppetItemRef(el, i)"
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
                      <img
                        v-else-if="item.locked"
                        :src="getAssetUrl('@assets/ui/lock.png')"
                        alt="未解锁"
                        class="equipment-icon"
                      />
                      <img
                        v-else-if="item.icon === '＋'"
                        :src="getAssetUrl('@assets/ui/jia.png')"
                        alt="空槽"
                        class="equipment-icon"
                      />
                      <span v-else class="equipment-icon">{{ item.icon }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="selectedPuppet?.stats?.class !== '工匠'"
                class="skill-section"
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
                <img
                  v-if="selectedPuppet.level < 5"
                  :src="RESOURCE_META.SpiritalSpark.icon"
                  alt="灵性火花"
                  class="cost-icon-img"
                />
                <span class="cost-amount">{{
                  selectedPuppet.level >= 5
                    ? '已满级'
                    : 'X ' + selectedPuppet.upgradeCost
                }}</span>
              </div>
              <button
                class="upgrade-btn"
                @click="upgradeSelected"
                :disabled="selectedPuppet?.level >= 5"
              >
                <img
                  :src="getAssetUrl('@assets/ui/upgrade.png')"
                  class="upgrade-icon"
                  alt="升级"
                />
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
    <audio ref="audioRef" :src="musicUrl" loop preload="auto"></audio>
  </div>
</template>

<style scoped src="../styles/warehouse.css"></style>
