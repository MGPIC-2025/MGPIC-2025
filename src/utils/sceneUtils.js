/**
 * 场景工具函数
 * 包含场景初始化、天空盒、光照等工具函数
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import log from '../log.js';
import { 
  getSkyboxConfig, 
  getLightingConfig,
  getCameraConfig,
  getRendererConfig,
  getDracoConfig,
  getTestUnitsConfig,
  getFloorConfig,
  getGridCellMaterialConfig,
} from './sceneConfig.js';

// 存储天空盒对象，以便后续可以移除
let skyboxMesh = null;

/**
 * 创建圆顶天空盒（使用球体或半球体几何体）
 * @param {THREE.Scene} scene - Three.js场景对象
 * @param {string} textureUrl - 纹理图片URL
 * @param {Object} options - 配置选项
 */
export function createDomeSkybox(scene, textureUrl, options = {}) {
  const {
    radius = 1000,
    segments = 32,
    hemisphere = false,
  } = options;

  // 移除旧的天空盒（如果存在）
  if (skyboxMesh) {
    scene.remove(skyboxMesh);
    if (skyboxMesh.geometry) skyboxMesh.geometry.dispose();
    if (skyboxMesh.material) {
      if (skyboxMesh.material.map) skyboxMesh.material.map.dispose();
      skyboxMesh.material.dispose();
    }
    skyboxMesh = null;
  }

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    textureUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      
      // 创建球体几何体
      const geometry = hemisphere
        ? new THREE.SphereGeometry(radius, segments, segments, 0, Math.PI * 2, 0, Math.PI / 2)
        : new THREE.SphereGeometry(radius, segments, segments);

      // 创建材质，使用BackSide让纹理显示在球体内侧
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide, // 内侧渲染
        depthWrite: false, // 不写入深度缓冲，避免遮挡场景
      });

      // 创建天空盒网格
      skyboxMesh = new THREE.Mesh(geometry, material);
      skyboxMesh.position.set(0, 0, 0);
      
      // 将天空盒添加到场景
      scene.add(skyboxMesh);
      
      log(`[SceneUtils] 圆顶天空盒创建成功（${hemisphere ? '半球' : '完整球体'}，半径：${radius}）`);
    },
    undefined,
    (error) => {
      log('[SceneUtils] 圆顶天空盒加载失败，使用默认背景', error);
      scene.background = new THREE.Color(0x222222);
    }
  );
}

/**
 * 加载圆顶天空盒
 * @param {THREE.Scene} scene - Three.js场景对象
 * @param {Object} config - 天空盒配置
 */
export function loadSkybox(scene, config) {
  if (!config || !config.url) {
    scene.background = new THREE.Color(0x222222);
    return;
  }

  createDomeSkybox(scene, config.url, {
    radius: config.radius || 1000,
    segments: config.segments || 32,
    hemisphere: config.hemisphere || false,
  });
}

/**
 * 应用环境光照配置
 * @param {THREE.Scene} scene - Three.js场景对象
 * @param {Object} config - 光照配置对象
 */
export function applyLighting(scene, config) {
  // 环境光
  const ambientLight = new THREE.AmbientLight(
    config.ambient.color,
    config.ambient.intensity
  );
  scene.add(ambientLight);

  // 主方向光
  const mainDirectionalLight = new THREE.DirectionalLight(
    config.mainDirectional.color,
    config.mainDirectional.intensity
  );
  mainDirectionalLight.position.set(
    config.mainDirectional.position.x,
    config.mainDirectional.position.y,
    config.mainDirectional.position.z
  );
  mainDirectionalLight.castShadow = config.mainDirectional.castShadow;
  scene.add(mainDirectionalLight);

  // 顶部补光
  const topLight = new THREE.DirectionalLight(
    config.topLight.color,
    config.topLight.intensity
  );
  topLight.position.set(
    config.topLight.position.x,
    config.topLight.position.y,
    config.topLight.position.z
  );
  scene.add(topLight);

  // 半球光
  const hemisphereLight = new THREE.HemisphereLight(
    config.hemisphere.skyColor,
    config.hemisphere.groundColor,
    config.hemisphere.intensity
  );
  hemisphereLight.position.set(
    config.hemisphere.position.x,
    config.hemisphere.position.y,
    config.hemisphere.position.z
  );
  scene.add(hemisphereLight);
}

/**
 * 创建相机
 * @param {Object} customConfig - 自定义相机配置（可选）
 * @returns {THREE.PerspectiveCamera} 相机对象
 */
