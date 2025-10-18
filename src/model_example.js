import {
  initScene,
  loadModel,
  setupInteraction,
  animate,
  initGUI,
  updateLighting,
  rotateModelByIndex,
  enablePointLightByIndex,
  getModelsArray,
  setModelConfig,
  setSelectedModel
} from './model.js';

// ✅ 配置参数
const FLOOR_TEXTURE = null;
const FLOOR_SIZE = 50;
const GRID_CELL_SIZE = 1.0;
const HOLD_DELAY = 500;

// 🌐 初始化场景
const container = document.getElementById('container');
const guiContainer = document.getElementById('gui-container');

const {
  scene,
  camera,
  renderer,
  controls,
  ambientLight,
  directionalLight,
  floor,
  gltfLoader
} = initScene(container, FLOOR_TEXTURE, FLOOR_SIZE, GRID_CELL_SIZE);


// 📦 状态管理
const models = [];
const selectedModelRef = { current: null };
const focusState = {
  focusPosition: null,
  focusTarget: null,
  lerpFactor: 0.08
};
const moveState = {
  forward: false, back: false, left: false, right: false, up: false, down: false
};

// 🎛️ 光照参数
const lightingParams = {
  ambientIntensity: 0.8,
  ambientColor: '#ffffff',
  directionalIntensity: 1.0,
  directionalColor: '#ffffff',
  dirLightX: 5,
  dirLightY: 10,
  dirLightZ: 5,
  bgColor: '#222222'
};

// 🎨 更新光照回调
const updateLightingCallback = () => {
  updateLighting(ambientLight, directionalLight, lightingParams, scene);
};

// 🎛️ 初始化GUI
initGUI(guiContainer, lightingParams, updateLightingCallback);

// 🖱️ 设置完整交互
const interaction = setupInteraction(
  camera,
  scene,
  models,
  floor,
  GRID_CELL_SIZE,
  selectedModelRef,
  (model) => setSelectedModel(selectedModelRef, scene, model),
  focusState,
  controls,
  HOLD_DELAY,
  guiContainer
);

// 🎮 WASD键盘控制
['keydown', 'keyup'].forEach(type => {
  window.addEventListener(type, (e) => {
    const state = type === 'keydown';
    switch (e.code) {
      case 'KeyW': moveState.back = state; break; // W = 前进
      case 'KeyS': moveState.forward = state; break;    // S = 后退
      case 'KeyA': moveState.right = state; break;    // A = 左移
      case 'KeyD': moveState.left = state; break;   // D = 右移
      case 'KeyQ': moveState.up = state; break;      // Q = 上升
      case 'KeyE': moveState.down = state; break;    // E = 下降
    }
  });
});

// 🌀 启动渲染循环
animate(renderer, scene, camera, controls, moveState, focusState, null);

// 📂 文件上传处理
let modelCounter = 0;

// 🗺️ 设置模型配置（示例）
// 你可以为每个不同的模型文件设置不同的参数
setModelConfig("variant", "./assets/enemy/variant/variant.glb",{
  initialX: 2,        // 初始位置X = 2
  initialY: 2,        // 初始位置Y = 0  
  initialZ: 3,       // 初始位置Z = -3
  initialScale: 4,  // 初始缩放 = 1.5倍
  lightIntensity: 2.0, // 光源强度 = 2.0
  lightDistance: 150,  // 光源距离 = 150
  lightColor: '#ffffffff', // 光源颜色 = 橙色
  lightPosX: 0.75,      // 光源相对X位置 = 1.0
  lightPosY: 0,      // 光源相对Y位置 = 0.5
  lightPosZ: 0       // 光源相对Z位置 = 0.5
});


loadModel(
  gltfLoader,
  scene,
  "variant",
  GRID_CELL_SIZE,
  modelCounter++,
  (modelData) => {
    models.push(modelData);
  },
  (error) => {
    console.error('Load error:', error);
  }
);

loadModel(
  gltfLoader,
  scene,
  "variant",
  GRID_CELL_SIZE,
  modelCounter++,
  (modelData) => {
    models.push(modelData);
  },
  (error) => {
    console.error('Load error:', error);
  }
);