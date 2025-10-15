<script setup>
import { defineEmits, onMounted } from 'https://unpkg.com/vue@3.5.21/dist/vue.esm-browser.js'
import { getAssetUrl } from '../utils/resourceLoader.js'

const emit = defineEmits(['startGame', 'openWarehouse', 'openTutorial', 'openEncyclopedia'])

function startGame() { emit('startGame') }
function openWarehouse() { emit('openWarehouse') }
function openTutorial() { emit('openTutorial') }
function openEncyclopedia() { emit('openEncyclopedia') }

// 设置背景图片URL
const bgStart = getAssetUrl('img/hall/start_game.png');
const bgWarehouse = getAssetUrl('img/hall/warehouse.png');
const bgWiki = getAssetUrl('img/hall/wiki.png');
const bgTutorial = getAssetUrl('img/hall/tutorial.png');
</script>

<template>
  <div class="menu">
    <button class="tile tile--start" :style="{ backgroundImage: `url('${bgStart}')` }" @click="startGame">
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--bottom">
        <div class="tile__title">开始游戏</div>
        <div class="tile__subtitle">Start Game</div>
      </div>
    </button>
    <button class="tile tile--warehouse" :style="{ backgroundImage: `url('${bgWarehouse}')` }" @click="openWarehouse">
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--top">
        <div class="tile__title">铜偶仓库</div>
        <div class="tile__subtitle">Copper Warehouse</div>
      </div>
    </button>
    <button class="tile tile--wiki" :style="{ backgroundImage: `url('${bgWiki}')` }" @click="openEncyclopedia">
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--bottom">
        <div class="tile__title">游戏百科</div>
        <div class="tile__subtitle">Game Wiki</div>
      </div>
    </button>
    <button class="tile tile--tutorial" :style="{ backgroundImage: `url('${bgTutorial}')` }" @click="openTutorial">
      <div class="tile__mask"></div>
      <div class="tile__caption tile__caption--top">
        <div class="tile__title">新手教程</div>
        <div class="tile__subtitle">Tutorial</div>
      </div>
    </button>
  </div>
</template>

<style scoped>
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
}
.tile {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.12);
  background-size: cover;
  background-position: center;
  box-shadow: 0 14px 32px rgba(0,0,0,0.22);
  cursor: pointer;
  height: 100%;
}
.tile__mask {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.35) 100%);
}
/* 背景图片现在通过内联样式设置 */

.tile__caption {
  position: absolute; left: 18px; right: 18px; color: #fff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.45);
}
.tile__caption--bottom { bottom: 16px; }
.tile__caption--top { top: 16px; }

.tile__title { font-weight: 800; font-size: 28px; }
.tile__subtitle { margin-top: 6px; font-size: 14px; font-weight: 600; opacity: 0.95; }
.tile:active { transform: translateY(1px); }

@media (max-width: 1200px) {
  .menu { width: 94vw; gap: 18px; }
  .tile__title { font-size: 24px; }
}
</style>


