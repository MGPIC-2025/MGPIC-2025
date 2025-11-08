<script setup>
import log from '../log.js';
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import {
  getAssetUrl,
  precacheAllResources,
  getCacheStatus,
} from '../utils/resourceLoader.js';
import modelPreloadManager from '../utils/modelPreloadManager.js';
import { modelCache } from '../utils/modelCache.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
});

const canvasRef = ref(null);
let scene = null;
let camera = null;
let renderer = null;
let animationId = null;
let logoObject = null;
let baseScale = 1.2;
const isReady = ref(false);
const showButtons = ref(false);
const showSettings = ref(false);
// 背景图（用于预览效果）
const startBg = ref(getAssetUrl('ui/Gemini_Generated_Image_gtrehogtrehogtre (1).png'));

// 对外事件（仅对外通知 started；设置改为本地弹层）
const emit = defineEmits(['started']);

// 监听可见性变化，自动恢复/暂停渲染
watch(
  () => props.visible,
  visible => {
    if (visible && scene && logoObject) {
      resume();
    } else if (!visible) {
      pause();
    }
  }
);

function renderLoop() {
  animationId = requestAnimationFrame(renderLoop);
  if (logoObject) {
    const time = Date.now() * 0.001;
    logoObject.position.y = Math.sin(time * 0.8) * 0.1;
    logoObject.rotation.y = Math.sin(time * 0.6) * 0.1;
    const scale = baseScale + Math.sin(time * 1.2) * 0.04;
    logoObject.scale.setScalar(scale);
  }
  renderer && renderer.render(scene, camera);
}

function handleResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function pause() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  // 额外清理：停止渲染器的自动更新
  if (renderer) {
    renderer.setAnimationLoop(null);
  }
}

function resume() {
  if (!animationId) {
    renderLoop();
  }
}

function destroyScene() {
  try {
    pause();
  } catch (_) {}
  try {
    window.removeEventListener('resize', handleResize);
  } catch (_) {}
  try {
    if (scene) {
      scene.traverse(obj => {
        if (obj.isMesh) {
          if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach(m => m && m.dispose && m.dispose());
          } else if (mat && mat.dispose) {
            mat.dispose();
          }
        }
      });
      scene.clear();
    }
  } catch (_) {}
  try {
    if (renderer) {
      renderer.clear(true, true, true);
      renderer.dispose();
      const gl = renderer.getContext && renderer.getContext();
      const lose =
        gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
      if (lose && lose.loseContext) lose.loseContext();
    }
  } catch (_) {}
  scene = null;
  camera = null;
  renderer = null;
  logoObject = null;
}

async function initScene(onProgress = null) {
  // 暴露资源加载器到全局，兼容旧逻辑
  try {
    window.getAssetUrl = getAssetUrl;
    window.precacheAllResources = precacheAllResources;
    window.getCacheStatus = getCacheStatus;
  } catch (_) {}

  if (!scene || !renderer) {
    log('[StartMenu] Scene or renderer not initialized in onMounted');
    return;
  }

  // 步骤1：设置光照
  if (onProgress) onProgress(0, 100, 20);

  // 只在没有光照时添加
  const hasLight = scene.children.some(child => child.isLight);
  if (!hasLight) {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 12.5);
    directionalLight.position.set(-5, -2, 1);
    scene.add(directionalLight);
  }

  // 步骤2：准备加载Logo
  if (onProgress) onProgress(0, 100, 50);

  const logoUrl = getAssetUrl('logo.glb');

  try {
    // 步骤3：从Cache Storage或网络加载Logo模型
    if (onProgress) onProgress(0, 100, 60);
    log('[StartMenu] 开始加载Logo模型...');
    
    const logoModel = await modelCache.loadModel(logoUrl, true);

    // 步骤4：设置模型
    if (onProgress) onProgress(0, 100, 80);
    logoModel.position.set(0, 0, 0);
    scene.add(logoModel);
    const box = new THREE.Box3().setFromObject(logoModel);
    const center = box.getCenter(new THREE.Vector3());
    logoModel.position.set(-center.x, -center.y, -center.z);
    try {
      logoModel.scale.setScalar(baseScale);
    } catch (_) {}
    logoObject = logoModel;

    // 步骤8：预加载游戏模型
    if (onProgress) onProgress(0, 100, 80);
    log('[StartMenu] Logo 加载完成，开始预加载游戏模型...');

    try {
      await modelPreloadManager.startPreload(
        ['high', 'medium'],
        (loaded, total, percentage) => {
          // 将模型预加载进度映射到80-95%的进度条范围
          const mappedProgress = 80 + percentage * 0.15;
          if (onProgress) onProgress(0, 100, Math.round(mappedProgress));
          log(
            `[StartMenu] 模型预加载进度: ${loaded}/${total} (${percentage}%)`
          );
        }
      );
      log('[StartMenu] 所有游戏模型预加载完成');
    } catch (err) {
      log('[StartMenu] 游戏模型预加载失败:', err);
    }

    // 步骤9：完成
    if (onProgress) onProgress(0, 100, 100);
    isReady.value = true;
    log('[StartMenu] 所有资源加载完成');

    showButtons.value = true;
  } catch (e) {
    log('[StartMenu] 3D模型加载失败，使用占位符', e);
    // 创建占位符，不影响启动速度
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const placeholder = new THREE.Mesh(geometry, material);
    scene.add(placeholder);
    logoObject = placeholder;

    // 即使使用占位符也要预加载游戏模型
    log('[StartMenu] 使用占位符，开始预加载游戏模型...');

    try {
      await modelPreloadManager.startPreload(
        ['high', 'medium'],
        (loaded, total, percentage) => {
          // 将模型预加载进度映射到80-95%的进度条范围
          const mappedProgress = 80 + percentage * 0.15;
          if (onProgress) onProgress(0, 100, Math.round(mappedProgress));
          log(
            `[StartMenu] 模型预加载进度: ${loaded}/${total} (${percentage}%)`
          );
        }
      );
      log('[StartMenu] 所有游戏模型预加载完成');
    } catch (err) {
      log('[StartMenu] 游戏模型预加载失败:', err);
    }

    if (onProgress) onProgress(0, 100, 100);
    isReady.value = true;
    log('[StartMenu] 所有资源加载完成（使用占位符）');

    showButtons.value = true;
  }

  // 暴露全局暂停/恢复以兼容现有 App.vue 调用
  window.__START_MENU_PAUSE__ = () => pause();
  window.__START_MENU_RESUME__ = () => resume();
}

