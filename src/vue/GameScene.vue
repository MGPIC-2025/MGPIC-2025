<script setup>
import log from '../log.js';
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { messageQueue } from '../glue.js';
import { eventloop } from '../glue.js';
import {
  getAssetUrl,
  getCopperModelUrl,
  getEnemyModelUrl,
  getStructureModelUrl,
  getMaterialModelUrl,
} from '../utils/resourceLoader.js';
import modelCache from '../utils/modelCache.js';
import {
  getCopperEnglishName,
  getCopperTypeFolder,
} from '../utils/copperMapping.js';
import { getStructureEnglishName } from '../utils/structureMapping.js';
import { getSetting } from '../utils/gameSettings.js';
import { onEvent, offEvent, emitEvent, EventTypes } from '../utils/eventBus.js';
import { useHealthBars } from '../composables/useHealthBars.js';
import { useIndicators } from '../composables/useIndicators.js';
import { useEffects } from '../composables/useEffects.js';
import {
  getControlConfig,
  getSkyboxConfig,
  getLightingConfig,
  getGridCellMaterialConfig,
} from '../utils/sceneConfig.js';
import { getMusicUrl, getSoundUrl } from '../utils/audioConfig.js';
import {
  loadSkybox,
  applyLighting,
  createCamera,
  createRenderer,
  createGLTFLoader,
  createTestUnits,
  createFloor,
  disposeSkybox,
} from '../utils/sceneUtils.js';
import ActionPanel from './ActionPanel.vue';
import TurnSystem from './ActionPanelParts/TurnSystem.vue';
import SummonModal from './ActionPanelParts/SummonModal.vue';
import StructurePanel from './StructurePanel.vue';
import ResourcePanel from './ResourcePanel.vue';
import VirtualControls from './VirtualControls.vue';

const props = defineProps({
  isGameMode: {
    type: Boolean,
    default: false, // false = 测试模式，true = 游戏模式
  },
  musicOn: {
    type: Boolean,
    default: true,
  },
});

const container = ref(null);
const emit = defineEmits(['back']);

// 音乐播放相关
const audioRef = ref(null);
const musicUrl = getMusicUrl('gameScene');

// 音效播放相关
const moveSoundRef = ref(null);
const moveEnemySoundRef = ref(null);
const attackSoundRef = ref(null);
const attackEnemySoundRef = ref(null);
const meHurtSoundRef = ref(null);
const enemyHurtSoundRef = ref(null);
const moveSoundUrl = getSoundUrl('move');
const moveEnemySoundUrl = getSoundUrl('moveEnemy');
const attackSoundUrl = getSoundUrl('attack');
const attackEnemySoundUrl = getSoundUrl('attackEnemy');
const meHurtSoundUrl = getSoundUrl('meHurt');
const enemyHurtSoundUrl = getSoundUrl('enemyHurt');

let scene, camera, renderer, controls;
let models = [];
const controlCfgForFocus = getControlConfig();
let focusState = {
  focusPosition: null,
  focusTarget: null,
  lerpFactor: controlCfgForFocus.focusLerpFactor,
};
let raycaster = null;
let mouse = new THREE.Vector2();
let gltfLoader = null;

// Composables（将在 initScene 后初始化）
let healthBarsManager = null;
let indicatorsManager = null;
let effectsManager = null;

// 保存每个单位的上一帧血量，用于检测是否受伤
const previousHealth = new Map(); // { unitId: number }

// 地板指示器已移至 indicatorsManager (useIndicators composable)

// 第一人称控制
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
  space: false,
};
// 控制配置（从配置文件读取）
const controlCfg = getControlConfig();
const moveSpeed = controlCfg.moveSpeed;
const rotationSpeed = controlCfg.rotationSpeed;

// Mobile分支：固定使用虚拟摇杆控制模式
const controlMode = ref('mobile');
const mouseSensitivity = ref(0.002);

// 虚拟摇杆控制状态
const virtualMoveInput = ref({ x: 0, y: 0 });
const virtualRotateInput = ref({ x: 0, y: 0 });
const virtualVerticalInput = ref({ up: false, down: false });

// 更新控制模式（供设置面板调用）
window.updateControlMode = mode => {
  controlMode.value = mode;
  log(`[GameScene] 切换控制模式: ${mode}`);
};

// 更新鼠标灵敏度（供设置面板调用）
window.updateMouseSensitivity = sensitivity => {
  mouseSensitivity.value = sensitivity;
};

// 虚拟控制事件处理
function handleVirtualMove(movement) {
  virtualMoveInput.value = movement;
}

function handleVirtualRotate(rotation) {
  virtualRotateInput.value = rotation;
}

function handleVirtualVerticalMove(vertical) {
  virtualVerticalInput.value = vertical;
}

// 键盘事件处理
function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    keys[key] = true;
  } else if (key === 'shift') {
    keys.shift = true;
  } else if (key === ' ') {
    keys.space = true;
    event.preventDefault(); // 防止页面滚动
  } else if (key === 'escape') {
    // ESC 键退出鼠标锁定
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    keys[key] = false;
  } else if (key === 'shift') {
    keys.shift = false;
  } else if (key === ' ') {
    keys.space = false;
  }
}

// 第一人称鼠标控制
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;
let pitch = 0; // 上下旋转
let yaw = 0; // 左右旋转
let isPointerLocked = false; // 是否已锁定鼠标

function handleMouseDown(event) {
  // 右键或中键不响应
  if (event.button !== 0) return;

  // 鼠标模式：点击时请求锁定鼠标
  if (controlMode.value === 'mouse' && container.value) {
    container.value.requestPointerLock();
  }

  isMouseDown = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
}

function handleMouseUp() {
  isMouseDown = false;
}

