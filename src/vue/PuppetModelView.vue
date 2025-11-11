<script setup>
import log from '../log.js';
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import modelCache from '../utils/modelCache.js';

const props = defineProps({
  puppet: { type: Object, default: null },
});

const mountEl = ref(null);
const isLoading = ref(false); // 加载状态
let renderer = null;
let scene = null;
let camera = null;
let animationId = 0;
let currentModel = null;
let currentMixer = null;
let clock = new THREE.Clock();
let resizeObserver = null;
let dracoLoader = null;
let loadSequence = 0; // 防止旧的异步加载结果覆盖新的选择
let isInitialized = false; // 添加初始化状态标记

// 使用全局缓存，不受组件生命周期影响
if (!window.__GLTF_MEMORY_CACHE__) {
  window.__GLTF_MEMORY_CACHE__ = new Map();
  log('[PuppetModelView] Initialized global GLTF memory cache');
}
const gltfMemoryCache = window.__GLTF_MEMORY_CACHE__;

function initThreeIfNeeded() {
  if (isInitialized) return;

  const container = mountEl.value;
  if (!container) {
    log('[PuppetModelView] Container not ready for Three.js initialization');
    return; // 不再重试，由调用方控制时机
  }

  log('[PuppetModelView] Initializing Three.js...');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 1, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 初始化 Draco 解码器
  dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
  );
  dracoLoader.setCrossOrigin('anonymous');
  log('[PuppetModelView] Draco loader initialized:', !!dracoLoader);

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(3, 5, 2);

  // 添加额外的光源来照亮模型
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.8);
  dir2.position.set(-2, 3, 4);

  const pointLight = new THREE.PointLight(0xffffff, 1.0, 10);
  pointLight.position.set(0, 2, 3);

  scene.add(ambient, dir, dir2, pointLight);

  const onResize = () => {
    if (!container || !renderer) return;
    let w = container.clientWidth;
    let h = container.clientHeight;
    if (!w || !h) {
      const rect = container.getBoundingClientRect();
      w = rect.width || 200;
      h = rect.height || 200;
      if (!rect.width || !rect.height) {
        requestAnimationFrame(onResize);
        return;
      }
    }
    // 更新 canvas 的样式以匹配容器，避免在高 DPI / 大屏幕下出现位置或缩放偏差
    renderer.setSize(w, h, true);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  onResize();
  resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  // 早期多帧稳定：首 3 帧重复 resize，避免初始为 0 尺寸
  requestAnimationFrame(() => {
    onResize();
    requestAnimationFrame(() => {
      onResize();
      requestAnimationFrame(onResize);
    });
  });

  const animate = () => {
    if (!renderer || !scene || !camera) return;
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (currentMixer) currentMixer.update(delta);
    if (currentModel) currentModel.rotation.y += delta * 0.6;
    renderer.render(scene, camera);
  };
  animate();

  isInitialized = true;
  log(
    '[PuppetModelView] Three.js initialized successfully, container size:',
    container.clientWidth,
    'x',
    container.clientHeight
  );
}

function clearCurrentModel() {
  if (currentMixer) {
    currentMixer.stopAllAction();
    currentMixer = null;
  }
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(obj => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => {
            if (m.map) m.map.dispose();
            if (m) m.dispose && m.dispose();
          });
        } else if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          if (obj.material.dispose) obj.material.dispose();
        }
      }
    });
    currentModel = null;
  }
}

function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  object.position.sub(center);
  // 将对象居中到原点（移除手动偏移，手动偏移会在不同分辨率下表现不一致）
  object.position.add(new THREE.Vector3(0, 0, 0));

  // 适度缩放模型以适配视野（放大一些以在大屏上更明显）
  const shrink = 0.8;
  object.scale.multiplyScalar(shrink);

  const canvas = renderer?.domElement;
  const w = canvas ? canvas.clientWidth || canvas.width : 200;
  const h = canvas ? canvas.clientHeight || canvas.height : 200;
  const aspect = Math.max(1e-6, w / Math.max(1, h));
  const vFov = camera.fov * (Math.PI / 180);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const padding = 1.05; // 略减边距以让模型更靠近画面（放大效果更明显）
  const distV = size.y / 2 / Math.tan(vFov / 2);
  const distH = size.x / 2 / Math.tan(hFov / 2);
  const dist = padding * Math.max(distV, distH, 0.1);

  camera.position.set(0, 0, dist); // 相机位置也居中
  camera.lookAt(0, 0, 0);
}

