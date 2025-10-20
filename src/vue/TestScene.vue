<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { messageQueue } from '../glue.js'
import TestPanel from './TestPanel.vue'

const container = ref(null)
const emit = defineEmits(['back'])

let scene, camera, renderer, controls
let models = []
let focusState = { focusPosition: null, focusTarget: null, lerpFactor: 0.08 }

onMounted(() => {
  initScene()
  setupMessageQueue()
  animate()
})

onBeforeUnmount(() => {
  if (renderer) {
    renderer.dispose()
  }
  if (controls) {
    controls.dispose()
  }
})

function initScene() {
  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  )
  camera.position.set(0, 5, 10)
  
  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)
  
  // 添加控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  
  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 10, 5)
  scene.add(directionalLight)
  
  // 创建地板
  const floorSize = 20
  const gridCellSize = 1
  const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize)
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333,
    side: THREE.DoubleSide 
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0
  scene.add(floor)
  
  // 添加网格
  const grid = new THREE.GridHelper(floorSize, floorSize / gridCellSize, 0x000000, 0x000000)
  grid.position.y = 0.01
  grid.material.opacity = 0.5
  grid.material.transparent = true
  scene.add(grid)
  
  // 创建测试用的立方体（代表单位）
  createTestUnits()
  
  // 窗口大小变化
  window.addEventListener('resize', onWindowResize)
}

function createTestUnits() {
  // 创建单位1（蓝色立方体）
  const geometry1 = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  const material1 = new THREE.MeshStandardMaterial({ color: 0x4488ff })
  const cube1 = new THREE.Mesh(geometry1, material1)
  cube1.position.set(0.5, 0.4, 0.5)
  scene.add(cube1)
  
  models.push({
    id: 1,
    object: cube1,
    name: '单位1'
  })
  
  // 创建单位2（红色立方体）
  const geometry2 = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  const material2 = new THREE.MeshStandardMaterial({ color: 0xff4444 })
  const cube2 = new THREE.Mesh(geometry2, material2)
  cube2.position.set(4.5, 0.4, 4.5)
  scene.add(cube2)
  
  models.push({
    id: 2,
    object: cube2,
    name: '单位2'
  })
  
  console.log('[TestScene] 创建了测试单位:', models.map(m => `ID=${m.id}`))
}

