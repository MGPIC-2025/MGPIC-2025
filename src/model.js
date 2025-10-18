// 📦 导入依赖
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import GUI from 'lil-gui';
// 🗺️ 模型配置映射 - 改为使用模型名称作为键
const modelConfigMap = new Map();
// 🗺️ URL到名称的映射
const modelUrlToNameMap = new Map();

/**
 * 设置模型配置（使用名称）
 * @param {string} name - 模型名称（唯一标识符）
 * @param {string} url - 模型文件URL
 * @param {Object} config - 模型配置参数
 */
function setModelConfig(name, url, config) {
  modelConfigMap.set(name, {
    url: url,
    initialX: config.initialX || 0,
    initialY: config.initialY || 0,
    initialZ: config.initialZ || 0,
    initialScale: config.initialScale || 1.0,
    lightIntensity: config.lightIntensity || 1.5,
    lightDistance: config.lightDistance || 100,
    lightColor: config.lightColor || '#ffffff',
    lightPosX: config.lightPosX !== undefined ? config.lightPosX : 0.75,
    lightPosY: config.lightPosY !== undefined ? config.lightPosY : 0,
    lightPosZ: config.lightPosZ !== undefined ? config.lightPosZ : 0
  });
  // 建立URL到名称的映射
  modelUrlToNameMap.set(url, name);
}

/**
 * 获取模型配置（通过名称）
 * @param {string} name - 模型名称
 * @returns {Object} 配置对象
 */
function getModelConfig(name) {
  return modelConfigMap.get(name) || {
    url: '',
    initialX: 0,
    initialY: 0,
    initialZ: 0,
    initialScale: 1.0,
    lightIntensity: 1.5,
    lightDistance: 100,
    lightColor: '#ffffff',
    lightPosX: 0.75,
    lightPosY: 0,
    lightPosZ: 0
  };
}

/**
 * 通过URL获取模型名称
 * @param {string} url - 模型URL
 * @returns {string} 模型名称
 */
function getModelNameByUrl(url) {
  return modelUrlToNameMap.get(url) || 'default_model';
}

/**
 * 创建点光源（自动启用）
 * 这个函数会在模型上创建一个点光源，并自动开启
 * @param {THREE.Object3D} modelObject - 要添加光源的模型对象
 * @param {number} intensity - 光源强度 (0-5 范围)
 * @param {number} distance - 光源照射距离 (0-500 范围)
 * @param {string} color - 光源颜色 (HEX 格式，如 '#ff0000')
 * @param {THREE.Vector3} position - 光源相对于模型的位置
 * @returns {Object} 包含点光源对象和控制参数的对象
 */
function createPointLight(modelObject, intensity = 1.5, distance = 100, color = '#ffffff', position = new THREE.Vector3(0.75, 0, 0)) {
  // 创建Three.js的点光源对象
  const pointLight = new THREE.PointLight(color, intensity, distance);
  // 设置光源位置（相对于模型的局部坐标）
  pointLight.position.copy(position);
  // 将光源添加到模型上（这样光源会跟随模型移动和旋转）
  modelObject.add(pointLight);
  // 自动启用光源（设为true）
  pointLight.visible = true;

  // 返回包含光源和参数的对象，用于后续控制
  return {
    pointLight,
    lightParams: {
      enabled: true,        // 光源启用状态
      color: color,         // 光源颜色
      intensity: intensity, // 光源强度
      distance: distance,   // 光源距离
      autoIntensity: true,  // 是否自动调整强度（缩放时）
      position: position.clone() // 光源位置的副本
    }
  };
}

/**
 * 计算聚焦到模型原点所需的相机位置
 * 这个函数会计算出相机应该移动到哪里，才能让模型居中显示
 * @param {THREE.Object3D} modelObject - 要聚焦的模型
 * @param {THREE.PerspectiveCamera} camera - 当前相机
 * @param {OrbitControls} controls - 相机控制器
 * @returns {Object} 包含目标位置、目标点和移动速度的对象
 */