async function loadPuppetModel(puppet) {
  if (!puppet) return;
  log('[PuppetModelView] Loading puppet:', puppet.name);

  // 设置加载状态
  isLoading.value = true;

  initThreeIfNeeded();
  clearCurrentModel();
  const token = ++loadSequence;

  // 使用全局模型缓存管理器
  log('[PuppetModelView] 使用全局模型缓存管理器');

  // 直接使用传入的 modelUrl（已被处理为完整URL）
  let modelUrl = puppet.modelUrl || '';
  log('[PuppetModelView] Original modelUrl:', modelUrl);
  log('[PuppetModelView] Puppet image:', puppet.image);
  log('[PuppetModelView] Puppet name:', puppet.name);
  log('[PuppetModelView] Puppet data:', puppet);

  // 如果 modelUrl 为空，且没有从 png 推导的逻辑
  // （StartGame 和 Warehouse 都确保 modelUrl 被正确设置）
  if (!modelUrl || modelUrl.trim() === '') {
    log('[PuppetModelView] No model URL found');
    return;
  }

  log('[PuppetModelView] Final Model URL:', modelUrl);

  try {
    log('[PuppetModelView] Starting to load:', modelUrl);
    log('[PuppetModelView] Cache status:', modelCache.getCacheStatus());

    // 使用全局模型缓存管理器加载模型
    const modelInstance = await modelCache.loadModel(modelUrl);
    log('[PuppetModelView] Model loaded from cache manager:', modelInstance);
    // 检查是否是最新的加载请求
    if (token !== loadSequence) {
      log('[PuppetModelView] Ignoring outdated load result for:', puppet.name);
      // 释放临时资源
      if (gltf && gltf.scene) {
        gltf.scene.traverse(obj => {
          if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => {
                if (m.map) m.map.dispose();
                if (m.dispose) m.dispose();
              });
            } else if (obj.material) {
              if (obj.material.map) obj.material.map.dispose();
              if (obj.material.dispose) obj.material.dispose();
            }
          }
        });
      }
      return;
    }

    log('[PuppetModelView] Applying model for:', puppet.name);

    // 确保 Three.js 场景已经初始化
    if (!scene) {
      log('[PuppetModelView] Scene not ready, initializing...');
      initThreeIfNeeded();
      // 等待场景初始化
      let waitCount = 0;
      while (!scene && waitCount < 40) {
        await new Promise(resolve => setTimeout(resolve, 50));
        waitCount++;
      }
      if (!scene) {
        log('[PuppetModelView] Scene initialization timeout');
        return;
      }
    }

    // 应用模型到场景
    currentModel = modelInstance;
    if (!currentModel) {
      log('[PuppetModelView] No model instance received');
      return;
    }
    scene.add(currentModel);
    // 注意：全局缓存管理器不保存动画信息，如果需要动画需要重新加载
    fitCameraToObject(currentModel);
    log(
      '[PuppetModelView] Model loaded successfully:',
      puppet.name,
      'Scene children:',
      scene.children.length
    );

    // 加载完成，清除加载状态
    isLoading.value = false;
  } catch (e) {
    log('[PuppetModelView] Load failed:', e);
    log('[PuppetModelView] Failed URL:', modelUrl);
    log('[PuppetModelView] Puppet data:', puppet);

    // 尝试不使用 Draco 解码器重新加载
    if (typeof e?.message === 'string' && e.message.includes('DRACOLoader')) {
      log('[PuppetModelView] Retrying without Draco decoder...');
      try {
        // 创建一个临时的fallback loader，不使用Draco
        const fallbackLoader = new GLTFLoader();
        fallbackLoader.setCrossOrigin('anonymous');
        // 不设置 Draco 解码器
        const fallbackGltf = await fallbackLoader.loadAsync(modelUrl);
        if (token === loadSequence) {
          currentModel = fallbackGltf.scene || fallbackGltf.scenes?.[0];
          if (currentModel) {
            scene.add(currentModel);
            if (fallbackGltf.animations && fallbackGltf.animations.length) {
              currentMixer = new THREE.AnimationMixer(currentModel);
              const action = currentMixer.clipAction(
                fallbackGltf.animations[0]
              );
              action.play();
            }
            fitCameraToObject(currentModel);
            log(
              '[PuppetModelView] Model loaded successfully without Draco:',
              puppet.name
            );
            return;
          }
        }
      } catch (fallbackError) {
        log('[PuppetModelView] Fallback load also failed:', fallbackError);
      }
    }

    // 只有在是最新请求时才显示错误立方体
    if (token === loadSequence) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8888ff });
      currentModel = new THREE.Mesh(geo, mat);
      scene.add(currentModel);
      fitCameraToObject(currentModel);
    }

    // 加载失败，清除加载状态
    isLoading.value = false;
  }
}