function handleMouseMove(event) {
  // 触控板模式：需要按住鼠标才能旋转
  if (controlMode.value === 'touchpad') {
    if (!isMouseDown) return;

    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;

    // 更新旋转角度
    yaw -= deltaX * mouseSensitivity.value;
    pitch -= deltaY * mouseSensitivity.value;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
  // 鼠标模式：使用 Pointer Lock 的 movementX/Y
  else if (controlMode.value === 'mouse' && isPointerLocked) {
    const deltaX = event.movementX || 0;
    const deltaY = event.movementY || 0;

    // 更新旋转角度
    yaw -= deltaX * mouseSensitivity.value;
    pitch -= deltaY * mouseSensitivity.value;
  }

  // 限制上下旋转角度
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

  // 应用旋转到相机
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

// Pointer Lock 状态变化监听
function handlePointerLockChange() {
  isPointerLocked = document.pointerLockElement === container.value;
  if (isPointerLocked) {
    log('[GameScene] 鼠标已锁定');
  } else {
    log('[GameScene] 鼠标已解锁');
  }
}

function handlePointerLockError() {
  log('[GameScene] 鼠标锁定失败');
}

// 选中的铜偶信息
const selectedCopper = ref(null);
const selectedCopperResources = ref([]);
const copperActionPanelRef = ref(null);
const hasAttackTargets = ref(false); // 是否有可攻击的目标
// 传递目标列表（收集传递位置对应的铜偶）
const transferTargetPositions = ref([]); // 存储传递位置
const transferTargets = ref([]); // 存储可传递的铜偶列表

// 选中的建筑信息
const selectedStructure = ref(null);
const selectedStructureData = ref(null); // 存储完整的建筑数据（包括后端数据）

// 召唤系统相关
const showSummonModal = ref(false); // 是否显示召唤菜单
const summonPosition = ref(null); // 召唤位置
const enemyList = ref([]); // 可召唤的敌人列表

// 建造系统相关
const currentBuildingName = ref(null); // 当前选择要建造的建筑名称

// 回合系统
const currentRound = ref(1);
const playerCoppers = ref([]); // 玩家的铜偶列表
const currentCopperIndex = ref(-1);
const currentActionMode = ref(null); // 'moving' | 'attacking' | 'transferring' | 'summoning' | 'building' | null

// 敌人移动跟踪
const isEnemyMoving = ref(false); // 是否正在等待敌人移动完成
const pendingEnemyMoves = ref(new Set()); // 待移动完成的敌人ID集合

// 本地输入锁：防止同一单位在移动动画期间再次发送移动
const isMoveLocked = ref(false);

// 存储铜偶的 can_build 状态（工匠专用）
const copperCanBuildMap = new Map(); // { copperId: boolean }

// 游戏结束对话框
const showGameOverDialog = ref(false);

// 游戏成功对话框
const showGameSuccessDialog = ref(false);

// 制作团队名单显示
const showCredits = ref(false);

// 撤退确认对话框
const showWithdrawDialog = ref(false);

// 资源不足提示对话框
const showResourceDialog = ref(false);
const resourceDialogMessage = ref('');

const currentCopperId = computed(() => {
  if (
    playerCoppers.value.length === 0 ||
    currentCopperIndex.value < 0 ||
    currentCopperIndex.value >= playerCoppers.value.length
  ) {
    return null;
  }
  const copper = playerCoppers.value[currentCopperIndex.value];
  return copper ? copper.id : null;
});

onMounted(async () => {
  log('[GameScene] 组件挂载，初始化场景');
  initScene();
  log('[GameScene] 场景初始化完成，设置消息队列');
  setupMessageQueue();
  log('[GameScene] 消息队列设置完成');

  if (messageQueue.sceneContext?.setTestMode) {
    messageQueue.sceneContext.setTestMode('eventloop');
  }

  // 场景准备完成后，发送游戏开始消息
  // 兼容方式：优先使用window.__ACTUAL_COPPER_IDS__，否则使用事件总线
  if (window.__ACTUAL_COPPER_IDS__) {
    const ids = window.__ACTUAL_COPPER_IDS__;
    log('[GameScene] 场景准备完成，发送游戏开始消息，ID:', ids);
    const message = JSON.stringify({ type: 'on_game_start', content: { ids } });
    eventloop(message);
    // 清除标记
    delete window.__ACTUAL_COPPER_IDS__;
  } else {
    log('[GameScene] 警告：未找到铜偶ID列表');
  }

  // 添加键盘和鼠标事件监听
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousemove', handleMouseMove);

  // Pointer Lock 事件监听
  document.addEventListener('pointerlockchange', handlePointerLockChange);
  document.addEventListener('pointerlockerror', handlePointerLockError);

  animate();

  // 开发模式下暴露相机控制工具
  if (import.meta.env.DEV) {
    window.setCameraFocus = (distance = 8, height = 6) => {
      window.cameraFocusDistance = distance;
      window.cameraFocusHeight = height;
      log(`[GameScene] 相机聚焦参数已更新: 距离=${distance}, 高度=${height}`);
    };
    window.resetCamera = () => {
      camera.position.set(0, 10, 15);
      camera.lookAt(0, 0, 0);
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
      focusState.focusPosition = null;
      focusState.focusTarget = null;
      log('[GameScene] 相机已重置');
    };
    window.toggleAutoFocus = () => {
      window.disableAutoFocus = !window.disableAutoFocus;
      log(`[GameScene] 自动聚焦已${window.disableAutoFocus ? '禁用' : '启用'}`);
      if (window.disableAutoFocus) {
        focusState.focusPosition = null;
        focusState.focusTarget = null;
      }
    };
  }

  // 自动播放音乐（如果音乐开关是开启的）
  if (props.musicOn && audioRef.value) {
    const tryPlay = () => {
      if (audioRef.value.readyState >= 2) {
        audioRef.value
          .play()
          .then(() => {
            log('[GameScene] 音乐播放成功');
          })
          .catch(err => {
            log('[GameScene] 自动播放失败（可能浏览器阻止）:', err);
          });
      } else {
        const onCanPlay = () => {
          audioRef.value
            .play()
            .then(() => {
              log('[GameScene] 音频加载完成，播放成功');
            })
            .catch(err => {
              log('[GameScene] 播放失败:', err);
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

    if (newVal) {
      if (audioRef.value.readyState >= 2) {
        audioRef.value.play().catch(err => {
          log('[GameScene] 播放音乐失败:', err);
        });
      } else {
        const playWhenReady = () => {
          audioRef.value.play().catch(err => {
            log('[GameScene] 播放音乐失败:', err);
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

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('click', onSceneClick);

  // 移除键盘和鼠标事件监听
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousemove', handleMouseMove);

  // 移除 Pointer Lock 监听器
  document.removeEventListener('pointerlockchange', handlePointerLockChange);
  document.removeEventListener('pointerlockerror', handlePointerLockError);

  // 释放鼠标锁定
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  // 停止音乐播放
  if (audioRef.value) {
    audioRef.value.pause();
  }

  // 清理 Composables
  if (healthBarsManager) {
    healthBarsManager.dispose();
  }
  if (indicatorsManager) {
    indicatorsManager.dispose();
  }
  if (effectsManager) {
    effectsManager.dispose();
  }

  // 清理天空盒资源
  if (scene) {
    disposeSkybox(scene);
  }

  if (renderer) {
    renderer.dispose();
  }
});

// 场景工具函数已移至 sceneUtils.js

function initScene() {
  // 创建场景
  scene = new THREE.Scene();

  // 加载圆顶天空盒（使用工具函数）
  const skyboxCfg = getSkyboxConfig();
  loadSkybox(scene, skyboxCfg);

  // 创建相机（使用工具函数）
  camera = createCamera();

  // 初始化raycaster用于点击检测
  raycaster = new THREE.Raycaster();

  // 创建渲染器（使用工具函数）
  renderer = createRenderer(container.value);

  // 不使用OrbitControls，使用纯第一人称控制
  controls = null;

  // 应用环境光照（使用工具函数）
  const lightingCfg = getLightingConfig();
  applyLighting(scene, lightingCfg);

  // 创建地板（使用工具函数）
  createFloor(scene);

  // 初始化GLTF加载器（使用工具函数）
  gltfLoader = createGLTFLoader();

  // 添加点击事件监听（仅游戏模式）
  if (props.isGameMode) {
    window.addEventListener('click', onSceneClick);
  }

  // 创建测试用的立方体（使用工具函数）
  createTestUnits(scene, models);

  // 初始化 Composables（需要在 scene 和 camera 创建后）
  healthBarsManager = useHealthBars(scene, camera);
  indicatorsManager = useIndicators(scene);
  effectsManager = useEffects(scene);

  log('[GameScene] 场景初始化完成');
  log('[GameScene] - 蓝/红立方体(ID=1,2)用于"后端测试"');
  log('[GameScene] - EventLoop测试会动态创建新模型');

  // 窗口大小变化
  window.addEventListener('resize', onWindowResize);
}

// 辅助函数：加载铜偶GLTF模型（使用全局缓存）
async function loadGLTFModel(copperType, copperName, position, scale = 1.0) {
  const modelUrl = getCopperModelUrl(copperType, copperName);

  try {
    // 使用全局模型缓存管理器
    const cachedModel = await modelCache.loadModel(modelUrl, true);
    log(`[GameScene] 从缓存加载铜偶模型: ${copperName}`);

    // 深度克隆模型实例，避免多个单位共享同一个模型对象和材质
    const modelInstance = cachedModel.clone(true);

    // 确保所有材质都是独立的副本
    modelInstance.traverse(child => {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => mat.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(modelInstance);
    const size = box.getSize(new THREE.Vector3());

    // 创建容器组（单层，模型默认朝向+Z正面）
    const group = new THREE.Group();
    group.add(modelInstance);

    // 设置容器位置和缩放
    group.position.set(position[0], 0, position[1]);
    group.scale.set(scale, scale, scale);

    // 模型默认朝向+Z（正面），rotation.y = 0 表示正面朝+Z
    // 忽略后端的初始 change_direction，保持0度
    group.rotation.y = 0;

    // 计算缩放后的包围盒来正确定位模型
    const scaledBox = new THREE.Box3().setFromObject(group);

    // 调整Y位置使模型底部对齐地面
    group.position.y = -scaledBox.min.y;

    log(`[GameScene] 铜偶模型加载成功: ${copperName}, URL: ${modelUrl}`);
    return group;
  } catch (e) {
    log(`[GameScene] 模型加载失败: ${copperName}`, e);
    return null;
  }
}

// 辅助函数：加载敌人模型（使用全局缓存）
async function loadModelFromUrl(
  modelUrl,
  position,
  scale = 1.0,
  name = 'model'
) {
  try {
    // 使用全局模型缓存管理器
    const cachedModel = await modelCache.loadModel(modelUrl, true);
    log(`[GameScene] 从缓存加载模型: ${name}, url=${modelUrl}`);

    // 深度克隆模型实例，避免多个单位共享同一个模型对象和材质
    const modelInstance = cachedModel.clone(true);

    // 确保所有材质都是独立的副本
    modelInstance.traverse(child => {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => mat.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(modelInstance);
    const size = box.getSize(new THREE.Vector3());

    // 创建一个容器组
    const group = new THREE.Group();
    group.add(modelInstance);

    // 设置容器位置和缩放
    group.position.set(position[0], 0, position[1]);
    group.scale.set(scale, scale, scale);

    return group;
  } catch (error) {
    log(`[GameScene] 加载模型失败: ${name}, url=${modelUrl}, error=${error}`);
    return null;
  }
}

async function loadEnemyModel(enemyName, position, scale = 1.0) {
  const modelUrl = getEnemyModelUrl(enemyName);

  try {
    // 使用全局模型缓存管理器
    const cachedModel = await modelCache.loadModel(modelUrl, true);
    log(`[GameScene] 从缓存加载敌人模型: ${enemyName}`);

    // 深度克隆模型实例，避免多个单位共享同一个模型对象和材质
    const modelInstance = cachedModel.clone(true);

    // 确保所有材质都是独立的副本
    modelInstance.traverse(child => {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => mat.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(modelInstance);
    const size = box.getSize(new THREE.Vector3());

    // 创建一个容器组
    const group = new THREE.Group();
    group.add(modelInstance);

    // 设置容器位置和缩放
    group.position.set(position[0], 0, position[1]);
    group.scale.set(scale, scale, scale);

    // 敌人模型默认已经是正面朝向+Z，不需要额外旋转
    group.rotation.y = 0;

    // 计算缩放后的包围盒来正确定位模型
    const scaledBox = new THREE.Box3().setFromObject(group);

    // 调整Y位置使模型底部对齐地面
    group.position.y = -scaledBox.min.y;

    // 添加红色点光源到容器
    const pointLight = new THREE.PointLight(0xff4444, 2.5, 12);
    pointLight.position.set(0, size.y * scale * 0.8, 0);
    group.add(pointLight);

    log(`[GameScene] 敌人模型加载成功: ${enemyName}, URL: ${modelUrl}`);
    return group;
  } catch (e) {
    log(`[GameScene] 敌人模型加载失败: ${enemyName}`, e);
    return null;
  }
}

// 创建攻击特效函数（提取到外部作用域，以便在 handleAttackApply 中使用）
let createAttackEffectFunc = null;

function setupMessageQueue() {
  // 状态指示器存储
  const stateIndicators = new Map(); // { unitId: { canMove: Mesh, canAttack: Mesh } }
  const mapBlocks = new Map(); // { 'x,y': Mesh } 地图块存储
  const resourceMarkers = new Map(); // { 'x,y': Mesh } 资源标记存储

  // 创建状态指示器
  function createIndicator(unitId, type, show) {
    const model = models.find(m => m.id === unitId);
    if (!model || !model.object) return;

    // 根据类型设置颜色：绿色(移动) / 红色(攻击) / 黄色(召唤和建造)
    let color, radius;
    if (type === 'move') {
      color = 0x00ff00; // 绿色
      radius = 0.8;
    } else if (type === 'attack') {
      color = 0xff0000; // 红色
      radius = 1.0;
    } else if (type === 'summon') {
      color = 0xffff00; // 黄色（召唤和建造共用）
      radius = 1.2;
    } else {
      color = 0xffffff; // 默认白色
      radius = 1.0;
    }

    // 获取或创建指示器容器
    if (!stateIndicators.has(unitId)) {
      stateIndicators.set(unitId, {});
    }
    const indicators = stateIndicators.get(unitId);

    // 移除旧指示器
    if (indicators[type]) {
      scene.remove(indicators[type]);
      indicators[type].geometry.dispose();
      indicators[type].material.dispose();
      delete indicators[type]; // 使用 delete 而不是 = null
    }

    // 创建新指示器
    if (show) {
      const geometry = new THREE.RingGeometry(radius - 0.1, radius, 32);
      const material = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = -Math.PI / 2; // 平放在地面

      // 使用模型的X和Z坐标，但Y坐标抬高避免被地图块遮蔽
      ring.position.set(
        model.object.position.x,
        0.1, // 抬高10cm，避免被地图块遮蔽
        model.object.position.z
      );

      scene.add(ring);
      indicators[type] = ring;
    }
  }

  // 血条管理函数已移至 useHealthBars composable
  // 地板指示器管理已移至 useIndicators composable

  // 高亮选中的铜偶
  let selectedCopperId = null;
  const highlightSelectedCopper = copperId => {
    // 清除所有模型的高亮（包括铜偶、召唤物、敌人）
    models.forEach(model => {
      if (model.object) {
        model.object.scale.set(1, 1, 1);
        // 遍历所有子对象清除高亮
        model.object.traverse(child => {
          if (child.material) {
            child.material.emissive?.setHex(0x000000);
            if (child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = 0;
            }
          }
        });
      }
    });

    // 添加新的高亮
    if (copperId !== null) {
      const model = models.find(m => m.id === copperId);
      if (model) {
        model.object.scale.set(1.1, 1.1, 1.1);
        // 遍历所有子对象设置高亮
        model.object.traverse(child => {
          if (child.material && child.material.emissive) {
            child.material.emissive.setHex(0xffaa00);
            child.material.emissiveIntensity = 0.5;
          }
        });
        selectedCopperId = copperId;
        const unitType =
          model.type === 'summon'
            ? '召唤物'
            : model.type === 'copper'
              ? '铜偶'
              : '敌人';
        log(`[GameScene] 高亮${unitType}: ${model.name} (ID=${copperId})`);
      }
    } else {
      selectedCopperId = null;
    }
  };

  // 地板指示器逻辑已移至 indicatorsManager (useIndicators composable)

  // 创建攻击特效（闪光）
  createAttackEffectFunc = (attackerId, targetPosition) => {
    const attacker = models.find(m => m.id === attackerId);
    if (!attacker) return;

    // 注意：攻击音效在 handleAttackApply 中播放，这里只处理视觉特效

    // 攻击者闪光 - 遍历所有材质
    const originalEmissives = new Map();
    attacker.object.traverse(child => {
      if (child.material && child.material.emissive) {
        originalEmissives.set(child, {
          color: child.material.emissive.getHex(),
          intensity: child.material.emissiveIntensity || 0,
        });
        child.material.emissive.setHex(0xff0000);
        child.material.emissiveIntensity = 0.8;
      }
    });

    // 500ms后恢复
    setTimeout(() => {
      originalEmissives.forEach((original, child) => {
        if (child.material && child.material.emissive) {
          child.material.emissive.setHex(original.color);
          child.material.emissiveIntensity = original.intensity;
        }
      });
    }, 500);

    // 攻击线特效（从攻击者到目标）
    // 从攻击者中心位置发射（提高高度）
    const attackerPos = new THREE.Vector3(
      attacker.object.position.x,
      0.5, // 提高到模型中心高度
      attacker.object.position.z
    );
    // 直接使用后端传来的坐标（已经是世界坐标）
    const targetPos = new THREE.Vector3(
      targetPosition[0],
      0.5, // 与攻击者同高
      targetPosition[1]
    );

    // 创建攻击射线
    const direction = new THREE.Vector3().subVectors(targetPos, attackerPos);
    const distance = direction.length();
    const midpoint = new THREE.Vector3()
      .addVectors(attackerPos, targetPos)
      .multiplyScalar(0.5);

    // 创建圆柱体作为射线
    const cylinderGeometry = new THREE.CylinderGeometry(
      0.05,
      0.05,
      distance,
      8
    );
    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.9,
      emissive: 0xff4444,
      emissiveIntensity: 0.5,
    });
    const line = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

    // 定位和旋转圆柱体
    line.position.copy(midpoint);
    line.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    scene.add(line);

    // 创建爆炸圆环
    const ringGeometry = new THREE.RingGeometry(0.2, 0.4, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2; // 水平放置
    ring.position.copy(targetPos);
    scene.add(ring);

    // 动画：线和圆环淡出
    const startTime = performance.now();
    const duration = 300;

    function animateEffect() {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        // 淡出
        const opacity = 1 - progress;
        if (cylinderMaterial) cylinderMaterial.opacity = opacity;
        if (ringMaterial) ringMaterial.opacity = opacity;

        // 圆环扩大
        ring.scale.set(1 + progress * 2, 1 + progress * 2, 1);

        requestAnimationFrame(animateEffect);
      } else {
        // 清除
        scene.remove(line);
        scene.remove(ring);
        cylinderGeometry.dispose();
        cylinderMaterial.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
      }
    }

    animateEffect();
    log(
      `[GameScene] 攻击特效: 攻击者ID=${attackerId}, 位置=${attackerPos.x.toFixed(1)},${attackerPos.z.toFixed(1)} → 目标位置[${targetPosition[0]},${targetPosition[1]}]`
    );
  };

  // 设置场景上下文
  messageQueue.setSceneContext({
    scene,
    camera,
    controls,
    models,
    gridCellSize: 1.0,
    focusState,
    focusOnModel: focusOnModelFunc,
    // 显示铜偶信息
    onShowCopperInfo: (copper, resources, has_attack_targets) => {
      log(
        `[GameScene] onShowCopperInfo 原始数据: type=${copper.copper?.copper_type}, can_build=${copper.can_build}, can_summon=${copper.can_summon}`
      );

      // 保存 can_build 状态到 Map（供游戏开始时的状态圈显示使用）
      if (
        copper.copper?.copper_type === 'CraftsMan' &&
        copper.id !== undefined
      ) {
        copperCanBuildMap.set(copper.id, copper.can_build === true);
      }

      // 对于工匠，使用 can_build 作为 can_summon 的值（前端统一用 can_summon）
      // 创建新对象以触发 Vue 响应式更新
      const displayName =
        copper.copper?.copper_info?.name ||
        copper.name ||
        copper.enemy?.enemy_base?.name ||
        copper.enemy?.enemy_base?.enemy_type ||
        copper.enemy_base?.name ||
        copper.enemy_base?.enemy_type ||
        `单位 #${copper.id}`;

      if (copper.copper?.copper_type === 'CraftsMan') {
        log(
          `[GameScene] 检测到工匠，使用 can_build=${copper.can_build} 作为 can_summon`
        );
        selectedCopper.value = {
          ...copper,
          name: displayName,
          can_summon: copper.can_build === true,
        };
      } else {
        selectedCopper.value = {
          ...copper,
          name: displayName,
        };
      }

      selectedCopperResources.value = resources || [];
      // 使用后端返回的攻击目标状态
      hasAttackTargets.value = has_attack_targets || false;
      log(
        `[GameScene] 更新铜偶信息完成: ID=${selectedCopper.value.id}, has_attack_targets=${hasAttackTargets.value}, can_summon=${selectedCopper.value.can_summon}`
      );
    },
    // 显示建筑信息
    onShowStructureInfo: (structure, resources) => {
      selectedStructure.value = structure;
      selectedStructureData.value = { structure, resources };
      log(
        `[GameScene] 更新建筑信息: ID=${structure.id}, 名称=${structure.structure_base?.name}, 血量=${structure.now_health}/${structure.structure_base.health}`
      );
    },
    highlightSelectedCopper,
    createAttackEffect: createAttackEffectFunc, // 攻击特效
    // 移动开始时的回调（用于跟踪敌人移动）
    onMoveStart: (id, model) => {
      if (!props.isGameMode) return;

      // 如果是野生敌人（type === 'enemy' 且 isOwned === false）且正在跟踪敌人移动，将其添加到跟踪列表
      if (isEnemyMoving.value && model?.type === 'enemy' && !model?.isOwned) {
        log(`[GameScene] 开始跟踪野生敌人 ${id} 的移动`);
        pendingEnemyMoves.value.add(id);
      }
    },
    // 移动完成后的回调
    onMoveComplete: id => {
      if (!props.isGameMode) return;

      // 先检查是否是建筑
      const model = models.find(m => m.id === id);
      if (model?.type === 'structure') {
        log('[GameScene] 建筑移动完成，刷新建筑状态');
        // 重置状态
        currentActionMode.value = null;
        // 解锁（防止建筑移动后仍被锁定）
        isMoveLocked.value = false;

        // 重新点击建筑刷新状态
        setTimeout(async () => {
          await handleClickStructure(id);
        }, 300);
        return;
      }

      // 检查是否是野生敌人（type === 'enemy' 且 isOwned === false）
      const isWildEnemy = model?.type === 'enemy' && !model?.isOwned;
      if (isWildEnemy) {
        // 这是野生敌人移动完成
        if (isEnemyMoving.value && pendingEnemyMoves.value.has(id)) {
          log(`[GameScene] 野生敌人 ${id} 移动完成`);
          pendingEnemyMoves.value.delete(id);

          // 检查是否所有敌人都移动完成
          if (pendingEnemyMoves.value.size === 0) {
            log('[GameScene] 所有野生敌人移动完成，允许按钮点击');
            isEnemyMoving.value = false;
          }
        } else {
          log(`[GameScene] 野生敌人 ${id} 移动完成，不在跟踪列表中`);
        }
        return;
      }

      // 检查移动的是否是玩家的铜偶或友方召唤物
      const isPlayerCopper = playerCoppers.value.some(
        copper => copper.id === id
      );
      const isFriendlySummon = model?.type === 'summon' || model?.isOwned;
      if (!isPlayerCopper && !isFriendlySummon) {
        // 既不是铜偶也不是友方召唤物，可能是其他类型，直接返回
        return;
      }

      // 玩家单位或友方召唤物移动完成，解锁移动
      isMoveLocked.value = false;

      log('[GameScene] 移动完成，准备切换铜偶');
      // 重置状态
      currentActionMode.value = null;
      if (copperActionPanelRef.value) {
        copperActionPanelRef.value.cancelAction();
      }

      // 重新获取单位最新状态，然后判断是否切换
      setTimeout(async () => {
        // 判断是铜偶还是友方召唤物
        const isSummon = model?.type === 'summon';

        // 重新点击当前单位获取最新状态
        if (isSummon) {
          await handleClickEnemy(id, false);
        } else {
          await handleClickCopper(id);
        }

        // 等待状态更新后再判断是否切换
        setTimeout(() => {
          // 如果有地面物品，不自动跳转（让玩家拾取）
          if (
            selectedCopperResources.value &&
            selectedCopperResources.value.length > 0
          ) {
            log('[GameScene] 检测到地面物品，不自动跳转');
            return;
          }
          tryNextCopper();
        }, 100);
      }, 300);
    },
    // 合成结果回调
    onCraftResult: (success, message) => {
      log(`[GameScene] 合成结果: ${success ? '成功' : '失败'} - ${message}`);
      // TODO: 可以添加UI提示
      alert(message);
    },
    // 资源不足回调
    onResourceNotEnough: message => {
      log(`[GameScene] 资源不足: ${message}`);
      resourceDialogMessage.value = message;
      showResourceDialog.value = true;
      // 清除所有操作模式
      currentActionMode.value = null;
      currentBuildingName.value = null;
      showSummonModal.value = false;
      summonPosition.value = null;
    },
    // 召唤失败回调
    onSummonFailed: message => {
      log(`[GameScene] 召唤失败: ${message}`);
      alert(`❌ ${message}`);
      // 清除召唤模式
      currentActionMode.value = null;
      showSummonModal.value = false;
      summonPosition.value = null;
    },
    // 显示召唤菜单回调
    onShowSummonMenu: contents => {
      log(`[GameScene] 收到敌人列表:`, contents);
      enemyList.value = contents || [];
    },
    // 显示建造菜单回调
    onShowStructureMenu: contents => {
      log(`[GameScene] 收到建造菜单，共`, contents?.length || 0, '个建筑');
      // 调用 ActionPanel 的 showBuildMenu 方法
      if (copperActionPanelRef.value?.showBuildMenu) {
        copperActionPanelRef.value.showBuildMenu(contents || []);
      } else {
        log(`[GameScene] ⚠️ copperActionPanelRef.value.showBuildMenu 不存在`);
      }
    },
    // 移除铜偶（死亡时从列表中移除）
    onRemoveCopper: id => {
      const index = playerCoppers.value.findIndex(c => c.id === id);
      if (index > -1) {
        log(`[GameScene] 移除死亡铜偶: ID=${id}`);
        playerCoppers.value.splice(index, 1);

        // 如果当前选中的是死亡铜偶，清除选中状态
        if (selectedCopper.value && selectedCopper.value.id === id) {
          closeCopperPanel();
        }

        // 调整当前铜偶索引
        if (playerCoppers.value.length === 0) {
          currentCopperIndex.value = -1;
        } else if (currentCopperIndex.value === index) {
          currentCopperIndex.value = -1;
        } else if (currentCopperIndex.value > index) {
          currentCopperIndex.value -= 1;
        } else if (currentCopperIndex.value >= playerCoppers.value.length) {
          currentCopperIndex.value = playerCoppers.value.length - 1;
        }
      }
    },
    // 显示资源获取特效（敌人死亡时）
    onShowResourceGain: (position, resourceChanges) => {
      log('[GameScene] 显示资源获取特效:', position, resourceChanges);

      // 使用 effectsManager 显示资源获取特效
      if (effectsManager && Object.keys(resourceChanges).length > 0) {
        effectsManager.createResourceGainEffect(position, resourceChanges);
      }
    },
    // 游戏结束回调
    onGameOver: () => {
      log('[GameScene] 收到游戏结束消息，显示对话框');
      showGameOverDialog.value = true;
    },
    // 游戏成功回调
    onGameSuccess: () => {
      log('[GameScene] 收到游戏胜利消息，显示对话框');
      showGameSuccessDialog.value = true;
    },
    // 攻击完成后的回调
    onAttackComplete: id => {
      if (!props.isGameMode) return;

      // 先检查是否是建筑
      const model = models.find(m => m.id === id);
      if (model?.type === 'structure') {
        log('[GameScene] 建筑攻击完成，刷新建筑状态');
        // 重置状态
        currentActionMode.value = null;

        // 重新点击建筑刷新状态
        setTimeout(async () => {
          await handleClickStructure(id);
        }, 300);
        return;
      }

      // 检查攻击的是否是玩家的铜偶（而不是敌人）
      const isPlayerCopper = playerCoppers.value.some(
        copper => copper.id === id
      );
      if (!isPlayerCopper) {
        log('[GameScene] 敌人攻击完成，不做处理');
        return;
      }

      log('[GameScene] 攻击完成，准备切换铜偶');
      // 重置状态
      currentActionMode.value = null;
      if (copperActionPanelRef.value) {
        copperActionPanelRef.value.cancelAction();
      }

      // 重新获取单位最新状态，然后判断是否切换
      setTimeout(async () => {
        // 判断是铜偶还是友方召唤物
        const isSummon = model?.type === 'summon';

        // 重新点击当前单位获取最新状态
        if (isSummon) {
          await handleClickEnemy(id, false);
        } else {
          await handleClickCopper(id);
        }

        // 等待状态更新后再判断是否切换
        setTimeout(() => {
          // 如果有地面物品，不自动跳转（让玩家拾取）
          if (
            selectedCopperResources.value &&
            selectedCopperResources.value.length > 0
          ) {
            log('[GameScene] 检测到地面物品，不自动跳转');
            return;
          }
          tryNextCopper();
        }, 100);
      }, 300);
    },
    onSetMoveBlock: position => {
      if (indicatorsManager) {
        indicatorsManager.createIndicator(position, 'move');
      }
      log(`[GameScene] 显示移动范围: 坐标=${position}`);
    },
    onSetAttackBlock: position => {
      // 检查是否是传递模式（通过 currentActionMode 判断）
      if (currentActionMode.value === 'transferring') {
        // 收集传递目标位置
        transferTargetPositions.value.push(position);
        // 查找该位置的铜偶
        const targetCopper = models.find(m => {
          if (m.type === 'copper' && m.object) {
            const pos = m.object.position;
            // 检查位置是否匹配（允许小误差）
            return (
              Math.abs(pos.x - position[0]) < 0.1 &&
              Math.abs(pos.z - position[1]) < 0.1
            );
          }
          return false;
        });
        if (targetCopper) {
          // 从 playerCoppers 中查找详细信息
          const copperInfo = playerCoppers.value.find(
            c => c.id === targetCopper.id
          );
          // 检查是否已存在
          const existing = transferTargets.value.find(
            t => t.id === targetCopper.id
          );
          if (!existing) {
            transferTargets.value.push({
              id: targetCopper.id,
              name:
                targetCopper.name ||
                (copperInfo ? copperInfo.name : `铜偶 #${targetCopper.id}`) ||
                `铜偶 #${targetCopper.id}`,
              position: position,
            });
            log(
              `[GameScene] 找到传递目标: ${targetCopper.name || targetCopper.id} (ID=${targetCopper.id}), 总目标数=${transferTargets.value.length}`
            );
          }
        } else {
          log(`[GameScene] 传递位置 ${position} 未找到对应铜偶`);
        }
      } else {
        // 攻击模式
        if (indicatorsManager) {
          indicatorsManager.createIndicator(position, 'attack');
        }
        hasAttackTargets.value = true; // 有攻击范围说明有目标
        log(`[GameScene] 显示攻击范围: ${position}`);
      }
    },
    onSetCanSummonBlock: position => {
      // 显示召唤范围（黄色）
      if (indicatorsManager) {
        indicatorsManager.createIndicator(position, 'summon');
      }
      log(`[GameScene] 显示召唤范围: 坐标=${position}`);
    },
    onClearBlock: position => {
      if (indicatorsManager) {
        indicatorsManager.clearIndicatorAt(position);
      }
    },
    // 从后端消息创建铜偶模型
    onSetCopper: async (_id, position, copper) => {
      log(`[GameScene] 创建铜偶模型: id=${copper.id}, pos=${position}`);

      // 检查是否已存在
      const existing = models.find(m => m.id === copper.id);
      if (existing) {
        log(`[GameScene] 铜偶ID=${copper.id}已存在，跳过`);
        return;
      }

      // 保存工匠的 can_build 状态（供游戏开始时的状态圈显示）
      if (copper.copper?.copper_type === 'CraftsMan') {
        copperCanBuildMap.set(copper.id, copper.can_build === true);
        log(
          `[GameScene] 保存工匠 can_build 状态: id=${copper.id}, can_build=${copper.can_build}`
        );
      }

      // 添加到玩家铜偶列表（游戏模式）
      if (props.isGameMode) {
        const copperData = {
          id: copper.id,
          name: copper.copper.copper_info?.name || `铜偶 #${copper.id}`,
          level: Number(copper.copper?.level ?? 0),
          turnDone: false,
        };
        if (!playerCoppers.value.find(c => c.id === copper.id)) {
          playerCoppers.value.push(copperData);
          log(`[GameScene] 添加玩家铜偶: ${copperData.name}`);
        }
      }

      // 获取铜偶信息
      const copperType = copper.copper.copper_type || 'Arcanist';
      const copperChineseName = copper.copper.copper_info?.name || 'default';
      const modelUrl = copper.copper.copper_info?.model_url;

      // 根据铜偶类型调整缩放
      let modelScale = 1.0;
      switch (copperType) {
        case 'IronWall':
          modelScale = 1.2;
          break;
        case 'Arcanist':
          modelScale = 1.0;
          break;
        case 'Mechanic':
          modelScale = 1.1;
          break;
        case 'Resonator':
          modelScale = 1.0;
          break;
        case 'CraftsMan':
          modelScale = 1.0;
          break;
        default:
          modelScale = 1.0;
      }

      let obj;

      // 如果有直接的模型URL且是召唤物（model_url 包含 '/enemy/'），直接加载
      if (modelUrl && modelUrl.includes('/enemy/')) {
        // 转换为R2 CDN URL
        const cdnModelUrl = getAssetUrl(modelUrl);
        log(
          `[GameScene] 召唤物：使用敌人模型URL加载: ${modelUrl} -> ${cdnModelUrl}`
        );
        obj = await loadModelFromUrl(
          cdnModelUrl,
          position,
          modelScale,
          copperChineseName
        );

        // 为召唤物添加特殊处理（光源）
        if (obj) {
          // 计算包围盒
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());

          // 调整Y位置使模型底部对齐地面
          const scaledBox = new THREE.Box3().setFromObject(obj);
          obj.position.y = -scaledBox.min.y;

          // 添加蓝色点光源（区分友方召唤物）
          const pointLight = new THREE.PointLight(0x4444ff, 2.5, 12);
          pointLight.position.set(0, size.y * modelScale * 0.8, 0);
          obj.add(pointLight);
        }
      } else {
        // 否则使用传统的铜偶模型加载方式
        const copperName = getCopperEnglishName(copperChineseName);
        const typeFolder = getCopperTypeFolder(copperType);

        log(
          `[GameScene] 铜偶信息: 中文名=${copperChineseName}, 英文名=${copperName}, type=${copperType}, typeFolder=${typeFolder}`
        );

        // 尝试加载GLTF模型（传入文件夹名称和模型名称）
        obj = await loadGLTFModel(typeFolder, copperName, position, modelScale);
      }

      // 如果模型加载失败，创建备用立方体
      if (!obj) {
        log(`[GameScene] 使用备用立方体代替模型: ${copperChineseName}`);
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        let color = 0x4488ff;

        // 根据铜偶类型选择颜色
        switch (copperType) {
          case 'IronWall':
            color = 0x888888;
            break;
          case 'Arcanist':
            color = 0xff4488;
            break;
          case 'Mechanic':
            color = 0x44ff88;
            break;
          case 'Resonator':
            color = 0xffaa44;
            break;
          case 'CraftsMan':
            color = 0x4444ff;
            break;
        }

        const material = new THREE.MeshStandardMaterial({ color });
        obj = new THREE.Mesh(geometry, material);
        obj.position.set(position[0], 0.4, position[1]);
      }

      obj.userData.modelId = copper.id; // 设置ID以便点击检测
      scene.add(obj);

      // 添加到models数组
      const modelData = {
        id: copper.id,
        object: obj,
        name: copper.copper.copper_info?.name || `Copper_${copper.id}`,
        type: 'copper',
      };
      models.push(modelData);

      log(`[GameScene] 铜偶创建成功: ${modelData.name} (ID=${copper.id})`);
    },
    onSetEnemy: async (id, position, enemy) => {
      // 使用后端传递的实际 enemy.id
      const actualId = enemy.id;
      const isOwned = enemy.owned || false; // 是否为友方召唤物
      log(
        `[GameScene] 创建敌人模型: id=${actualId}, pos=${position}, owned=${isOwned}`
      );

      // 检查是否已存在
      const existing = models.find(m => m.id === actualId);
      if (existing) {
        log(`[GameScene] 敌人ID=${actualId}已存在，跳过`);
        return;
      }

      // 获取敌人类型名称
      const enemyType = enemy.enemy_base?.enemy_type || '';
      const enemyName = enemyType.toLowerCase() || 'goblin';

      // 根据敌人类型调整缩放
      let modelScale = 1.0;
      switch (enemyName) {
        case 'demon':
        case 'glutton':
        case 'devourer':
          modelScale = 1.5;
          break;
        case 'guard':
        case 'horn':
          modelScale = 1.2;
          break;
        default:
          modelScale = 1.0;
      }

      // 立即添加占位符到models数组，防止竞态条件导致重复创建
      const placeholder = {
        id: actualId,
        object: null,
        name: enemy.enemy_base?.enemy_type || `Enemy_${actualId}`,
        type: isOwned ? 'summon' : 'enemy',
        position: position,
        isOwned: isOwned,
        isLoading: true,
      };
      models.push(placeholder);

      // 尝试加载GLTF模型
      let obj = await loadEnemyModel(enemyName, position, modelScale);

      // 如果模型加载失败，创建备用立方体
      if (!obj) {
        log(`[GameScene] 使用备用立方体代替敌人模型: ${enemyName}`);
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({
          color: isOwned ? 0x4444ff : 0xff0000,
        }); // 友方蓝色，敌方红色
        obj = new THREE.Mesh(geometry, material);
        obj.position.set(position[0], 0.4, position[1]);
      }

      // 如果是友方召唤物，添加蓝色点光源
      if (isOwned && obj) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const pointLight = new THREE.PointLight(0x4444ff, 2.5, 12);
        pointLight.position.set(0, size.y * modelScale * 0.8, 0);
        obj.add(pointLight);
        log(`[GameScene] 友方召唤物添加蓝色光源: ${enemyName}`);
      }

      obj.userData.modelId = actualId; // 设置ID以便点击检测
      scene.add(obj);

      // 更新占位符对象
      placeholder.object = obj;
      placeholder.isLoading = false;

      // 创建血条（所有敌人和召唤物都需要）
      if (
        enemy.now_health !== undefined &&
        enemy.enemy_base?.health !== undefined &&
        healthBarsManager
      ) {
        healthBarsManager.createOrUpdateHealthBar(
          actualId,
          enemy.now_health,
          enemy.enemy_base.health
        );
        log(
          `[GameScene] 创建血条: ${enemyName} (${enemy.now_health}/${enemy.enemy_base.health})`
        );
      }

      // 如果是友方召唤物，添加到playerCoppers列表（使其可被操控）
      if (isOwned) {
        playerCoppers.value.push({
          id: actualId,
          name: enemy.enemy_base?.name || enemyName,
          type: 'summon',
          enemy: enemy, // 保存完整的enemy数据
        });
        log(
          `[GameScene] 友方召唤物添加到操控列表: ${enemyName} (ID=${actualId})`
        );
      }

      log(
        `[GameScene] 敌人创建成功: ${enemy.enemy_base?.enemy_type || actualId}, owned=${isOwned}`
      );
    },
    onSetMaterial: async (id, position, material) => {
      log(
        `[GameScene] 创建矿物: id=${id}, pos=${position}, name=${material.material_base?.name}`
      );

      // 检查是否已存在
      const existing = models.find(m => m.id === id);
      if (existing) {
        log(`[GameScene] 矿物ID=${id}已存在，跳过`);
        return;
      }

      const materialName = material.material_base?.name || '';
      const rawModelUrl = material.material_base?.model_url;

      if (!rawModelUrl) {
        log(`[GameScene] 矿物model_url为空，创建占位立方体`);
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const placeholderMaterial = new THREE.MeshStandardMaterial({
          color: 0xffaa00,
          metalness: 0.3,
          roughness: 0.7,
        });
        const obj = new THREE.Mesh(geometry, placeholderMaterial);
        obj.position.set(position[0], 0.25, position[1]);
        obj.userData.modelId = id;
        scene.add(obj);
        models.push({
          id: id,
          object: obj,
          name: materialName || `Material_${id}`,
          type: 'material',
        });
        return;
      }

      const modelUrl = getMaterialModelUrl(rawModelUrl);
      let obj = null;

      try {
        const modelInstance = await modelCache.loadModel(modelUrl, true);

        const group = new THREE.Group();
        group.add(modelInstance);
        group.position.set(position[0], 0, position[1]);
        group.scale.set(1.0, 1.0, 1.0);
        group.rotation.y = 0;

        // 调整Y位置使模型底部对齐地面
        const scaledBox = new THREE.Box3().setFromObject(group);
        group.position.y = -scaledBox.min.y;

        obj = group;
        log(`[GameScene] 矿物模型加载成功: ${materialName}, URL: ${modelUrl}`);
      } catch (e) {
        log(`[GameScene] 矿物模型加载失败: ${materialName}`, e);

        // 创建占位立方体
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const placeholderMaterial = new THREE.MeshStandardMaterial({
          color: 0xffaa00,
          metalness: 0.3,
          roughness: 0.7,
        });
        obj = new THREE.Mesh(geometry, placeholderMaterial);
        obj.position.set(position[0], 0.25, position[1]);
      }

      obj.userData.modelId = id;
      scene.add(obj);

      models.push({
        id: id,
        object: obj,
        name: materialName || `Material_${id}`,
        type: 'material',
      });

      log(`[GameScene] 矿物创建成功: ${materialName}`);
    },
    onSetStructure: async (id, position, structure) => {
      log(`[GameScene] 创建建筑: id=${id}, pos=${position}`);

      // 检查是否已存在
      const existing = models.find(m => m.id === id);
      if (existing) {
        log(`[GameScene] 建筑ID=${id}已存在，跳过`);
        return;
      }

      const structureName = structure.structure_base?.name || '';
      const englishName = getStructureEnglishName(structureName);

      // 尝试加载GLTF模型
      const modelUrl = getStructureModelUrl(englishName);
      let obj = null;

      try {
        const modelInstance = await modelCache.loadModel(modelUrl, true);

        const group = new THREE.Group();
        group.add(modelInstance);
        group.position.set(position[0], 0, position[1]);
        group.scale.set(1.0, 1.0, 1.0);
        group.rotation.y = 0;

        // 调整Y位置使模型底部对齐地面
        const scaledBox = new THREE.Box3().setFromObject(group);
        group.position.y = -scaledBox.min.y;

        obj = group;
        log(`[GameScene] 建筑模型加载成功: ${structureName}, URL: ${modelUrl}`);
      } catch (e) {
        log(`[GameScene] 建筑模型加载失败: ${structureName}`, e);

        // 创建占位立方体
        const geometry = new THREE.BoxGeometry(0.9, 1.2, 0.9);
        const material = new THREE.MeshStandardMaterial({
          color: 0x666666,
          metalness: 0.5,
          roughness: 0.6,
        });
        obj = new THREE.Mesh(geometry, material);
        obj.position.set(position[0], 0.6, position[1]);
      }

      obj.userData.modelId = id;
      scene.add(obj);

      models.push({
        id: id,
        object: obj,
        name: structureName || `Structure_${id}`,
        type: 'structure',
      });

      log(`[GameScene] 建筑创建成功: ${structureName}`);

      // 创建建筑血条（如果有血量信息）
      if (
        structure.now_health !== undefined &&
        structure.structure_base?.health &&
        healthBarsManager
      ) {
        healthBarsManager.createOrUpdateHealthBar(
          id,
          structure.now_health,
          structure.structure_base.health
        );
        log(
          `[GameScene] 创建建筑血条: ${structureName} (${structure.now_health}/${structure.structure_base.health})`
        );
      }
    },
    onPutResourceMarker: position => {
      const key = `${position[0]},${position[1]}`;

      // 如果已存在，先移除
      if (resourceMarkers.has(key)) {
        const oldMarker = resourceMarkers.get(key);
        scene.remove(oldMarker);

        // 递归清理所有子对象
        oldMarker.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });

        resourceMarkers.delete(key);
      }

      // 创建资源标记（发光的宝箱/袋子图标）
      const group = new THREE.Group();

      // 主体：小圆柱
      const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.25, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.6,
        metalness: 0.7,
        roughness: 0.3,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.125;
      group.add(body);

      // 顶部：发光球
      const topGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const topMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1.0,
      });
      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.position.y = 0.3;
      group.add(top);

      const worldX = position[0];
      const worldZ = position[1];
      group.position.set(worldX, 0.15, worldZ);

      // 添加发光点光源
      const pointLight = new THREE.PointLight(0xffd700, 1.5, 3);
      pointLight.position.set(0, 0.3, 0);
      group.add(pointLight);

      scene.add(group);
      resourceMarkers.set(key, group);
    },
    onClearResourceMarker: position => {
      const key = `${position[0]},${position[1]}`;

      if (resourceMarkers.has(key)) {
        const marker = resourceMarkers.get(key);
        scene.remove(marker);

        // 递归清理所有子对象
        marker.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });

        resourceMarkers.delete(key);
      }
    },
    onDisplayCanMove: (unitId, canMove) => {
      log(`[GameScene] 显示可移动状态: id=${unitId}, show=${canMove}`);
      createIndicator(unitId, 'move', canMove);

      // 如果是当前选中的铜偶，同步更新状态（创建新对象触发响应式）
      if (selectedCopper.value && selectedCopper.value.id === unitId) {
        selectedCopper.value = {
          ...selectedCopper.value,
          can_move: canMove,
        };
        log(`[GameScene] 同步更新selectedCopper.can_move=${canMove}`);
      }
    },
    onDisplayCanAttack: (unitId, canAttack) => {
      log(`[GameScene] 显示可攻击状态: id=${unitId}, show=${canAttack}`);
      createIndicator(unitId, 'attack', canAttack);

      // 如果是当前选中的铜偶，同步更新状态（创建新对象触发响应式）
      if (selectedCopper.value && selectedCopper.value.id === unitId) {
        selectedCopper.value = {
          ...selectedCopper.value,
          can_attack: canAttack,
        };
        log(`[GameScene] 同步更新selectedCopper.can_attack=${canAttack}`);
      }
    },
    onDisplayCanSummon: (unitId, canSummon) => {
      // 后端发送 can_summon 消息，但对于工匠需要使用 can_build 字段
      // 从 selectedCopper 或 playerCoppers 中获取铜偶数据
      let actualCanSummon = canSummon;

      // 检查是否是工匠：
      // 1. 如果有 selectedCopper 数据，从中获取类型
      // 2. 否则从 copperCanBuildMap 查找（游戏开始时的状态圈）
      let isCreaftsman = false;
      let canBuild = false;

      if (selectedCopper.value && selectedCopper.value.id === unitId) {
        // 已点击铜偶，从 selectedCopper 获取
        isCreaftsman = selectedCopper.value.copper?.copper_type === 'CraftsMan';
        canBuild = selectedCopper.value.can_build === true;
      } else if (copperCanBuildMap.has(unitId)) {
        // 未点击但之前保存过，从 Map 获取
        isCreaftsman = true;
        canBuild = copperCanBuildMap.get(unitId);
      }

      if (isCreaftsman) {
        actualCanSummon = canBuild;
        log(
          `[GameScene] 工匠建造状态: id=${unitId}, can_build=${actualCanSummon}`
        );
      }

      log(
        `[GameScene] 显示可召唤/建造状态: id=${unitId}, show=${actualCanSummon}`
      );
      createIndicator(unitId, 'summon', actualCanSummon);

      // 如果是当前选中的铜偶，同步更新状态（创建新对象触发响应式）
      if (selectedCopper.value && selectedCopper.value.id === unitId) {
        selectedCopper.value = {
          ...selectedCopper.value,
          can_summon: actualCanSummon,
        };
        log(`[GameScene] 同步更新selectedCopper.can_summon=${actualCanSummon}`);
      }
    },
    onClearState: unitId => {
      log(`[GameScene] 清除状态: id=${unitId}`);
      // 清除该单位的所有指示器
      if (stateIndicators.has(unitId)) {
        const indicators = stateIndicators.get(unitId);
        if (indicators.move) {
          scene.remove(indicators.move);
          indicators.move.geometry.dispose();
          indicators.move.material.dispose();
          delete indicators.move;
        }
        if (indicators.attack) {
          scene.remove(indicators.attack);
          indicators.attack.geometry.dispose();
          indicators.attack.material.dispose();
          delete indicators.attack;
        }
        if (indicators.summon) {
          scene.remove(indicators.summon);
          indicators.summon.geometry.dispose();
          indicators.summon.material.dispose();
          delete indicators.summon;
        }
        stateIndicators.delete(unitId);
      }
    },
    onUpdateHealth: (unitId, nowHealth, maxHealth) => {
      log(`[GameScene] 更新血量: id=${unitId}, hp=${nowHealth}/${maxHealth}`);

      // 检测是否受伤（血量减少且不是死亡）
      const prevHealth = previousHealth.get(unitId);
      if (prevHealth !== undefined && nowHealth < prevHealth && nowHealth > 0) {
        // 查找单位类型
        const model = models.find(m => m.id === unitId);
        if (model) {
          const isCopper = model.type === 'copper';
          const soundRef = isCopper
            ? meHurtSoundRef.value
            : enemyHurtSoundRef.value;
          if (soundRef) {
            // 重置播放位置并播放
            soundRef.currentTime = 0;
            soundRef.play().catch(err => {
              log(
                `[GameScene] 播放受击音效失败 (${isCopper ? '铜偶' : '敌人'}):`,
                err
              );
            });
            log(
              `[GameScene] 播放受击音效: ${isCopper ? '铜偶' : '敌人'} (ID=${unitId})`
            );
          }
        }
      }

      // 保存当前血量作为下一帧的上一帧血量
      previousHealth.set(unitId, nowHealth);

      if (healthBarsManager) {
        healthBarsManager.createOrUpdateHealthBar(unitId, nowHealth, maxHealth);
      }
    },
    onRemoveHealthBar: unitId => {
      log(`[GameScene] 移除血条: id=${unitId}`);
      if (healthBarsManager) {
        healthBarsManager.removeHealthBar(unitId);
      }
      // 同时清除保存的血量记录
      previousHealth.delete(unitId);
    },
    onPutMapBlock: position => {
      // log(`[GameScene] 放置地图块: position=${position}`)  // 日志太多，已注释
      const key = `${position[0]},${position[1]}`;

      // 如果已存在，先移除
      if (mapBlocks.has(key)) {
        const block = mapBlocks.get(key);
        scene.remove(block);
        block.geometry.dispose();
        if (block.material) {
          // 清理材质资源
          if (block.material.map) block.material.map.dispose();
          if (Array.isArray(block.material)) {
            block.material.forEach(mat => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            block.material.dispose();
          }
        }
      }

      // 获取地图块材质配置
      const cellConfig = getGridCellMaterialConfig();

      if (!cellConfig.enabled) {
        // 如果未启用，不创建地图块
        return;
      }

      // 创建地图块几何体（使用配置的尺寸）
      const size = cellConfig.size || 0.9;
      const height = 0.05; // 保持扁平高度
      const geometry = new THREE.BoxGeometry(size, height, size);

      // 创建材质（根据配置类型）
      let material;
      if (cellConfig.materialType === 'texture' && cellConfig.texture.url) {
        // 纹理材质
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(cellConfig.texture.url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(
          cellConfig.texture.repeat.x,
          cellConfig.texture.repeat.y
        );

        // 纹理材质
        // 强制设置为不透明，避免透明对象渲染顺序问题导致遮挡血条
        const opacity = 1.0; // 强制不透明
        material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: false, // 强制不透明
          opacity: opacity,
          depthTest: true, // 明确启用深度测试
          depthWrite: true, // 允许写入深度（用于遮挡单位模型）
        });
      } else if (cellConfig.materialType === 'standard') {
        // 标准材质（支持光照）
        // 强制设置为不透明，避免透明对象渲染顺序问题导致遮挡血条
        const opacity = 1.0; // 强制不透明
        material = new THREE.MeshStandardMaterial({
          color: cellConfig.standard.color,
          roughness: cellConfig.standard.roughness,
          metalness: cellConfig.standard.metalness,
          transparent: false, // 强制不透明
          opacity: opacity,
          depthTest: true, // 明确启用深度测试
          depthWrite: true, // 允许写入深度（用于遮挡单位模型）
        });
      } else {
        // 基础材质
        // 强制设置为不透明，避免透明对象渲染顺序问题导致遮挡血条
        const opacity = 1.0; // 强制不透明
        material = new THREE.MeshBasicMaterial({
          color: cellConfig.basic.color,
          transparent: false, // 强制不透明
          opacity: opacity,
          depthTest: true, // 明确启用深度测试
          depthWrite: true, // 允许写入深度（用于遮挡单位模型）
        });
      }

      const block = new THREE.Mesh(geometry, material);

      // 设置渲染顺序，确保地图块在血条之前渲染（血条的renderOrder是9999）
      // 使用负值确保地图块先于血条渲染，但保持深度写入以正确遮挡单位模型
      block.renderOrder = -100;

      //  以(0,0)为中心，地图范围 -7 到 7
      // 使用配置的Y偏移，降低地图块位置，避免遮挡血条
      const yOffset = cellConfig.yOffset || 0;
      block.position.set(
        position[0], // 格子中心
        height / 2 + yOffset, // 地板中心（高度的一半）+ 偏移
        position[1] // 格子中心
      );

      scene.add(block);
      mapBlocks.set(key, block);
    },
    //  移动/攻击范围使用 indicatorsManager 系统
    // onSetMoveBlock, onSetAttackBlock, onClearBlock 在前面的 messageQueue.setSceneContext 中已定义
    animateModelMove: (model, targetPosition, onComplete) => {
      if (!model || !model.object) return;

      // 播放移动音效
      const isEnemy = model.type === 'enemy';
      const soundRef = isEnemy ? moveEnemySoundRef.value : moveSoundRef.value;
      if (soundRef) {
        // 重置播放位置并播放
        soundRef.currentTime = 0;
        soundRef.play().catch(err => {
          log(
            `[GameScene] 播放移动音效失败 (${isEnemy ? '敌人' : '铜偶'}):`,
            err
          );
        });
      }

      model.isMoving = true;
      const startPosition = model.object.position.clone();
      const target = new THREE.Vector3(
        targetPosition.x,
        targetPosition.y,
        targetPosition.z
      );
      const duration = 500;
      const startTime = performance.now();

      function animate() {
        if (!model || !model.object) {
          if (onComplete) onComplete();
          return;
        }

        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 2);

        model.object.position.lerpVectors(startPosition, target, easeProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          model.object.position.copy(target);
          model.isMoving = false;
          if (onComplete) onComplete();
        }
      }

      animate();
    },
    //  模式切换：控制测试模型和EventLoop模型的显示
    setTestMode: mode => {
      log(
        `[GameScene] 切换到${
          mode === 'backend' ? '后端测试' : 'EventLoop测试'
        }模式`
      );

      models.forEach(model => {
        if (model.type === 'test') {
          // 测试模型：后端测试和自定义测试时显示
          model.object.visible = mode === 'backend';
        } else if (model.type === 'copper' || model.type === 'enemy') {
          // EventLoop模型：EventLoop测试时显示
          model.object.visible = mode === 'eventloop';
        }
      });

      log(
        `[GameScene] 已${mode === 'backend' ? '显示' : '隐藏'}测试模型，${
          mode === 'eventloop' ? '显示' : '隐藏'
        }EventLoop模型`
      );
    },
  });

  log('[GameScene] 消息队列已配置');
}

function focusOnModelFunc(modelObject, camera, controls) {
  // 获取模型的世界坐标
  const worldOrigin = new THREE.Vector3();
  modelObject.getWorldPosition(worldOrigin);

  // 使用固定的观察角度（斜上方，从后方观看）
  // 可以通过 window.setCameraFocus(距离, 高度) 调整
  const distance = window.cameraFocusDistance || 8; // 相机距离单位的水平距离
  const height = window.cameraFocusHeight || 6; // 相机高度（斜上方视角）

  // 从单位后上方观看（朝向地图中心方向）
  // 相机在单位的 +Z 方向（后方），这样可以看到单位向前移动
  const offsetX = 0;
  const offsetZ = distance;

  const targetPosition = new THREE.Vector3(
    worldOrigin.x + offsetX,
    worldOrigin.y + height,
    worldOrigin.z + offsetZ
  );

  return {
    focusPosition: targetPosition.clone(),
    focusTarget: worldOrigin.clone(),
    lerpFactor: 0.1, // 平滑插值系数
  };
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  // 第一人称移动控制（键盘或虚拟摇杆）
  const hasKeyboardInput = keys.w || keys.a || keys.s || keys.d || keys.shift || keys.space;
  const hasVirtualInput = controlMode.value === 'mobile' && 
    (Math.abs(virtualMoveInput.value.x) > 0.01 || 
     Math.abs(virtualMoveInput.value.y) > 0.01 ||
     virtualVerticalInput.value.up || 
     virtualVerticalInput.value.down);
  
  if (hasKeyboardInput || hasVirtualInput) {
    const velocity = new THREE.Vector3();

    // 键盘输入
    if (keys.w) velocity.z -= 1; // 向前
    if (keys.s) velocity.z += 1; // 向后
    if (keys.a) velocity.x -= 1; // 向左
    if (keys.d) velocity.x += 1; // 向右

    // 虚拟摇杆输入（左摇杆）
    if (controlMode.value === 'mobile') {
      velocity.x += virtualMoveInput.value.x;
      velocity.z += virtualMoveInput.value.y; // 摇杆Y轴对应前后移动
    }

    // 垂直移动
    if (keys.shift) velocity.y -= 1; // 向下
    if (keys.space) velocity.y += 1; // 向上
    if (controlMode.value === 'mobile') {
      if (virtualVerticalInput.value.up) velocity.y += 1;
      if (virtualVerticalInput.value.down) velocity.y -= 1;
    }

    // 应用相机旋转到水平移动
    velocity.applyQuaternion(camera.quaternion);

    // 重置Y轴，只保留水平移动（如果没有垂直移动输入）
    const hasVerticalInput = keys.shift || keys.space || 
      (controlMode.value === 'mobile' && (virtualVerticalInput.value.up || virtualVerticalInput.value.down));
    if (hasVerticalInput) {
      velocity.y = (keys.shift || (controlMode.value === 'mobile' && virtualVerticalInput.value.down)) ? -1 : 1;
    } else {
      velocity.y = 0;
    }

    // 移动相机位置
    camera.position.add(velocity.multiplyScalar(moveSpeed));
  }

  // 虚拟摇杆视角控制（右摇杆）
  if (controlMode.value === 'mobile' && 
      (Math.abs(virtualRotateInput.value.x) > 0.01 || Math.abs(virtualRotateInput.value.y) > 0.01)) {
    const rotateSpeed = 0.05; // 虚拟摇杆旋转速度
    yaw -= virtualRotateInput.value.x * rotateSpeed;
    pitch -= virtualRotateInput.value.y * rotateSpeed;

    // 限制上下旋转角度
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    // 应用旋转到相机
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  // 处理聚焦（简化版，不使用controls）
  if (focusState.focusPosition && focusState.focusTarget) {
    // 平滑移动相机位置
    camera.position.lerp(focusState.focusPosition, focusState.lerpFactor);

    // 直接使用 lookAt 让相机朝向目标（更简单可靠）
    camera.lookAt(focusState.focusTarget);

    // 同步更新 yaw 和 pitch，以便第一人称控制继续工作
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;

    // 当接近目标位置时，清除聚焦状态
    const distance = camera.position.distanceTo(focusState.focusPosition);
    if (distance < 0.5) {
      log('[GameScene] 相机聚焦完成');
      focusState.focusPosition = null;
      focusState.focusTarget = null;
    }
  }

  // 更新所有血条位置（让血条跟随单位移动并面向相机）
  if (healthBarsManager) {
    healthBarsManager.updateHealthBarsPosition(models);
  }

  renderer.render(scene, camera);
}

function goBack() {
  emit('back');
}

// 点击场景中的对象
function onSceneClick(event) {
  // 忽略UI点击
  if (event.target.tagName !== 'CANVAS') return;

  // 计算鼠标位置（归一化设备坐标）
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // 更新射线
  raycaster.setFromCamera(mouse, camera);

  // 如果在移动/攻击/召唤/建造模式，检测地板点击
  if (
    currentActionMode.value === 'moving' ||
    currentActionMode.value === 'attacking' ||
    currentActionMode.value === 'summoning' ||
    currentActionMode.value === 'building' ||
    currentActionMode.value === 'transferring' ||
    currentActionMode.value === 'structureMoving' ||
    currentActionMode.value === 'structureAttacking' ||
    currentActionMode.value === 'structureExtract' ||
    currentActionMode.value === 'structureTransfer'
  ) {
    handleFloorClick(mouse);
    return;
  }

  // 检测可点击单位（铜偶、友方召唤物、野生敌人、建筑）
  const clickableObjects = models
    .filter(
      m =>
        (m.type === 'copper' ||
          m.type === 'summon' ||
          m.type === 'enemy' ||
          m.type === 'structure') &&
        m.object
    )
    .map(m => m.object);

  const intersects = raycaster.intersectObjects(clickableObjects, true);

  if (intersects.length > 0) {
    // 找到被点击的模型
    let clickedObject = intersects[0].object;
    while (clickedObject.parent && !clickedObject.userData.modelId) {
      clickedObject = clickedObject.parent;
    }

    const modelId = clickedObject.userData.modelId;
    if (modelId !== undefined) {
      const model = models.find(m => m.id === modelId);
      const unitTypeMap = {
        copper: '铜偶',
        summon: '友方召唤物',
        enemy: '野生敌人',
        structure: '建筑',
      };
      const unitType = unitTypeMap[model?.type] || '未知单位';
      log(`[GameScene] 点击${unitType}，ID:`, modelId);

      // 根据单位类型分别处理
      if (model?.type === 'summon' || model?.type === 'enemy') {
        // 友方召唤物和野生敌人都调用handleClickEnemy
        handleClickEnemy(modelId, model?.type === 'enemy');
      } else if (model?.type === 'structure') {
        // 建筑点击处理
        handleClickStructure(modelId);
      } else {
        handleClickCopper(modelId);
      }
    }
  } else {
    // 点击空白处，关闭所有面板
    selectedCopper.value = null;
    selectedStructure.value = null;
  }
}

// 处理地板点击（移动/攻击）
async function handleFloorClick(mousePos) {
  // 创建一个平面用于射线检测
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mousePos, camera);

  // 若正在锁定移动，直接忽略地板点击（防止连续发送移动）
  if (currentActionMode.value === 'moving' && isMoveLocked.value) {
    log('[GameScene] 移动中，忽略新的移动点击');
    return;
  }

  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);

  if (intersectPoint) {
    // 转换为网格坐标（直接使用全局坐标系统：世界坐标除以cellSize）
    const gridX = Math.round(intersectPoint.x);
    const gridZ = Math.round(intersectPoint.z);

    log(`[GameScene] 点击地板: (${gridX}, ${gridZ})`);

    // 检查点击的位置是否在允许的范围内
    const expectedType = {
      moving: 'move',
      attacking: 'attack',
      summoning: 'summon',
      building: 'summon', // 建造使用 summon 类型（后端设计：建筑和召唤共用同一个圈）
      structureMoving: 'move', // 建筑移动使用移动范围的黄色方块
      structureAttacking: 'attack', // 建筑攻击使用攻击范围的红色方块
      structureExtract: 'attack', // 提取使用攻击范围的红色方块
      structureTransfer: 'attack', // 传递使用攻击范围的红色方块
    }[currentActionMode.value];

    // 使用 indicatorsManager 检查是否有对应类型的指示器
    if (
      !indicatorsManager ||
      !indicatorsManager.hasIndicatorAt([gridX, gridZ], expectedType)
    ) {
      log(`[GameScene] 点击位置 (${gridX}, ${gridZ}) 不在允许范围内，忽略`);
      return;
    }

    if (currentActionMode.value === 'moving') {
      await handleMoveApply(gridX, gridZ);
    } else if (currentActionMode.value === 'attacking') {
      await handleAttackApply(gridX, gridZ);
    } else if (currentActionMode.value === 'summoning') {
      await handleSummonApply(gridX, gridZ);
    } else if (currentActionMode.value === 'building') {
      await handleBuildApply(gridX, gridZ);
    } else if (currentActionMode.value === 'structureMoving') {
      await handleStructureMoveApply(gridX, gridZ);
    } else if (currentActionMode.value === 'structureAttacking') {
      await handleStructureAttackApply(gridX, gridZ);
    } else if (currentActionMode.value === 'structureExtract') {
      await handleStructureExtractApply(gridX, gridZ);
    } else if (currentActionMode.value === 'structureTransfer') {
      await handleStructureTransferApply(gridX, gridZ);
    }
  }
}

// 执行移动
async function handleMoveApply(x, z) {
  if (!selectedCopper.value) return;
  if (isMoveLocked.value) {
    log('[GameScene] 已发送移动请求，等待完成，忽略新的移动');
    return;
  }

  // 判断是铜偶还是友方召唤物
  const isOwnedEnemy = selectedCopper.value.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_enemy_move_apply' : 'on_move_apply';

  log(
    `[GameScene] 请求移动到: (${x}, ${z}), 单位类型=${isOwnedEnemy ? '友方召唤物' : '铜偶'}, 事件=${eventType}`
  );

  const message = JSON.stringify({
    type: eventType,
    content: {
      id: String(selectedCopper.value.id),
      position: { x: String(x), y: String(z) },
    },
  });

  // 发送一次移动后加锁，等待 move_to 动画完成回调再解锁
  isMoveLocked.value = true;

  await eventloop(message);

  // 不在这里切换铜偶，等待后端验证成功后的 move_to 消息
}

// 执行攻击
async function handleAttackApply(x, z) {
  if (!selectedCopper.value) return;

  // 判断是铜偶还是友方召唤物
  const isOwnedEnemy = selectedCopper.value.isOwnedEnemy === true;
  const eventType = isOwnedEnemy ? 'on_enemy_attack_apply' : 'on_attack_apply';

  log(
    `[GameScene] 请求攻击位置: (${x}, ${z}), 单位类型=${isOwnedEnemy ? '友方召唤物' : '铜偶'}, 事件=${eventType}`
  );

  // 立即播放攻击音效和特效（在发送消息前）
  const attackerId = selectedCopper.value.id;
  const attacker = models.find(m => m.id === attackerId);
  if (attacker) {
    // 播放攻击音效
    const isEnemy = attacker.type === 'enemy';
    const soundRef = isEnemy ? attackEnemySoundRef.value : attackSoundRef.value;
    if (soundRef) {
      soundRef.currentTime = 0;
      soundRef.play().catch(err => {
        log(
          `[GameScene] 播放攻击音效失败 (${isEnemy ? '敌人' : '铜偶'}):`,
          err
        );
      });
    }

    // 调用攻击特效
    if (createAttackEffectFunc) {
      createAttackEffectFunc(attackerId, [x, z]);
    }
  }

  const message = JSON.stringify({
    type: eventType,
    content: {
      id: String(selectedCopper.value.id),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);

  // 不在这里切换铜偶，等待后端攻击完成后再处理
}

// 执行召唤（点击地面时）
async function handleSummonApply(x, z) {
  if (!selectedCopper.value) return;

  log(`[GameScene] 选择召唤位置: (${x}, ${z})`);

  // 保存召唤位置
  summonPosition.value = [x, z];

  // 获取可召唤的敌人列表
  const message = JSON.stringify({
    type: 'on_get_summon_menu',
  });
  await eventloop(message);

  // 短暂延迟等待敌人列表加载
  await new Promise(resolve => setTimeout(resolve, 100));

  // 显示召唤菜单
  showSummonModal.value = true;
}

// 执行建造（点击地面时）
async function handleBuildApply(x, z) {
  if (!selectedCopper.value || !currentBuildingName.value) return;

  log(`[GameScene] 请求建造 ${currentBuildingName.value} 到位置: (${x}, ${z})`);

  const copperId = selectedCopper.value.id;

  const message = JSON.stringify({
    type: 'on_structure_build_apply',
    content: {
      id: String(copperId),
      position: { x: String(x), y: String(z) },
      name: currentBuildingName.value,
    },
  });
  await eventloop(message);

  // 建造完成，清除建造模式（后端会自动清理黄色方块）
  currentActionMode.value = null;
  currentBuildingName.value = null;

  // 重置 ActionPanel 的状态
  if (copperActionPanelRef.value) {
    copperActionPanelRef.value.cancelAction();
  }

  // 等待消息处理完成
  await new Promise(resolve => setTimeout(resolve, 100));

  // 重新点击铜偶刷新状态（建造后 can_build 状态会改变）
  log('[GameScene] 建造完成，刷新铜偶状态');
  await handleClickCopper(copperId);
}

// 确认召唤（从菜单选择敌人后）
async function handleSummonConfirm(enemyName) {
  if (!selectedCopper.value || !summonPosition.value) return;

  const [x, z] = summonPosition.value;
  log(`[GameScene] 确认召唤 ${enemyName} 到位置: (${x}, ${z})`);

  try {
    const message = JSON.stringify({
      type: 'on_summon_apply',
      content: {
        id: String(selectedCopper.value.id),
        position: { x: String(x), y: String(z) },
        name: enemyName,
      },
    });
    await eventloop(message);
  } catch (error) {
    log('[GameScene] 召唤失败:', error);
  } finally {
    // 无论成功还是失败，都清理UI
    // 关闭召唤菜单
    showSummonModal.value = false;

    // 召唤完成后清除召唤模式
    currentActionMode.value = null;
    summonPosition.value = null;

    // 清理 ActionPanel 的状态
    if (copperActionPanelRef.value) {
      copperActionPanelRef.value.cancelAction();
    }

    // 发送召唤结束消息
    try {
      const endMessage = JSON.stringify({ type: 'on_summon_end' });
      await eventloop(endMessage);
    } catch (error) {
      log('[GameScene] 清除召唤范围失败:', error);
    }
  }
}

// 关闭召唤菜单
function handleCloseSummonModal() {
  showSummonModal.value = false;
  summonPosition.value = null;
  // 清除召唤模式
  currentActionMode.value = null;
  // 发送召唤结束消息，清除黄色方块
  const endMessage = JSON.stringify({ type: 'on_summon_end' });
  eventloop(endMessage).catch(e => {
    log('[GameScene] 清除召唤范围失败', e);
  });
}

// 处理建筑面板取消操作
function handleStructurePanelCancel() {
  log('[GameScene] 建筑面板取消操作');

  if (currentActionMode.value === 'structureMoving') {
    const message = JSON.stringify({ type: 'on_structure_move_end' });
    eventloop(message).catch(e => {
      log('[GameScene] 清除建筑移动范围失败', e);
    });
  } else if (currentActionMode.value === 'structureAttacking') {
    const message = JSON.stringify({ type: 'on_structure_attack_end' });
    eventloop(message).catch(e => {
      log('[GameScene] 清除建筑攻击范围失败', e);
    });
  } else if (currentActionMode.value === 'structureExtract') {
    const message = JSON.stringify({ type: 'on_structure_extract_end' });
    eventloop(message).catch(e => {
      log('[GameScene] 清除建筑提取范围失败', e);
    });
  } else if (currentActionMode.value === 'structureTransfer') {
    const message = JSON.stringify({ type: 'on_structure_transfer_end' });
    eventloop(message).catch(e => {
      log('[GameScene] 清除建筑传递范围失败', e);
    });
  }

  currentActionMode.value = null;
}

// 关闭建筑面板
function closeStructurePanel() {
  // 如果正在进行建筑的 extract/transfer 操作，需要清理
  handleStructurePanelCancel();

  selectedStructure.value = null;
  selectedStructureData.value = null;
  log('[GameScene] 关闭建筑面板');
}

// 处理建筑动作
async function handleStructureAction(action) {
  if (!selectedStructure.value) return;

  const structureId = selectedStructure.value.id;
  log(`[GameScene] 建筑动作: ${action.type}, ID=${structureId}`);

  switch (action.type) {
    case 'move':
      // 建筑移动（矿车专属）
      await handleStructureMoveStart(structureId);
      break;
    case 'attack':
      // 建筑攻击（箭塔等防御建筑）
      await handleStructureAttackStart(structureId);
      break;
    case 'transfer':
      // 建筑传递物品（传递给周围的铜偶/建筑）
      await handleStructureTransferStart(structureId);
      break;
    case 'extract':
      // 建筑提取物品（从周围的铜偶/建筑提取到自己）
      await handleStructureExtractStart(structureId);
      break;
    default:
      log('[GameScene] 未知建筑动作:', action.type);
  }
}

// 建筑开始移动
async function handleStructureMoveStart(structureId) {
  log(`[GameScene] 建筑 ${structureId} 开始移动`);

  const message = JSON.stringify({
    type: 'on_structure_move_start',
    content: { id: String(structureId) },
  });
  await eventloop(message);

  // 进入移动模式
  currentActionMode.value = 'structureMoving';
}

// 建筑开始攻击
async function handleStructureAttackStart(structureId) {
  log(`[GameScene] 建筑 ${structureId} 开始攻击`);

  const message = JSON.stringify({
    type: 'on_structure_attack_start',
    content: { id: String(structureId) },
  });
  await eventloop(message);

  // 进入攻击模式
  currentActionMode.value = 'structureAttacking';
}

// 建筑开始提取物品
async function handleStructureExtractStart(structureId) {
  log(`[GameScene] 建筑 ${structureId} 开始提取物品`);

  const message = JSON.stringify({
    type: 'on_structure_extract_start',
    content: { id: String(structureId) },
  });
  await eventloop(message);

  // 进入提取模式
  currentActionMode.value = 'structureExtract';
}

// 建筑开始传递物品
async function handleStructureTransferStart(structureId) {
  log(`[GameScene] 建筑 ${structureId} 开始传递物品`);

  const message = JSON.stringify({
    type: 'on_structure_transfer_start',
    content: { id: String(structureId) },
  });
  await eventloop(message);

  // 进入传递模式
  currentActionMode.value = 'structureTransfer';
}

// 建筑应用移动
async function handleStructureMoveApply(x, z) {
  if (!selectedStructure.value) return;

  log(`[GameScene] 建筑 ${selectedStructure.value.id} 移动到 (${x}, ${z})`);

  const message = JSON.stringify({
    type: 'on_structure_move_apply',
    content: {
      id: String(selectedStructure.value.id),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);

  // 移动完成，清除模式
  currentActionMode.value = null;
}

// 建筑应用攻击
async function handleStructureAttackApply(x, z) {
  if (!selectedStructure.value) return;

  log(`[GameScene] 建筑 ${selectedStructure.value.id} 攻击 (${x}, ${z})`);

  const message = JSON.stringify({
    type: 'on_structure_attack_apply',
    content: {
      id: String(selectedStructure.value.id),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);

  // 攻击完成，清除模式
  currentActionMode.value = null;
}

// 建筑应用提取物品
async function handleStructureExtractApply(x, z) {
  if (!selectedStructure.value) return;

  log(
    `[GameScene] 建筑 ${selectedStructure.value.id} 从 (${x}, ${z}) 提取物品`
  );

  const structureId = selectedStructure.value.id;

  const message = JSON.stringify({
    type: 'on_structure_extract_apply',
    content: {
      id: String(structureId),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);

  // 清除红色圈
  log('[GameScene] 发送提取结束消息，清除红色圈');
  const endMessage = JSON.stringify({ type: 'on_structure_extract_end' });
  await eventloop(endMessage);

  // 等待消息处理
  await new Promise(resolve => setTimeout(resolve, 100));
  log('[GameScene] 提取完成，准备刷新建筑状态');

  // 提取完成，清除模式
  currentActionMode.value = null;

  // 重新点击建筑刷新状态（延迟以确保后端状态已更新）
  setTimeout(async () => {
    log('[GameScene] 重新点击建筑刷新状态');
    await handleClickStructure(structureId);
  }, 300);
}

// 建筑应用传递物品
async function handleStructureTransferApply(x, z) {
  if (!selectedStructure.value) return;

  log(
    `[GameScene] 建筑 ${selectedStructure.value.id} 向 (${x}, ${z}) 传递物品`
  );

  const structureId = selectedStructure.value.id;

  const message = JSON.stringify({
    type: 'on_structure_transfer_apply',
    content: {
      id: String(structureId),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);

  // 清除红色圈
  log('[GameScene] 发送传递结束消息，清除红色圈');
  const endMessage = JSON.stringify({ type: 'on_structure_transfer_end' });
  await eventloop(endMessage);

  // 等待消息处理
  await new Promise(resolve => setTimeout(resolve, 100));
  log('[GameScene] 传递完成，准备刷新建筑状态');

  // 传递完成，清除模式
  currentActionMode.value = null;

  // 重新点击建筑刷新状态（延迟以确保后端状态已更新）
  setTimeout(async () => {
    log('[GameScene] 重新点击建筑刷新状态');
    await handleClickStructure(structureId);
  }, 300);
}

// 处理点击铜偶
async function handleClickCopper(copperId) {
  // 更新当前铜偶索引，以便 TurnSystem 正确显示名称
  const index = playerCoppers.value.findIndex(c => c.id === copperId);
  if (index !== -1) {
    currentCopperIndex.value = index;
  }

  // 关闭建筑面板
  selectedStructure.value = null;

  const message = JSON.stringify({
    type: 'on_click_copper',
    content: { id: String(copperId) },
  });
  await eventloop(message);
}

// 处理点击建筑
async function handleClickStructure(structureId) {
  log(`[GameScene] 点击建筑: ID=${structureId}`);

  // 关闭铜偶面板
  selectedCopper.value = null;

  // 发送点击建筑消息到后端
  const message = JSON.stringify({
    type: 'on_click_structure',
    content: { id: String(structureId) },
  });
  await eventloop(message);
}

// 处理点击友方召唤物或野生敌人
async function handleClickEnemy(enemyId, isWildEnemy = false) {
  // 只有友方召唤物才更新索引（野生敌人不在playerCoppers列表中）
  if (!isWildEnemy) {
    const index = playerCoppers.value.findIndex(c => c.id === enemyId);
    if (index !== -1) {
      currentCopperIndex.value = index;
    }
  } else {
    currentCopperIndex.value = -1;
    closeCopperPanel();
  }

  // 关闭建筑面板
  selectedStructure.value = null;

  const message = JSON.stringify({
    type: 'on_click_enemy',
    content: { id: String(enemyId) },
  });
  await eventloop(message);
}

// 关闭铜偶面板
function closeCopperPanel() {
  selectedCopper.value = null;
  selectedCopperResources.value = [];
  currentActionMode.value = null;
}

// 处理铜偶操作
async function handleCopperAction(action) {
  log('[GameScene] 铜偶操作:', action);

  if (action.type === 'moveStart') {
    currentActionMode.value = 'moving';
  } else if (action.type === 'attackStart') {
    currentActionMode.value = 'attacking';
  } else if (action.type === 'summonStart') {
    currentActionMode.value = 'summoning';
  } else if (action.type === 'buildRequest') {
    // 请求建造菜单
    log('[GameScene] 请求建造菜单');
    const message = JSON.stringify({
      type: 'on_get_structure_menu',
    });
    await eventloop(message);
    // 等待消息处理完成，菜单会通过 onShowStructureMenu 回调显示
  } else if (action.type === 'buildStart') {
    currentActionMode.value = 'building';
    currentBuildingName.value = action.structureName || null;
  } else if (
    action.type === 'transferring' ||
    action.type === 'transferStart'
  ) {
    currentActionMode.value = 'transferring';
    // 清空之前的传递目标
    transferTargetPositions.value = [];
    transferTargets.value = [];
  } else if (action.type === 'transferComplete') {
    // 传递完成，清除传递模式和目标
    currentActionMode.value = null;
    transferTargetPositions.value = [];
    transferTargets.value = [];
  } else if (action.type === 'cancel') {
    // 根据当前模式调用对应的 end 函数清除范围显示
    const mode = currentActionMode.value;
    if (mode === 'moving') {
      const message = JSON.stringify({ type: 'on_move_end' });
      eventloop(message).catch(e => {
        log('[GameScene] 清除移动范围失败', e);
      });
    } else if (mode === 'attacking') {
      const message = JSON.stringify({ type: 'on_attack_end' });
      eventloop(message).catch(e => {
        log('[GameScene] 清除攻击范围失败', e);
      });
    } else if (mode === 'transferring') {
      const message = JSON.stringify({ type: 'on_transfer_end' });
      eventloop(message).catch(e => {
        log('[GameScene] 清除传递范围失败', e);
      });
      // 清空传递目标
      transferTargetPositions.value = [];
      transferTargets.value = [];
    } else if (mode === 'summoning') {
      const message = JSON.stringify({ type: 'on_summon_end' });
      eventloop(message).catch(e => {
        log('[GameScene] 清除召唤范围失败', e);
      });
      // 关闭召唤菜单
      showSummonModal.value = false;
    } else if (mode === 'building') {
      const message = JSON.stringify({ type: 'on_structure_build_end' });
      eventloop(message).catch(e => {
        log('[GameScene] 清除建造范围失败', e);
      });
      // 清除建造状态
      currentBuildingName.value = null;
      summonPosition.value = null;
    }
    currentActionMode.value = null;
  } else if (action.type === 'wait') {
    log('[GameScene] 铜偶选择等待，跳转到下一个');
    // 跳转到下一个铜偶
    nextCopper();
  }
}

// 尝试切换到下一个铜偶（检查是否还有可操作的铜偶）
function tryNextCopper() {
  if (playerCoppers.value.length === 0) return;

  // 检查当前铜偶是否还能操作
  if (selectedCopper.value) {
    const canMove = selectedCopper.value.can_move;
    const canAttack = selectedCopper.value.can_attack;
    const canSummon = selectedCopper.value.can_summon;

    log(
      `[GameScene] 检查铜偶状态: ID=${selectedCopper.value.id}, can_move=${canMove}, can_attack=${canAttack}, can_summon=${canSummon}, hasAttackTargets=${hasAttackTargets.value}`
    );

    // 实际可执行的操作：
    // 1. 可以移动
    // 2. 可以攻击 且 有攻击目标
    // 3. 可以召唤
    const hasValidActions =
      canMove || (canAttack && hasAttackTargets.value) || canSummon;

    if (hasValidActions) {
      log('[GameScene] 当前铜偶还能操作，不切换');
      return;
    }
  }

  log('[GameScene] 当前铜偶不能操作，切换到下一个');
  // 当前铜偶不能操作了，尝试切换到下一个
  nextCopper();
}

// 切换到下一个铜偶
async function nextCopper() {
  if (playerCoppers.value.length === 0) return;

  // 关闭当前面板
  selectedCopper.value = null;
  currentActionMode.value = null;

  const startIndex = currentCopperIndex.value;
  let attempts = 0;
  const maxAttempts = playerCoppers.value.length;

  // 循环查找下一个可操作的铜偶
  while (attempts < maxAttempts) {
    // 切换索引
    currentCopperIndex.value =
      (currentCopperIndex.value + 1) % playerCoppers.value.length;
    const nextCopper = playerCoppers.value[currentCopperIndex.value];

    log(
      `[GameScene] 检查铜偶: ${nextCopper.name || nextCopper.id} (尝试 ${
        attempts + 1
      }/${maxAttempts})`
    );

    // 点击单位获取最新状态（根据类型选择正确的函数）
    await new Promise(resolve => {
      setTimeout(async () => {
        // 判断是铜偶还是友方召唤物
        const model = models.find(m => m.id === nextCopper.id);
        const isSummon = model?.type === 'summon';

        if (isSummon) {
          await handleClickEnemy(nextCopper.id, false);
        } else {
          await handleClickCopper(nextCopper.id);
        }
        resolve();
      }, 300);
    });

    // 等待状态更新
    await new Promise(resolve => setTimeout(resolve, 200));

    // 检查这个铜偶是否真的可以操作
    // 实际可执行的操作：
    // 1. 可以移动
    // 2. 可以攻击 且 有攻击目标
    // 3. 可以召唤
    const canMove = selectedCopper.value?.can_move || false;
    const canAttack = selectedCopper.value?.can_attack || false;
    const canSummon = selectedCopper.value?.can_summon || false;
    const hasValidActions =
      canMove || (canAttack && hasAttackTargets.value) || canSummon;

    log(
      `[GameScene] 铜偶 ${nextCopper.name}: can_move=${canMove}, can_attack=${canAttack}, can_summon=${canSummon}, hasTargets=${hasAttackTargets.value}, valid=${hasValidActions}`
    );

    if (selectedCopper.value && hasValidActions) {
      log(`[GameScene] 找到可操作的铜偶: ${nextCopper.name || nextCopper.id}`);
      return; // 找到可操作的铜偶，停止
    }

    attempts++;
  }

  // 所有铜偶都不能操作了
  log('[GameScene] 所有铜偶都不能操作，回合可以结束');
  selectedCopper.value = null;

  // 提示玩家可以结束回合
  if (props.isGameMode) {
    log('[GameScene] 提示：所有铜偶都已完成操作，可以点击"结束回合"按钮');
  }
}

// 结束回合
function endRound() {
  currentRound.value++;
  currentCopperIndex.value = -1;
  selectedCopper.value = null;
  currentActionMode.value = null;

  // 重置所有铜偶的turnDone状态
  playerCoppers.value.forEach(c => (c.turnDone = false));

  log(`[GameScene] 进入回合 ${currentRound.value}`);

  // 检查是否有野生敌人
  const wildEnemies = models.filter(m => m.type === 'enemy' && !m.isOwned);
  log(`[GameScene] 检测到 ${wildEnemies.length} 个野生敌人`);

  if (wildEnemies.length === 0) {
    // 没有野生敌人，不需要跟踪
    log('[GameScene] 没有野生敌人，允许按钮点击');
    isEnemyMoving.value = false;
  } else {
    // 开始跟踪敌人移动
    isEnemyMoving.value = true;
    pendingEnemyMoves.value.clear();
    log('[GameScene] 开始跟踪敌人移动，禁用按钮');

    // 设置超时，如果 3 秒后还没有所有敌人移动完成，也允许按钮点击（防止卡死）
    let timeoutId = setTimeout(() => {
      if (isEnemyMoving.value && pendingEnemyMoves.value.size > 0) {
        log('[GameScene] 敌人移动超时，强制允许按钮点击');
        isEnemyMoving.value = false;
        pendingEnemyMoves.value.clear();
      }
    }, 3000);

    // 如果所有敌人移动完成，清除超时
    let checkInterval = setInterval(() => {
      if (!isEnemyMoving.value) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
      }
    }, 100);

    // 检查是否有敌人需要移动：如果 1 秒后还没有敌人开始移动，允许按钮点击
    // 注意：敌人可能选择攻击而不是移动，所以即使没有 move_to 消息也是正常的
    setTimeout(() => {
      if (isEnemyMoving.value && pendingEnemyMoves.value.size === 0) {
        log('[GameScene] 没有敌人需要移动（可能选择了攻击），允许按钮点击');
        isEnemyMoving.value = false;
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
      }
    }, 1000);
  }
}

// 处理游戏结束对话框确定按钮
async function handleGameOverConfirm() {
  log('[GameScene] 游戏结束对话框确定，返回菜单');

  // 关闭对话框
  showGameOverDialog.value = false;

  // 发送 on_game_over 消息给后端，让后端清空 Game
  const message = JSON.stringify({ type: 'on_game_over' });
  await eventloop(message);

  // 返回菜单
  emit('back');
}

// 处理游戏成功对话框确定按钮
async function handleGameSuccessConfirm() {
  log('[GameScene] 游戏胜利对话框确定，发送game over事件');

  // 关闭成功对话框
  showGameSuccessDialog.value = false;

  // 发送 on_game_over 消息给后端，让后端清空 Game
  const message = JSON.stringify({ type: 'on_game_over' });
  await eventloop(message);

  // 显示制作团队名单
  showCreditsScreen();
}

// 显示制作团队名单
function showCreditsScreen() {
  log('[GameScene] 显示制作团队名单');
  showCredits.value = true;

  // 5秒后自动关闭制作团队名单并返回菜单
  setTimeout(() => {
    log('[GameScene] 制作团队名单播放完毕，返回菜单');
    showCredits.value = false;
    emit('back');
  }, 5000);
}

// 跳过制作团队名单
function skipCredits() {
  log('[GameScene] 跳过制作团队名单，立即返回菜单');
  showCredits.value = false;
  emit('back');
}

// 打开撤退确认对话框
function openWithdrawDialog() {
  log('[GameScene] 打开撤退确认对话框');
  showWithdrawDialog.value = true;
}

// 取消撤退
function cancelWithdraw() {
  log('[GameScene] 取消撤退');
  showWithdrawDialog.value = false;
}

// 确认撤退
async function confirmWithdraw() {
  log('[GameScene] 确认撤退，发送 game_over 消息');

  // 关闭对话框
  showWithdrawDialog.value = false;

  // 发送 game_over 消息（直接发送 game_over，不需要先经过前端处理）
  // 然后发送 on_game_over 清空 Game
  const message = JSON.stringify({ type: 'on_game_over' });
  await eventloop(message);

  // 返回菜单
  emit('back');
}

// 关闭资源不足提示
function closeResourceDialog() {
  log('[GameScene] 关闭资源不足提示');
  showResourceDialog.value = false;
  resourceDialogMessage.value = '';
}

// 背景图片路径（CSS border-image 需要 url() 包裹）
const panel7Src = `url('${getAssetUrl('@assets/ui/panel7.png')}')`;
const panel8Src = `url('${getAssetUrl('@assets/ui/panel8.png')}')`;
</script>

<template>
  <div class="game-scene">
    <div ref="container" class="scene-container"></div>

    <!-- 回合系统 -->
    <TurnSystem
      v-if="isGameMode"
      :currentCopperId="currentCopperId"
      :copperList="playerCoppers"
      :roundNumber="currentRound"
      :isEnemyMoving="isEnemyMoving"
      @nextCopper="nextCopper"
      @endRound="endRound"
      @selectCopper="handleClickCopper"
    />

    <!-- 撤退按钮 -->
    <button
      v-if="isGameMode"
      class="withdraw-button"
      @click="openWithdrawDialog"
    >
      撤退
    </button>

    <!-- 全局资源面板 -->
    <ResourcePanel v-if="isGameMode" />


    <!-- 铜偶操作面板（仅游戏模式显示） -->
    <ActionPanel
      v-if="isGameMode && selectedCopper"
      ref="copperActionPanelRef"
      :copper="selectedCopper"
      :resources="selectedCopperResources"
      :hasAttackTargets="hasAttackTargets"
      :transferTargets="transferTargets"
      :onSelectCopper="handleClickCopper"
      @close="closeCopperPanel"
      @action="handleCopperAction"
    />

    <!-- 召唤菜单（仅游戏模式显示） -->
    <SummonModal
      v-if="isGameMode"
      :visible="showSummonModal"
      :copper-name="selectedCopper?.copper?.copper_info?.name || '共鸣者'"
      :enemy-list="enemyList"
      :position="summonPosition"
      @close="handleCloseSummonModal"
      @summon="handleSummonConfirm"
    />

    <!-- 建筑详情面板（仅游戏模式显示） -->
    <StructurePanel
      v-if="isGameMode && selectedStructure"
      :structure="selectedStructure"
      :resources="selectedStructureData?.resources || []"
      :action-mode="
        currentActionMode === 'structureMoving'
          ? 'move'
          : currentActionMode === 'structureAttacking'
            ? 'attack'
            : currentActionMode === 'structureExtract'
              ? 'extract'
              : currentActionMode === 'structureTransfer'
                ? 'transfer'
                : null
      "
      @close="closeStructurePanel"
      @action="handleStructureAction"
      @cancel="handleStructurePanelCancel"
    />

    <!-- 提示信息（仅测试模式显示） -->
    <div v-if="!isGameMode" class="info-panel">
      <h3>3D测试场景</h3>
      <p style="color: #ffd700; font-weight: 600">💡 两种测试模式：</p>

      <div
        style="
          margin: 8px 0;
          padding: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
        "
      >
        <p style="font-weight: 600">📌 后端测试（旧）</p>
        <p style="font-size: 12px">🟦 蓝色立方体 = ID:1</p>
        <p style="font-size: 12px">🟥 红色立方体 = ID:2</p>
      </div>

      <div
        style="
          margin: 8px 0;
          padding: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
        "
      >
        <p style="font-weight: 600">🎮 EventLoop测试（新）</p>
        <p style="font-size: 12px">1. 点击🧪 → EventLoop</p>
        <p style="font-size: 12px">2. 点击"🎮 游戏开始"</p>
        <p style="font-size: 12px">3. 会创建3个新铜偶：</p>
        <p style="font-size: 11px">
          ⬜ 灰色=IronWall 🟪 粉红=Arcanist 🟦 蓝色=CraftsMan
        </p>
      </div>
    </div>

    <!-- 游戏结束对话框 -->
    <div v-if="showGameOverDialog" class="game-over-overlay">
      <div class="game-over-dialog">
        <h2 class="game-over-title">游戏结束</h2>
        <p class="game-over-message">所有铜偶已被击败</p>
        <button class="game-over-button" @click="handleGameOverConfirm">
          确定
        </button>
      </div>
    </div>

    <!-- 游戏成功对话框 -->
    <div v-if="showGameSuccessDialog" class="game-over-overlay">
      <div class="game-over-dialog success-dialog">
        <h2 class="success-title">🎉 胜利！ 🎉</h2>
        <p class="game-over-message">恭喜你成功完成了所有挑战！</p>
        <button
          class="game-over-button success-button"
          @click="handleGameSuccessConfirm"
        >
          确定
        </button>
      </div>
    </div>

    <!-- 制作团队名单 -->
    <div v-if="showCredits" class="credits-overlay">
      <div class="credits-container">
        <h1 class="credits-title">制作团队</h1>

        <div class="credits-content">
          <div class="credits-section">
            <h2>游戏设计</h2>
            <p>MGPIC Team</p>
          </div>

          <div class="credits-section">
            <h2>程序开发</h2>
            <p>Backend Developer</p>
            <p>Frontend Developer</p>
          </div>

          <div class="credits-section">
            <h2>美术设计</h2>
            <p>3D Artist</p>
            <p>UI Designer</p>
          </div>

          <div class="credits-section">
            <h2>音乐音效</h2>
            <p>Sound Designer</p>
          </div>

          <div class="credits-section">
            <h2>特别感谢</h2>
            <p>所有参与测试的玩家</p>
          </div>
        </div>

        <button class="skip-credits-button" @click="skipCredits">跳过</button>
      </div>
    </div>

    <!-- 资源不足对话框 -->
    <div v-if="showResourceDialog" class="game-over-overlay">
      <div class="game-over-dialog">
        <h2 class="withdraw-title">资源不足</h2>
        <p class="game-over-message">{{ resourceDialogMessage }}</p>
        <div class="dialog-buttons">
          <button
            class="dialog-button confirm-button"
            @click="closeResourceDialog"
          >
            知道了
          </button>
        </div>
      </div>
    </div>

    <!-- 撤退确认对话框 -->
    <div v-if="showWithdrawDialog" class="game-over-overlay">
      <div class="game-over-dialog">
        <h2 class="withdraw-title">撤退确认</h2>
        <p class="game-over-message">确定要撤退吗？<br />当前进度将会丢失</p>
        <div class="dialog-buttons">
          <button class="dialog-button cancel-button" @click="cancelWithdraw">
            取消
          </button>
          <button class="dialog-button confirm-button" @click="confirmWithdraw">
            确定撤退
          </button>
        </div>
      </div>
    </div>
    <audio ref="audioRef" :src="musicUrl" loop preload="auto"></audio>
    <!-- 移动音效 -->
    <audio ref="moveSoundRef" :src="moveSoundUrl" preload="auto"></audio>
    <audio
      ref="moveEnemySoundRef"
      :src="moveEnemySoundUrl"
      preload="auto"
    ></audio>
    <!-- 攻击音效 -->
    <audio ref="attackSoundRef" :src="attackSoundUrl" preload="auto"></audio>
    <audio
      ref="attackEnemySoundRef"
      :src="attackEnemySoundUrl"
      preload="auto"
    ></audio>
    <!-- 受击音效 -->
    <audio ref="meHurtSoundRef" :src="meHurtSoundUrl" preload="auto"></audio>
    <audio
      ref="enemyHurtSoundRef"
      :src="enemyHurtSoundUrl"
      preload="auto"
    ></audio>
  </div>
</template>

<style scoped>
.game-scene {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 9999;
}

.scene-container {
  width: 100%;
  height: 100%;
}

.info-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  background: rgba(43, 26, 17, 0.9);
  color: white;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10000;
  backdrop-filter: blur(10px);
  max-width: 300px;
}

.info-panel h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 700;
}

.info-panel p {
  margin: 6px 0;
  font-size: 14px;
  line-height: 1.5;
}

/* 撤退按钮 */
.withdraw-button {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(139, 0, 0, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  padding: 12px 24px;
  cursor: pointer;
  z-index: 1500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.withdraw-button:hover {
  background: rgba(178, 34, 34, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(178, 34, 34, 0.5);
}

.withdraw-button:active {
  transform: translateY(0);
}

/* 游戏结束对话框样式 */
.game-over-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
  animation: fadeIn 0.3s ease-out;
}

.game-over-dialog {
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-source: v-bind(panel7Src);
  border-image-slice: 8 fill;
  border-image-width: 12px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  padding: 40px 60px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: scaleIn 0.3s ease-out;
}

.game-over-title {
  font-size: 48px;
  font-weight: 900;
  color: #ff4444;
  margin: 0 0 20px 0;
  text-shadow: 0 4px 8px rgba(255, 68, 68, 0.4);
}

.withdraw-title {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #ef4444;
  text-shadow: 0 2px 0 rgba(120, 0, 0, 0.35);
  margin: 0 0 20px 0;
}

.game-over-message {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6a4931;
  margin: 0 0 40px 0;
}

.game-over-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 20px;
  font-weight: 700;
  padding: 16px 48px;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transition: all 0.2s;
}

.game-over-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.6);
}

.game-over-button:active {
  transform: translateY(0);
}

/* 对话框按钮组 */
.dialog-buttons {
  display: flex;
  gap: 100px;
  justify-content: center;
}

.dialog-button {
  padding: 14px 32px;
  box-sizing: border-box;
  border-style: solid;
  border-width: 12px;
  border-image-slice: 8 fill;
  border-image-width: 12px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
  color: #fff3ef;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
}

.cancel-button {
  border-image-source: v-bind(panel8Src);
}

.cancel-button:hover {
  opacity: 0.9;
}

.confirm-button {
  border-image-source: v-bind(panel7Src);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
}

.confirm-button:hover {
  opacity: 0.9;
}

.dialog-button:active {
  transform: translateY(0);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 游戏成功对话框样式 */
.success-dialog {
  background: linear-gradient(135deg, #1a2b11 0%, #0f1f0c 100%) !important;
  border: 3px solid rgba(100, 255, 100, 0.5) !important;
}

.success-title {
  font-size: 52px;
  font-weight: 900;
  color: #44ff44;
  margin: 0 0 20px 0;
  text-shadow:
    0 4px 8px rgba(68, 255, 68, 0.6),
    0 0 20px rgba(68, 255, 68, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

.success-button {
  background: linear-gradient(135deg, #44ff44 0%, #22aa22 100%) !important;
  box-shadow: 0 8px 16px rgba(68, 255, 68, 0.4) !important;
}

.success-button:hover {
  box-shadow: 0 12px 24px rgba(68, 255, 68, 0.6) !important;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 制作团队名单样式 */
.credits-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #000000 0%, #1a1a2e 50%, #000000 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 25000;
  animation: fadeIn 0.5s ease-out;
}

.credits-container {
  width: 100%;
  max-width: 800px;
  padding: 40px;
  text-align: center;
  animation: creditsScroll 5s ease-in-out;
}

.credits-title {
  font-size: 64px;
  font-weight: 900;
  color: #ffd700;
  margin: 0 0 60px 0;
  text-shadow: 0 4px 12px rgba(255, 215, 0, 0.6);
  letter-spacing: 8px;
}

.credits-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.credits-section {
  opacity: 0;
  animation: fadeInUp 0.8s ease-out forwards;
}

.credits-section:nth-child(1) {
  animation-delay: 0.2s;
}
.credits-section:nth-child(2) {
  animation-delay: 0.6s;
}
.credits-section:nth-child(3) {
  animation-delay: 1s;
}
.credits-section:nth-child(4) {
  animation-delay: 1.4s;
}
.credits-section:nth-child(5) {
  animation-delay: 1.8s;
}

.credits-section h2 {
  font-size: 32px;
  font-weight: 700;
  color: #88ccff;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 8px rgba(136, 204, 255, 0.4);
}

.credits-section p {
  font-size: 24px;
  color: #ffffff;
  margin: 8px 0;
  opacity: 0.9;
}

.skip-credits-button {
  position: fixed;
  bottom: 40px;
  right: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  padding: 12px 32px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.skip-credits-button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

@keyframes creditsScroll {
  0% {
    transform: translateY(100px);
    opacity: 0;
  }
  20% {
    transform: translateY(0);
    opacity: 1;
  }
  80% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-50px);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
