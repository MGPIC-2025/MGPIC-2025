<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['startGame', 'openWarehouse', 'openTutorial', 'openEncyclopedia'])

function startGame() { emit('startGame') }
function openWarehouse() { emit('openWarehouse') }
function openTutorial() { emit('openTutorial') }
function openEncyclopedia() { emit('openEncyclopedia') }
</script>

<template>
  <div class="menu">
    <button class="tile tile--start" @click="startGame">
      <div class="tile__caption">
        <div class="tile__title">开始游戏</div>
        <div class="tile__subtitle"></div>
      </div>
    </button>
    <button class="tile tile--lobby" @click="openWarehouse">
      <div class="tile__caption">
        <div class="tile__title">铜偶仓库</div>
        <div class="tile__subtitle">Copper Warehouse</div>
      </div>
    </button>
    <button class="tile tile--workshop" @click="openTutorial">
      <div class="tile__caption">
        <div class="tile__title">新手教程</div>
        <div class="tile__subtitle">Tutorial</div>
      </div>
    </button>
    <button class="tile tile--home" @click="openEncyclopedia">
      <div class="tile__caption">
        <div class="tile__title">游戏百科</div>
        <div class="tile__subtitle">Game Encyclopedia</div>
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
  width: min(1400px, 96vw);
  height: min(620px, 80vh);
  display: grid;
  grid-template-columns: repeat(4, 1fr); 
  grid-template-rows: 1fr; 
  gap: 18px;
  pointer-events: auto;
}
.tile {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.08);
  background: linear-gradient(135deg, #ffe08a, #facc15);
  box-shadow: 0 10px 24px rgba(0,0,0,0.18);
  cursor: pointer;
  height: 100%;
}
.tile--start { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.tile--lobby { background: linear-gradient(135deg, #60a5fa, #2563eb); }
.tile--workshop { background: linear-gradient(135deg, #94a3b8, #64748b); }
.tile--home { background: linear-gradient(135deg, #fda4af, #f43f5e); }
.tile__title {
  position: absolute;
  left: 18px;
  bottom: 14px;
  color: #fff;
  font-weight: 700;
  font-size: 28px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.35);
}
.tile__caption { position: absolute; left: 18px; right: 18px; bottom: 14px; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.35); }
.tile__subtitle { margin-top: 6px; font-size: 14px; font-weight: 500; opacity: 0.95; }
.tile:active { transform: translateY(1px); }
</style>


