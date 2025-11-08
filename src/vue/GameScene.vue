<script setup>
import log from '../log.js';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
import ActionPanel from './ActionPanel.vue';
import TurnSystem from './ActionPanelParts/TurnSystem.vue';
import SummonModal from './ActionPanelParts/SummonModal.vue';
import StructurePanel from './StructurePanel.vue';

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
const emit = defineEmits(['back', 'toggle-music']);

let scene, camera, renderer, controls;
let models = [];
let focusState = { focusPosition: null, focusTarget: null, lerpFactor: 0.08 };
let raycaster = null;
let mouse = new THREE.Vector2();
let gltfLoader = null;

// 血条管理（全局作用域，供 animate() 访问）
const healthBars = new Map(); // { unitId: { container: Group, background: Mesh, foreground: Mesh } }

// 地板块缓存（用于显示移动/攻击/建造范围）
const floorBlocks = new Map(); // key: "x,y", value: THREE.Mesh

// 更新所有血条位置（在动画循环中调用）
function updateHealthBarsPosition() {
  healthBars.forEach((healthBar, unitId) => {
    const model = models.find(m => m.id === unitId);
    if (model && model.object) {
      // 更新血条位置（跟随模型）
      healthBar.container.position.set(
        model.object.position.x,
        model.object.position.y + 1.0,
        model.object.position.z
      );

      // 让血条始终面向相机
      healthBar.container.lookAt(camera.position);
    }
  });
}

// 第一人称控制
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
  space: false,
};
const moveSpeed = 0.2;
const rotationSpeed = 0.003;
const mouseSensitivity = 0.002;

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

function handleMouseDown(event) {
  isMouseDown = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
}

function handleMouseUp() {
  isMouseDown = false;
}

function handleMouseMove(event) {
  if (!isMouseDown) return;

  const deltaX = event.clientX - lastMouseX;
  const deltaY = event.clientY - lastMouseY;

  // 更新旋转角度
  yaw -= deltaX * mouseSensitivity;
  pitch -= deltaY * mouseSensitivity;

  // 限制上下旋转角度
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

  // 应用旋转到相机
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
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
const currentCopperIndex = ref(0);
const currentActionMode = ref(null); // 'moving' | 'attacking' | 'transferring' | 'summoning' | 'building' | null

const currentCopperId = computed(() => {
  if (playerCoppers.value.length === 0) return null;
  const copper = playerCoppers.value[currentCopperIndex.value];
  return copper ? copper.id : null;
});

onMounted(async () => {
  log('[GameScene] 组件挂载，初始化场景');
  initScene();
  log('[GameScene] 场景初始化完成，设置消息队列');
  setupMessageQueue();
  log('[GameScene] 消息队列设置完成');

  // 默认切换到EventLoop模式（隐藏测试模型）
  const { messageQueue } = await import('../messageQueue.js');
  if (messageQueue.sceneContext?.setTestMode) {
    messageQueue.sceneContext.setTestMode('eventloop');
  }
  
  // 场景准备完成后，发送游戏开始消息
  if (window.__ACTUAL_COPPER_IDS__) {
    const ids = window.__ACTUAL_COPPER_IDS__;
    log('[GameScene] 场景准备完成，发送游戏开始消息，ID:', ids);
    const message = JSON.stringify({ type: 'on_game_start', content: { ids } });
    eventloop(message).catch(e => {
      log('[GameScene] 发送游戏开始消息失败', e);
    });
    // 清除标记
    delete window.__ACTUAL_COPPER_IDS__;
  }

  // 添加键盘和鼠标事件监听
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousemove', handleMouseMove);

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
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('click', onSceneClick);

  // 移除键盘和鼠标事件监听
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousemove', handleMouseMove);

  if (renderer) {
    renderer.dispose();
  }
});

function initScene() {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 5, 10);

  // 初始化raycaster用于点击检测
  raycaster = new THREE.Raycaster();

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.value.appendChild(renderer.domElement);

  // 不使用OrbitControls，使用纯第一人称控制
  controls = null;

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // 网格参数（保留用于其他用途）
  const floorSize = 20;
  const gridCellSize = 1; // 全局坐标系统，1单位 = 1网格

  // 初始化GLTF加载器
  gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
  );
  gltfLoader.setDRACOLoader(dracoLoader);

  // 添加点击事件监听（仅游戏模式）
  if (props.isGameMode) {
    window.addEventListener('click', onSceneClick);
  }

  // 创建测试用的立方体（用于后端测试，ID=1和2）
  createTestUnits();
    log('[GameScene] 场景初始化完成');
    log('[GameScene] - 蓝/红立方体(ID=1,2)用于"后端测试"');
    log('[GameScene] - EventLoop测试会动态创建新模型');

  // 窗口大小变化
  window.addEventListener('resize', onWindowResize);
}