function focusOnModel(modelObject, camera, controls) {
  // 获取模型本地坐标 (0,0,0) 在世界坐标系中的位置
  const worldOrigin = new THREE.Vector3(0, 0, 0);
  modelObject.localToWorld(worldOrigin);

  // 计算模型的包围盒（最小包围立方体）
  const box = new THREE.Box3().setFromObject(modelObject);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  
  // 根据相机视野(FOV)计算合适的观看距离
  const fov = camera.fov * (Math.PI / 180);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  distance = Math.max(distance * 1.5, 2); // 确保至少2单位远

  // 计算相机应该看向的方向（当前相机朝向）
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0; // 保持在水平面（Y=0）
  dir.normalize(); // 标准化方向向量
  
  // 计算相机目标位置：从模型原点向后退distance距离
  const targetPosition = new THREE.Vector3().copy(worldOrigin).sub(dir.clone().multiplyScalar(distance));

  // 返回聚焦数据
  return {
    focusPosition: targetPosition.clone(), // 相机目标位置
    focusTarget: worldOrigin.clone(),      // 相机目标点（模型原点）
    lerpFactor: 0.08                      // 移动速度（0.08 = 较慢）
  };
}

/**
 * 创建地板网格
 * @param {string} textureUrl - 地板纹理图片的URL
 * @param {number} floorSize - 地板总尺寸（宽度和深度）
 * @param {number} gridCellSize - 每个网格单元的大小
 * @returns {THREE.Mesh} 地板网格对象
 */
function createFloor(textureUrl, floorSize, gridCellSize) {
  // 创建平面几何体
  const geometry = new THREE.PlaneGeometry(floorSize, floorSize);
  
  if (textureUrl) {
    // 如果有纹理URL，加载纹理
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(textureUrl);
    
    // 设置纹理为SRGB色彩空间（确保颜色显示正确）
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // 设置纹理重复次数（让纹理平铺整个地板）
    const repeat = floorSize / gridCellSize;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    
    // 创建材质和网格
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2; // 旋转90度变成水平面
    floor.position.y = 0;            // 放在Y=0平面上
    return floor;
  } else {
    // 如果没有纹理，使用纯色地板
    const material = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    return floor;
  }
}

/**
 * 创建网格边框（显示网格线）
 * @param {number} floorSize - 地板总尺寸
 * @param {number} gridCellSize - 网格单元大小
 * @returns {THREE.GridHelper} 网格边框对象
 */
function createGridOverlay(floorSize, gridCellSize) {
  // 创建Three.js的网格辅助线
  const grid = new THREE.GridHelper(floorSize, Math.floor(floorSize / gridCellSize), 0x000000, 0x000000);
  grid.position.y = 0.01; // 略高于地板，避免显示问题
  grid.material.opacity = 0.5; // 50%透明度
  grid.material.transparent = true;
  return grid;
}

/**
 * 创建地板高亮指示器（显示目标移动位置）
 * @param {number} cellSize - 网格单元大小
 * @param {number} color - 高亮颜色（默认黄色）
 * @returns {THREE.Mesh} 高亮指示器对象
 */
function createFloorHighlight(cellSize, color = 0xffff00) {
  // 创建一个小平面作为高亮指示器
  const geometry = new THREE.PlaneGeometry(cellSize, cellSize);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3, // 30%透明度
    side: THREE.DoubleSide
  });
  const highlight = new THREE.Mesh(geometry, material);
  highlight.rotation.x = -Math.PI / 2; // 旋转成水平面
  highlight.visible = false; // 初始隐藏
  return highlight;
}

/**
 * 加载单个模型
 * 这个函数会根据配置映射自动应用所有设置
 * @param {GLTFLoader} gltfLoader - GLTF模型加载器
 * @param {THREE.Scene} scene - 3D场景
 * @param {string} url - 模型文件URL
 * @param {number} gridCellSize - 网格单元大小
 * @param {number} modelIndex - 模型索引（用于唯一命名）
 * @param {Function} onLoad - 加载成功回调函数
 * @param {Function} onError - 加载失败回调函数
 */
