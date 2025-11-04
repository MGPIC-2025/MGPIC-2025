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
  getResourceModelUrl,
} from '../utils/resourceLoader.js';
import modelCache from '../utils/modelCache.js';
import {
  getCopperEnglishName,
  getCopperTypeFolder,
} from '../utils/copperMapping.js';
import { getStructureEnglishName } from '../utils/structureMapping.js';
import TestPanel from './TestPanel.vue';
import ActionPanel from './ActionPanel.vue';
import TurnSystem from './ActionPanelParts/TurnSystem.vue';

const props = defineProps({
  isGameMode: {
    type: Boolean,
    default: false, // false = 测试模式，true = 游戏模式
  },
});

const container = ref(null);
const emit = defineEmits(['back']);

let scene, camera, renderer, controls;
let models = [];
let focusState = { focusPosition: null, focusTarget: null, lerpFactor: 0.08 };
let raycaster = null;
let mouse = new THREE.Vector2();
let gltfLoader = null;

// 血条管理（全局作用域，供 animate() 访问）
const healthBars = new Map(); // { unitId: { container: Group, background: Mesh, foreground: Mesh } }

// 更新所有血条位置（在动画循环中调用）
function updateHealthBarsPosition() {
  healthBars.forEach((healthBar, unitId) => {
    const model = models.find(m => m.id === unitId);
    if (model && model.object) {
      // 更新血条位置（跟随模型）
      healthBar.container.position.set(
        model.object.position.x,
        model.object.position.y + 1.5,
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

// 回合系统
const currentRound = ref(1);
const playerCoppers = ref([]); // 玩家的铜偶列表
const currentCopperIndex = ref(0);
const currentActionMode = ref(null); // 'moving' | 'attacking' | 'transferring' | null

const currentCopperId = computed(() => {
  if (playerCoppers.value.length === 0) return null;
  const copper = playerCoppers.value[currentCopperIndex.value];
  return copper ? copper.id : null;
});

onMounted(async () => {
  initScene();
  setupMessageQueue();

  // 默认切换到EventLoop模式（隐藏测试模型）
  const { messageQueue } = await import('../messageQueue.js');
  if (messageQueue.sceneContext?.setTestMode) {
    messageQueue.sceneContext.setTestMode('eventloop');
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
      log(`[TestScene] 相机聚焦参数已更新: 距离=${distance}, 高度=${height}`);
    };
    window.resetCamera = () => {
      camera.position.set(0, 10, 15);
      camera.lookAt(0, 0, 0);
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
      focusState.focusPosition = null;
      focusState.focusTarget = null;
      log('[TestScene] 相机已重置');
    };
    window.toggleAutoFocus = () => {
      window.disableAutoFocus = !window.disableAutoFocus;
      log(`[TestScene] 自动聚焦已${window.disableAutoFocus ? '禁用' : '启用'}`);
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
  log('[TestScene] 场景初始化完成');
  log('[TestScene] - 蓝/红立方体(ID=1,2)用于"后端测试"');
  log('[TestScene] - EventLoop测试会动态创建新模型');

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
    '[TestScene] 创建了测试单位:',
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
    log(`[TestScene] 从缓存加载铜偶模型: ${copperName}`);

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

    log(`[TestScene] 铜偶模型加载成功: ${copperName}, URL: ${modelUrl}`);
    return group;
  } catch (e) {
    log(`[TestScene] 模型加载失败: ${copperName}`, e);
    return null;
  }
}

// 辅助函数：加载敌人模型（使用全局缓存）
async function loadEnemyModel(enemyName, position, scale = 1.0) {
  const modelUrl = getEnemyModelUrl(enemyName);

  try {
    // 使用全局模型缓存管理器
    const cachedModel = await modelCache.loadModel(modelUrl, true);
    log(`[TestScene] 从缓存加载敌人模型: ${enemyName}`);

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

    log(`[TestScene] 敌人模型加载成功: ${enemyName}, URL: ${modelUrl}`);
    return group;
  } catch (e) {
    log(`[TestScene] 敌人模型加载失败: ${enemyName}`, e);
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

    const color = type === 'move' ? 0x00ff00 : 0xff0000; // 绿色/红色
    const radius = type === 'move' ? 0.8 : 1.0;

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
      indicators[type] = null;
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

    // 如果血条不存在，创建新的
    if (!healthBars.has(unitId)) {
      const barWidth = 1.0;
      const barHeight = 0.1;

      // 创建血条容器
      const container = new THREE.Group();

      // 创建背景（黑色）
      const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
      const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide, // 双面渲染
      });
      const background = new THREE.Mesh(bgGeometry, bgMaterial);

      // 创建前景（红色到绿色渐变）
      const fgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
      const fgMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide, // 双面渲染
      });
      const foreground = new THREE.Mesh(fgGeometry, fgMaterial);
      foreground.position.z = 0.01; // 稍微前移，避免z-fighting

      container.add(background);
      container.add(foreground);

      // 设置血条位置（在模型上方）
      container.position.set(
        model.object.position.x,
        model.object.position.y + 1.5, // 在模型上方1.5单位
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

    // 根据血量百分比更新颜色（绿->黄->红）
    if (healthPercent > 0.5) {
      // 绿色到黄色
      const t = (1 - healthPercent) * 2;
      healthBar.foreground.material.color.setRGB(t, 1, 0);
    } else {
      // 黄色到红色
      const t = healthPercent * 2;
      healthBar.foreground.material.color.setRGB(1, t, 0);
    }

    // 更新血条位置（跟随模型）
    healthBar.container.position.set(
      model.object.position.x,
      model.object.position.y + 1.5,
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

  // 创建地板块缓存（用于显示移动/攻击范围）
  const floorBlocks = new Map(); // key: "x,y", value: THREE.Mesh

  // 高亮选中的铜偶
  let selectedCopperId = null;
  const highlightSelectedCopper = copperId => {
    // 清除旧的高亮
    models.forEach(model => {
      if (model.type === 'copper') {
        model.object.scale.set(1, 1, 1);
        // 遍历所有子对象设置材质
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
        log(`[TestScene] 高亮铜偶: ${model.name} (ID=${copperId})`);
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
      `[TestScene] 尝试清除地板块: 坐标=${position}, key=${key}, 找到=${!!block}, 总数=${
        floorBlocks.size
      }`
    );
    if (block) {
      scene.remove(block);
      // 释放几何体和材质
      if (block.geometry) block.geometry.dispose();
      if (block.material) block.material.dispose();
      floorBlocks.delete(key);
      log(`[TestScene] 已清除地板块: ${key}, 剩余=${floorBlocks.size}`);
    } else {
      log(
        `[TestScene] 未找到地板块: ${key}, 现有keys:`,
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
      log(`[TestScene] 清除了${count}个${type}地板块`);
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
      `[TestScene] 攻击特效: 攻击者ID=${attackerId} → 目标位置${targetPosition}`
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
        `[TestScene] 更新铜偶信息: ID=${copper.id}, has_attack_targets=${hasAttackTargets.value}`
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
        log('[TestScene] 敌人移动完成，不做处理');
        return;
      }

      log('[TestScene] 移动完成，准备切换铜偶');
      // 重置状态
      currentActionMode.value = null;
      if (copperActionPanelRef.value) {
        copperActionPanelRef.value.cancelAction();
      }

      // 重新获取铜偶最新状态，然后判断是否切换
      setTimeout(async () => {
        // 重新点击当前铜偶获取最新状态
        await handleClickCopper(id);

        // 等待状态更新后再判断是否切换
        setTimeout(() => {
          // 如果有地面物品，不自动跳转（让玩家拾取）
          if (selectedCopperResources.value && selectedCopperResources.value.length > 0) {
            log('[TestScene] 检测到地面物品，不自动跳转');
            return;
          }
          tryNextCopper();
        }, 100);
      }, 300);
    },
    // 合成结果回调
    onCraftResult: (success, message) => {
      log(`[TestScene] 合成结果: ${success ? '成功' : '失败'} - ${message}`);
      // TODO: 可以添加UI提示
      alert(message);
    },
    // 移除铜偶（死亡时从列表中移除）
    onRemoveCopper: id => {
      const index = playerCoppers.value.findIndex(c => c.id === id);
      if (index > -1) {
        log(`[TestScene] 移除死亡铜偶: ID=${id}`);
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
        log('[TestScene] 敌人攻击完成，不做处理');
        return;
      }

      log('[TestScene] 攻击完成，准备切换铜偶');
      // 重置状态
      currentActionMode.value = null;
      if (copperActionPanelRef.value) {
        copperActionPanelRef.value.cancelAction();
      }

      // 重新获取铜偶最新状态，然后判断是否切换
      setTimeout(async () => {
        // 重新点击当前铜偶获取最新状态
        await handleClickCopper(id);

        // 等待状态更新后再判断是否切换
        setTimeout(() => {
          // 如果有地面物品，不自动跳转（让玩家拾取）
          if (selectedCopperResources.value && selectedCopperResources.value.length > 0) {
            log('[TestScene] 检测到地面物品，不自动跳转');
            return;
          }
          tryNextCopper();
        }, 100);
      }, 300);
    },
    onSetMoveBlock: position => {
      const key = `${position[0]},${position[1]}`;
      createOrUpdateFloorBlock(position, 0x44ff44, 'move');
      log(`[TestScene] 显示移动范围: 坐标=${position}, key=${key}`);
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
            return Math.abs(pos.x - position[0]) < 0.1 && 
                   Math.abs(pos.z - position[1]) < 0.1;
          }
          return false;
        });
        if (targetCopper) {
          // 从 playerCoppers 中查找详细信息
          const copperInfo = playerCoppers.value.find(c => c.id === targetCopper.id);
          // 检查是否已存在
          const existing = transferTargets.value.find(t => t.id === targetCopper.id);
          if (!existing) {
            transferTargets.value.push({
              id: targetCopper.id,
              name: targetCopper.name || (copperInfo ? copperInfo.name : `铜偶 #${targetCopper.id}`) || `铜偶 #${targetCopper.id}`,
              position: position,
            });
            log(`[TestScene] 找到传递目标: ${targetCopper.name || targetCopper.id} (ID=${targetCopper.id}), 总目标数=${transferTargets.value.length}`);
          }
        } else {
          log(`[TestScene] 传递位置 ${position} 未找到对应铜偶`);
        }
      } else {
        // 攻击模式
        createOrUpdateFloorBlock(position, 0xff4444, 'attack');
        hasAttackTargets.value = true; // 有攻击范围说明有目标
        log(`[TestScene] 显示攻击范围: ${position}`);
      }
    },
    onClearBlock: position => {
      clearFloorBlock(position);
    },
    // 从后端消息创建铜偶模型
    onSetCopper: async (_id, position, copper) => {
      log(`[TestScene] 创建铜偶模型: id=${copper.id}, pos=${position}`);

      // 检查是否已存在
      const existing = models.find(m => m.id === copper.id);
      if (existing) {
        log(`[TestScene] 铜偶ID=${copper.id}已存在，跳过`);
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
          log(`[TestScene] 添加玩家铜偶: ${copperData.name}`);

          // 如果是第一个铜偶，自动点击显示动作面板
          if (isFirstCopper) {
            setTimeout(() => {
              log(`[TestScene] 自动点击第一个铜偶: ${copperData.name}`);
              handleClickCopper(copper.id);
            }, 500);
          }
        }
      }

      // 获取铜偶信息
      const copperType = copper.copper.copper_type || 'Arcanist';
      const copperChineseName = copper.copper.copper_info?.name || 'default';

      // 将中文名转换为英文文件夹名
      const copperName = getCopperEnglishName(copperChineseName);

      // 将类型名转换为文件夹名
      const typeFolder = getCopperTypeFolder(copperType);

      log(
        `[TestScene] 铜偶信息: 中文名=${copperChineseName}, 英文名=${copperName}, type=${copperType}, typeFolder=${typeFolder}`
      );

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

      // 尝试加载GLTF模型（传入文件夹名称和模型名称）
      let obj = await loadGLTFModel(
        typeFolder,
        copperName,
        position,
        modelScale
      );

      // 如果模型加载失败，创建备用立方体
      if (!obj) {
        log(`[TestScene] 使用备用立方体代替模型: ${copperName}`);
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

      log(`[TestScene] 铜偶创建成功: ${modelData.name} (ID=${copper.id})`);
    },
    onSetEnemy: async (id, position, enemy) => {
      // 使用后端传递的实际 enemy.id
      const actualId = enemy.id;
      log(`[TestScene] 创建敌人模型: id=${actualId}, pos=${position}`);

      // 检查是否已存在
      const existing = models.find(m => m.id === actualId);
      if (existing) {
        log(`[TestScene] 敌人ID=${actualId}已存在，跳过`);
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
        log(`[TestScene] 使用备用立方体代替敌人模型: ${enemyName}`);
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        obj = new THREE.Mesh(geometry, material);
        obj.position.set(position[0], 0.4, position[1]);
      }

      obj.userData.modelId = actualId; // 设置ID以便点击检测
      scene.add(obj);

      models.push({
        id: actualId,
        object: obj,
        name: enemy.enemy_base?.enemy_type || `Enemy_${actualId}`,
        type: 'enemy',
      });

      log(
        `[TestScene] 敌人创建成功: ${enemy.enemy_base?.enemy_type || actualId}`
      );
    },
    onSetMaterial: async (id, position, material) => {
      log(
        `[TestScene] 创建矿物: id=${id}, pos=${position}, name=${material.material_base?.name}`
      );

      // 检查是否已存在
      const existing = models.find(m => m.id === id);
      if (existing) {
        log(`[TestScene] 矿物ID=${id}已存在，跳过`);
        return;
      }

      // 创建矿物立方体（金黄色，表示可收集资源）
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material_mesh = new THREE.MeshStandardMaterial({
        color: 0xffd700, // 金色
        emissive: 0xffaa00,
        emissiveIntensity: 0.2,
        metalness: 0.6,
        roughness: 0.4,
      });
      const obj = new THREE.Mesh(geometry, material_mesh);
      obj.position.set(position[0], 0.25, position[1]);

      // 添加发光效果
      const pointLight = new THREE.PointLight(0xffaa00, 1.5, 3);
      pointLight.position.set(0, 0.5, 0);
      obj.add(pointLight);

      obj.userData.modelId = id;
      scene.add(obj);

      models.push({
        id: id,
        object: obj,
        name: material.material_base?.name || `Material_${id}`,
        type: 'material',
      });

      log(`[TestScene] 矿物创建成功: ${material.material_base?.name}`);
    },
    onSetStructure: async (id, position, structure) => {
      log(`[TestScene] 创建建筑: id=${id}, pos=${position}`);

      // 检查是否已存在
      const existing = models.find(m => m.id === id);
      if (existing) {
        log(`[TestScene] 建筑ID=${id}已存在，跳过`);
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
        log(`[TestScene] 建筑模型加载成功: ${structureName}, URL: ${modelUrl}`);
      } catch (e) {
        log(`[TestScene] 建筑模型加载失败: ${structureName}`, e);

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

      log(`[TestScene] 建筑创建成功: ${structureName}`);
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
      log(`[TestScene] 显示可移动状态: id=${unitId}, show=${canMove}`);
      createIndicator(unitId, 'move', canMove);

      // 如果是当前选中的铜偶，同步更新状态（创建新对象触发响应式）
      if (selectedCopper.value && selectedCopper.value.id === unitId) {
        selectedCopper.value = {
          ...selectedCopper.value,
          can_move: canMove,
        };
        log(`[TestScene] 同步更新selectedCopper.can_move=${canMove}`);
      }
    },
    onDisplayCanAttack: (unitId, canAttack) => {
      log(`[TestScene] 显示可攻击状态: id=${unitId}, show=${canAttack}`);
      createIndicator(unitId, 'attack', canAttack);

      // 如果是当前选中的铜偶，同步更新状态（创建新对象触发响应式）
      if (selectedCopper.value && selectedCopper.value.id === unitId) {
        selectedCopper.value = {
          ...selectedCopper.value,
          can_attack: canAttack,
        };
        log(`[TestScene] 同步更新selectedCopper.can_attack=${canAttack}`);
      }
    },
    onClearState: unitId => {
      log(`[TestScene] 清除状态: id=${unitId}`);
      // 清除该单位的所有指示器
      if (stateIndicators.has(unitId)) {
        const indicators = stateIndicators.get(unitId);
        if (indicators.move) {
          scene.remove(indicators.move);
          indicators.move.geometry.dispose();
          indicators.move.material.dispose();
          indicators.move = null;
        }
        if (indicators.attack) {
          scene.remove(indicators.attack);
          indicators.attack.geometry.dispose();
          indicators.attack.material.dispose();
          indicators.attack = null;
        }
        stateIndicators.delete(unitId);
      }
    },
    onUpdateHealth: (unitId, nowHealth, maxHealth) => {
      log(`[TestScene] 更新血量: id=${unitId}, hp=${nowHealth}/${maxHealth}`);
      createOrUpdateHealthBar(unitId, nowHealth, maxHealth);
    },
    onRemoveHealthBar: unitId => {
      log(`[TestScene] 移除血条: id=${unitId}`);
      removeHealthBar(unitId);
    },
    onPutMapBlock: position => {
      // log(`[TestScene] 放置地图块: position=${position}`)  // 日志太多，已注释
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
        `[TestScene] 切换到${
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
        `[TestScene] 已${mode === 'backend' ? '显示' : '隐藏'}测试模型，${
          mode === 'eventloop' ? '显示' : '隐藏'
        }EventLoop模型`
      );
    },
  });

  log('[TestScene] 消息队列已配置');
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
      log('[TestScene] 相机聚焦完成');
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

  // 如果在移动/攻击模式，检测地板点击
  if (
    currentActionMode.value === 'moving' ||
    currentActionMode.value === 'attacking' ||
    currentActionMode.value === 'transferring'
  ) {
    handleFloorClick(mouse);
    return;
  }

  // 检测铜偶点击
  const clickableObjects = models
    .filter(m => m.type === 'copper' && m.object)
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
      log('[TestScene] 点击铜偶，ID:', modelId);
      // 发送点击事件到后端
      handleClickCopper(modelId);
    }
  } else {
    // 点击空白处，关闭面板
    selectedCopper.value = null;
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

    log(`[TestScene] 点击地板: (${gridX}, ${gridZ})`);

    if (currentActionMode.value === 'moving') {
      await handleMoveApply(gridX, gridZ);
    } else if (currentActionMode.value === 'attacking') {
      await handleAttackApply(gridX, gridZ);
    }
  }
}

// 执行移动
async function handleMoveApply(x, z) {
  if (!selectedCopper.value) return;

  log(`[TestScene] 请求移动到: (${x}, ${z})`);
  const message = JSON.stringify({
    type: 'on_move_apply',
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

  log(`[TestScene] 请求攻击位置: (${x}, ${z})`);
  const message = JSON.stringify({
    type: 'on_attack_apply',
    content: {
      id: String(selectedCopper.value.id),
      position: { x: String(x), y: String(z) },
    },
  });
  await eventloop(message);

  // 不在这里切换铜偶，等待后端攻击完成后再处理
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

// 关闭铜偶面板
function closeCopperPanel() {
  selectedCopper.value = null;
  selectedCopperResources.value = [];
  currentActionMode.value = null;
}

// 处理铜偶操作
function handleCopperAction(action) {
  log('[TestScene] 铜偶操作:', action);

  if (action.type === 'moveStart') {
    currentActionMode.value = 'moving';
  } else if (action.type === 'attackStart') {
    currentActionMode.value = 'attacking';
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
    if (mode === 'transferring') {
      const message = JSON.stringify({ type: 'on_transfer_end' });
      eventloop(message).catch(e => {
        log('[TestScene] 清除传递范围失败', e);
      });
      // 清空传递目标
      transferTargetPositions.value = [];
      transferTargets.value = [];
    }
    currentActionMode.value = null;
  } else if (action.type === 'wait') {
    log('[TestScene] 铜偶选择等待，跳转到下一个');
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

    log(
      `[TestScene] 检查铜偶状态: ID=${selectedCopper.value.id}, can_move=${canMove}, can_attack=${canAttack}, hasAttackTargets=${hasAttackTargets.value}`
    );

    // 实际可执行的操作：
    // 1. 可以移动
    // 2. 可以攻击 且 有攻击目标
    const hasValidActions = canMove || (canAttack && hasAttackTargets.value);

    if (hasValidActions) {
      log('[TestScene] 当前铜偶还能操作，不切换');
      return;
    }
  }

  log('[TestScene] 当前铜偶不能操作，切换到下一个');
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
      `[TestScene] 检查铜偶: ${nextCopper.name || nextCopper.id} (尝试 ${
        attempts + 1
      }/${maxAttempts})`
    );

    // 点击铜偶获取最新状态
    await new Promise(resolve => {
      setTimeout(async () => {
        await handleClickCopper(nextCopper.id);
        resolve();
      }, 300);
    });

    // 等待状态更新
    await new Promise(resolve => setTimeout(resolve, 200));

    // 检查这个铜偶是否真的可以操作
    // 实际可执行的操作：
    // 1. 可以移动
    // 2. 可以攻击 且 有攻击目标
    const canMove = selectedCopper.value?.can_move || false;
    const canAttack = selectedCopper.value?.can_attack || false;
    const hasValidActions = canMove || (canAttack && hasAttackTargets.value);

    log(
      `[TestScene] 铜偶 ${nextCopper.name}: can_move=${canMove}, can_attack=${canAttack}, hasTargets=${hasAttackTargets.value}, valid=${hasValidActions}`
    );

    if (selectedCopper.value && hasValidActions) {
      log(`[TestScene] 找到可操作的铜偶: ${nextCopper.name || nextCopper.id}`);
      return; // 找到可操作的铜偶，停止
    }

    attempts++;
  }

  // 所有铜偶都不能操作了
  log('[TestScene] 所有铜偶都不能操作，回合可以结束');
  selectedCopper.value = null;

  // 提示玩家可以结束回合
  if (props.isGameMode) {
    log('[TestScene] 提示：所有铜偶都已完成操作，可以点击"结束回合"按钮');
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

  log(`[TestScene] 进入回合 ${currentRound.value}`);

  // 新回合开始，自动点击第一个铜偶显示动作面板
  if (playerCoppers.value.length > 0) {
    setTimeout(() => {
      const firstCopper = playerCoppers.value[0];
      log(`[TestScene] 新回合开始，自动点击第一个铜偶: ${firstCopper.name}`);
      handleClickCopper(firstCopper.id);
    }, 500);
  }
}
</script>

<template>
  <div class="test-scene">
    <div ref="container" class="scene-container"></div>

    <!-- 返回按钮 -->
    <button
      class="back-btn"
      @click="goBack"
      :title="isGameMode ? '返回大厅' : '返回主菜单'"
    >
      ← {{ isGameMode ? '返回大厅' : '返回' }}
    </button>

    <!-- 测试面板（仅测试模式显示） -->
    <TestPanel v-if="!isGameMode" />

    <!-- 回合系统（仅游戏模式显示） -->
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
.test-scene {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 9999;
}

.scene-container {
  width: 100%;
  height: 100%;
}

.back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  padding: 12px 24px;
  background: rgba(58, 37, 25, 0.9);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  z-index: 10000;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(75, 46, 31, 0.9);
  transform: translateX(-2px);
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
