<script setup>
import { computed } from 'vue';
import { getAssetUrl } from '../../utils/resourceLoader.js';
import './HealthBar.css';

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

// 血条边框资源（<img>标签使用原始URL，CSS使用url()包裹）
const bloodBorderLeftSrc = getAssetUrl('ui/blood-border-left.png');
const bloodBorderRightSrc = getAssetUrl('ui/blood-border-right.png');
// CSS background-image需要url()包裹
const bloodBorderMiddleSrc = `url('${getAssetUrl('ui/blood-border-middle.png')}')`;
const bloodBarSrc = `url('${getAssetUrl('ui/blood-bar.png')}')`;

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
.health-bar__border-middle {
  background-image: v-bind(bloodBorderMiddleSrc);
}
.health-bar__fill {
  background-image: v-bind(bloodBarSrc);
}
</style>