function loadModel(gltfLoader, scene, name, gridCellSize, modelIndex,onLoad, onError) {
  // 从配置映射中获取这个模型的设置
  const config = getModelConfig(name);
  
  // 开始加载模型
  gltfLoader.load(
    config.url,
    (gltf) => {
      // 获取模型根对象
      const obj = gltf.scene;
      
      // 计算模型包围盒并居中
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center); // 将模型中心移到原点
      scene.add(obj);           // 添加到场景

      // 应用配置的初始位置和缩放
      obj.position.x += config.initialX;
      obj.position.y += config.initialY;
      obj.position.z += config.initialZ;
      obj.scale.set(config.initialScale, config.initialScale, config.initialScale);

      // 创建点光源（使用配置的参数）
      const lightPosition = new THREE.Vector3(config.lightPosX, config.lightPosY, config.lightPosZ);
      const { pointLight, lightParams } = createPointLight(
        obj, 
        config.lightIntensity, 
        config.lightDistance, 
        config.lightColor, 
        lightPosition
      );
      
      // 计算包围盒信息（用于UI显示）
      const size = box.getSize(new THREE.Vector3());
      const bboxInfo = {
        width: size.x.toFixed(6),
        depth: size.z.toFixed(6),
        height: size.y.toFixed(6)
      };

      // 创建完整的模型数据对象
      const modelData = {
        object: obj,           // 模型对象
        name: `Model_${modelIndex}`, // 唯一名称
        position: obj.position, // 位置引用
        rotation: obj.rotation, // 旋转引用  
        scale: obj.scale,       // 缩放引用
        pointLight,            // 点光源对象
        lightParams,          // 光源参数
        bboxInfo,             // 包围盒信息
        outline: null,        // 高亮轮廓（初始为空）
        isMoving: false       // 移动状态（初始为false）
      };

      // 如果没有指定初始位置，则自动吸附到最近的网格中心
      if (config.initialX === 0 && config.initialZ === 0) {
        const pos = obj.position;
        const ix = Math.round(pos.x / gridCellSize);
        const iz = Math.round(pos.z / gridCellSize);
        pos.x = ix * gridCellSize + gridCellSize / 2;
        pos.z = iz * gridCellSize + gridCellSize / 2;
      }

      // 调用成功回调
      if (onLoad) onLoad(modelData);
    },
    undefined,
    onError
  );
}

/**
 * 设置选中模型（在model.js内部管理）
 * @param {Object} selectedModelRef - 选中模型引用对象 { current: model }
 * @param {THREE.Scene} scene - 场景对象
 * @param {Object} model - 要选中的模型数据对象（可为null表示取消选中）
 */
function setSelectedModel(selectedModelRef, scene, model) {
  // 移除旧的轮廓
  if (selectedModelRef.current && selectedModelRef.current.outline) {
    scene.remove(selectedModelRef.current.outline);
    selectedModelRef.current.outline = null;
  }
  selectedModelRef.current = model;
  // 添加新的轮廓
  if (model) {
    const outline = createOutline(model.object);
    model.outline = outline;
    scene.add(outline);
  }
}

/**
 * 创建模型高亮轮廓（选中时显示的线框）
 * @param {THREE.Object3D} modelObject - 模型对象
 * @param {number} color - 轮廓颜色（默认青色）
 * @returns {THREE.Mesh} 轮廓对象
 */
function createOutline(modelObject, color = 0x00ffff) {
  const box = new THREE.Box3().setFromObject(modelObject);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const outlineGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    depthTest: false,
    transparent: true,
    opacity: 0.8
  });
  const outline = new THREE.Mesh(outlineGeo, outlineMaterial);
  outline.position.copy(center);
  return outline;
}

/**
 * 旋转模型X轴（带动画效果）
 * @param {THREE.Object3D} modelObject - 模型对象
 * @param {number} degrees - 目标旋转角度（度）
 * @param {Function} onComplete - 动画完成回调（可选）
 */
