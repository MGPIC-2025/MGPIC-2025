<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { getAssetUrl, precacheAllResources, getCacheStatus } from "../utils/resourceLoader.js";

const canvasRef = ref(null);
const uiRootRef = ref(null);
let scene = null;
let camera = null;
let renderer = null;
let animationId = null;
let logoObject = null;
let baseScale = 1.2;
const isReady = ref(false);
const showSettings = ref(false);

// 对外事件（仅对外通知 started；设置改为本地弹层）
const emit = defineEmits(["started"]);

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
}

function resume() {
  if (!animationId) {
    renderLoop();
  }
}

function destroyScene() {
  try { pause(); } catch (_) {}
  try { window.removeEventListener("resize", handleResize); } catch (_) {}
  try {
    if (scene) {
      scene.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m && m.dispose && m.dispose());
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
      const lose = gl && gl.getExtension && gl.getExtension("WEBGL_lose_context");
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

  // 步骤1：初始化基础场景
  if (onProgress) onProgress(0, 100, 10);
  await new Promise(resolve => setTimeout(resolve, 30));

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#a0a0a0");

  camera = new THREE.PerspectiveCamera(50, 1.333, 0.1, 1000);
  camera.position.set(-3.655, 0.2, -0.006);
  camera.rotation.set(-1.618275, -1.538307, -1.6183, "XYZ");

  // 步骤2：初始化渲染器
  if (onProgress) onProgress(0, 100, 20);
  await new Promise(resolve => setTimeout(resolve, 30));

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasRef.value });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // 步骤3：设置光照
  if (onProgress) onProgress(0, 100, 30);
  await new Promise(resolve => setTimeout(resolve, 30));

  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 12.5);
  directionalLight.position.set(-5, -2, 1);
  scene.add(directionalLight);

  // 步骤4：初始化DRACO解码器
  if (onProgress) onProgress(0, 100, 40);
  await new Promise(resolve => setTimeout(resolve, 50));

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  // 步骤5：检查模型文件
  if (onProgress) onProgress(0, 100, 50);
  await new Promise(resolve => setTimeout(resolve, 30));

  const logoUrl = (window.getAssetUrl ? window.getAssetUrl("logo.glb") : "./assets/logo.glb");

  const tryLoad = () => new Promise((resolve, reject) => {
    loader.load(logoUrl, (gltf) => resolve(gltf), undefined, (err) => reject(err));
  });

  try {
    // 步骤6：下载模型文件
    if (onProgress) onProgress(0, 100, 60);
    const head = await fetch(logoUrl, { method: "HEAD", mode: "cors", credentials: "omit" });
    if (!head.ok) throw new Error("logo not ok");
    
    if (onProgress) onProgress(0, 100, 70);
    const gltf = await tryLoad();
    
    // 步骤7：设置模型
    if (onProgress) onProgress(0, 100, 80);
    gltf.scene.position.set(0, 0, 0);
    scene.add(gltf.scene);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.set(-center.x, -center.y, -center.z);
    try { gltf.scene.scale.setScalar(baseScale); } catch (_) {}
    logoObject = gltf.scene;
    
    // 步骤8：启动渲染
    if (onProgress) onProgress(0, 100, 90);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    isReady.value = true;
    if (onProgress) onProgress(0, 100, 100);
    
  } catch (_) {
    try {
      if (onProgress) onProgress(0, 100, 60);
      const gltf = await tryLoad();
      
      if (onProgress) onProgress(0, 100, 80);
      gltf.scene.position.set(0, 0, 0);
      scene.add(gltf.scene);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      gltf.scene.position.set(-center.x, -center.y, -center.z);
      try { gltf.scene.scale.setScalar(baseScale); } catch (_) {}
      logoObject = gltf.scene;
      
      if (onProgress) onProgress(0, 100, 90);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      isReady.value = true;
      if (onProgress) onProgress(0, 100, 100);
    } catch (e) {
      console.warn('3D模型加载失败，使用占位符');
      // 创建占位符
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const placeholder = new THREE.Mesh(geometry, material);
      scene.add(placeholder);
      logoObject = placeholder;
      
      if (onProgress) onProgress(0, 100, 100);
      isReady.value = true;
    }
  }

  window.addEventListener("resize", handleResize);
  renderLoop();

  // 暴露全局暂停/恢复以兼容现有 App.vue 调用
  window.__START_MENU_PAUSE__ = () => pause();
  window.__START_MENU_RESUME__ = () => resume();
}

function onStart() {
  emit("started");
  // 仅暂停渲染，保留资源以便快速返回
  pause();
}

function onOpenSettings() { showSettings.value = true }
function onCloseSettings() { showSettings.value = false }

onMounted(() => {
  // 外部会在资源加载完成后调用此函数
  window.__INIT_THREE_SCENE__ = async (onProgress) => {
    if (scene && logoObject) return; // 场景已存在，跳过重复初始化
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
    <div ref="uiRootRef" class="startmenu-ui" v-show="isReady">
      <button id="start-btn" class="startmenu-btn" aria-label="开始" @click="onStart">开始</button>
      <button id="settings-btn" class="startmenu-btn" aria-label="设置" @click="onOpenSettings">设置</button>
    </div>
    <div v-if="showSettings" class="settings-local">
      <div class="settings-local__card">
        <div class="settings-local__header">
          <div class="settings-local__title">设置</div>
          <button class="settings-local__close" @click="onCloseSettings" aria-label="关闭">✕</button>
        </div>
        <div class="settings-local__content">
          <div class="settings-local__row">此处放置开始界面相关设置（占位）。</div>
        </div>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.startmenu { position: fixed; inset: 0; z-index: 10001; background: #a0a0a0; }
.startmenu__canvas { width: 100%; height: 100%; display: block; background: #a0a0a0; }
.startmenu-ui{position:fixed;left:50%;top:72%;transform:translate(-50%,-50%);z-index:10000;display:flex;flex-direction:column;align-items:center;gap:28px;pointer-events:none}
.startmenu-btn{pointer-events:auto;padding:20px 64px;border-radius:20px;border:none;background:#2a1a0f;color:#fff;font-size:32px;font-weight:800;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,0.35);width:min(560px,64vw);min-height:72px;transition:transform .12s ease,box-shadow .12s ease}
.startmenu-btn:hover{transform:translateY(-1px);box-shadow:0 16px 36px rgba(0,0,0,0.32)}
.startmenu-btn:active{transform:translateY(0)}
@media (max-width:900px){.startmenu-ui{top:70%}.startmenu-btn{width:86vw;padding:16px 0;font-size:26px;border-radius:16px;min-height:64px}}

/* 本地设置弹层样式 */
.settings-local { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 10002; }
.settings-local__card { width: min(90vw, 520px); background: #2b1a11; color: #fff; border-radius: 14px; box-shadow: 0 18px 40px rgba(0,0,0,0.35); overflow: hidden; }
.settings-local__header { height: 56px; background: #1f130c; display: flex; align-items: center; justify-content: space-between; padding: 0 14px 0 18px; }
.settings-local__title { font-size: 22px; font-weight: 900; }
.settings-local__close { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.12); border: 0; color: #fff; cursor: pointer; }
.settings-local__close:hover { background: rgba(255,255,255,0.18); }
.settings-local__content { padding: 16px; }
.settings-local__row { padding: 12px; background: #3a2519; border-radius: 12px; }
</style>