function setupMessageQueue() {
  // 状态指示器存储
  const stateIndicators = new Map() // { unitId: { canMove: Mesh, canAttack: Mesh } }
  const mapBlocks = new Map() // { 'x,y': Mesh } 地图块存储
  
  // 创建状态指示器
  function createIndicator(unitId, type, show) {
    const model = models.find(m => m.id === unitId)
    if (!model || !model.object) return
    
    const color = type === 'move' ? 0x00ff00 : 0xff0000 // 绿色/红色
    const radius = type === 'move' ? 0.8 : 1.0
    
    // 获取或创建指示器容器
    if (!stateIndicators.has(unitId)) {
      stateIndicators.set(unitId, {})
    }
    const indicators = stateIndicators.get(unitId)
    
    // 移除旧指示器
    if (indicators[type]) {
      scene.remove(indicators[type])
      indicators[type].geometry.dispose()
      indicators[type].material.dispose()
      indicators[type] = null
    }
    
    // 创建新指示器
    if (show) {
      const geometry = new THREE.RingGeometry(radius - 0.1, radius, 32)
      const material = new THREE.MeshBasicMaterial({ 
        color, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      })
      const ring = new THREE.Mesh(geometry, material)
      ring.rotation.x = -Math.PI / 2 // 平放在地面
      ring.position.copy(model.object.position)
      ring.position.y = 0.01 // 稍微抬高避免z-fighting
      scene.add(ring)
      indicators[type] = ring
    }
  }
  
  // 设置场景上下文
  messageQueue.setSceneContext({
    scene,
    camera,
    controls,
    models,
    gridCellSize: 1.0,
    focusState,
    focusOnModel: focusOnModelFunc,
    onDisplayCanMove: (unitId, canMove) => {
      console.log(`[TestScene] 显示可移动状态: id=${unitId}, show=${canMove}`)
      createIndicator(unitId, 'move', canMove)
    },
    onDisplayCanAttack: (unitId, canAttack) => {
      console.log(`[TestScene] 显示可攻击状态: id=${unitId}, show=${canAttack}`)
      createIndicator(unitId, 'attack', canAttack)
    },
    onClearState: (unitId) => {
      console.log(`[TestScene] 清除状态: id=${unitId}`)
      // 清除该单位的所有指示器
      if (stateIndicators.has(unitId)) {
        const indicators = stateIndicators.get(unitId)
        if (indicators.move) {
          scene.remove(indicators.move)
          indicators.move.geometry.dispose()
          indicators.move.material.dispose()
          indicators.move = null
        }
        if (indicators.attack) {
          scene.remove(indicators.attack)
          indicators.attack.geometry.dispose()
          indicators.attack.material.dispose()
          indicators.attack = null
        }
        stateIndicators.delete(unitId)
      }
    },
    onPutMapBlock: (position) => {
      console.log(`[TestScene] 放置地图块: position=${position}`)
      const key = `${position[0]},${position[1]}`
      
      // 如果已存在，先移除
      if (mapBlocks.has(key)) {
        const block = mapBlocks.get(key)
        scene.remove(block)
        block.geometry.dispose()
        block.material.dispose()
      }
      
      // 创建地图块（灰色立方体）
      const geometry = new THREE.BoxGeometry(0.9, 0.1, 0.9)
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 })
      const block = new THREE.Mesh(geometry, material)
      block.position.set(position[0], 0.05, position[1])
      scene.add(block)
      mapBlocks.set(key, block)
    },
    onSetMoveBlock: (position) => {
      console.log(`[TestScene] 设置可移动块: position=${position}`)
      const key = `${position[0]},${position[1]}`
      const block = mapBlocks.get(key)
      if (block) {
        block.material.color.setHex(0x00ff00) // 绿色
      }
    },
    onSetAttackBlock: (position) => {
      console.log(`[TestScene] 设置可攻击块: position=${position}`)
      const key = `${position[0]},${position[1]}`
      const block = mapBlocks.get(key)
      if (block) {
        block.material.color.setHex(0xff0000) // 红色
      }
    },
    onClearBlock: (position) => {
      console.log(`[TestScene] 清除地图块: position=${position}`)
      const key = `${position[0]},${position[1]}`
      const block = mapBlocks.get(key)
      if (block) {
        scene.remove(block)
        block.geometry.dispose()
        block.material.dispose()
        mapBlocks.delete(key)
      }
    },
    animateModelMove: (model, targetPosition, onComplete) => {
      if (!model || !model.object) return
      
      model.isMoving = true
      const startPosition = model.object.position.clone()
      const target = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)
      const duration = 500
      const startTime = performance.now()
      
      function animate() {
        if (!model || !model.object) {
          if (onComplete) onComplete()
          return
        }
        
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 2)
        
        model.object.position.lerpVectors(startPosition, target, easeProgress)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          model.object.position.copy(target)
          model.isMoving = false
          if (onComplete) onComplete()
        }
      }
      
      animate()
    }
  })
  
  console.log('[TestScene] 消息队列已配置')
}

function focusOnModelFunc(modelObject, camera, controls) {
  // 计算聚焦参数
  const worldOrigin = new THREE.Vector3(0, 0, 0)
  modelObject.localToWorld(worldOrigin)

  const box = new THREE.Box3().setFromObject(modelObject)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  
  const fov = camera.fov * (Math.PI / 180)
  let distance = maxDim / (2 * Math.tan(fov / 2))
  distance = Math.max(distance * 1.5, 2)

  const dir = new THREE.Vector3()
  camera.getWorldDirection(dir)
  dir.y = 0
  dir.normalize()
  
  const targetPosition = new THREE.Vector3().copy(worldOrigin).sub(dir.clone().multiplyScalar(distance))

  return {
    focusPosition: targetPosition.clone(),
    focusTarget: worldOrigin.clone(),
    lerpFactor: 0.08
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function animate() {
  requestAnimationFrame(animate)
  
  // 处理聚焦
  if (focusState.focusPosition && focusState.focusTarget) {
    camera.position.lerp(focusState.focusPosition, focusState.lerpFactor)
    controls.target.lerp(focusState.focusTarget, focusState.lerpFactor)
    controls.update()
    
    if (camera.position.distanceTo(focusState.focusPosition) < 0.01 &&
        controls.target.distanceTo(focusState.focusTarget) < 0.01) {
      focusState.focusPosition = null
      focusState.focusTarget = null
    }
  } else {
    controls.update()
  }
  
  renderer.render(scene, camera)
}

function goBack() {
  emit('back')
}
</script>

<template>
  <div class="test-scene">
    <div ref="container" class="scene-container"></div>
    
    <!-- 返回按钮 -->
    <button class="back-btn" @click="goBack" title="返回主菜单">
      ← 返回
    </button>
    
    <!-- 测试面板 -->
    <TestPanel />
    
    <!-- 提示信息 -->
    <div class="info-panel">
      <h3>3D测试场景</h3>
      <p>🟦 蓝色立方体 = 单位1 (ID: 1)</p>
      <p>🟥 红色立方体 = 单位2 (ID: 2)</p>
      <p>💡 点击右下角 🧪 按钮测试消息</p>
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
  z-index: 10001;
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
  z-index: 10001;
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