function rotateModelX(modelObject, degrees, onComplete = null) {
  if (!modelObject) return;
  
  const targetRadians = degrees * Math.PI / 180;
  const startRadians = modelObject.rotation.x;
  const duration = 300; // 300ms 动画时长
  const startTime = performance.now();
  
  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // 使用 ease-out 缓动
    const easeProgress = 1 - Math.pow(1 - progress, 2);
    
    modelObject.rotation.x = startRadians + (targetRadians - startRadians) * easeProgress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      modelObject.rotation.x = targetRadians;
      if (onComplete) onComplete();
    }
  }
  
  animate();
}

/**
 * 设置点光源启用状态
 * @param {Object} modelData - 模型数据对象
 * @param {boolean} enabled - 是否启用
 */
function setPointLightEnabled(modelData, enabled) {
  if (!modelData || !modelData.pointLight) return;
  modelData.pointLight.visible = enabled;
  if (modelData.lightParams) {
    modelData.lightParams.enabled = enabled;
  }
}

/**
 * 平移动画（模型移动到目标位置）
 * @param {Object} model - 模型数据对象
 * @param {THREE.Vector3} targetPosition - 目标位置
 * @param {Function} onComplete - 动画完成回调
 */
function animateModelMove(model, targetPosition, onComplete) {
  if (!model || !model.object) return;
  
  model.isMoving = true;
  const startPosition = model.object.position.clone();
  const duration = 500; // 500毫秒动画
  const startTime = performance.now();
  
  function animate() {
    if (!model || !model.object) {
      if (onComplete) onComplete();
      return;
    }
    
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // 使用缓动函数让动画更自然
    const easeProgress = 1 - Math.pow(1 - progress, 2);
    
    model.object.position.lerpVectors(startPosition, targetPosition, easeProgress);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (model && model.object) {
        model.object.position.copy(targetPosition);
      }
      model.isMoving = false;
      if (onComplete) onComplete();
    }
  }
  
  animate();
}

/**
 * 精确计算网格单元中心
 * 这个函数确保点击边界时也能正确计算到正确的网格单元
 * @param {THREE.Vector3} worldPoint - 世界坐标点
 * @param {number} cellSize - 网格单元大小
 * @returns {Object} 包含中心坐标和索引的对象
 */
function getGridCellCenter(worldPoint, cellSize) {
  // 使用Math.floor确保负数也能正确处理
  const ix = Math.floor(worldPoint.x / cellSize);
  const iz = Math.floor(worldPoint.z / cellSize);
  // 计算单元中心点（索引+0.5）
  const centerX = (ix + 0.5) * cellSize;
  const centerZ = (iz + 0.5) * cellSize;
  return { x: centerX, z: centerZ, ix, iz };
}

/**
 * 更新场景光照
 * @param {THREE.AmbientLight} ambientLight - 环境光
 * @param {THREE.DirectionalLight} directionalLight - 方向光
 * @param {Object} lightingParams - 光照参数
 * @param {THREE.Scene} scene - 场景
 */
function updateLighting(ambientLight, directionalLight, lightingParams, scene) {
  ambientLight.intensity = lightingParams.ambientIntensity;
  ambientLight.color.set(lightingParams.ambientColor);
  directionalLight.intensity = lightingParams.directionalIntensity;
  directionalLight.color.set(lightingParams.directionalColor);
  directionalLight.position.set(
    lightingParams.dirLightX,
    lightingParams.dirLightY,
    lightingParams.dirLightZ
  );
  scene.background = new THREE.Color(lightingParams.bgColor);
}

/**
 * 初始化GUI控制面板
 * @param {HTMLElement} guiContainer - GUI容器
 * @param {Object} lightingParams - 光照参数
 * @param {Function} updateLightingCallback - 光照更新回调
 * @returns {GUI} GUI实例
 */
