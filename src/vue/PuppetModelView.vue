<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { getAssetUrl, loadResourceWithCache } from '../utils/resourceLoader.js'

const props = defineProps({
  puppet: { type: Object, default: null }
})

const mountEl = ref(null)
const isLoading = ref(false)  // 加载状态
let renderer = null
let scene = null
let camera = null
let animationId = 0
let currentModel = null
let currentMixer = null
let clock = new THREE.Clock()
let resizeObserver = null
let dracoLoader = null
let loadSequence = 0 // 防止旧的异步加载结果覆盖新的选择
let isInitialized = false // 添加初始化状态标记

// 使用全局缓存，不受组件生命周期影响
if (!window.__GLTF_MEMORY_CACHE__) {
  window.__GLTF_MEMORY_CACHE__ = new Map()
  console.log('[PuppetModelView] Initialized global GLTF memory cache')
}
const gltfMemoryCache = window.__GLTF_MEMORY_CACHE__

function initThreeIfNeeded() {
  if (isInitialized) return
  
  const container = mountEl.value
  if (!container) {
    console.warn('[PuppetModelView] Container not ready for Three.js initialization')
    return  // 不再重试，由调用方控制时机
  }
  
  console.log('[PuppetModelView] Initializing Three.js...')
  
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
  camera.position.set(0, 1, 3)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // 初始化 Draco 解码器
  dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  dracoLoader.setCrossOrigin('anonymous')
  console.log('[PuppetModelView] Draco loader initialized:', !!dracoLoader)

  container.innerHTML = ''
  container.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 1.2)
  const dir = new THREE.DirectionalLight(0xffffff, 1.5)
  dir.position.set(3, 5, 2)
  
  // 添加额外的光源来照亮模型
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.8)
  dir2.position.set(-2, 3, 4)
  
  const pointLight = new THREE.PointLight(0xffffff, 1.0, 10)
  pointLight.position.set(0, 2, 3)
  
  scene.add(ambient, dir, dir2, pointLight)

  const onResize = () => {
    if (!container || !renderer) return
    let w = container.clientWidth
    let h = container.clientHeight
    if (!w || !h) {
      const rect = container.getBoundingClientRect()
      w = rect.width || 200
      h = rect.height || 200
      if (!rect.width || !rect.height) {
        requestAnimationFrame(onResize)
        return
      }
    }
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(1, h)
    camera.updateProjectionMatrix()
  }
  onResize()
  resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(container)

  // 早期多帧稳定：首 3 帧重复 resize，避免初始为 0 尺寸
  requestAnimationFrame(() => {
    onResize()
    requestAnimationFrame(() => {
      onResize()
      requestAnimationFrame(onResize)
    })
  })

  const animate = () => {
    if (!renderer || !scene || !camera) return
    animationId = requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (currentMixer) currentMixer.update(delta)
    if (currentModel) currentModel.rotation.y += delta * 0.6
    renderer.render(scene, camera)
  }
  animate()
  
  isInitialized = true
  console.log('[PuppetModelView] Three.js initialized successfully, container size:', container.clientWidth, 'x', container.clientHeight)
}

function clearCurrentModel() {
  if (currentMixer) { currentMixer.stopAllAction(); currentMixer = null }
  if (currentModel) {
    scene.remove(currentModel)
    currentModel.traverse(obj => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => { if (m.map) m.map.dispose(); if (m) m.dispose && m.dispose() })
        } else if (obj.material) {
          if (obj.material.map) obj.material.map.dispose()
          if (obj.material.dispose) obj.material.dispose()
        }
      }
    })
    currentModel = null
  }
}

function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  object.position.sub(center)

  // 调整模型位置，使其更居中
  const offsetX = 0  // 移除X轴偏移，使模型居中
  const offsetY = 0  // 移除Y轴偏移，使模型居中
  const offsetZ = 0   // 移除Z轴偏移，使模型居中
  object.position.add(new THREE.Vector3(offsetX, offsetY, offsetZ))

  const shrink = 0.6  // 稍微增大模型尺寸
  object.scale.multiplyScalar(shrink)

  const canvas = renderer?.domElement
  const w = canvas ? canvas.clientWidth || canvas.width : 200
  const h = canvas ? canvas.clientHeight || canvas.height : 200
  const aspect = Math.max(1e-6, w / Math.max(1, h))
  const vFov = camera.fov * (Math.PI / 180)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  const padding = 1.2  // 稍微增加边距
  const distV = (size.y / 2) / Math.tan(vFov / 2)
  const distH = (size.x / 2) / Math.tan(hFov / 2)
  const dist = padding * Math.max(distV, distH, 0.1)

  camera.position.set(0, 0, dist)  // 相机位置也居中
  camera.lookAt(0, 0, 0)
}

