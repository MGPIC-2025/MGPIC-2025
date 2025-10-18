import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import GUI from 'lil-gui';
// 🌐 全局变量声明
let scene, camera, renderer, controls, gridHelper;
let ambientLight, directionalLight;
const models = []; // 存储所有加载的模型
let gui = null; // lil-gui 实例
let intensityControllers = new Map(); // 存储每个模型的光源强度控制器
let focusTarget = null; // 平滑聚焦的目标点（相机 lookAt 目标）
let focusPosition = null; // 平滑聚焦的目标位置（相机位置）
const lerpFactor = 0.08; // 平滑插值因子（值越小越慢）

// 🎮 WASD 移动状态（记录按键是否按下）
const moveState = {
  forward: false,  // W
  back: false,     // S
  left: false,     // A
  right: false,    // D
  up: false,       // Q
  down: false      // E
};

// 📦 初始化 Three.js 场景
function initScene() {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222); // 深灰色背景

  // 创建透视相机
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 2, 5); // 初始位置：前方5单位，高度2

  // 创建 WebGL 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true }); // 抗锯齿
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio); // 高 DPI 屏幕适配
  document.getElementById('container').appendChild(renderer.domElement);

  // 添加 OrbitControls（鼠标控制旋转/缩放/平移）
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // 启用惯性阻尼，使旋转更平滑

  // 添加全局光照（✅ 环境光调亮至 0.8）
  ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 环境光（均匀照亮）
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1); // 方向光（模拟太阳）
  directionalLight.position.set(5, 10, 5); // 从右上前方照射
  scene.add(directionalLight);

  // 添加网格地板（Y=0 平面）
  gridHelper = new THREE.GridHelper(50, 20, 0x888888, 0x444444);
  gridHelper.position.y = 0;
  scene.add(gridHelper);

  // 🎮 监听键盘事件（WASDQE）
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': moveState.forward = true; break; // 前进
      case 'KeyS': moveState.back = true; break;  // 后退
      case 'KeyA': moveState.left = true; break;  // 左移
      case 'KeyD': moveState.right = true; break; // 右移
      case 'KeyQ': moveState.up = true; break;    // 上升
      case 'KeyE': moveState.down = true; break;  // 下降
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': moveState.forward = false; break;
      case 'KeyS': moveState.back = false; break;
      case 'KeyA': moveState.left = false; break;
      case 'KeyD': moveState.right = false; break;
      case 'KeyQ': moveState.up = false; break;
      case 'KeyE': moveState.down = false; break;
    }
  });

  // 🖱️ 点击模型聚焦
  window.addEventListener('click', (event) => {
    // 排除 GUI 区域点击
    if (event.target.closest('#gui-container')) return;

    // 计算鼠标在归一化设备坐标中的位置 (-1 到 1)
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 创建射线拾取器
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // 收集所有模型的 Mesh 子对象（用于拾取）
    const allMeshes = [];
    models.forEach(model => {
      model.object.traverse(child => {
        if (child.isMesh) allMeshes.push(child);
      });
    });

    // 执行射线检测
    const intersects = raycaster.intersectObjects(allMeshes, true);
    if (intersects.length > 0) {
      // 从点击的 Mesh 向上查找根模型
      let current = intersects[0].object;
      let clickedModel = null;
      while (current) {
        clickedModel = models.find(m => m.object === current);
        if (clickedModel) break;
        current = current.parent;
      }
      if (clickedModel) {
        focusOnModel(clickedModel); // 平滑聚焦
      }
    }
  });

  // 窗口大小变化时更新相机和渲染器
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 🌀 渲染循环
  const velocity = new THREE.Vector3(); // 移动速度向量
  const direction = new THREE.Vector3(); // 相机前方方向
  let previousTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - previousTime) / 1000; // 秒
    previousTime = time;

    // 📌 平滑聚焦逻辑
    if (focusPosition && focusTarget) {
      // 使用线性插值（lerp）逐步接近目标
      camera.position.lerp(focusPosition, lerpFactor);
      controls.target.lerp(focusTarget, lerpFactor);
      controls.update();

      // 检查是否已接近目标（停止条件）
      if (camera.position.distanceTo(focusPosition) < 0.01 &&
        controls.target.distanceTo(focusTarget) < 0.01) {
        focusPosition = null;
        focusTarget = null;
      }
    }

    // 🎮 WASD 移动逻辑（仅在未聚焦时生效）
    if (!focusPosition) {
      velocity.set(0, 0, 0);

      // 设置移动方向（注意：Three.js Z 轴朝前为负）
      if (moveState.forward) velocity.z -= 1.0; // 前进：Z 减小
      if (moveState.back) velocity.z += 1.0;   // 后退：Z 增大
      if (moveState.left) velocity.x -= 1.0;   // 左移：X 减小
      if (moveState.right) velocity.x += 1.0;  // 右移：X 增大
      if (moveState.up) velocity.y += 1.0;     // 上升：Y 增大
      if (moveState.down) velocity.y -= 1.0;   // 下降：Y 减小

      // 应用移动（考虑相机朝向）
      if (velocity.lengthSq() > 0) {
        // 获取相机的水平前方方向（忽略 Y 轴）
        camera.getWorldDirection(direction);
        direction.y = 0; // 锁定在水平面
        direction.normalize();

        // 计算右方向（垂直于前方和上方向）
        const right = new THREE.Vector3();
        right.crossVectors(camera.up, direction).normalize();

        // 根据方向和右方向计算实际移动向量
        const moveForward = direction.clone().multiplyScalar(velocity.z * 5.0 * delta);
        const moveRight = right.clone().multiplyScalar(velocity.x * 5.0 * delta);
        const moveVertical = new THREE.Vector3(0, velocity.y * 5.0 * delta, 0);

        // 更新相机和控制目标位置
        camera.position.add(moveForward).add(moveRight).add(moveVertical);
        controls.target.add(moveForward).add(moveRight).add(moveVertical);
      }
    }

    // 📊 同步相机状态到 GUI（用于显示）
    if (window.globalParams) {
      window.globalParams.camX = camera.position.x;
      window.globalParams.camY = camera.position.y;
      window.globalParams.camZ = camera.position.z;

      // 从四元数计算欧拉角（只读）
      const euler = new THREE.Euler();
      euler.setFromQuaternion(camera.quaternion);
      window.globalParams.camRotX = euler.x;
      window.globalParams.camRotY = euler.y;
      window.globalParams.camRotZ = euler.z;
    }

    // 更新 OrbitControls（仅在未聚焦时）
    if (!focusPosition) {
      controls.update();
    }

    // 渲染场景
    renderer.render(scene, camera);
  }
  animate();

  // 🔑 初始化 Draco 解码器（用于压缩模型）
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  window.gltfLoader = new GLTFLoader();
  window.gltfLoader.setDRACOLoader(dracoLoader);
}

