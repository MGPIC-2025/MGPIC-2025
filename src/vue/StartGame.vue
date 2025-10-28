<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { get_copper_list, eventloop } from "../glue.js";
import { getAssetUrl, getCopperModelUrl } from "../utils/resourceLoader.js";
import modelCache from "../utils/modelCache.js";
import {
  getCopperEnglishName,
  getCopperTypeFolder,
} from "../utils/copperMapping.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const emit = defineEmits(["confirm", "close"]);

const loading = ref(true);
const error = ref("");
const copperList = ref([]);
const selectedIds = ref(new Set());
const previewContainer = ref(null);

let scene, camera, renderer, controls;
let gltfLoader;
const loadedModels = new Map(); // copper id -> model object

const canConfirm = computed(() => selectedIds.value.size === 3);

const selectedCoppers = computed(() => {
  return copperList.value.filter((c) => selectedIds.value.has(c.id));
});

function init3DScene() {
  if (!previewContainer.value) return;

  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    45,
    previewContainer.value.clientWidth / previewContainer.value.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 3, 8);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    previewContainer.value.clientWidth,
    previewContainer.value.clientHeight
  );
  renderer.setPixelRatio(window.devicePixelRatio);
  previewContainer.value.appendChild(renderer.domElement);

  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);

  // 添加环境光（提供基础照明）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // 主光源（从前上方照射，照亮铜偶正面）
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(0, 5, 10); // 从相机方向照射
  scene.add(mainLight);

  // 补光（从侧面照射，增加立体感）
  const sideLight1 = new THREE.DirectionalLight(0xaaccff, 0.4);
  sideLight1.position.set(-5, 3, 5);
  scene.add(sideLight1);

  const sideLight2 = new THREE.DirectionalLight(0xffccaa, 0.4);
  sideLight2.position.set(5, 3, 5);
  scene.add(sideLight2);

  // 背光（从后上方照射，勾勒轮廓）
  const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
  backLight.position.set(0, 5, -5);
  scene.add(backLight);

  // 添加地板
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // 初始化GLTF加载器
  gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
  );
  gltfLoader.setDRACOLoader(dracoLoader);

  // 开始动画循环
  animate3D();

  // 窗口大小调整
  window.addEventListener("resize", onWindowResize);
}

function animate3D() {
  requestAnimationFrame(animate3D);
  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function onWindowResize() {
  if (!previewContainer.value || !camera || !renderer) return;
  camera.aspect =
    previewContainer.value.clientWidth / previewContainer.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    previewContainer.value.clientWidth,
    previewContainer.value.clientHeight
  );
}

function toggleSelect(id) {
  const set = selectedIds.value;
  if (set.has(id)) {
    set.delete(id);
  } else {
    if (set.size >= 3) return; // 最多选择3个
    set.add(id);
  }
  selectedIds.value = new Set(set);
}

async function loadCopperModel(copper, index) {
  if (!scene || !gltfLoader) return;
  let modelUrl = copper.modelUrl;
    console.log(`[StartGame] 使用后端model_url加载: ${copper.name}, URL: ${modelUrl}`);

  try {
    // 使用全局模型缓存管理器
    const modelInstance = await modelCache.loadModel(modelUrl, true);
    console.log(`[StartGame] 从缓存加载铜偶模型: ${copper.name}`);

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(modelInstance);
    const size = box.getSize(new THREE.Vector3());

    // 创建容器组
    const group = new THREE.Group();
    group.add(modelInstance);

    // 设置位置（3个铜偶并排显示，沿X轴左右排列）
    const spacing = 2.5;
    const startX = (-(selectedCoppers.value.length - 1) * spacing) / 2;
    group.position.set(startX + index * spacing, 0, 0);
    group.scale.set(1.0, 1.0, 1.0);
    
    // 旋转模型，使其正面朝向相机（+Z方向）
    // 游戏内模型默认朝向侧面，需要旋转90度让正面朝向相机
    group.rotation.y = -Math.PI / 2; // 旋转-90度（逆时针）

    // 计算缩放后的包围盒，使模型底部对齐地面
    const scaledBox = new THREE.Box3().setFromObject(group);
    group.position.y = -scaledBox.min.y;

    scene.add(group);
    loadedModels.set(copper.id, group);

    console.log(`[StartGame] 模型加载成功: ${copper.name}`);
  } catch (e) {
    console.warn(`[StartGame] 模型加载失败: ${copper.name}`, e);
    // 创建占位立方体
    createPlaceholderCube(copper, index);
  }
}

