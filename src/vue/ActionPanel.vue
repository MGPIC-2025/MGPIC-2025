<script setup>
import log from '../log.js';
import { ref, computed, watch } from 'vue';
import { eventloop } from '../glue.js';
import { getItemName } from '../utils/resourceMeta.js';
import { getAssetUrl } from '../utils/resourceLoader.js';
import DiamondPanel from './ActionPanelParts/DiamondPanel.vue';
import InventoryModal from './ActionPanelParts/InventoryModal.vue';
import HealthBar from './ActionPanelParts/HealthBar.vue';
import TriPanel from './ActionPanelParts/TriPanel.vue';
import BuildModal from './ActionPanelParts/BuildModal.vue';
import './ActionPanel.css';

const props = defineProps({
  copper: {
    type: Object,
    default: null,
  },
  resources: {
    type: Array,
    default: () => [],
  },
  hasAttackTargets: {
    type: Boolean,
    default: true, // 默认假设有目标
  },
  onSelectCopper: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(['close', 'action', 'selectCopper']);

// UI资源URL（CSS background-image需要url()包裹）
const swordImgSrc = computed(() => `url('${getAssetUrl('ui/sword.png')}')`);
const redPanelBg = computed(() => `url('${getAssetUrl('ui/red.png')}')`);
const bootImgSrc = computed(() => `url('${getAssetUrl('ui/boot.png')}')`);
const greenPanelBg = computed(() => `url('${getAssetUrl('ui/green.png')}')`);
const buildImgSrc = computed(
  () => `url('${getAssetUrl('@assets/ui/build.png')}')`
);
const summonImgSrc = computed(
  () => `url('${getAssetUrl('@assets/ui/summon.png')}')`
);
const closeIconSrc = getAssetUrl('@assets/ui/close.png');

// 三角操作面板已独立为组件 TriPanel

// 面板状态：'full' = 完整显示, 'minimized' = 最小化到底部
const panelMode = ref('full');
const actionMode = ref(null); // 'moving' = 等待选择移动位置, 'attacking' = 等待选择攻击目标

// 资源弹窗状态
const showInventory = ref(false);
// 建造弹窗状态
const showBuildModal = ref(false);
const structureList = ref([]);

// 注意：inventoryItems 已移除，现在由 InventoryModal 内部管理全局资源数据

const copperInfo = computed(() => {
  if (!props.copper) return null;
  const derivedName =
    props.copper.copper?.copper_info?.name ||
    props.copper.enemy?.enemy_base?.name ||
    props.copper.enemy_base?.name ||
    props.copper.name ||
    `单位 #${props.copper.id}`;

  return {
    id: props.copper.id,
    name: derivedName,
    level:
      props.copper.copper?.level ??
      props.copper.enemy?.level ??
      props.copper.enemy_base?.level ??
      1,
    hp: props.copper.now_health,
    maxHp:
      props.copper.copper?.attribute?.health ??
      props.copper.enemy?.enemy_base?.health ??
      props.copper.enemy_base?.health ??
      100,
    attack:
      props.copper.copper?.attribute?.attack ??
      props.copper.enemy?.enemy_base?.attack ??
      props.copper.enemy_base?.attack ??
      0,
    defense:
      props.copper.copper?.attribute?.defense ??
      props.copper.enemy?.enemy_base?.defense ??
      props.copper.enemy_base?.defense ??
      0,
    speed:
      props.copper.copper?.attribute?.speed ??
      props.copper.enemy?.enemy_base?.speed ??
      props.copper.enemy_base?.speed ??
      0,
    canMove: props.copper.can_move,
    canAttack: props.copper.can_attack,
    canSummon: props.copper.can_summon,
    position:
      Array.isArray(props.copper.position) && props.copper.position.length >= 2
        ? props.copper.position
        : Array.isArray(props.copper.enemy?.position) &&
            props.copper.enemy.position.length >= 2
          ? props.copper.enemy.position
          : Array.isArray(props.copper.enemy_base?.position) &&
              props.copper.enemy_base.position.length >= 2
            ? props.copper.enemy_base.position
            : [0, 0],
    inventoryCapacity: props.copper.inventory?.capacity || 0,
    copperType:
      props.copper.copper?.copper_type ||
      props.copper.enemy?.enemy_base?.enemy_type ||
      props.copper.enemy_base?.enemy_type ||
      '',
    isOwnedEnemy: props.copper.isOwnedEnemy === true,
    isEnemy: props.copper.isEnemy === true,
  };
});

// 计算装备数据（参考 Warehouse.vue 的处理方式）
const equipmentData = computed(() => {
  if (!props.copper) return [];

  const equipmentSlot = props.copper.copper?.equipment_slot || {};
  const slot1 = equipmentSlot?.slot1 || null;
  const slot2 = equipmentSlot?.slot2 || null;

  return [
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
  ];
});

// 当切换选择的单位时，重置面板为默认状态
watch(
  () => props.copper?.id,
  (newId, oldId) => {
    if (newId === oldId) return;
    panelMode.value = 'full';
    actionMode.value = null;
    showInventory.value = false;
    showBuildModal.value = false;
  }
);

async function handleMove() {
  if (!copperInfo.value.canMove) return;
  log('[ActionPanel] 请求移动范围');

  // 判断是铜偶还是友方召唤物
  const isOwnedEnemy = props.copper.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_enemy_move_start' : 'on_move_start';

  log(
    `[ActionPanel] 单位类型: ${isOwnedEnemy ? '友方召唤物' : '铜偶'}, 事件: ${eventType}`
  );

  const message = JSON.stringify({
    type: eventType,
    content: { id: String(copperInfo.value.id) },
  });
  eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'moving';
  emit('action', { type: 'moveStart', copperId: copperInfo.value.id });
}

async function handleAttack() {
  log('[ActionPanel] 攻击按钮点击', {
    canAttack: copperInfo.value.canAttack,
    copperId: copperInfo.value.id,
    name: copperInfo.value.name,
  });
  if (!copperInfo.value.canAttack) {
    log('[ActionPanel] 攻击被阻止: 本回合已攻击');
    return;
  }
  log('[ActionPanel] 请求攻击范围');

  // 判断是铜偶还是友方召唤物
  const isOwnedEnemy = props.copper.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_enemy_attack_start' : 'on_attack_start';

  log(
    `[ActionPanel] 单位类型: ${isOwnedEnemy ? '友方召唤物' : '铜偶'}, 事件: ${eventType}`
  );

  const message = JSON.stringify({
    type: eventType,
    content: { id: String(copperInfo.value.id) },
  });
  eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'attacking';
  emit('action', { type: 'attackStart', copperId: copperInfo.value.id });
}

async function handleSummon() {
  log('[ActionPanel] 召唤按钮点击', {
    canSummon: copperInfo.value.canSummon,
    copperId: copperInfo.value.id,
    name: copperInfo.value.name,
  });
  if (!copperInfo.value.canSummon) {
    log('[ActionPanel] 召唤被阻止: 本回合已召唤');
    return;
  }
  log('[ActionPanel] 请求召唤范围');
  const message = JSON.stringify({
    type: 'on_summon_start',
    content: { id: String(copperInfo.value.id) },
  });
  eventloop(message);
  panelMode.value = 'minimized';
  actionMode.value = 'summoning';
  emit('action', { type: 'summonStart', copperId: copperInfo.value.id });
}

async function handleBuild() {
  log('[ActionPanel] 建造按钮点击', {
    copperId: copperInfo.value.id,
    name: copperInfo.value.name,
  });
  if (!copperInfo.value.canSummon) {
    log('[ActionPanel] 建造被阻止: 本回合已建造/召唤');
    return;
  }

  // 发送事件给父组件，让父组件来显示建造菜单
  emit('action', {
    type: 'buildRequest',
    copperId: copperInfo.value.id,
  });
}

// 由父组件调用的函数，用于显示建造菜单
function showBuildMenu(structures) {
  log('[ActionPanel] 显示建造菜单，共', structures?.length || 0, '个建筑');
  structureList.value = structures || [];
  showBuildModal.value = true;
}

async function handleBuildConfirm(structureName) {
  log('[ActionPanel] 确认建造:', structureName);
  // 先关闭弹窗
  showBuildModal.value = false;

  // 请求建造范围（通知后端选择的建筑类型，显示黄色方块）
  const startMessage = JSON.stringify({
    type: 'on_structure_build_start',
    content: { id: String(copperInfo.value.id), name: structureName },
  });
  eventloop(startMessage);

  // 最小化面板，进入建造模式
  panelMode.value = 'minimized';
  actionMode.value = 'building';
  emit('action', {
    type: 'buildStart',
    copperId: copperInfo.value.id,
    structureName: structureName,
  });
}

function handleInventory() {
  // 资源面板现在显示全局资源，总是可以打开
  log('[ActionPanel] 打开资源面板（全局资源）');
  showInventory.value = true;
}

async function handlePickup(index) {
  log(`[ActionPanel] 拾取物品: index=${index}`);
  const message = JSON.stringify({
    type: 'on_copper_pick_up',
    content: { id: String(copperInfo.value.id), index: String(index) },
  });
  eventloop(message);
  await refreshCopperState();
}

async function handleCraft() {
  log('[ActionPanel] 合成物品');
  const message = JSON.stringify({
    type: 'on_copper_craft',
    content: { id: String(copperInfo.value.id) },
  });
  eventloop(message);
  await refreshCopperState();
}

// 处理资源组件的事件
async function handleInventoryCraft() {
  await handleCraft();
}

async function refreshCopperState() {
  // 判断是铜偶还是友方召唤物，发送不同的事件
  const isOwnedEnemy = props.copper.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_click_enemy' : 'on_click_copper';

  const message = JSON.stringify({
    type: eventType,
    content: { id: String(copperInfo.value.id) },
  });
  eventloop(message);
}

function handleWait() {
  log('[ActionPanel] 等待');
  emit('action', { type: 'wait', copperId: copperInfo.value.id });
}

function close() {
  panelMode.value = 'full';
  actionMode.value = null;
  showInventory.value = false;
  emit('close');
}

function handleCloseInventory() {
  showInventory.value = false;
}

// 恢复完整显示逻辑已移除

// 使用共享工具获取资源名称

// 取消当前操作
function cancelAction() {
  panelMode.value = 'full';
  actionMode.value = null;
  emit('action', { type: 'cancel', copperId: copperInfo.value.id });
}

function handleMinimizedClose() {
  cancelAction();
  close();
}

// 处理选择铜偶（如果提供了回调函数）
async function handleSelectCopper(copperId) {
  if (props.onSelectCopper) {
    await props.onSelectCopper(copperId);
  } else {
    emit('selectCopper', copperId);
  }
}

// 暴露方法给父组件
defineExpose({ cancelAction, handleSelectCopper, showBuildMenu });
</script>

<template>
  <div v-if="copper" class="copper-panel-parent">
    <!-- 菱形属性面板 -->
    <DiamondPanel
      :copper-info="copperInfo"
      :inventory-items="[]"
      :inventory-capacity="5"
      @inventory-click="handleInventory"
    />

    <!-- 血条 -->
    <HealthBar :hp="copperInfo?.hp || 0" :max-hp="copperInfo?.maxHp || 100" />

    <div
      v-if="
        panelMode === 'minimized' ||
        (resources && resources.length > 0 && panelMode === 'full')
      "
      class="copper-panel"
      :class="{
        'copper-panel--minimized': panelMode === 'minimized',
        'copper-panel--min-attack':
          panelMode === 'minimized' && actionMode === 'attacking',
        'copper-panel--min-move':
          panelMode === 'minimized' && actionMode === 'moving',
        'copper-panel--min-summon':
          panelMode === 'minimized' && actionMode === 'summoning',
        'copper-panel--min-build':
          panelMode === 'minimized' && actionMode === 'building',
      }"
      @click.stop
    >
      <!-- 最小化状态 -->
      <div v-if="panelMode === 'minimized'" class="minimized-content">
        <button
          class="minimized-close"
          type="button"
          @click="handleMinimizedClose"
          title="关闭"
        >
          <img :src="closeIconSrc" alt="关闭" />
        </button>
        <div class="minimized-info">
          <span class="minimized-name">{{ copperInfo.name }}</span>
          <span class="minimized-action">
            {{
              actionMode === 'moving'
                ? '选择移动位置...'
                : actionMode === 'attacking'
                  ? '选择攻击目标...'
                  : actionMode === 'summoning'
                    ? '选择召唤位置...'
                    : actionMode === 'building'
                      ? '选择建造位置...'
                      : ''
            }}
          </span>
        </div>
      </div>

      <!-- 完整显示状态 -->
      <template v-else>
        <!-- 关闭按钮 -->
        <button class="close-btn" @click="close" title="关闭">
          <img :src="closeIconSrc" alt="关闭" />
        </button>

        <div class="panel-content">
          <!-- 铜偶信息（已移除不再展示） -->

          <!-- 地面资源（如果有） -->
          <div v-if="resources && resources.length > 0" class="resources">
            <div class="resources-header">📦 地面物品</div>
            <div class="resources-list">
              <div
                v-for="(resource, index) in resources"
                :key="index"
                class="resource-item"
                @click="handlePickup(index)"
                title="点击拾取"
              >
                <span class="resource-name">{{ getItemName(resource) }}</span>
                <span class="resource-count">x{{ resource.count || 1 }}</span>
                <span class="resource-pickup">⬆️</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 操作三角图标（野生敌人不显示操作按钮） -->
    <TriPanel
      v-if="!props.copper.isEnemy"
      :copper-type="copperInfo?.copperType"
      :can-move="copperInfo?.canMove !== false"
      :can-attack="copperInfo?.canAttack !== false"
      :can-summon="copperInfo?.canSummon !== false"
      @move="handleMove"
      @wait="handleWait"
      @attack="handleAttack"
      @summon="handleSummon"
      @build="handleBuild"
    />

    <!-- 野生敌人提示 -->
    <div v-if="props.copper.isEnemy" class="enemy-info-tip">
      <span>🔍 查看模式（敌人单位）</span>
    </div>
  </div>

  <!-- 资源弹窗 -->
  <InventoryModal
    :visible="showInventory"
    :copper-name="copperInfo?.name || '未知铜偶'"
    :equipment="equipmentData"
    @close="handleCloseInventory"
    @craft="handleInventoryCraft"
  />

  <!-- 建造弹窗 -->
  <BuildModal
    :visible="showBuildModal"
    :copper-name="copperInfo?.name || '未知铜偶'"
    :structure-list="structureList"
    @close="showBuildModal = false"
    @build="handleBuildConfirm"
  />
</template>

<style scoped>
/* 边框：攻击 = 红色；移动 = 绿色（仅在最小化时生效） */
.copper-panel--minimized.copper-panel--min-attack {
  border: none;
  /* Two-layer background: top = sword badge, bottom = red panel */
  background-image: v-bind(swordImgSrc), v-bind(redPanelBg);
  background-repeat: no-repeat, no-repeat;
  background-position:
    8px 8px,
    center;
  /* keep red panel slightly expanded to compensate asset margins */
  background-size:
    32px 32px,
    130% 122%;
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  image-rendering: pixelated;
}

.copper-panel--minimized.copper-panel--min-move {
  border: none;
  /* Two-layer background: top = boot badge, bottom = green panel */
  background-image: v-bind(bootImgSrc), v-bind(greenPanelBg);
  background-repeat: no-repeat, no-repeat;
  background-position:
    8px 8px,
    center;
  /* keep green panel slightly expanded to compensate asset margins */
  background-size:
    32px 32px,
    130% 122%;
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  image-rendering: pixelated;
}

.copper-panel--minimized.copper-panel--min-summon {
  border: none;
  /* Two-layer background: top = summon badge, bottom = green panel */
  background-image: v-bind(summonImgSrc), v-bind(greenPanelBg);
  background-repeat: no-repeat, no-repeat;
  background-position:
    8px 8px,
    center;
  /* keep green panel slightly expanded to compensate asset margins */
  background-size:
    32px 32px,
    130% 122%;
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  image-rendering: pixelated;
}

.copper-panel--minimized.copper-panel--min-build {
  border: none;
  /* Two-layer background: top = build badge, bottom = green panel */
  background-image: v-bind(buildImgSrc), v-bind(greenPanelBg);
  background-repeat: no-repeat, no-repeat;
  background-position:
    8px 8px,
    center;
  /* keep green panel slightly expanded to compensate asset margins */
  background-size:
    32px 32px,
    130% 122%;
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  image-rendering: pixelated;
}
</style>
