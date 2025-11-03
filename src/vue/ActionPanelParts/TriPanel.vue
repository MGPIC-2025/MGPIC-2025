<script setup>
const props = defineProps({
  canMove: { type: Boolean, default: true },
  canAttack: { type: Boolean, default: true },
});

const emit = defineEmits(['move', 'wait', 'attack']);

const hexSrc = '/assets/your-image.png';
const moveIconSrc = '/assets/boot.png';
const waitIconSrc = '/assets/mushroom.png';
const attackIconSrc = '/assets/sword.png';

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
</script>

<template>
  <div class="tri-panel">
    <div class="tri" aria-label="三角排列图像">
      <div
        class="hex top"
        :title="canMove ? '移动' : '本回合已移动'"
        :class="{ 'is-locked': canMove === false }"
        @click="onMove"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="waitIconSrc" alt="移动图标（蘑菇）" />
      </div>

      <div class="hex left" title="等待" @click="onWait">
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="moveIconSrc" alt="等待图标（靴子）" />
      </div>

      <div
        class="hex right"
        :title="canAttack ? '攻击' : '本回合已攻击'"
        :class="{ 'is-locked': canAttack === false }"
        @click="onAttack"
      >
        <img class="hex-bg" :src="hexSrc" alt="六边形背景" />
        <img class="hex-icon" :src="attackIconSrc" alt="攻击图标（剑）" />
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
.tri {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  grid-template-rows: repeat(2, max-content);
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
.top {
  transform: translateY(var(--topDropY));
}
.left {
  transform: translate(var(--overlapX), calc(-1 * var(--overlapY)));
}
.right {
  transform: translate(calc(-1 * var(--overlapX)), calc(-1 * var(--overlapY)));
}
.hex:is(.top, .left, .right):hover {
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
</style>