function createPlaceholderCube(copper, index) {
  if (!scene) return;

  const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
  const cube = new THREE.Mesh(geometry, material);

  const spacing = 2.5;
  const startX = (-(selectedCoppers.value.length - 1) * spacing) / 2;
  cube.position.set(startX + index * spacing, 0.8, 0);
  
  // 旋转占位立方体，保持一致性
  cube.rotation.y = -Math.PI / 2;

  scene.add(cube);
  loadedModels.set(copper.id, cube);
}

function updateModels() {
  if (!scene) return;

  // 清除所有现有模型
  loadedModels.forEach((obj) => {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
  loadedModels.clear();

  // 加载选中的铜偶模型
  selectedCoppers.value.forEach((copper, index) => {
    loadCopperModel(copper, index);
  });
}

async function loadCoppers() {
  loading.value = true;
  error.value = "";
  try {
    const plain = await get_copper_list();
    const arr = Array.isArray(plain?.coppers) ? plain.coppers : [];
    copperList.value = (arr || []).map((c, i) => {
      const modelUrl = c?.copper_info?.model_url;
      console.log(`[StartGame] Copper ${c?.copper_info?.name || i + 1}: model_url=${modelUrl}`);
      return {
        id: Number(c?.id ?? i + 1),
        name: c?.copper_info?.name || `铜偶#${i + 1}`,
        icon: getAssetUrl(c?.copper_info?.icon_url || ""),
        level: Number(c?.level ?? 1),
        copperType: c?.copper_type || "Arcanist",
        modelName: c?.copper_info?.name?.toLowerCase() || "",
        modelUrl: modelUrl ? getAssetUrl(modelUrl) : "",
      };
    });
  } catch (e) {
    console.warn("[StartGame] 获取铜偶列表失败", e);
    error.value = "加载失败，请重试";
  } finally {
    loading.value = false;
  }
}

async function startGame() {
  if (selectedIds.value.size !== 3) return;
  const ids = Array.from(selectedIds.value).map((id) => String(id));
  try {
    if (!window.__ACTUAL_COPPER_IDS__) window.__ACTUAL_COPPER_IDS__ = [];
    const message = JSON.stringify({ type: "on_game_start", content: { ids } });

    // 不等待eventloop完成，直接发送消息
    // 因为broadcast_room_content会发送大量消息（225个地图块），会阻塞界面
    eventloop(message).catch((e) => {
      console.error("[StartGame] eventloop执行失败", e);
    });

    // 立即关闭界面，让消息队列在后台处理
    console.log("[StartGame] 游戏开始消息已发送，ID:", ids);
    emit("confirm", { ids });
  } catch (e) {
    console.error("[StartGame] 发送开始游戏消息失败", e);
    emit("confirm", { ids });
  }
}

function close() {
  emit("close");
}

// 监听选中铜偶变化，更新3D模型
watch(
  selectedCoppers,
  () => {
    updateModels();
  },
  { deep: true }
);

onMounted(() => {
  loadCoppers();
  // 延迟初始化3D场景，确保DOM已挂载
  setTimeout(() => {
    init3DScene();
  }, 100);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onWindowResize);

  // 清理3D资源
  loadedModels.forEach((obj) => {
    if (scene) scene.remove(obj);
  });
  loadedModels.clear();

  if (renderer) {
    renderer.dispose();
  }
  if (controls) {
    controls.dispose();
  }
});
</script>

<template>
  <div class="startgame-modal">
    <div class="card">
      <div class="card__header">
        <div class="card__title">开始游戏 · Start Game</div>
        <button class="card__close" @click="close" aria-label="关闭">✕</button>
      </div>

      <div class="card__body">
        <!-- 左侧：铜偶列表 -->
        <div class="card__content">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else class="list">
            <div
              v-for="c in copperList"
              :key="c.id"
              class="item"
              :class="{ 'item--selected': selectedIds.has(c.id) }"
              @click="toggleSelect(c.id)"
            >
              <div class="item__img">
                <img :src="c.icon" :alt="c.name" />
              </div>
              <div class="item__meta">
                <div class="item__name">{{ c.name }}</div>
                <div class="item__level">Lv. {{ c.level }}</div>
              </div>
              <div class="item__tick">
                {{ selectedIds.has(c.id) ? "✓" : "" }}
              </div>
            </div>
          </div>
          <div class="hint">从仓库中选择3个铜偶开始游戏。</div>
        </div>

        <!-- 右侧：3D预览 -->
        <div class="preview">
          <div class="preview__title">队伍预览</div>
          <div ref="previewContainer" class="preview__scene"></div>
          <div class="preview__info">
            <div v-if="selectedCoppers.length === 0" class="preview__empty">
              请选择铜偶
            </div>
            <div v-else class="preview__names">
              <div
                v-for="(copper, index) in selectedCoppers"
                :key="copper.id"
                class="preview__name"
              >
                <span class="preview__name-number">{{ index + 1 }}</span>
                <span class="preview__name-text">{{ copper.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card__footer">
        <button
          class="btn btn--primary"
          :disabled="!canConfirm"
          @click="startGame"
        >
          开始
        </button>
        <button class="btn" @click="close">返回</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.startgame-modal {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
}

.card {
  width: min(95vw, 1000px);
  height: min(90vh, 700px);
  background: #3a2519;
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card__header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 16px;
  background: #2b1a11;
  border-bottom: 1px solid #4b2e1f;
  flex-shrink: 0;
}

.card__title {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}

.card__close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #4b2e1f;
  border: 1px solid #5a3525;
  cursor: pointer;
  color: #fff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card__close:hover {
  background: #5a3525;
}

.card__body {
  display: flex;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

.card__content {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.preview {
  width: 400px;
  background: #2b1a11;
  border-left: 1px solid #4b2e1f;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.preview__title {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #ffd700;
  border-bottom: 1px solid #4b2e1f;
}

.preview__scene {
  flex: 1;
  position: relative;
  background: #1a1a1a;
}

.preview__scene canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.preview__info {
  padding: 12px 16px;
  border-top: 1px solid #4b2e1f;
  min-height: 100px;
  max-height: 140px;
  overflow-y: auto;
}

.preview__empty {
  text-align: center;
  color: #888;
  padding: 20px;
  font-size: 14px;
}

.preview__names {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview__name {
  font-size: 13px;
  color: #fff;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.5;
}

.preview__name-number {
  flex-shrink: 0;
  width: 20px;
  color: #ffd700;
  font-weight: 700;
}

.preview__name-text {
  flex: 1;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #ccc;
}

.error {
  padding: 12px;
  color: #ff6b6b;
  background: #4b2e1f;
  border: 1px solid #5a3525;
  border-radius: 8px;
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  align-items: stretch;
}

.item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid #4b2e1f;
  border-radius: 10px;
  cursor: pointer;
  background: #4b2e1f;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.item:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.item--selected {
  box-shadow: 0 0 0 2px #f59e0b inset;
  background: rgba(245, 158, 11, 0.1);
}

.item__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: #2b1a11;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #ccc;
}

.item__name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 90px;
  color: #fff;
}

.item__level {
  opacity: 0.8;
  color: #ccc;
}

.item__tick {
  position: absolute;
  top: 8px;
  right: 10px;
  font-weight: 900;
  font-size: 18px;
  color: #f59e0b;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: #ccc;
}

.card__footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 12px 14px;
  border-top: 1px solid #4b2e1f;
  background: #2b1a11;
  flex-shrink: 0;
}

.btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid #4b2e1f;
  background: #4b2e1f;
  cursor: pointer;
  color: #fff;
}

.btn:hover {
  background: #5a3525;
}

.btn--primary {
  background: #f59e0b;
  color: #2b1a11;
  border-color: #f59e0b;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
  font-weight: 700;
}

.btn--primary:hover {
  background: #fbbf24;
}

.btn[disabled],
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
