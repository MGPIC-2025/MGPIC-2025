<script setup>
import log from '../log.js';
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { get_copper_list, eventloop } from '../glue.js';
import { getAssetUrl } from '../utils/resourceLoader.js';
import modelCache from '../utils/modelCache.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const emit = defineEmits(['confirm', 'close']);

const props = defineProps({
  musicOn: {
    type: Boolean,
    default: true,
  },
  paused: {
    type: Boolean,
    default: false,
  },
});

const loading = ref(true);
const error = ref('');
const copperList = ref([]);
const selectedIds = ref(new Set());
const previewContainer = ref(null);

// 音乐播放相关
const audioRef = ref(null);
// 统一使用远程R2
const musicUrl = getAssetUrl('@assets/frontend_resource/startgame.mp3');

let scene, camera, renderer, controls;
let gltfLoader;
const loadedModels = new Map(); // copper id -> model object

const canConfirm = computed(() => selectedIds.value.size === 3);

const selectedCoppers = computed(() => {
  return copperList.value.filter(c => selectedIds.value.has(c.id));
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
    'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
  );
  gltfLoader.setDRACOLoader(dracoLoader);

  // 开始动画循环
  animate3D();

  // 窗口大小调整
  window.addEventListener('resize', onWindowResize);
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
  log(`[StartGame] 使用后端model_url加载: ${copper.name}, URL: ${modelUrl}`);

  try {
    // 使用全局模型缓存管理器
    const modelInstance = await modelCache.loadModel(modelUrl, true);
    log(`[StartGame] 从缓存加载铜偶模型: ${copper.name}`);

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

    log(`[StartGame] 模型加载成功: ${copper.name}`);
  } catch (e) {
    log(`[StartGame] 模型加载失败: ${copper.name}`, e);
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
  loadedModels.forEach(obj => {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
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
  error.value = '';
  try {
    const plain = get_copper_list();
    const arr = Array.isArray(plain?.coppers) ? plain.coppers : [];
    copperList.value = (arr || []).map((c, i) => {
      const modelUrl = c?.copper_info?.model_url;
      log(
        `[StartGame] Copper ${c?.copper_info?.name || i + 1}: model_url=${modelUrl}`
      );
      return {
        id: Number(c?.id ?? i + 1),
        name: c?.copper_info?.name || `铜偶#${i + 1}`,
        icon: getAssetUrl(c?.copper_info?.icon_url || ''),
        level: Number(c?.level ?? 1),
        copperType: c?.copper_type || 'Arcanist',
        modelName: c?.copper_info?.name?.toLowerCase() || '',
        modelUrl: modelUrl ? getAssetUrl(modelUrl) : '',
      };
    });
  } catch (e) {
    log('[StartGame] 获取铜偶列表失败', e);
    error.value = '加载失败，请重试';
  } finally {
    loading.value = false;
  }
}

async function startGame() {
  if (selectedIds.value.size !== 3) return;
  const ids = Array.from(selectedIds.value).map(id => String(id));

  window.__ACTUAL_COPPER_IDS__ = ids;

  log('[StartGame] 准备进入游戏，ID:', ids);
  emit('confirm', { ids });
}

function close() {
  emit('close');
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

  // 自动播放音乐（如果音乐开关是开启的且未暂停）
  if (props.musicOn && !props.paused && audioRef.value) {
    const tryPlay = () => {
      if (audioRef.value.readyState >= 2) {
        audioRef.value
          .play()
          .then(() => {
            log('[StartGame] 音乐播放成功');
          })
          .catch(err => {
            log('[StartGame] 自动播放失败（可能浏览器阻止）:', err);
          });
      } else {
        const onCanPlay = () => {
          audioRef.value
            .play()
            .then(() => {
              log('[StartGame] 音频加载完成，播放成功');
            })
            .catch(err => {
              log('[StartGame] 播放失败:', err);
            });
          audioRef.value.removeEventListener('canplay', onCanPlay);
        };
        audioRef.value.addEventListener('canplay', onCanPlay, { once: true });
      }
    };

    // 延迟一下确保音频元素已挂载
    setTimeout(tryPlay, 200);
  }
});

// 监听 musicOn 变化
watch(
  () => props.musicOn,
  newVal => {
    if (!audioRef.value) return;

    if (newVal && !props.paused) {
      if (audioRef.value.readyState >= 2) {
        audioRef.value.play().catch(err => {
          log('[StartGame] 播放音乐失败:', err);
        });
      } else {
        const playWhenReady = () => {
          audioRef.value.play().catch(err => {
            log('[StartGame] 播放音乐失败:', err);
          });
          audioRef.value.removeEventListener('canplay', playWhenReady);
        };
        audioRef.value.addEventListener('canplay', playWhenReady);
      }
    } else {
      audioRef.value.pause();
    }
  }
);

// 监听 paused 变化（当游戏场景打开时暂停 StartGame 音乐）
watch(
  () => props.paused,
  newVal => {
    if (!audioRef.value) return;

    if (newVal) {
      // 暂停音乐
      audioRef.value.pause();
      log('[StartGame] 音乐已暂停（游戏场景打开）');
    } else if (props.musicOn) {
      // 恢复播放（如果音乐开关是开启的）
      if (audioRef.value.readyState >= 2) {
        audioRef.value.play().catch(err => {
          log('[StartGame] 恢复播放失败:', err);
        });
      } else {
        const playWhenReady = () => {
          audioRef.value.play().catch(err => {
            log('[StartGame] 恢复播放失败:', err);
          });
          audioRef.value.removeEventListener('canplay', playWhenReady);
        };
        audioRef.value.addEventListener('canplay', playWhenReady);
      }
      log('[StartGame] 音乐已恢复播放');
    }
  }
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);

  // 停止音乐播放
  if (audioRef.value) {
    audioRef.value.pause();
  }

  // 清理3D资源
  loadedModels.forEach(obj => {
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

// 背景图片路径（CSS border-image 需要 url() 包裹）
const panel1Src = `url('${getAssetUrl('@assets/ui/panel1.png')}')`;
const panel2Src = `url('${getAssetUrl('@assets/ui/panel2.png')}')`;
const panel3Src = `url('${getAssetUrl('@assets/ui/panel3.png')}')`;
const panel6Src = `url('${getAssetUrl('@assets/ui/panel6.png')}')`;
const panel7Src = `url('${getAssetUrl('@assets/ui/panel7.png')}')`;
const panel8Src = `url('${getAssetUrl('@assets/ui/panel8.png')}')`;
const panel9Src = `url('${getAssetUrl('@assets/ui/panel9.png')}')`;
const panel10Src = `url('${getAssetUrl('@assets/ui/panel10.png')}')`;
const styleVars = computed(() => ({
  '--panel1-src': panel1Src,
  '--panel2-src': panel2Src,
  '--panel3-src': panel3Src,
  '--panel6-src': panel6Src,
  '--panel7-src': panel7Src,
  '--panel8-src': panel8Src,
  '--panel9-src': panel9Src,
  '--panel10-src': panel10Src,
}));
</script>

<template>
  <div class="startgame-modal" :style="styleVars">
    <div class="card">
      <div class="card__header">
        <div class="card__title">开始游戏</div>
        <button class="card__close" @click="close" aria-label="关闭">
          <img :src="getAssetUrl('@assets/ui/close.png')" alt="关闭" />
        </button>
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
    <audio ref="audioRef" :src="musicUrl" loop preload="auto"></audio>
  </div>
</template>

<style scoped src="../styles/start-game.css"></style>