watch(
  () => props.puppet,
  async val => {
    // 等待下一个 tick 确保 DOM 已更新
    await nextTick();
    loadPuppetModel(val);
  },
  { immediate: false }
); // 改为 false，让 onMounted 先执行

onMounted(() => {
  log('[PuppetModelView] Component mounted');
  // 立即初始化 Three.js（同步）
  nextTick(() => {
    if (mountEl.value) {
      initThreeIfNeeded();
      // 初始化完成后异步加载初始模型（不阻塞）
      if (props.puppet) {
        // 使用 setTimeout 让文字内容先渲染
        setTimeout(() => {
          loadPuppetModel(props.puppet);
        }, 0);
      }
    }
  });
});

onBeforeUnmount(() => {
  log('[PuppetModelView] Cleaning up...');

  // 立即停止动画循环
  cancelAnimationFrame(animationId);

  // 立即清理当前模型（轻量级操作）
  clearCurrentModel();

  // 立即停止 ResizeObserver
  if (resizeObserver && mountEl.value) {
    try {
      resizeObserver.unobserve(mountEl.value);
    } catch (_) {}
  }

  // 缓存需要清理的对象
  const sceneToClean = scene;
  const rendererToClean = renderer;

  // 立即重置状态，让组件能快速卸载
  renderer = null;
  scene = null;
  camera = null;
  isInitialized = false;
  loadSequence = 0;

  // 将耗时的清理操作延迟到空闲时执行，不阻塞 UI
  const deferredCleanup = () => {
    log('[PuppetModelView] Starting deferred cleanup...');

    // 清理场景资源
    if (sceneToClean) {
      sceneToClean.traverse(obj => {
        if (obj.isMesh) {
          try {
            if (obj.geometry) obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => {
                try {
                  if (m.map) m.map.dispose();
                  if (m.dispose) m.dispose();
                } catch (_) {}
              });
            } else if (obj.material) {
              try {
                if (obj.material.map) obj.material.map.dispose();
                if (obj.material.dispose) obj.material.dispose();
              } catch (_) {}
            }
          } catch (_) {}
        }
      });
    }

    // 清理渲染器
    if (rendererToClean) {
      try {
        rendererToClean.dispose();
        rendererToClean.forceContextLoss && rendererToClean.forceContextLoss();
      } catch (_) {}
    }

    log('[PuppetModelView] Deferred cleanup completed');
  };

  // 使用 requestIdleCallback（如果支持），否则使用 setTimeout
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    window.requestIdleCallback(deferredCleanup, { timeout: 1000 });
  } else {
    setTimeout(deferredCleanup, 100);
  }

  log('[PuppetModelView] Quick cleanup completed, heavy cleanup deferred');
});
</script>

<template>
  <div class="model-wrapper">
    <div ref="mountEl" class="model-canvas"></div>
    <div v-if="isLoading" class="model-loading">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.model-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.model-canvas {
  width: 100%;
  height: 100%;
}

.model-canvas canvas {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.model-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
