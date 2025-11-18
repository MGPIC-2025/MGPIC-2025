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
import { getSettings, updateSetting } from '../utils/gameSettings.js';
import './StartMenu.css';

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
const controlMode = ref('touchpad');
// 检测是否在 Electron 环境
const isElectron = ref(false);
// 背景图（用于预览效果）
const startBg = ref(
  getAssetUrl('ui/Gemini_Generated_Image_gtrehogtrehogtre (1).png')
);
// 按钮背景面板（使用像素清晰的 border-image）
const panel5Src = `url('${getAssetUrl('@assets/ui/panel4.png')}')`;

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
    // 调整位置让 logo 在屏幕中央显示（向左移动修正偏右问题）
    logoModel.position.set(-center.x, -center.y, -center.z - 0.3);

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
  // 打开设置时，加载当前设置
  const settings = getSettings();
  controlMode.value = settings.controlMode;
  showSettings.value = true;
}
function onCloseSettings() {
  showSettings.value = false;
}

function setControlMode(mode) {
  controlMode.value = mode;
  updateSetting('controlMode', mode);

  // 通知 GameScene 更新控制模式
  if (window.updateControlMode) {
    window.updateControlMode(mode);
  }
  log(`[StartMenu] 设置控制模式: ${mode}`);
}

onMounted(() => {
  showButtons.value = false;
  isReady.value = false;

  // 检测 Electron 环境
  isElectron.value =
    typeof window !== 'undefined' &&
    (window.navigator.userAgent.toLowerCase().includes('electron') ||
      window.process?.type === 'renderer' ||
      !!(
        window.require &&
        window.process &&
        window.process.versions &&
        window.process.versions.electron
      ));

  log('[StartMenu] 组件挂载，开始加载...');
  log('[StartMenu] Electron 环境:', isElectron.value);

  if (!scene && canvasRef.value) {
    scene = new THREE.Scene();
    // 设置透明背景，让背景图片显示
    scene.background = null;

    camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(-3.655, 0.2, -0.006);
    camera.rotation.set(-1.618275, -1.538307, -1.6183, 'XYZ');

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // 启用透明背景
      canvas: canvasRef.value,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // 透明清除颜色

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
    <!-- 顶部提示横幅 (仅在非 Electron 环境显示) -->
    <div v-if="!isElectron" class="download-banner">
      <span class="download-banner__text">
        想要获得帧率更高的游戏体验，请下载本地版本
      </span>
      <a
        href="https://github.com/MGPIC-2025/Cross/releases"
        target="_blank"
        rel="noopener noreferrer"
        class="download-banner__link"
      >
        点击下载
      </a>
    </div>

    <!-- 背景图片层（最底层） -->
    <div
      class="startmenu__bg"
      :style="{ backgroundImage: `url('${startBg}')` }"
    />

    <!-- 3D Canvas 层（透明背景，显示 Logo） -->
    <canvas ref="canvasRef" class="startmenu__canvas" />

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
            <div class="setting-label">视角控制模式</div>
            <div class="setting-options">
              <button
                class="option-btn"
                :class="{ active: controlMode === 'touchpad' }"
                @click="setControlMode('touchpad')"
              >
                <span class="option-title">触控板模式</span>
                <span class="option-desc">需要按住鼠标拖动</span>
              </button>
              <button
                class="option-btn"
                :class="{ active: controlMode === 'mouse' }"
                @click="setControlMode('mouse')"
              >
                <span class="option-title">鼠标模式</span>
                <span class="option-desc">直接移动鼠标转动视角</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.startmenu-btn {
  border-image-source: v-bind(panel5Src);
}
</style>