function initGUI(guiContainer, lightingParams, updateLightingCallback) {
  const gui = new GUI({ container: guiContainer });
  const lightFolder = gui.addFolder('Global Lighting');
  lightFolder.open();
  lightFolder.add(lightingParams, 'ambientIntensity', 0, 2).name('Ambient Intensity').onChange(updateLightingCallback);
  lightFolder.addColor(lightingParams, 'ambientColor').name('Ambient Color').onChange(updateLightingCallback);
  lightFolder.add(lightingParams, 'directionalIntensity', 0, 5).name('Directional Intensity').onChange(updateLightingCallback);
  lightFolder.addColor(lightingParams, 'directionalColor').name('Directional Color').onChange(updateLightingCallback);
  lightFolder.add(lightingParams, 'dirLightX', -200, 200).name('Dir Light X').onChange(updateLightingCallback);
  lightFolder.add(lightingParams, 'dirLightY', -200, 200).name('Dir Light Y').onChange(updateLightingCallback);
  lightFolder.add(lightingParams, 'dirLightZ', -200, 200).name('Dir Light Z').onChange(updateLightingCallback);
  lightFolder.addColor(lightingParams, 'bgColor').name('Background Color').onChange(updateLightingCallback);
  return gui;
}

/**
 * 初始化场景
 * @param {HTMLElement} container - 渲染容器
 * @param {string} floorTextureUrl - 地板纹理URL
 * @param {number} floorSize - 地板尺寸
 * @param {number} gridCellSize - 网格单元大小
 * @returns {Object} 场景核心对象
 */
function initScene(container, floorTextureUrl, floorSize, gridCellSize) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 2, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // 添加响应式处理
  function updateSize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
  }
  
  updateSize();
  window.addEventListener('resize', updateSize);
  
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const floor = createFloor(floorTextureUrl, floorSize, gridCellSize);
  scene.add(floor);

  const gridOverlay = createGridOverlay(floorSize, gridCellSize);
  scene.add(gridOverlay);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  return {
    scene,
    camera,
    renderer,
    controls,
    ambientLight,
    directionalLight,
    floor,
    gltfLoader
  };
}

// 🖱️ 简化的交互注册函数（每个操作单独注册）

/**
 * 注册鼠标移动事件（用于地板高亮）
 * @param {THREE.PerspectiveCamera} camera - 相机
 * @param {THREE.Scene} scene - 场景
 * @param {Array} models - 模型数组
 * @param {number} gridCellSize - 网格单元大小
 * @param {THREE.Mesh} floorHighlight - 地板高亮指示器
 * @param {Object} selectedModelRef - 选中模型引用
 * @returns {Function} 清理函数
 */
function registerMouseMoveHandler(camera, scene, models, gridCellSize, floorHighlight, selectedModelRef) {
  function onMouseMove(event) {
    // 如果没有选中模型，隐藏高亮
    if (!selectedModelRef.current) {
      floorHighlight.visible = false;
      return;
    }

    // 计算鼠标在3D空间中的位置
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // 计算鼠标与地板(Y=0平面)的交点
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      // 计算交点所在的网格单元中心
      const cellCenter = getGridCellCenter(intersection, gridCellSize);
      // 更新高亮指示器位置
      floorHighlight.position.set(cellCenter.x, 0.005, cellCenter.z);
      floorHighlight.visible = true;
    } else {
      floorHighlight.visible = false;
    }
  }

  // 注册事件监听器
  window.addEventListener('mousemove', onMouseMove);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('mousemove', onMouseMove);
  };
}

/**
 * 注册鼠标按下事件（用于模型选择和地板点击）
 * @param {THREE.PerspectiveCamera} camera - 相机
 * @param {THREE.Scene} scene - 场景
 * @param {Array} models - 模型数组
 * @param {number} gridCellSize - 网格单元大小
 * @param {THREE.Mesh} floorHighlight - 地板高亮指示器
 * @param {Object} selectedModelRef - 选中模型引用
 * @param {Function} setSelectedModel - 设置选中模型的函数
 * @param {Object} focusState - 聚焦状态
 * @param {OrbitControls} cameraControls - 相机控制器
 * @param {number} holdDelay - 长按延迟时间
 * @param {HTMLElement} guiContainer - GUI容器
 * @returns {Function} 清理函数
 */
