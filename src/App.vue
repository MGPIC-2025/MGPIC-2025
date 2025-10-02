<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import GameControlPanel from "./vue/GameControlPanel.vue";
import WarehousePanel from "./vue/WarehousePanel.vue";

const isPaused = ref(false);
const overlay = ref(null);
const overlayHistory = ref([]);
const currentPuppetIndex = ref(0)

// 通过全局函数与开场动画交互
function togglePause() {
  const next = !isPaused.value;
  isPaused.value = next;
  if (next) {
    window.__START_MENU_PAUSE__ && window.__START_MENU_PAUSE__();
  } else {
    window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
  }
}

function openOverlay(type) {
  if (overlay.value !== type) {
    overlayHistory.value.push(overlay.value);
    overlay.value = type;
  }
  window.__START_MENU_PAUSE__ && window.__START_MENU_PAUSE__();
  isPaused.value = true;
}

function closeOverlay() {
  overlay.value = null;
  overlayHistory.value = [];
  window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
  isPaused.value = false;
}

function openSettings() {
  openOverlay('settings')
}

function goBack() {
  if (overlay.value) {
    const prev = overlayHistory.value.pop() ?? null;
    overlay.value = prev;
    if (!prev) {
      window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
      isPaused.value = false;
    }
    return;
  }
  // 没有覆盖层时不刷新，保持当前状态
}

// 设置：音乐/存档交互占位
const musicOn = ref(true)
const fileInput = ref(null)
function onToggleMusic() { musicOn.value = !musicOn.value }
function onDownloadSave() {
  try {
    const data = { version: 1, savedAt: Date.now(), payload: {} }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'save.json'
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (_) {}
}
function onUploadSave() {
  try { fileInput.value && fileInput.value.click() } catch (_) {}
}
function onFileChange(ev) {
  try {
    const file = ev.target && ev.target.files && ev.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { JSON.parse(String(reader.result || '{}')) } catch (_) {}
      ev.target.value = ''
    }
    reader.readAsText(file)
  } catch (_) {}
}

</script>

<template>
  <div class="stage">
    <!-- Three.js 的 canvas 在 index.html 中，Vue 只负责覆盖层 UI -->
    <div class="panel" style="left: 24px; right: auto;">
      <button class="btn" @click="goBack" title="返回">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="sr-only">返回</span>
      </button>
      <button class="btn" @click="openSettings" title="设置">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="#ffffff" stroke-width="2"/>
          <path d="M19.4 15A7.964 7.964 0 0 0 20 12C20 11.49 19.95 10.99 19.86 10.5L22 8.5L20 5.5L17.34 6.07C16.78 5.58 16.14 5.18 15.44 4.9L15 2H9L8.56 4.9C7.86 5.18 7.22 5.58 6.66 6.07L4 5.5L2 8.5L4.14 10.5C4.05 10.99 4 11.49 4 12C4 12.51 4.05 13.01 4.14 13.5L2 15.5L4 18.5L6.66 17.93C7.22 18.42 7.86 18.82 8.56 19.1L9 22H15L15.44 19.1C16.14 18.82 16.78 18.42 17.34 17.93L20 18.5L22 15.5L19.86 13.5C19.95 13.01 20 12.51 20 12" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="sr-only">设置</span>
      </button>
    </div>
    <GameControlPanel
      @startGame="openOverlay('start')"
      @openWarehouse="openOverlay('warehouse')"
      @openTutorial="openOverlay('tutorial')"
      @openEncyclopedia="openOverlay('encyclopedia')"
    />
    <div v-if="overlay" class="overlay" :class="{ 'overlay--settings': overlay==='settings', 'overlay--warehouse': overlay==='warehouse' }">
      <template v-if="overlay==='settings'">
        <div class="settings">
          <div class="settings__header">
            <div class="settings__title">设置</div>
            <button class="settings__close" @click="closeOverlay" aria-label="关闭">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="settings__content">
            <button class="settings__item" @click="onToggleMusic">
              <span class="settings__icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18V5l10-2v9" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-6a3 3 0 1 1-6 0" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="settings__label">音乐</span>
              <span class="settings__state">{{ musicOn ? '开' : '关' }}</span>
            </button>

            <button class="settings__item" @click="onDownloadSave">
              <span class="settings__icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M4 19h16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="settings__label">下载存档</span>
            </button>

            <button class="settings__item" @click="onUploadSave">
              <span class="settings__icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21V9m0 0l4 4m-4-4L8 13" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M4 5h16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="settings__label">上传存档</span>
            </button>

            <input ref="fileInput" type="file" accept=".json" @change="onFileChange" style="display:none" />
          </div>
        </div>
      </template>
      <template v-else-if="overlay==='warehouse'">
        <WarehousePanel />
      </template>
      <template v-else>
        <div class="modal">
          <h2 class="modal-title">
            {{
              overlay === 'warehouse'
                ? '铜偶仓库 · Copper Warehouse'
                : overlay === 'tutorial'
                ? '新手教程 · Tutorial'
                : overlay === 'encyclopedia'
                ? '游戏百科 · Game Encyclopedia'
                : '开始游戏 · Start Game'
            }}
          </h2>
          <p class="modal-body">占位内容（后续替换为实际功能界面）。</p>
          <button class="close-btn" @click="closeOverlay">关闭</button>
        </div>
      </template>
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
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: saturate(1.2) blur(6px);
  -webkit-backdrop-filter: saturate(1.2) blur(6px);
  padding: 8px 10px;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}
.btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #3a2519;
  border: 1px solid rgba(255,255,255,0.18);
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
}
.btn:hover { background: #2f1e14; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  pointer-events: auto;
}
.overlay--settings { background: rgba(0,0,0,0.25); align-items: flex-start; justify-content: flex-start; }
.overlay--warehouse { background: transparent; }
.modal {
  width: min(90vw, 520px);
  background: #fff;
  border-radius: 12px;
  padding: 16px 16px 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.modal-title {
  margin: 0 0 8px 0;
  font-size: 18px;
}
.modal-body {
  margin: 0 0 12px 0;
  color: #374151;
}
.close-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
}
.close-btn:hover {
  background: #f9fafb;
}

/* Settings card panel */
.settings { position: relative; margin: 96px 0 0 64px; width: min(1100px, 88vw); max-height: 70vh; background: #2b1a11; color: #fff; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; box-shadow: 0 18px 40px rgba(0,0,0,0.35); }
.settings__header { height: 60px; background: #1f130c; display: flex; align-items: center; justify-content: space-between; padding: 0 14px 0 20px; }
.settings__title { font-size: 26px; font-weight: 900; letter-spacing: 1px; color: #fff; }
.settings__close { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.12); border: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.settings__close:hover { background: rgba(255,255,255,0.18); }
.settings__content { padding: 16px 18px; display: flex; flex-direction: column; gap: 18px; overflow: auto; }
.settings__item { display: flex; align-items: center; gap: 16px; background: #3a2519; border: 0; border-radius: 14px; padding: 12px 14px; cursor: pointer; text-align: left; color: #fff; }
.settings__item:hover { background: #3f281c; }
.settings__icon { width: 56px; height: 56px; border-radius: 50%; background: #4b2e1f; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.settings__label { font-size: 24px; font-weight: 800; letter-spacing: 0.5px; color: #fff; }
.settings__state { margin-left: auto; font-size: 18px; opacity: 0.9; color: #fff; }

</style>
