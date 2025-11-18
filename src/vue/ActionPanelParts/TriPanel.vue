<script setup>
import { computed } from 'vue';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import './TriPanel.css';

const props = defineProps({
  copperType: { type: String, default: '' },
  canMove: { type: Boolean, default: true },
  canAttack: { type: Boolean, default: true },
  canSummon: { type: Boolean, default: false },
});

const emit = defineEmits(['move', 'wait', 'attack', 'summon', 'build']);

// 根据铜偶类型决定右侧按钮显示什么
// 工匠：建造，共鸣：召唤，其他：攻击
const rightButtonType = computed(() => {
  if (props.copperType === 'CraftsMan') return 'build';
  if (props.copperType === 'Resonator') return 'summon';
  return 'attack';
});

const rightButtonTitle = computed(() => {
  if (rightButtonType.value === 'build')
    return props.canSummon ? '建造' : '本回合已建造';
  if (rightButtonType.value === 'summon')
    return props.canSummon ? '召唤' : '本回合已召唤';
  return props.canAttack ? '攻击' : '本回合已攻击';
});

const rightButtonLocked = computed(() => {
  if (rightButtonType.value === 'build') return !props.canSummon;
  if (rightButtonType.value === 'summon') return !props.canSummon;
  return !props.canAttack;
});

const hexSrc = getAssetUrl('ui/your-image.png');
const moveIconSrc = getAssetUrl('ui/boot.png');
const waitIconSrc = getAssetUrl('ui/mushroom.png');
const attackIconSrc = getAssetUrl('ui/sword.png');
const summonIconSrc = getAssetUrl('@assets/ui/summon.png');
const buildIconSrc = getAssetUrl('@assets/ui/build.png');

function onMove() {
  if (!props.canMove) return;
  emit('move');
}

function onWait() {
  emit('wait');
}

function onRightButton() {
  // 根据按钮类型触发不同事件
  if (rightButtonType.value === 'build') {
    if (!props.canSummon) return;
    emit('build');
  } else if (rightButtonType.value === 'summon') {
    if (!props.canSummon) return;
    emit('summon');
  } else {
    if (!props.canAttack) return;
    emit('attack');
  }
}
</script>

<template>
  <div class="tri-panel">
    <div class="diamond" aria-label="菱形操作面板">
      <!-- 上：等待 -->
      <div class="hex top" title="等待" @click="onWait">
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="moveIconSrc" alt="等待图标" />
      </div>

      <!-- 左：移动 -->
      <div
        class="hex left"
        :title="canMove ? '移动' : '本回合已移动'"
        :class="{ 'is-locked': canMove === false }"
        @click="onMove"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="waitIconSrc" alt="移动图标" />
      </div>

      <!-- 右：根据铜偶类型显示 攻击/召唤/建造 -->
      <div
        class="hex right"
        :title="rightButtonTitle"
        :class="{ 'is-locked': rightButtonLocked }"
        @click="onRightButton"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img
          class="hex-icon"
          :src="
            rightButtonType === 'build'
              ? buildIconSrc
              : rightButtonType === 'summon'
                ? summonIconSrc
                : attackIconSrc
          "
          :alt="
            rightButtonType === 'build'
              ? '建造图标'
              : rightButtonType === 'summon'
                ? '召唤图标'
                : '攻击图标'
          "
        />
      </div>
    </div>
  </div>
</template>