async function loadPuppetModel(puppet) {
  if (!puppet) return
  console.log('[PuppetModelView] Loading puppet:', puppet.name)
  
  // 设置加载状态
  isLoading.value = true
  
  initThreeIfNeeded()
  clearCurrentModel()
  const token = ++loadSequence

  const loader = new GLTFLoader()
  loader.setCrossOrigin('anonymous')
  
  // 确保 Draco 解码器存在
  if (!dracoLoader) {
    console.log('[PuppetModelView] Creating Draco loader...')
    dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    dracoLoader.setCrossOrigin('anonymous')
  }
  
  loader.setDRACOLoader(dracoLoader)
  console.log('[PuppetModelView] Draco loader set:', !!dracoLoader)

  let modelUrl = puppet.modelUrl || ''
  console.log('[PuppetModelView] Original modelUrl:', modelUrl)
  console.log('[PuppetModelView] Puppet image:', puppet.image)
  
  if (!modelUrl && puppet.image && /.webp($|\?)/i.test(puppet.image)) {
    modelUrl = puppet.image.replace(/\.webp(\?.*)?$/i, '.glb')
    console.log('[PuppetModelView] Generated modelUrl from image:', modelUrl)
  }
  if (modelUrl && !/^https?:\/\//i.test(modelUrl) && !modelUrl.startsWith('/assets/')) {
    const originalUrl = modelUrl
    modelUrl = getAssetUrl(modelUrl)
    console.log('[PuppetModelView] Converted URL:', originalUrl, '->', modelUrl)
  }
  console.log('[PuppetModelView] Model URL:', modelUrl)
  if (!modelUrl) {
    console.log('[PuppetModelView] No model URL found')
    return
  }

  try {
    console.log('[PuppetModelView] Starting to load:', modelUrl)
    console.log('[PuppetModelView] Memory cache size:', gltfMemoryCache.size, 'entries')
    console.log('[PuppetModelView] Memory cache has this URL?', gltfMemoryCache.has(modelUrl))
    
    // 首先检查内存缓存
    let gltf
    if (gltfMemoryCache.has(modelUrl)) {
      console.log('[PuppetModelView] Loading from memory cache (instant):', modelUrl)
      const cachedGltf = gltfMemoryCache.get(modelUrl)
      // 克隆场景以避免共享引用
      gltf = {
        scene: cachedGltf.scene.clone(true),
        scenes: cachedGltf.scenes,
        animations: cachedGltf.animations,
        cameras: cachedGltf.cameras,
        asset: cachedGltf.asset,
        parser: cachedGltf.parser,
        userData: cachedGltf.userData
      }
      console.log('[PuppetModelView] GLTF cloned from memory cache:', gltf)
    } else {
      // 内存缓存未命中，从 Cache Storage 或网络加载
      try {
        console.log('[PuppetModelView] Checking Cache Storage for:', modelUrl)
        const cachedResponse = await loadResourceWithCache(modelUrl)
        if (cachedResponse) {
          console.log('[PuppetModelView] Loading from Cache Storage:', modelUrl)
          // 从缓存的响应创建 ArrayBuffer
          const arrayBuffer = await cachedResponse.arrayBuffer()
          // 使用 GLTFLoader 的 parse 方法直接解析
          gltf = await new Promise((resolve, reject) => {
            loader.parse(arrayBuffer, '', resolve, reject)
          })
          console.log('[PuppetModelView] GLTF loaded from Cache Storage:', gltf)
          // 保存到内存缓存
          gltfMemoryCache.set(modelUrl, gltf)
          console.log('[PuppetModelView] GLTF saved to memory cache')
        } else {
          throw new Error('No cached response available')
        }
      } catch (cacheError) {
        console.log('[PuppetModelView] Cache miss, loading from network:', modelUrl)
        // 缓存失败，直接从网络加载
        gltf = await loader.loadAsync(modelUrl)
        console.log('[PuppetModelView] GLTF loaded from network:', gltf)
        // 保存到内存缓存
        gltfMemoryCache.set(modelUrl, gltf)
        console.log('[PuppetModelView] GLTF saved to memory cache')
      }
    }
    // 检查是否是最新的加载请求
    if (token !== loadSequence) {
      console.log('[PuppetModelView] Ignoring outdated load result for:', puppet.name)
      // 释放临时资源
      if (gltf && gltf.scene) {
        gltf.scene.traverse(obj => {
          if (obj.isMesh) {
            if (obj.geometry) obj.geometry.dispose()
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => { if (m.map) m.map.dispose(); if (m.dispose) m.dispose() })
            } else if (obj.material) {
              if (obj.material.map) obj.material.map.dispose()
              if (obj.material.dispose) obj.material.dispose()
            }
          }
        })
      }
      return
    }
    
    console.log('[PuppetModelView] Applying model for:', puppet.name)
    
    // 确保 Three.js 场景已经初始化
    if (!scene) {
      console.log('[PuppetModelView] Scene not ready, initializing...')
      initThreeIfNeeded()
      // 等待场景初始化
      let waitCount = 0
      while (!scene && waitCount < 40) {
        await new Promise(resolve => setTimeout(resolve, 50))
        waitCount++
      }
      if (!scene) {
        console.error('[PuppetModelView] Scene initialization timeout')
        return
      }
    }
    
    currentModel = gltf.scene || gltf.scenes?.[0]
    if (!currentModel) {
      console.error('[PuppetModelView] No scene found in GLTF')
      return
    }
    scene.add(currentModel)
    if (gltf.animations && gltf.animations.length) {
      currentMixer = new THREE.AnimationMixer(currentModel)
      const action = currentMixer.clipAction(gltf.animations[0])
      action.play()
    }
    fitCameraToObject(currentModel)
    console.log('[PuppetModelView] Model loaded successfully:', puppet.name, 'Scene children:', scene.children.length)
    
    // 加载完成，清除加载状态
    isLoading.value = false
  } catch (e) {
    console.error('[PuppetModelView] Load failed:', e)
    console.error('[PuppetModelView] Failed URL:', modelUrl)
    console.error('[PuppetModelView] Puppet data:', puppet)
    
    // 尝试不使用 Draco 解码器重新加载
    if (e.message.includes('DRACOLoader')) {
      console.log('[PuppetModelView] Retrying without Draco decoder...')
      try {
        const fallbackLoader = new GLTFLoader()
        fallbackLoader.setCrossOrigin('anonymous')
        // 不设置 Draco 解码器
        const gltf = await fallbackLoader.loadAsync(modelUrl)
        if (token === loadSequence) {
          currentModel = gltf.scene || gltf.scenes?.[0]
          if (currentModel) {
            scene.add(currentModel)
            if (gltf.animations && gltf.animations.length) {
              currentMixer = new THREE.AnimationMixer(currentModel)
              const action = currentMixer.clipAction(gltf.animations[0])
              action.play()
            }
            fitCameraToObject(currentModel)
            console.log('[PuppetModelView] Model loaded successfully without Draco:', puppet.name)
            return
          }
        }
      } catch (fallbackError) {
        console.error('[PuppetModelView] Fallback load also failed:', fallbackError)
      }
    }
    
    // 只有在是最新请求时才显示错误立方体
    if (token === loadSequence) {
      const geo = new THREE.BoxGeometry(1, 1, 1)
      const mat = new THREE.MeshStandardMaterial({ color: 0x8888ff })
      currentModel = new THREE.Mesh(geo, mat)
      scene.add(currentModel)
      fitCameraToObject(currentModel)
    }
    
    // 加载失败，清除加载状态
    isLoading.value = false
  }
}