function onStart() {
  emit('started');
  // 仅暂停渲染，保留资源以便快速返回
  pause();
}

function onOpenSettings() {
  showSettings.value = true;
}
function onCloseSettings() {
  showSettings.value = false;
}

onMounted(() => {
  showButtons.value = false;
  isReady.value = false;

  log('[StartMenu] 组件挂载，开始加载...');

  if (!scene && canvasRef.value) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#a0a0a0');

    camera = new THREE.PerspectiveCamera(50, 1.333, 0.1, 1000);
    camera.position.set(-3.655, 0.2, -0.006);
    camera.rotation.set(-1.618275, -1.538307, -1.6183, 'XYZ');

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvasRef.value,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    window.addEventListener('resize', handleResize);
    renderLoop();

    // 不在这里调用initScene，等待__INIT_THREE_SCENE__调用
    log('[StartMenu] 场景已初始化，等待进度条调用');
  } else if (scene && !logoObject) {
    log('[StartMenu] 场景已存在，等待进度条调用');
  } else if (logoObject) {
    log('[StartMenu] Logo已存在，直接显示');
    showButtons.value = true;
    isReady.value = true;
  }

  window.__INIT_THREE_SCENE__ = async onProgress => {
    if (scene && logoObject) {
      log('[StartMenu] 场景和Logo已存在，直接显示按钮');
      showButtons.value = true;
      isReady.value = true;
      return;
    }

    log('[StartMenu] 开始初始化3D场景...');
    await initScene(onProgress);
  };
});

onBeforeUnmount(() => {
  destroyScene();
});
</script>

<template>
  <div class="startmenu">
    <canvas ref="canvasRef" class="startmenu__canvas" />

    <!-- 背景图片覆盖层（仅用于预览效果） - 暂时禁用以避免CORS阻塞 -->
    <!-- <div
      class="startmenu__bg"
      :style="{ backgroundImage: `url('${startBg}')` }"
    /> -->

    <div
      class="startmenu-ui"
      v-show="showButtons"
      :class="{ 'fade-in': showButtons }"
    >
      <button
        id="start-btn"
        class="startmenu-btn"
        aria-label="开始"
        @click="onStart"
      >
        开始
      </button>
      <button
        id="settings-btn"
        class="startmenu-btn"
        aria-label="设置"
        @click="onOpenSettings"
      >
        设置
      </button>
    </div>
    <div v-if="showSettings" class="settings-local">
      <div class="settings-local__card">
        <div class="settings-local__header">
          <div class="settings-local__title">设置</div>
          <button
            class="settings-local__close"
            @click="onCloseSettings"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div class="settings-local__content">
          <div class="settings-local__row">
            此处放置开始界面相关设置（占位）。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.startmenu {
  position: fixed;
  inset: 0;
  z-index: 10001;
  background: #a0a0a0;
}
.startmenu__canvas {
  width: 100%;
  height: 100%;
  display: block;
  background: #a0a0a0;
}

.startmenu__bg {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: brightness(0.9);
  z-index: 9999; /* 低于UI按钮（10000），高于canvas */
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.startmenu-ui {
  position: fixed;
  left: 50%;
  top: 72%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  pointer-events: none;
}
.startmenu-ui.fade-in {
  animation: fadeInUp 0.4s ease-out forwards;
}
.startmenu-btn {
  pointer-events: auto;
  padding: 20px 64px;
  border-radius: 20px;
  border: none;
  background: #2a1a0f;
  color: #fff;
  font-size: 32px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  width: min(560px, 64vw);
  min-height: 72px;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}
.startmenu-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.32);
}
.startmenu-btn:active {
  transform: translateY(0);
}
@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
}
@media (max-width: 900px) {
  .startmenu-ui {
    top: 70%;
  }
  .startmenu-btn {
    width: 86vw;
    padding: 16px 0;
    font-size: 26px;
    border-radius: 16px;
    min-height: 64px;
  }
}

/* 本地设置弹层样式 */
.settings-local {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
}
.settings-local__card {
  width: min(90vw, 520px);
  background: #2b1a11;
  color: #fff;
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.settings-local__header {
  height: 56px;
  background: #1f130c;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 18px;
}
.settings-local__title {
  font-size: 22px;
  font-weight: 900;
}
.settings-local__close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 0;
  color: #fff;
  cursor: pointer;
}
.settings-local__close:hover {
  background: rgba(255, 255, 255, 0.18);
}
.settings-local__content {
  padding: 16px;
}
.settings-local__row {
  padding: 12px;
  background: #3a2519;
  border-radius: 12px;
}
</style>