// 💡 创建点光源（✅ 纯白色，固定在模型局部坐标 (0.75, 0, 0)）
function createPointLight(model) {
  const pointLight = new THREE.PointLight(0xffffff, 1.5, 100); // ✅ 纯白 #ffffff
  pointLight.position.set(0.75, 0, 0); // 相对于模型的位置
  model.object.add(pointLight); // 作为模型子对象，自动跟随变换
  pointLight.visible = true;

  // 添加光源辅助球（红色小球，用于可视化）
  // const lightHelper = new THREE.PointLightHelper(pointLight, 0.3, 0xff0000);
  // scene.add(lightHelper);

  // 光源控制参数
  const lightParams = {
    enabled: true,
    color: '#ffffff', // ✅ 纯白
    intensity: 1.5,
    distance: 100,
    autoIntensity: true,
    position: new THREE.Vector3(0.75, 0, 0)
  };

  return { pointLight, lightParams };
}

// 🎛️ 为模型创建 GUI 控制面板
function createModelUI(model) {
  if (!gui) return;

  const modelFolder = gui.addFolder(`Model ${models.length}: ${model.name}`);
  const f = modelFolder;

  // 位置控制
  f.add(model.position, 'x', -100, 100).name('Position X').listen();
  f.add(model.position, 'y', -100, 100).name('Position Y').listen();
  f.add(model.position, 'z', -100, 100).name('Position Z').listen();

  // 旋转控制
  f.add(model.rotation, 'x', -Math.PI, Math.PI).name('Rotation X').listen();
  f.add(model.rotation, 'y', -Math.PI, Math.PI).name('Rotation Y').listen();
  f.add(model.rotation, 'z', -Math.PI, Math.PI).name('Rotation Z').listen();

  // 缩放控制
  f.add(model.scale, 'x', 0.01, 50).name('Scale X').listen().onChange(() => updateLightIntensity(model));
  f.add(model.scale, 'y', 0.01, 50).name('Scale Y').listen().onChange(() => updateLightIntensity(model));
  f.add(model.scale, 'z', 0.01, 50).name('Scale Z').listen().onChange(() => updateLightIntensity(model));

  // 包围盒信息（只读）
  const bboxFolder = f.addFolder('Bounding Box (Units)');
  bboxFolder.add(model.bboxInfo, 'width').name('Width (X)').disable();
  bboxFolder.add(model.bboxInfo, 'depth').name('Depth (Z)').disable();
  bboxFolder.add(model.bboxInfo, 'height').name('Height (Y)').disable();
  bboxFolder.open();

  // 点光源控制
  const lightParams = model.lightParams;
  const lightSub = f.addFolder('Point Light');
  lightSub.add(lightParams, 'enabled').name('Enable Light').onChange(() => {
    model.pointLight.visible = lightParams.enabled;
    if (model.lightHelper) model.lightHelper.visible = lightParams.enabled;
  });
  lightSub.addColor(lightParams, 'color').name('Color').onChange(() => {
    model.pointLight.color.set(lightParams.color);
    if (model.lightHelper) model.lightHelper.update();
  });
  lightSub.add(lightParams, 'autoIntensity').name('Auto Intensity').onChange(() => {
    updateLightIntensity(model);
  });
  const intensityCtrl = lightSub.add(lightParams, 'intensity', 0, 50).name('Intensity').onChange(() => {
    if (!lightParams.autoIntensity) model.pointLight.intensity = lightParams.intensity;
  });
  intensityControllers.set(model, intensityCtrl);
  lightSub.add(lightParams, 'distance', 0, 500).name('Distance').onChange(() => {
    model.pointLight.distance = lightParams.distance;
  });
  lightSub.add(lightParams.position, 'x', -50, 50).name('Light Pos X').onChange(updateLightPos);
  lightSub.add(lightParams.position, 'y', -50, 50).name('Light Pos Y').onChange(updateLightPos);
  lightSub.add(lightParams.position, 'z', -50, 50).name('Light Pos Z').onChange(updateLightPos);
  lightSub.open();

  function updateLightPos() {
    model.pointLight.position.copy(lightParams.position);
    if (model.lightHelper) model.lightHelper.update();
  }

  // 实用工具
  const utilsFolder = f.addFolder('Utils');
  utilsFolder.add({
    snapToGrid: () => {
      const cellSize = window.globalParams.gridSize / window.globalParams.gridDivisions;
      model.position.x = Math.round(model.position.x / cellSize) * cellSize;
      model.position.z = Math.round(model.position.z / cellSize) * cellSize;
    }
  }, 'snapToGrid').name('Snap to Grid');
  utilsFolder.open();

  f.open();
}