function registerMouseDownHandler(
  camera, 
  scene, 
  models, 
  gridCellSize, 
  floorHighlight, 
  selectedModelRef, 
  setSelectedModel, 
  focusState, 
  cameraControls, 
  holdDelay, 
  guiContainer
) {
  let currentHold = null;
  let isMouseDown = false;

  function onMouseDown(event) {
    // 如果点击了GUI区域，忽略
    if (guiContainer && guiContainer.contains(event.target)) return;

    // 计算鼠标位置
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // 尝试拾取模型
    const modelMeshes = [];
    for (let i = 0; i < models.length; i++) {
      if (!models[i].isMoving) {
        models[i].object.traverse(child => {
          if (child.isMesh) modelMeshes.push(child);
        });
      }
    }

    const modelIntersects = raycaster.intersectObjects(modelMeshes, true);
    if (modelIntersects.length > 0) {
      // 找到被点击的模型
      let current = modelIntersects[0].object;
      let clickedModel = null;
      while (current) {
        for (let i = 0; i < models.length; i++) {
          if (models[i].object === current && !models[i].isMoving) {
            clickedModel = models[i];
            break;
          }
        }
        if (clickedModel) break;
        current = current.parent;
      }
      if (clickedModel) {
        // 点击已选中模型则取消选中
        if (selectedModelRef.current === clickedModel) {
          setSelectedModel(null);
          floorHighlight.visible = false;
          isMouseDown = false;
          return;
        }
        
        // 选中新模型
        setSelectedModel(clickedModel);
        floorHighlight.visible = false;
        isMouseDown = true;
        
        // 设置长按聚焦计时器
        let isHolding = true;
        const holdTimer = setTimeout(() => {
          if (isHolding && isMouseDown) {
            const focusData = focusOnModel(clickedModel.object, camera, cameraControls);
            focusState.focusPosition = focusData.focusPosition;
            focusState.focusTarget = focusData.focusTarget;
            focusState.lerpFactor = focusData.lerpFactor;
          }
        }, holdDelay);
        
        currentHold = { 
          cancel: () => isHolding = false,
          timer: holdTimer
        };
        return;
      }
    }

    // 点击地板（仅当选中模型时）
    if (selectedModelRef.current) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        const cellCenter = getGridCellCenter(intersection, gridCellSize);
        const targetPosition = new THREE.Vector3(
          cellCenter.x,
          selectedModelRef.current.object.position.y,
          cellCenter.z
        );
        
        animateModelMove(selectedModelRef.current, targetPosition, () => {});
        
        // 移动完成后取消选中
        setTimeout(() => {
          setSelectedModel(null);
        }, 550);
      }
    }
    
    // 点击空白区域取消选中
    if (selectedModelRef.current) {
      setSelectedModel(null);
      floorHighlight.visible = false;
    }
    
    isMouseDown = true;
  }

  function onMouseUp() {
    if (currentHold) {
      clearTimeout(currentHold.timer);
      currentHold.cancel();
      currentHold = null;
    }
    isMouseDown = false;
  }

  // 注册事件监听器
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mouseleave', onMouseUp);

  // 返回清理函数
  return () => {
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mouseleave', onMouseUp);
  };
}

/**
 * 设置完整的交互（组合所有事件处理器）
 * @param {THREE.PerspectiveCamera} camera - 相机
 * @param {THREE.Scene} scene - 场景
 * @param {Array} models - 模型数组
 * @param {THREE.Mesh} floor - 地板对象
 * @param {number} gridCellSize - 网格单元大小
 * @param {Object} selectedModelRef - 选中模型引用
 * @param {Function} setSelectedModel - 设置选中模型的函数
 * @param {Object} focusState - 聚焦状态
 * @param {OrbitControls} cameraControls - 相机控制器
 * @param {number} holdDelay - 长按延迟时间
 * @param {HTMLElement} guiContainer - GUI容器
 * @returns {Object} 包含清理函数的对象
 */