function createTestUnits() {
  // 创建单位1（蓝色立方体）
  const geometry1 = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const material1 = new THREE.MeshStandardMaterial({ color: 0x4488ff });
  const cube1 = new THREE.Mesh(geometry1, material1);
  cube1.position.set(0.5, 0.4, 0.5);
  scene.add(cube1);

  models.push({
    id: 1,
    object: cube1,
    name: '单位1',
    type: 'test', // ✅ 标记为测试模型
  });

  // 创建单位2（红色立方体）
  const geometry2 = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const material2 = new THREE.MeshStandardMaterial({ color: 0xff4444 });
  const cube2 = new THREE.Mesh(geometry2, material2);
  cube2.position.set(4.5, 0.4, 4.5);
  scene.add(cube2);

  models.push({
    id: 2,
    object: cube2,
    name: '单位2',
    type: 'test', // ✅ 标记为测试模型
  });

  log(
    '[GameScene] 创建了测试单位:',
    models.map(m => `ID=${m.id}`)
  );

  // 默认显示测试模型（向后兼容）
  // 当切换到EventLoop模式时会隐藏它们
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

function setupMessageQueue() {
  // 状态指示器存储
  const stateIndicators = new Map(); // { unitId: { canMove: Mesh, canAttack: Mesh } }
  const mapBlocks = new Map(); // { 'x,y': Mesh } 地图块存储
  const resourceMarkers = new Map(); // { 'x,y': Mesh } 资源标记存储
  // healthBars 已在外部作用域定义

  // 创建状态指示器
  function createIndicator(unitId, type, show) {
    const model = models.find(m => m.id === unitId);
    if (!model || !model.object) return;

    // 根据类型设置颜色：绿色(移动) / 红色(攻击) / 黄色(召唤)
    let color, radius;
    if (type === 'move') {
      color = 0x00ff00; // 绿色
      radius = 0.8;
    } else if (type === 'attack') {
      color = 0xff0000; // 红色
      radius = 1.0;
    } else if (type === 'summon') {
      color = 0xffff00; // 黄色
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

  // 创建或更新血条
  function createOrUpdateHealthBar(unitId, nowHealth, maxHealth) {
    const model = models.find(m => m.id === unitId);
    if (!model || !model.object) return;

    // 根据单位类型确定血条颜色：铜偶=绿色，敌人/召唤物=红色
    const isCopper = model.type === 'copper';
    const healthColor = isCopper ? 0x00ff00 : 0xff0000;

    // 如果血条不存在，创建新的
    if (!healthBars.has(unitId)) {
      const barWidth = 1.0;
      const barHeight = 0.06;

      // 创建血条容器
      const container = new THREE.Group();

      // 创建背景（黑色）
      const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
      const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        side: THREE.DoubleSide, // 双面渲染
        transparent: true,
        opacity: 0.35,
      });
      const background = new THREE.Mesh(bgGeometry, bgMaterial);

      // 创建前景（根据单位类型设置颜色）
      const fgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
      const fgMaterial = new THREE.MeshBasicMaterial({
        color: healthColor,
        side: THREE.DoubleSide, // 双面渲染
      });
      const foreground = new THREE.Mesh(fgGeometry, fgMaterial);
      foreground.position.z = 0.01; // 稍微前移，避免z-fighting

      container.add(background);
      container.add(foreground);

      // 设置血条位置（在模型上方）
      container.position.set(
        model.object.position.x,
        model.object.position.y + 1.0, // 在模型上方1.0单位
        model.object.position.z
      );

      // 让血条始终面向相机
      container.lookAt(camera.position);

      scene.add(container);
      healthBars.set(unitId, { container, background, foreground });
    }

    // 更新血条
    const healthBar = healthBars.get(unitId);
    const healthPercent = Math.max(0, Math.min(1, nowHealth / maxHealth));

    // 更新前景宽度
    const barWidth = 1.0;
    healthBar.foreground.scale.x = healthPercent;
    healthBar.foreground.position.x = (-barWidth / 2) * (1 - healthPercent);

    // 根据单位类型设置颜色
    if (healthBar.foreground.material && healthBar.foreground.material.color) {
      healthBar.foreground.material.color.setHex(healthColor);
    }

    // 更新血条位置（跟随模型）
    healthBar.container.position.set(
      model.object.position.x,
      model.object.position.y + 1.0,
      model.object.position.z
    );

    // 让血条始终面向相机
    healthBar.container.lookAt(camera.position);
  }

  // 移除血条
  function removeHealthBar(unitId) {
    if (healthBars.has(unitId)) {
      const healthBar = healthBars.get(unitId);
      scene.remove(healthBar.container);
      healthBar.background.geometry.dispose();
      healthBar.background.material.dispose();
      healthBar.foreground.geometry.dispose();
      healthBar.foreground.material.dispose();
      healthBars.delete(unitId);
    }
  }

  // updateHealthBarsPosition 已在外部作用域定义
  // floorBlocks 已在外部作用域定义

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

  // 创建/更新地板块
  const createOrUpdateFloorBlock = (position, color, type) => {
    const key = `${position[0]},${position[1]}`;

    // 如果已存在，更新颜色
    if (floorBlocks.has(key)) {
      const block = floorBlocks.get(key);
      block.material.color.setHex(color);
      block.userData.type = type;
      return;
    }

    // 创建新的地板块
    const geometry = new THREE.PlaneGeometry(0.9, 0.9);
    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const block = new THREE.Mesh(geometry, material);
    block.rotation.x = -Math.PI / 2;
    // ✅ 以(0,0)为中心，地图范围 -7 到 7
    block.position.set(
      position[0],
      0.08, // ✅ 高于地图块（0.05），确保可见
      position[1]
    );
    block.userData = { type, position };
    scene.add(block);
    floorBlocks.set(key, block);
  };

  // 清除地板块
  const clearFloorBlock = position => {
    const key = `${position[0]},${position[1]}`;
    const block = floorBlocks.get(key);
    log(
      `[GameScene] 尝试清除地板块: 坐标=${position}, key=${key}, 找到=${!!block}, 总数=${
        floorBlocks.size
      }`
    );
    if (block) {
      scene.remove(block);
      // 释放几何体和材质
      if (block.geometry) block.geometry.dispose();
      if (block.material) block.material.dispose();
      floorBlocks.delete(key);
      log(`[GameScene] 已清除地板块: ${key}, 剩余=${floorBlocks.size}`);
    } else {
      log(
        `[GameScene] 未找到地板块: ${key}, 现有keys:`,
        Array.from(floorBlocks.keys())
      );
    }
  };

  // 清除所有特定类型的地板块
  const clearFloorBlocksByType = type => {
    let count = 0;
    floorBlocks.forEach((block, key) => {
      if (block.userData.type === type) {
        scene.remove(block);
        floorBlocks.delete(key);
        count++;
      }
    });
    if (count > 0) {
      log(`[GameScene] 清除了${count}个${type}地板块`);
    }
  };

  // 创建攻击特效（闪光）
  const createAttackEffect = (attackerId, targetPosition) => {
    const attacker = models.find(m => m.id === attackerId);
    if (!attacker) return;

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
    const attackerPos = attacker.object.position;
    // ✅ 以(0,0)为中心，地图范围 -7 到 7
    const targetPos = new THREE.Vector3(
      (targetPosition[0] - 7) * 1.0,
      0.4,
      (targetPosition[1] - 7) * 1.0
    );

    // 创建闪电线
    const points = [attackerPos, targetPos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff4444,
      linewidth: 3,
      transparent: true,
      opacity: 0.8,
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // 创建爆炸圆环
    const ringGeometry = new THREE.RingGeometry(0.2, 0.4, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(targetPos);
    ring.position.y = 0.5;
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
        if (material) material.opacity = opacity;
        if (ringMaterial) ringMaterial.opacity = opacity;

        // 圆环扩大
        ring.scale.set(1 + progress * 2, 1 + progress * 2, 1);

        requestAnimationFrame(animateEffect);
      } else {
        // 清除
        scene.remove(line);
        scene.remove(ring);
        geometry.dispose();
        material.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
      }
    }

    animateEffect();
    log(
      `[GameScene] 攻击特效: 攻击者ID=${attackerId} → 目标位置${targetPosition}`
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
      selectedCopper.value = copper;
      selectedCopperResources.value = resources || [];
      // 使用后端返回的攻击目标状态
      hasAttackTargets.value = has_attack_targets || false;
      log(
        `[GameScene] 更新铜偶信息: ID=${copper.id}, has_attack_targets=${hasAttackTargets.value}`
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
    floorBlocks,
    createAttackEffect, // 攻击特效
    // 移动完成后的回调
    onMoveComplete: id => {
      if (!props.isGameMode) return;

      // 检查移动的是否是玩家的铜偶（而不是敌人）
      const isPlayerCopper = playerCoppers.value.some(
        copper => copper.id === id
      );
      if (!isPlayerCopper) {
        log('[GameScene] 敌人移动完成，不做处理');
        return;
      }

      log('[GameScene] 移动完成，准备切换铜偶');
      // 重置状态
      currentActionMode.value = null;
      if (copperActionPanelRef.value) {
        copperActionPanelRef.value.cancelAction();
      }

      // 重新获取单位最新状态，然后判断是否切换
      setTimeout(async () => {
        // 判断是铜偶还是友方召唤物
        const model = models.find(m => m.id === id);
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
      alert(`❌ ${message}`);
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
          selectedCopper.value = null;
        }

        // 调整当前铜偶索引
        if (
          currentCopperIndex.value >= playerCoppers.value.length &&
          playerCoppers.value.length > 0
        ) {
          currentCopperIndex.value = 0;
        }
      }
    },
    // 攻击完成后的回调
    onAttackComplete: id => {
      if (!props.isGameMode) return;

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
        const model = models.find(m => m.id === id);
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
      const key = `${position[0]},${position[1]}`;
      createOrUpdateFloorBlock(position, 0x44ff44, 'move');
      log(`[GameScene] 显示移动范围: 坐标=${position}, key=${key}`);
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
        createOrUpdateFloorBlock(position, 0xff4444, 'attack');
        hasAttackTargets.value = true; // 有攻击范围说明有目标
        log(`[GameScene] 显示攻击范围: ${position}`);
      }
    },
    onSetCanSummonBlock: position => {
      // 显示召唤范围（黄色）
      const key = `${position[0]},${position[1]}`;
      createOrUpdateFloorBlock(position, 0xffff00, 'summon');
      log(`[GameScene] 显示召唤范围: 坐标=${position}, key=${key}`);
    },
    onClearBlock: position => {
      clearFloorBlock(position);
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

      // 添加到玩家铜偶列表（游戏模式）
      if (props.isGameMode) {
        const copperData = {
          id: copper.id,
          name: copper.copper.copper_info?.name || `铜偶 #${copper.id}`,
          turnDone: false,
        };
        const isFirstCopper = playerCoppers.value.length === 0;
        if (!playerCoppers.value.find(c => c.id === copper.id)) {
          playerCoppers.value.push(copperData);
          log(`[GameScene] 添加玩家铜偶: ${copperData.name}`);

          // 如果是第一个铜偶，自动点击显示动作面板
          if (isFirstCopper) {
            setTimeout(() => {
              log(`[GameScene] 自动点击第一个铜偶: ${copperData.name}`);
              handleClickCopper(copper.id);
            }, 500);
          }
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

      models.push({
        id: actualId,
        object: obj,
        name: enemy.enemy_base?.enemy_type || `Enemy_${actualId}`,
        type: isOwned ? 'summon' : 'enemy', // 友方召唤物标记为summon
      });

      // 创建血条（所有敌人和召唤物都需要）
      if (
        enemy.now_health !== undefined &&
        enemy.enemy_base?.health !== undefined
      ) {
        createOrUpdateHealthBar(
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
      if (structure.now_health !== undefined && structure.structure_base?.health) {
        createOrUpdateHealthBar(id, structure.now_health, structure.structure_base.health);
        log(`[GameScene] 创建建筑血条: ${structureName} (${structure.now_health}/${structure.structure_base.health})`);
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
      log(`[GameScene] 显示可召唤状态: id=${unitId}, show=${canSummon}`);
      createIndicator(unitId, 'summon', canSummon);

      // 如果是当前选中的铜偶，同步更新状态（创建新对象触发响应式）
      if (selectedCopper.value && selectedCopper.value.id === unitId) {
        selectedCopper.value = {
          ...selectedCopper.value,
          can_summon: canSummon,
        };
        log(`[GameScene] 同步更新selectedCopper.can_summon=${canSummon}`);
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
      createOrUpdateHealthBar(unitId, nowHealth, maxHealth);
    },
    onRemoveHealthBar: unitId => {
      log(`[GameScene] 移除血条: id=${unitId}`);
      removeHealthBar(unitId);
    },
    onPutMapBlock: position => {
      // log(`[GameScene] 放置地图块: position=${position}`)  // 日志太多，已注释
      const key = `${position[0]},${position[1]}`;

      // 如果已存在，先移除
      if (mapBlocks.has(key)) {
        const block = mapBlocks.get(key);
        scene.remove(block);
        block.geometry.dispose();
        block.material.dispose();
      }

      // 创建地图块（灰色扁平立方体）
      const geometry = new THREE.BoxGeometry(0.9, 0.05, 0.9); // ⭐ 高度从0.1降到0.05（更扁）
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 });
      const block = new THREE.Mesh(geometry, material);

      //  以(0,0)为中心，地图范围 -7 到 7
      block.position.set(
        position[0], // 格子中心
        0.025, // ⭐ 地板中心（高度0.05的一半）
        position[1] // 格子中心
      );

      scene.add(block);
      mapBlocks.set(key, block);
    },
    //  移动/攻击范围使用独立的 floorBlocks 系统（在前面已定义）
    // onSetMoveBlock, onSetAttackBlock, onClearBlock 在前面的 messageQueue.setSceneContext 中已定义
    animateModelMove: (model, targetPosition, onComplete) => {
      if (!model || !model.object) return;

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

  // 第一人称移动控制
  if (keys.w || keys.a || keys.s || keys.d || keys.shift || keys.space) {
    const velocity = new THREE.Vector3();

    // 根据相机朝向计算移动方向
    if (keys.w) velocity.z -= 1; // 向前
    if (keys.s) velocity.z += 1; // 向后
    if (keys.a) velocity.x -= 1; // 向左
    if (keys.d) velocity.x += 1; // 向右

    // 垂直移动
    if (keys.shift) velocity.y -= 1; // 向下
    if (keys.space) velocity.y += 1; // 向上

    // 应用相机旋转到水平移动
    velocity.applyQuaternion(camera.quaternion);

    // 重置Y轴，只保留水平移动
    velocity.y = keys.shift ? -1 : keys.space ? 1 : 0;

    // 移动相机位置
    camera.position.add(velocity.multiplyScalar(moveSpeed));
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
  updateHealthBarsPosition();

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
    currentActionMode.value === 'transferring'
  ) {
    handleFloorClick(mouse);
    return;
  }

  // 检测可点击单位（铜偶、友方召唤物、野生敌人、建筑）
  const clickableObjects = models
    .filter(
      m =>
        (m.type === 'copper' || m.type === 'summon' || m.type === 'enemy' || m.type === 'structure') &&
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

  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);

  if (intersectPoint) {
    // 转换为网格坐标（直接使用全局坐标系统：世界坐标除以cellSize）
    const gridX = Math.round(intersectPoint.x);
    const gridZ = Math.round(intersectPoint.z);

    log(`[GameScene] 点击地板: (${gridX}, ${gridZ})`);

    // 检查点击的位置是否在允许的范围内（有黄色方块标记）
    const key = `${gridX},${gridZ}`;
    const block = floorBlocks.get(key);
    
    if (!block) {
      log(`[GameScene] 点击位置 (${gridX}, ${gridZ}) 不在允许范围内，忽略`);
      return;
    }

    // 验证地板块类型与当前操作模式匹配
    const expectedType = {
      moving: 'move',
      attacking: 'attack',
      summoning: 'summon',
      building: 'summon', // 建造也使用 summon 类型的黄色方块
      structureExtract: 'attack', // 提取使用攻击范围的红色方块
      structureTransfer: 'attack', // 传递使用攻击范围的红色方块
    }[currentActionMode.value];

    if (block.userData.type !== expectedType) {
      log(`[GameScene] 地板块类型不匹配: expected=${expectedType}, actual=${block.userData.type}`);
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

  log(
    `[GameScene] 请求建造 ${currentBuildingName.value} 到位置: (${x}, ${z})`
  );

  const message = JSON.stringify({
    type: 'on_structure_build_apply',
    content: {
      id: String(selectedCopper.value.id),
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
  
  if (currentActionMode.value === 'structureExtract') {
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
      // TODO: 实现建筑移动逻辑
      log('[GameScene] 建筑移动功能尚未实现');
      break;
    case 'attack':
      // TODO: 实现建筑攻击逻辑
      log('[GameScene] 建筑攻击功能尚未实现');
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

// 建筑应用提取物品
async function handleStructureExtractApply(x, z) {
  if (!selectedStructure.value) return;
  
  log(`[GameScene] 建筑 ${selectedStructure.value.id} 从 (${x}, ${z}) 提取物品`);
  
  const message = JSON.stringify({
    type: 'on_structure_extract_apply',
    content: {
      id: String(selectedStructure.value.id),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);
  
  // 提取完成，清除模式
  currentActionMode.value = null;
}

// 建筑应用传递物品
async function handleStructureTransferApply(x, z) {
  if (!selectedStructure.value) return;
  
  log(`[GameScene] 建筑 ${selectedStructure.value.id} 向 (${x}, ${z}) 传递物品`);
  
  const message = JSON.stringify({
    type: 'on_structure_transfer_apply',
    content: {
      id: String(selectedStructure.value.id),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);
  
  // 传递完成，清除模式
  currentActionMode.value = null;
}

// 处理点击铜偶
async function handleClickCopper(copperId) {
  // 更新当前铜偶索引，以便 TurnSystem 正确显示名称
  const index = playerCoppers.value.findIndex(c => c.id === copperId);
  if (index !== -1) {
    currentCopperIndex.value = index;
  }

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
  }

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
  currentCopperIndex.value = 0;
  selectedCopper.value = null;
  currentActionMode.value = null;

  // 重置所有铜偶的turnDone状态
  playerCoppers.value.forEach(c => (c.turnDone = false));

  log(`[GameScene] 进入回合 ${currentRound.value}`);

  // 新回合开始，自动点击第一个铜偶显示动作面板
  if (playerCoppers.value.length > 0) {
    setTimeout(() => {
      const firstCopper = playerCoppers.value[0];
      log(`[GameScene] 新回合开始，自动点击第一个铜偶: ${firstCopper.name}`);
      handleClickCopper(firstCopper.id);
    }, 500);
  }
}
</script>

<template>
  <div class="game-scene">
    <div ref="container" class="scene-container"></div>

    <!-- 音乐控制按钮 -->
    <button
      class="music-btn"
      @click="emit('toggle-music')"
      :title="musicOn ? '关闭音乐' : '开启音乐'"
    >
      <svg
        v-if="musicOn"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 18V5L21 3V16"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="6" cy="18" r="3" stroke="#ffffff" stroke-width="2" />
        <circle cx="18" cy="16" r="3" stroke="#ffffff" stroke-width="2" />
      </svg>
      <svg
        v-else
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 18V5L21 3V16"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="6" cy="18" r="3" stroke="#ffffff" stroke-width="2" />
        <circle cx="18" cy="16" r="3" stroke="#ffffff" stroke-width="2" />
        <line
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <!-- 回合系统 -->
    <TurnSystem
      v-if="isGameMode"
      :currentCopperId="currentCopperId"
      :copperList="playerCoppers"
      :roundNumber="currentRound"
      @nextCopper="nextCopper"
      @endRound="endRound"
      @selectCopper="handleClickCopper"
    />

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
      :action-mode="currentActionMode === 'structureExtract' ? 'extract' : currentActionMode === 'structureTransfer' ? 'transfer' : null"
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

.music-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(58, 37, 25, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  z-index: 50000;
  transition: all 0.2s ease;
}

.music-btn:hover {
  background: rgba(47, 30, 20, 0.95);
  transform: scale(1.05);
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
</style>
