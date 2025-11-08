<script setup>
import log from './log.js';
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Hall from './vue/Hall.vue';
import Warehouse from './vue/Warehouse.vue';
import TopLeftPanel from './vue/TopLeftPanel.vue';
import StartMenu from './vue/StartMenu.vue';
import StartGame from './vue/StartGame.vue';
import GameScene from './vue/GameScene.vue';
import { getAssetUrl } from './utils/resourceLoader.js';

// 导入glue.js以触发消息处理器注册
import './glue.js';
import { info_subscribe } from './glue.js';

const isPaused = ref(false);
const overlay = ref(null);
const showSettingsOverlay = ref(false);
const warehouseRef = ref(null);
const overlayHistory = ref([]);
const currentPuppetIndex = ref(0);
const showStartMenu = ref(true);
const showGameScene = ref(false); // 控制游戏场景显示
const destroyStartMenu = ref(false); // 控制是否完全销毁StartMenu以释放内存
let startMenuDestroyTimer = null;

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

function onStartMenuStarted() {
  showStartMenu.value = false;
  // StartMenu隐藏时自动暂停渲染，不需要手动调用pause

  // 设置定时器：5分钟后销毁StartMenu以释放内存
  if (startMenuDestroyTimer) {
    clearTimeout(startMenuDestroyTimer);
  }
  startMenuDestroyTimer = setTimeout(
    () => {
      if (!showStartMenu.value) {
        log('[App] 销毁StartMenu以释放内存');
        destroyStartMenu.value = true;
      }
    },
    5 * 60 * 1000
  ); // 5分钟
}

function closeOverlay() {
  overlay.value = null;
  overlayHistory.value = [];
  window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
  isPaused.value = false;
}

function handleGameStart(params) {
  log('[App] 游戏开始，铜偶ID:', params.ids);
  closeOverlay();
  // 跳转到游戏场景
  showGameScene.value = true;
  log('[App] 已切换到游戏场景');
}

function closeGameScene() {
  showGameScene.value = false;
  // 从游戏场景返回时，保持在大厅状态
}

function openSettings() {
  showSettingsOverlay.value = true;
  isPaused.value = true;
}
function closeSettings() {
  showSettingsOverlay.value = false;
  // 如果没有其他覆盖层，则恢复
  if (!overlay.value) {
    window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
    isPaused.value = false;
  }
}

function goBack() {
  // 优先关闭设置浮层
  if (showSettingsOverlay.value) {
    closeSettings();
    return;
  }
  if (overlay.value) {
    // 若为仓库界面，优先让子组件处理返回（先关闭抽卡界面）
    if (
      overlay.value === 'warehouse' &&
      warehouseRef.value &&
      warehouseRef.value.handleBack
    ) {
      const consumed = warehouseRef.value.handleBack();
      if (consumed) return;
    }
    const prev = overlayHistory.value.pop() ?? null;
    overlay.value = prev;
    if (!prev) {
      // 覆盖层关闭后，不需要做额外处理，保持在大厅状态
      // 不再自动返回开始菜单
      isPaused.value = false;
    }
    return;
  }
  // 没有覆盖层：若当前不在开始菜单，则回到开始菜单
  if (!showStartMenu.value) {
    // 取消销毁定时器
    if (startMenuDestroyTimer) {
      clearTimeout(startMenuDestroyTimer);
      startMenuDestroyTimer = null;
    }
    // 如果StartMenu已被销毁，需要重新创建
    if (destroyStartMenu.value) {
      destroyStartMenu.value = false;
      log('[App] 重新创建StartMenu');
    }
    showStartMenu.value = true;
    // 恢复开始菜单动画（StartMenu 常驻，使用全局钩子控制）
    // 增加延迟确保组件完全挂载和场景初始化
    setTimeout(() => {
      if (window.__INIT_THREE_SCENE__) {
        window
          .__INIT_THREE_SCENE__()
          .then(() => {
            window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
          })
          .catch(() => {
            window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
          });
      } else {
        window.__START_MENU_RESUME__ && window.__START_MENU_RESUME__();
      }
    }, 100); // 延迟以确保组件已挂载
    isPaused.value = false;
    return;
  }
  // 其余情况保持当前状态
}

// 设置：音乐/存档交互占位
const musicOn = ref(true);
const fileInput = ref(null);
const audioRef = ref(null);
const musicUrl = getAssetUrl('ui/铜偶的探险.mp3');

function onToggleMusic() {
  musicOn.value = !musicOn.value;
  if (audioRef.value) {
    if (musicOn.value) {
      audioRef.value.play().catch(err => {
        console.log('播放音乐失败:', err);
      });
    } else {
      audioRef.value.pause();
    }
  }
}
function onDownloadSave() {
  try {
    const data = { version: 1, savedAt: Date.now(), payload: {} };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'save.json';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (_) {}
}
function onUploadSave() {
  try {
    fileInput.value && fileInput.value.click();
  } catch (_) {}
}
function onFileChange(ev) {
  try {
    const file = ev.target && ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        JSON.parse(String(reader.result || '{}'));
      } catch (_) {}
      ev.target.value = '';
    };
    reader.readAsText(file);
  } catch (_) {}
}

