<script setup>
import { computed } from 'vue';

const props = defineProps({
  hp: {
    type: Number,
    default: 0,
  },
  maxHp: {
    type: Number,
    default: 100,
  },
});

// 血条边框资源
const bloodBorderLeftSrc = new URL(
  '../../../assets/blood-border-left.png',
  import.meta.url
).href;
const bloodBorderRightSrc = new URL(
  '../../../assets/blood-border-right.png',
  import.meta.url
).href;

const hpPercentage = computed(() => {
  if (!props.maxHp || props.maxHp === 0) return 0;
  // 确保血量在有效范围内
  const currentHp = Math.max(0, Math.min(props.hp, props.maxHp));
  const percentage = (currentHp / props.maxHp) * 100;
  // 限制在 0-100 之间
  return Math.max(0, Math.min(100, percentage));
});

const hpText = computed(() => {
  const currentHp = Math.max(0, Math.min(props.hp, props.maxHp));
  const maxHp = props.maxHp || 100;
  return `${Math.round(currentHp)}/${Math.round(maxHp)}`;
});
</script>

<template>
  <div class="health-bar" aria-label="Health Bar">
    <div class="health-bar__border">
      <div class="health-bar__border-left">
        <img :src="bloodBorderLeftSrc" alt="血条左边框" />
      </div>
      <div class="health-bar__border-middle"></div>
      <div class="health-bar__border-right">
        <img :src="bloodBorderRightSrc" alt="血条右边框" />
      </div>
      <!-- 血条填充 -->
      <div
        class="health-bar__fill"
        :style="{ width: `calc(${hpPercentage}% + 20px)` }"
      ></div>
      <!-- 血量文字 -->
      <div class="health-bar__text">{{ hpText }}</div>
    </div>
  </div>
</template>

<style scoped>
/* 血条样式 */
.health-bar {
  position: absolute;
  left: 20px;
  bottom: 20px;
  width: min(360px, 40vw);
  transform: scale(0.7);
  transform-origin: left bottom;
  z-index: 6000;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.health-bar__border {
  display: flex;
  width: 100%;
  align-items: stretch;
  position: relative;
}

.health-bar__border-left,
.health-bar__border-middle,
.health-bar__border-right {
  display: flex;
  align-items: stretch;
}

.health-bar__border-left,
.health-bar__border-right {
  flex-shrink: 0;
  width: 56px;
}

.health-bar__border-left img,
.health-bar__border-right img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.health-bar__border-middle {
  flex: 1;
  min-width: 0;
  background-image: url('../../../assets/blood-border-middle.png');
  background-repeat: repeat-x;
  background-size: auto 100%;
  background-position: left center;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.health-bar__fill {
  position: absolute;
  left: -10px;
  top: 0;
  bottom: 0;
  height: 100%;
  background-image: url('../../../assets/blood-bar.png');
  background-repeat: no-repeat;
  background-size: 100% 100%;
  background-position: left center;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  z-index: 1;
  transition: width 0.3s ease;
}

.health-bar__text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
}
</style>