// 🔧 更新光源强度（自动补偿缩放）
function updateLightIntensity(model) {
  const lightParams = model.lightParams;
  if (lightParams.autoIntensity) {
    const maxScale = Math.max(model.scale.x, model.scale.y, model.scale.z);
    const autoIntensity = 1.5 * maxScale * maxScale; // 平方补偿
    model.pointLight.intensity = autoIntensity;
    lightParams.intensity = autoIntensity;
    const ctrl = intensityControllers.get(model);
    if (ctrl) ctrl.setValue(autoIntensity); // 同步到 GUI
  } else {
    model.pointLight.intensity = lightParams.intensity;
  }
}

// 🎯 平滑聚焦到模型本地原点 (0,0,0)
function focusOnModel(model) {
  // 计算模型本地坐标 (0,0,0) 的世界坐标
  const worldOrigin = new THREE.Vector3(0, 0, 0);
  model.object.localToWorld(worldOrigin);

  // 计算合适的观看距离
  const box = new THREE.Box3().setFromObject(model.object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  distance = Math.max(distance * 1.5, 2); // 至少 2 单位远

  // 计算相机新位置（从当前方向后退 distance）
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0; // 保持水平
  dir.normalize();
  const pos = new THREE.Vector3().copy(worldOrigin).sub(dir.clone().multiplyScalar(distance));

  // 设置平滑目标
  focusTarget = worldOrigin.clone();
  focusPosition = pos.clone();
}

// 📥 加载模型函数（4个参数）
function loadModel(url, initialX = 0, initialY = 0, initialZ = 0) {
  window.gltfLoader.load(
    url,
    (gltf) => {
      const obj = gltf.scene;

      // 自动居中（减去包围盒中心）
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);

      // 应用初始位置偏移
      obj.position.x += initialX;
      obj.position.y += initialY;
      obj.position.z += initialZ;

      scene.add(obj);

      // 创建点光源
      const lightData = createPointLight({ object: obj });

      // 计算包围盒尺寸
      const size = box.getSize(new THREE.Vector3());
      const bboxInfo = {
        width: size.x.toFixed(6),
        depth: size.z.toFixed(6),
        height: size.y.toFixed(6)
      };

      // 创建模型数据对象
      const model = {
        object: obj,
        name: `Model_${models.length + 1}`,
        position: obj.position,
        rotation: obj.rotation,
        scale: obj.scale,
        pointLight: lightData.pointLight,
        lightHelper: lightData.lightHelper,
        lightParams: lightData.lightParams,
        bboxInfo
      };

      models.push(model);
      createModelUI(model); // 创建 GUI
    },
    undefined,
    (error) => {
      console.error('ModelError:', error);
    }
  );
}