watch(() => props.puppet, async (val) => {
  // 等待下一个 tick 确保 DOM 已更新
  await nextTick()
  loadPuppetModel(val)
}, { immediate: false })  // 改为 false，让 onMounted 先执行

onMounted(() => {
  console.log('[PuppetModelView] Component mounted')
  // 立即初始化 Three.js（同步）
  nextTick(() => {
    if (mountEl.value) {
      initThreeIfNeeded()
      // 初始化完成后异步加载初始模型（不阻塞）
      if (props.puppet) {
        // 使用 setTimeout 让文字内容先渲染
        setTimeout(() => {
          loadPuppetModel(props.puppet)
        }, 0)
      }
    }
  })
})

onBeforeUnmount(() => {
  console.log('[PuppetModelView] Cleaning up...')
  cancelAnimationFrame(animationId)
  clearCurrentModel()
  if (scene) {
    scene.traverse(obj => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => { if (m.map) m.map.dispose(); if (m.dispose) m.dispose() })
        } else if (obj.material) {
          if (obj.material.map) obj.material.map.dispose()
          if (obj.material.dispose) obj.material.dispose()
        }
      }
    })
  }
  if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss() }
  if (resizeObserver && mountEl.value) resizeObserver.unobserve(mountEl.value)
  
  // 重置所有状态
  renderer = null; scene = null; camera = null
  isInitialized = false
  loadSequence = 0
  console.log('[PuppetModelView] Cleanup completed')
})
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
  to { transform: rotate(360deg); }
}
</style>