function setupInteraction(
  camera,
  scene,
  models,
  floor,
  gridCellSize,
  selectedModelRef,
  setSelectedModel,
  focusState,
  cameraControls,
  holdDelay = 500,
  guiContainer = null
) {
  // 创建地板高亮指示器
  const floorHighlight = createFloorHighlight(gridCellSize, 0xffff00);
  scene.add(floorHighlight);
  
  // 分别注册不同的事件处理器
  const cleanupMouseMove = registerMouseMoveHandler(
    camera, scene, models, gridCellSize, floorHighlight, selectedModelRef
  );
  
  const cleanupMouseDown = registerMouseDownHandler(
    camera, scene, models, gridCellSize, floorHighlight, selectedModelRef,
    setSelectedModel, focusState, cameraControls, holdDelay, guiContainer
  );

  // 返回组合的清理函数
  return {
    cleanup: () => {
      cleanupMouseMove();
      cleanupMouseDown();
      scene.remove(floorHighlight);
    },
    floorHighlight: floorHighlight
  };
}

/**
 * 渲染循环
 * @param {THREE.WebGLRenderer} renderer - 渲染器
 * @param {THREE.Scene} scene - 场景
 * @param {THREE.PerspectiveCamera} camera - 相机
 * @param {OrbitControls} controls - 相机控制器
 * @param {Object} moveState - WASD移动状态
 * @param {Object} focusState - 聚焦状态
 * @param {Function} onCameraUpdate - 相机更新回调
 */
function animate(
  renderer,
  scene,
  camera,
  controls,
  moveState,
  focusState,
  onCameraUpdate
) {
  const time = performance.now();
  const delta = (time - (window.lastTime || time)) / 1000;
  window.lastTime = time;

  // 处理平滑聚焦
  if (focusState.focusPosition && focusState.focusTarget) {
    camera.position.lerp(focusState.focusPosition, focusState.lerpFactor);
    controls.target.lerp(focusState.focusTarget, focusState.lerpFactor);
    controls.update();

    if (camera.position.distanceTo(focusState.focusPosition) < 0.01 &&
        controls.target.distanceTo(focusState.focusTarget) < 0.01) {
      focusState.focusPosition = null;
      focusState.focusTarget = null;
    }
  }

  // 处理WASD移动
  if (!focusState.focusPosition) {
    const velocity = new THREE.Vector3();
    if (moveState.forward) velocity.z -= 1.0;
    if (moveState.back) velocity.z += 1.0;
    if (moveState.left) velocity.x -= 1.0;
    if (moveState.right) velocity.x += 1.0;
    if (moveState.up) velocity.y += 1.0;
    if (moveState.down) velocity.y -= 1.0;

    if (velocity.lengthSq() > 0) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      const right = new THREE.Vector3();
      right.crossVectors(camera.up, direction).normalize();
      const moveF = direction.clone().multiplyScalar(velocity.z * 5.0 * delta);
      const moveR = right.clone().multiplyScalar(velocity.x * 5.0 * delta);
      const moveV = new THREE.Vector3(0, velocity.y * 5.0 * delta, 0);
      camera.position.add(moveF).add(moveR).add(moveV);
      controls.target.add(moveF).add(moveR).add(moveV);
    }
  }

  if (onCameraUpdate) {
    const euler = new THREE.Euler();
    euler.setFromQuaternion(camera.quaternion);
    onCameraUpdate({ position: camera.position.clone(), rotation: euler });
  }

  if (!focusState.focusPosition) controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(() => animate(renderer, scene, camera, controls, moveState, focusState, onCameraUpdate));
}

// 📦 公共 API 函数
function rotateModelByIndex(models, modelIndex, degrees) {
  if (models[modelIndex]) {
    rotateModelX(models[modelIndex].object, degrees);
  }
}

function enablePointLightByIndex(models, modelIndex, enabled) {
  if (models[modelIndex]) {
    setPointLightEnabled(models[modelIndex], enabled);
  }
}

function getModelsArray(models) {
  return models;
}

// ✅ 统一 export
export {
  createPointLight,
  focusOnModel,
  createFloor,
  createGridOverlay,
  createFloorHighlight,
  loadModel,
  createOutline,
  rotateModelX,
  setPointLightEnabled,
  animateModelMove,
  getGridCellCenter,
  updateLighting,
  setupInteraction,
  animate,
  initGUI,
  initScene,
  rotateModelByIndex,
  enablePointLightByIndex,
  getModelsArray,
  setModelConfig,
  setSelectedModel
};