onMounted(() => {
  info_subscribe(message => {
    // Messages are handled by messageQueue
  });
  // 首次启动默认开启音乐，尝试自动播放
  nextTick(() => {
    if (musicOn.value && audioRef.value) {
      audioRef.value.play().catch(err => {
        // 浏览器可能阻止自动播放，需要用户交互后才能播放
        // 这会在用户首次点击时自动播放
        console.log('自动播放音乐失败（需要用户交互）:', err);
      });
    }
  });
});

// 清理定时器
onBeforeUnmount(() => {
  if (startMenuDestroyTimer) {
    clearTimeout(startMenuDestroyTimer);
    startMenuDestroyTimer = null;
  }
  // 清理音频
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value = null;
  }
});
</script>

<template>
  <div class="stage">
    <!-- 3D游戏场景 - 使用v-if完全销毁以节省资源 -->
    <GameScene
      v-if="showGameScene"
      :isGameMode="true"
      @back="closeGameScene"
    />

    <!-- 主界面 -->
    <template v-if="!showGameScene">
      <!-- StartMenu: 隐藏时保留5分钟，之后销毁以释放内存 -->
      <StartMenu
        v-if="!destroyStartMenu"
        v-show="showStartMenu"
        :visible="showStartMenu"
        @started="onStartMenuStarted"
      />
      <TopLeftPanel
        v-if="!showStartMenu"
        @back="goBack"
        @open-settings="openSettings"
      />
      <Hall
        @startGame="openOverlay('start')"
        @openWarehouse="openOverlay('warehouse')"
        @openTutorial="openOverlay('tutorial')"
        @openEncyclopedia="openOverlay('encyclopedia')"
      />
      <div
        v-if="overlay"
        class="overlay"
        :class="{ 'overlay--warehouse': overlay === 'warehouse' }"
      >
        <template v-if="overlay === 'warehouse'">
          <div style="position: relative; width: 100%; height: 100%">
            <TopLeftPanel @back="goBack" @open-settings="openSettings" />
            <Warehouse ref="warehouseRef" />
          </div>
        </template>
        <template v-else-if="overlay === 'start'">
          <StartGame @close="closeOverlay" @confirm="handleGameStart" />
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
    </template>

    <!-- 独立设置浮层，覆盖在所有内容之上 -->
    <div
      v-if="showSettingsOverlay"
      class="overlay"
      style="
        z-index: 30000;
        align-items: flex-start;
        justify-content: flex-start;
        background: rgba(0, 0, 0, 0.25);
      "
    >
      <div class="settings">
        <div class="settings__header">
          <div class="settings__title">设置</div>
          <button
            class="settings__close"
            @click="closeSettings"
            aria-label="关闭"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div class="settings__content">
          <button class="settings__item" @click="onToggleMusic">
            <span class="settings__icon">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18V5l10-2v9"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-6a3 3 0 1 1-6 0"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="settings__label">音乐</span>
            <span class="settings__state">{{ musicOn ? '开' : '关' }}</span>
          </button>

          <button class="settings__item" @click="onDownloadSave">
            <span class="settings__icon">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 3v12m0 0l-4-4m4 4l4-4"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4 19h16"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="settings__label">下载存档</span>
          </button>

          <button class="settings__item" @click="onUploadSave">
            <span class="settings__icon">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 21V9m0 0l4 4m-4-4L8 13"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4 5h16"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="settings__label">上传存档</span>
          </button>

          <input
            ref="fileInput"
            type="file"
            accept=".json"
            @change="onFileChange"
            style="display: none"
          />
        </div>
      </div>
    </div>
    <audio
      ref="audioRef"
      :src="musicUrl"
      loop
      preload="auto"
      @play="musicOn = true"
      @pause="musicOn = false"
      @ended="musicOn = false"
    ></audio>
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
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  padding: 8px 10px;
  border-radius: 10px;
  box-shadow: none;
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
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.btn:hover {
  background: #2f1e14;
}
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
  z-index: 20000;
  pointer-events: auto;
  transition: opacity 0.15s ease-out;
  will-change: opacity;
}
.overlay--settings {
  background: rgba(0, 0, 0, 0.25);
  align-items: flex-start;
  justify-content: flex-start;
}
.overlay--warehouse {
  background: transparent;
}
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
.settings {
  position: relative;
  margin: 96px 0 0 64px;
  width: min(1100px, 88vw);
  max-height: 70vh;
  background: #2b1a11;
  color: #fff;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}
.settings__header {
  height: 60px;
  background: #1f130c;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 20px;
}
.settings__title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #fff;
}
.settings__close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.settings__close:hover {
  background: rgba(255, 255, 255, 0.18);
}
.settings__content {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: auto;
}
.settings__item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #3a2519;
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  color: #fff;
}
.settings__item:hover {
  background: #3f281c;
}
.settings__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #4b2e1f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.settings__label {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #fff;
}
.settings__state {
  margin-left: auto;
  font-size: 18px;
  opacity: 0.9;
  color: #fff;
}
</style>
