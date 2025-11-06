<script setup>
import log from '../log.js';
import { ref, onMounted } from 'vue';
import { getAssetUrl } from '../utils/resourceLoader.js';

const emit = defineEmits([
  'startGame',
  'openWarehouse',
  'openTutorial',
  'openEncyclopedia',
]);

function startGame() {
  emit('startGame');
}
function openWarehouse() {
  emit('openWarehouse');
}
function openTutorial() {
  emit('openTutorial');
}
function openEncyclopedia() {
  emit('openEncyclopedia');
}

const bgStart = ref(getAssetUrl('frontend_resource/start_game.webp'));
const bgWarehouse = ref(getAssetUrl('frontend_resource/copper_warehouse.webp'));
const bgWiki = ref(getAssetUrl('frontend_resource/game_wiki.webp'));
const bgTutorial = ref(getAssetUrl('frontend_resource/Tutorial.webp'));
// 使用 Vite 的静态资源导入方式
const bgHall = ref(new URL('../../assets/Gemini_Generated_Image_gtrehogtrehogtre (1).png', import.meta.url).href);

onMounted(async () => {
  try {
    if (window.getCacheStatus) {
      const status = await window.getCacheStatus();
      log('缓存状态:', status);
    }
    const imageUrls = [
      bgStart.value,
      bgWarehouse.value,
      bgWiki.value,
      bgTutorial.value,
      bgHall.value,
    ];
    await Promise.allSettled(
      imageUrls.map(
        url =>
          new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              log('背景图片预加载成功:', url);
              resolve();
            };
            img.onerror = () => {
              log('背景图片预加载失败:', url);
              resolve();
            };
            img.src = url;
          })
      )
    );
  } catch (error) {
    log('背景图片预加载过程中出现错误:', error?.message || error);
  }
});
</script>

<template>
  <div class="hall-container">
    <div class="hall-bg" :style="{ backgroundImage: `url('${bgHall}')` }"></div>
    <div class="menu">
    <button
      class="tile tile--start"
      :style="{ backgroundImage: `url('${bgStart}')` }"
      @click="startGame"
    >
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--bottom">
        <div class="tile__title">开始游戏</div>
        <div class="tile__subtitle">Begin Adventure</div>
      </div>
    </button>
    <button
      class="tile tile--warehouse"
      :style="{ backgroundImage: `url('${bgWarehouse}')` }"
      @click="openWarehouse"
    >
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--top">
        <div class="tile__title">铜偶仓库</div>
        <div class="tile__subtitle">Character Collection</div>
      </div>
    </button>
    <button
      class="tile tile--wiki"
      :style="{ backgroundImage: `url('${bgWiki}')` }"
      @click="openEncyclopedia"
    >
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--bottom">
        <div class="tile__title">游戏百科</div>
        <div class="tile__subtitle">Encyclopedia</div>
      </div>
    </button>
    <button
      class="tile tile--tutorial"
      :style="{ backgroundImage: `url('${bgTutorial}')` }"
      @click="openTutorial"
    >
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--top">
        <div class="tile__title">新手教程</div>
        <div class="tile__subtitle">Tutorial</div>
      </div>
    </button>
    </div>
  </div>
</template>

<style scoped>
.hall-container {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}
.hall-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: brightness(0.9);
  z-index: 0;
  pointer-events: none;
}
.menu {
  position: absolute;
  left: 50%;
  top: 52%;
  transform: translate(-50%, -50%);
  width: min(1500px, 96vw);
  height: min(560px, 80vh);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 1fr;
  gap: 36px;
  pointer-events: auto;
  transform-style: preserve-3d;
  perspective: 900px;
  z-index: 1;
}
.tile {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-size: cover;
  background-position: center;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  height: 100%;
  transform: rotateY(0deg);
  transform-origin: center;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    filter 0.3s ease;
  will-change: transform, box-shadow;
}
.tile__mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.05) 30%,
    rgba(0, 0, 0, 0.35) 100%
  );
}
.tile__caption {
  position: absolute;
  left: 18px;
  right: 18px;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}
.tile__caption--bottom {
  bottom: 16px;
}
.tile__caption--top {
  top: 16px;
}
.tile__title {
  font-weight: 800;
  font-size: 28px;
}
.tile__subtitle {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.95;
}
.tile:active {
  transform: translateY(1px);
}
/* 父容器悬停联动与兄弟反向旋转 */
.menu:hover .tile {
  transform: rotateY(18deg);
}
.menu .tile:hover {
  transform: rotateY(0deg) scale(1.12);
  box-shadow: 0 25px 40px rgba(0, 0, 0, 0.35);
  z-index: 1;
}
.menu .tile:hover ~ .tile {
  transform: rotateY(-18deg);
}
@media (max-width: 1200px) {
  .menu {
    width: 94vw;
    gap: 18px;
  }
  .tile__title {
    font-size: 24px;
  }
}
@media (max-width: 992px) {
  .menu {
    grid-template-columns: repeat(2, 1fr);
    height: min(680px, 82vh);
  }
}
@media (max-width: 720px) {
  .menu {
    grid-template-columns: 1fr;
    height: min(720px, 84vh);
    gap: 16px;
  }
  .menu:hover .tile,
  .menu .tile:hover,
  .menu .tile:hover ~ .tile {
    transform: none;
  }
  .tile {
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
  }
}
</style>