export function createCamera(customConfig = {}) {
  const config = { ...getCameraConfig(), ...customConfig };
  const aspect = window.innerWidth / window.innerHeight;
  
  const camera = new THREE.PerspectiveCamera(
    config.fov,
    aspect,
    config.near,
    config.far
  );
  camera.position.set(config.position.x, config.position.y, config.position.z);
  return camera;
}

/**
 * 创建渲染器
 * @param {HTMLElement} container - 渲染容器
 * @param {Object} customOptions - 自定义渲染器选项（可选）
 * @returns {THREE.WebGLRenderer} 渲染器对象
 */
export function createRenderer(container, customOptions = {}) {
  const config = { ...getRendererConfig(), ...customOptions };
  const width = customOptions.width || window.innerWidth;
  const height = customOptions.height || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: config.antialias });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  return renderer;
}

/**
 * 初始化GLTF加载器
 * @param {string} customDracoPath - 自定义DRACO解码器路径（可选）
 * @returns {GLTFLoader} GLTF加载器
 */
export function createGLTFLoader(customDracoPath = null) {
  const config = getDracoConfig();
  const dracoPath = customDracoPath || config.decoderPath;
  
  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(dracoPath);
  gltfLoader.setDRACOLoader(dracoLoader);
  return gltfLoader;
}

/**
 * 创建测试单位（用于后端测试）
 * @param {THREE.Scene} scene - Three.js场景对象
 * @param {Array} modelsArray - 模型数组（用于存储创建的模型）
 */
export function createTestUnits(scene, modelsArray) {
  const config = getTestUnitsConfig();
  
  if (!config.enabled) {
    return;
  }

  config.units.forEach(unitConfig => {
    const geometry = new THREE.BoxGeometry(unitConfig.size, unitConfig.size, unitConfig.size);
    const material = new THREE.MeshStandardMaterial({ color: unitConfig.color });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(unitConfig.position.x, unitConfig.position.y, unitConfig.position.z);
    scene.add(cube);

    modelsArray.push({
      id: unitConfig.id,
      object: cube,
      name: unitConfig.name,
      type: 'test',
    });
  });

  log('[SceneUtils] 创建了测试单位:', modelsArray.map(m => `ID=${m.id}`));
}

/**
 * 创建地板
 * @param {THREE.Scene} scene - Three.js场景对象
 * @param {Object} customConfig - 自定义地板配置（可选）
 * @returns {THREE.Mesh|null} 地板网格对象，如果未启用则返回null
 */
