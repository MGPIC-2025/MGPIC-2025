<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import GameControlPanel from './vue/GameControlPanel.vue'

const isPaused = ref(false)
const overlay = ref(null)

// 通过全局函数与开场动画交互
function togglePause() {
  const next = !isPaused.value
  isPaused.value = next
  if (next) {
    window.__START_MENU_PAUSE__ && window.__START_MENU_PAUSE__()
  } else {
    window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__()
  }
}

function openOverlay(type) {
  overlay.value = type
  window.__START_MENU_PAUSE__ && window.__START_MENU_PAUSE__()
  isPaused.value = true
}

function closeOverlay() {
  overlay.value = null
  window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__()
  isPaused.value = false
}
</script>

<template>
  <div class="stage">
    <!-- Three.js 的 canvas 在 index.html 中，Vue 只负责覆盖层 UI -->
    <GameControlPanel
      @startGame="openOverlay('start')"
      @openWarehouse="openOverlay('warehouse')"
      @openTutorial="openOverlay('tutorial')"
      @openEncyclopedia="openOverlay('encyclopedia')"
    />

    <div v-if="overlay" class="overlay">
      <div class="modal">
        <h2 class="modal-title">
          {{
            overlay === 'warehouse' ? '铜偶仓库 · Copper Warehouse' :
            (overlay === 'tutorial' ? '新手教程 · Tutorial' :
            (overlay === 'encyclopedia' ? '游戏百科 · Game Encyclopedia' : '开始游戏 · Start Game'))
          }}
        </h2>
        <p class="modal-body">占位内容（后续替换为实际功能界面）。</p>
        <button class="close-btn" @click="closeOverlay">关闭</button>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  z-index: 9999;
}
.panel {
  position: absolute;
  top: 16px;
  right: 56px;
  display: flex;
  gap: 12px;
  z-index: 1000;
  user-select: none;
  -webkit-user-select: none;
  background: rgba(255,255,255,0.6);
  backdrop-filter: saturate(1.2) blur(6px);
  -webkit-backdrop-filter: saturate(1.2) blur(6px);
  padding: 8px 10px;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  pointer-events: auto;
}
.btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}
.btn:hover { background: #f9fafb; }
.sr-only { position: absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  pointer-events: auto;
}
.modal { width: min(90vw, 520px); background: #fff; border-radius: 12px; padding: 16px 16px 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.modal-title { margin: 0 0 8px 0; font-size: 18px; }
.modal-body { margin: 0 0 12px 0; color: #374151; }
.close-btn { padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; }
.close-btn:hover { background: #f9fafb; }
</style>