// 🌐 初始化 GUI
function initGUI() {
  const globalParams = {
    camX: camera.position.x,
    camY: camera.position.y,
    camZ: camera.position.z,
    camRotX: 0,
    camRotY: 0,
    camRotZ: 0,
    fov: camera.fov,
    ambientIntensity: 0.8, 
    directionalIntensity: 1,
    directionalColor: '#ffffff',
    dirLightX: directionalLight.position.x,
    dirLightY: directionalLight.position.y,
    dirLightZ: directionalLight.position.z,
    gridSize: 50,
    gridDivisions: 20,
    bgColor: '#222222'
  };
  window.globalParams = globalParams;

  gui = new GUI({ container: document.getElementById('gui-container') });

  // 网格地板控制
  const gridFolder = gui.addFolder('Grid Floor');
  gridFolder.add(globalParams, 'gridSize', 10, 500).name('Size').onChange(() => {
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(globalParams.gridSize, Math.floor(globalParams.gridDivisions), 0x888888, 0x444444);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
  });
  gridFolder.add(globalParams, 'gridDivisions', 4, 100).name('Divisions').step(1).onChange(() => {
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(globalParams.gridSize, Math.floor(globalParams.gridDivisions), 0x888888, 0x444444);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
  });
  gridFolder.open();

  // 相机控制
  const camFolder = gui.addFolder('Camera');
  camFolder.add(globalParams, 'camX', -200, 200).name('Position X').onChange(() => {
    camera.position.x = globalParams.camX;
    camera.updateProjectionMatrix();
    focusPosition = null; focusTarget = null; // 重置聚焦
  });
  camFolder.add(globalParams, 'camY', -200, 200).name('Position Y').onChange(() => {
    camera.position.y = globalParams.camY;
    camera.updateProjectionMatrix();
    focusPosition = null; focusTarget = null;
  });
  camFolder.add(globalParams, 'camZ', -200, 200).name('Position Z').onChange(() => {
    camera.position.z = globalParams.camZ;
    camera.updateProjectionMatrix();
    focusPosition = null; focusTarget = null;
  });
  camFolder.add(globalParams, 'camRotX', -Math.PI, Math.PI).name('Rotation X (rad)').listen().disable();
  camFolder.add(globalParams, 'camRotY', -Math.PI, Math.PI).name('Rotation Y (rad)').listen().disable();
  camFolder.add(globalParams, 'camRotZ', -Math.PI, Math.PI).name('Rotation Z (rad)').listen().disable();
  camFolder.add(globalParams, 'fov', 10, 120).name('FOV').onChange(() => {
    camera.fov = globalParams.fov;
    camera.updateProjectionMatrix();
    focusPosition = null; focusTarget = null;
  });
  camFolder.open();

  // 全局光照控制
  const lightFolder = gui.addFolder('Global Lighting');
  lightFolder.add(globalParams, 'ambientIntensity', 0, 2).onChange(() => {
    ambientLight.intensity = globalParams.ambientIntensity;
  });
  lightFolder.add(globalParams, 'directionalIntensity', 0, 2).onChange(() => {
    directionalLight.intensity = globalParams.directionalIntensity;
  });
  lightFolder.addColor(globalParams, 'directionalColor').onChange(() => {
    directionalLight.color.set(globalParams.directionalColor);
  });
  lightFolder.add(globalParams, 'dirLightX', -200, 200).onChange(() => {
    directionalLight.position.x = globalParams.dirLightX;
  });
  lightFolder.add(globalParams, 'dirLightY', -200, 200).onChange(() => {
    directionalLight.position.y = globalParams.dirLightY;
  });
  lightFolder.add(globalParams, 'dirLightZ', -200, 200).onChange(() => {
    directionalLight.position.z = globalParams.dirLightZ;
  });
  lightFolder.addColor(globalParams, 'bgColor').onChange(() => {
    scene.background = new THREE.Color(globalParams.bgColor);
  });
  lightFolder.open();
}

initScene();
// initGUI();

// 模型URL x y z
loadModel('./assets/enemy/variant/variant.glb', 0, 0, 1);