export function createFloor(scene, customConfig = {}) {
  const config = { ...getFloorConfig(), ...customConfig };
  
  if (!config.enabled) {
    return null;
  }

  // 创建平面几何体
  const geometry = new THREE.PlaneGeometry(config.size, config.size);

  let material;

  if (config.materialType === 'texture' && config.texture.url) {
    // 纹理材质
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(config.texture.url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE[config.texture.wrapS] || THREE.RepeatWrapping;
    texture.wrapT = THREE[config.texture.wrapT] || THREE.RepeatWrapping;
    texture.repeat.set(config.texture.repeat.x, config.texture.repeat.y);

    material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
  } else if (config.materialType === 'color') {
    // 纯色材质
    material = new THREE.MeshBasicMaterial({
      color: config.color.value,
      side: THREE.DoubleSide,
    });
  } else {
    // 标准材质（支持光照）
    const materialOptions = {
      color: config.standard.color,
      roughness: config.standard.roughness,
      metalness: config.standard.metalness,
      side: THREE.DoubleSide,
    };

    // 加载可选贴图
    const textureLoader = new THREE.TextureLoader();
    
    if (config.standard.normalMap) {
      const normalMap = textureLoader.load(config.standard.normalMap);
      normalMap.colorSpace = THREE.SRGBColorSpace;
      materialOptions.normalMap = normalMap;
      materialOptions.normalScale = new THREE.Vector2(
        config.standard.normalScale.x,
        config.standard.normalScale.y
      );
    }

    if (config.standard.roughnessMap) {
      const roughnessMap = textureLoader.load(config.standard.roughnessMap);
      roughnessMap.colorSpace = THREE.SRGBColorSpace;
      materialOptions.roughnessMap = roughnessMap;
    }

    if (config.standard.aoMap) {
      const aoMap = textureLoader.load(config.standard.aoMap);
      aoMap.colorSpace = THREE.SRGBColorSpace;
      materialOptions.aoMap = aoMap;
    }

    material = new THREE.MeshStandardMaterial(materialOptions);
  }

  // 创建地板网格
  const floor = new THREE.Mesh(geometry, material);
  floor.position.set(config.position.x, config.position.y, config.position.z);
  floor.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
  
  // 设置渲染顺序，确保地板在血条之前渲染（血条的renderOrder是999）
  // 使用负值确保地板先于血条渲染，但保持深度写入以正确遮挡单位模型
  floor.renderOrder = -200;
  
  // 添加到场景
  scene.add(floor);
  
  log(`[SceneUtils] 地板创建成功（材质类型：${config.materialType}，尺寸：${config.size}）`);
  
  return floor;
}

/**
 * 创建地图块网格（为每个网格单元创建带材质的地图块）
 * @param {THREE.Scene} scene - Three.js场景对象
 * @param {Array} positions - 地图块位置数组 [[x, z], ...]
 * @param {Object} customConfig - 自定义配置（可选）
 * @returns {Array} 创建的地图块网格数组
 */
export function createGridCells(scene, positions = [], customConfig = {}) {
  const config = { ...getGridCellMaterialConfig(), ...customConfig };
  
  if (!config.enabled || positions.length === 0) {
    return [];
  }

  const cells = [];
  const material = createCellMaterial(config);

  positions.forEach(([x, z]) => {
    const geometry = new THREE.PlaneGeometry(config.size, config.size);
    const cell = new THREE.Mesh(geometry, material);
    cell.rotation.x = -Math.PI / 2; // 水平放置
    cell.position.set(x, config.height, z);
    cell.userData = { position: [x, z], type: 'gridCell' };
    
    scene.add(cell);
    cells.push(cell);
  });

  log(`[SceneUtils] 创建了 ${cells.length} 个地图块`);
  return cells;
}

/**
 * 创建地图块材质（内部辅助函数）
 * @param {Object} config - 材质配置
 * @returns {THREE.Material} 材质对象
 */
function createCellMaterial(config) {
  if (config.materialType === 'texture' && config.texture.url) {
    // 纹理材质
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(config.texture.url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(config.texture.repeat.x, config.texture.repeat.y);

    return new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: config.standard?.opacity || 1.0,
    });
  } else if (config.materialType === 'standard') {
    // 标准材质（支持光照）
    return new THREE.MeshStandardMaterial({
      color: config.standard.color,
      roughness: config.standard.roughness,
      metalness: config.standard.metalness,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: config.standard.opacity,
    });
  } else {
    // 基础材质
    return new THREE.MeshBasicMaterial({
      color: config.basic.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: config.basic.opacity,
    });
  }
}

/**
 * 清理天空盒资源
 * @param {THREE.Scene} scene - Three.js场景对象
 */
export function disposeSkybox(scene) {
  if (skyboxMesh && scene) {
    scene.remove(skyboxMesh);
    if (skyboxMesh.geometry) skyboxMesh.geometry.dispose();
    if (skyboxMesh.material) {
      if (skyboxMesh.material.map) skyboxMesh.material.map.dispose();
      skyboxMesh.material.dispose();
    }
    skyboxMesh = null;
  }
}

/**
 * 初始化场景（完整初始化流程）
 * @param {HTMLElement} container - 渲染容器
 * @param {Object} options - 初始化选项
 * @returns {Object} 场景对象 { scene, camera, renderer, gltfLoader }
 */
export function initScene(container, options = {}) {
  const {
    createTestUnits: shouldCreateTestUnits = false,
    modelsArray = null,
  } = options;

  // 创建场景
  const scene = new THREE.Scene();
  
  // 加载圆顶天空盒
  const skyboxCfg = getSkyboxConfig();
  loadSkybox(scene, skyboxCfg);

  // 创建相机
  const camera = createCamera();

  // 创建渲染器
  const renderer = createRenderer(container);

  // 应用环境光照
  const lightingCfg = getLightingConfig();
  applyLighting(scene, lightingCfg);

  // 初始化GLTF加载器
  const gltfLoader = createGLTFLoader();

  // 创建测试单位（如果需要）
  if (shouldCreateTestUnits && modelsArray) {
    createTestUnits(scene, modelsArray);
  }

  log('[SceneUtils] 场景初始化完成');

  return {
    scene,
    camera,
    renderer,
    gltfLoader,
  };
}

