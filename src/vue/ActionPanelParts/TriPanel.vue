<script setup>
import { getAssetUrl } from '../../utils/resourceLoader.js';

const props = defineProps({
  canMove: { type: Boolean, default: true },
  canAttack: { type: Boolean, default: true },
  canSummon: { type: Boolean, default: false },
  canBuild: { type: Boolean, default: true }, // 所有铜偶都能建造
});

const emit = defineEmits(['move', 'wait', 'attack', 'summon', 'build']);

const hexSrc = getAssetUrl('ui/your-image.png');
const moveIconSrc = getAssetUrl('ui/boot.png');
const waitIconSrc = getAssetUrl('ui/mushroom.png');
const attackIconSrc = getAssetUrl('ui/sword.png');
const summonIconSrc = getAssetUrl('ui/currentcupper.png'); // 使用现有资源作为召唤图标
const buildIconSrc = getAssetUrl('ui/panel.png'); // 使用面板图标作为建造图标

function onMove() {
  if (!props.canMove) return;
  emit('move');
}

function onWait() {
  emit('wait');
}

function onAttack() {
  if (!props.canAttack) return;
  emit('attack');
}

function onSummon() {
  if (!props.canSummon) return;
  emit('summon');
}

function onBuild() {
  if (!props.canBuild) return;
  emit('build');
}
</script>

<template>
  <div class="tri-panel">
    <div class="diamond" aria-label="菱形操作面板">
      <!-- 上：移动 -->
      <div
        class="hex top"
        :title="canMove ? '移动' : '本回合已移动'"
        :class="{ 'is-locked': canMove === false }"
        @click="onMove"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="waitIconSrc" alt="移动图标" />
      </div>

      <!-- 左：等待 -->
      <div class="hex left" title="等待" @click="onWait">
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="moveIconSrc" alt="等待图标" />
      </div>

      <!-- 右：根据是否能召唤显示召唤或攻击 -->
      <div
        v-if="canSummon"
        class="hex right"
        :title="canSummon ? '召唤' : '本回合已召唤'"
        :class="{ 'is-locked': canSummon === false }"
        @click="onSummon"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="summonIconSrc" alt="召唤图标" />
      </div>
      <div
        v-else
        class="hex right"
        :title="canAttack ? '攻击' : '本回合已攻击'"
        :class="{ 'is-locked': canAttack === false }"
        @click="onAttack"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="attackIconSrc" alt="攻击图标" />
      </div>

      <!-- 下：建造 -->
      <div
        class="hex bottom"
        :title="canBuild ? '建造' : '无法建造'"
        :class="{ 'is-locked': canBuild === false }"
        @click="onBuild"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="buildIconSrc" alt="建造图标" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tri-panel {
  position: fixed;
  right: -45px;
  bottom: 10px;
  z-index: 6000;
  transform: scale(1.3);
  transform-origin: right bottom;
}
.tri-panel {
  --gap: 0px;
  --size: 64px;
  --overlapY: 16px;
  --overlapX: 37px;
  --topDropY: -8px;
}
@media (min-width: 640px) {
  .tri-panel {
    --size: 80px;
  }
}
.diamond {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  grid-template-rows: repeat(3, max-content);
  gap: var(--gap);
  align-items: center;
  justify-items: center;
}
.hex {
  position: relative;
  width: var(--size);
  height: var(--size);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  -webkit-user-drag: none;
  transition:
    transform 120ms ease,
    opacity 120ms ease,
    filter 120ms ease;
  cursor: pointer;
}
.hex-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: none;
}
.hex-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 47%;
  height: 47%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: none;
}
.top {
  grid-column: 2;
  grid-row: 1;
}
.left {
  grid-column: 1;
  grid-row: 2;
}
.right {
  grid-column: 3;
  grid-row: 2;
}
.bottom {
  grid-column: 2;
  grid-row: 3;
}
.top {
  transform: translateY(var(--topDropY));
}
.left {
  transform: translate(var(--overlapX), calc(-1 * var(--overlapY)));
}
.right {
  transform: translate(calc(-1 * var(--overlapX)), calc(-1 * var(--overlapY)));
}
.bottom {
  transform: translateY(calc(-1 * var(--overlapY) * 2));
}
.hex:is(.top, .left, .right, .bottom):hover {
  filter: brightness(1.08);
}
.is-locked {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.2);
}
.hex.top:hover:not(.is-locked) {
  animation: float-top 1200ms ease-in-out infinite;
}
.hex.left:hover:not(.is-locked) {
  animation: float-left 1200ms ease-in-out infinite;
}
.hex.right:hover:not(.is-locked) {
  animation: float-right 1200ms ease-in-out infinite;
}
.hex.bottom:hover:not(.is-locked) {
  animation: float-bottom 1200ms ease-in-out infinite;
}
@keyframes float-top {
  0% {
    transform: translateY(var(--topDropY)) scale(1);
  }
  50% {
    transform: translateY(calc(var(--topDropY) - 2px)) scale(1.06);
  }
  100% {
    transform: translateY(var(--topDropY)) scale(1);
  }
}
@keyframes float-left {
  0% {
    transform: translate(var(--overlapX), calc(-1 * var(--overlapY))) scale(1);
  }
  50% {
    transform: translate(
        calc(var(--overlapX) + 1px),
        calc(-1 * var(--overlapY) - 2px)
      )
      scale(1.06);
  }
  100% {
    transform: translate(var(--overlapX), calc(-1 * var(--overlapY))) scale(1);
  }
}
@keyframes float-right {
  0% {
    transform: translate(calc(-1 * var(--overlapX)), calc(-1 * var(--overlapY)))
      scale(1);
  }
  50% {
    transform: translate(
        calc(-1 * var(--overlapX) - 1px),
        calc(-1 * var(--overlapY) - 2px)
      )
      scale(1.06);
  }
  100% {
    transform: translate(calc(-1 * var(--overlapX)), calc(-1 * var(--overlapY)))
      scale(1);
  }
}
@keyframes float-bottom {
  0% {
    transform: translateY(calc(-1 * var(--overlapY) * 2)) scale(1);
  }
  50% {
    transform: translateY(calc(-1 * var(--overlapY) * 2 + 2px)) scale(1.06);
  }
  100% {
    transform: translateY(calc(-1 * var(--overlapY) * 2)) scale(1);
  }
}
</style>
