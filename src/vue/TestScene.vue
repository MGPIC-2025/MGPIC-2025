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

onMounted(async () => {
  initScene()
  setupMessageQueue()
  
  // 默认切换到EventLoop模式（隐藏测试模型）
  const { messageQueue } = await import('../messageQueue.js')
  if (messageQueue.sceneContext?.setTestMode) {
    messageQueue.sceneContext.setTestMode('eventloop')
  }
  
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
  
  // 创建测试用的立方体（用于后端测试，ID=1和2）
  createTestUnits()
  console.log('[TestScene] 场景初始化完成')
  console.log('[TestScene] - 蓝/红立方体(ID=1,2)用于"后端测试"')
  console.log('[TestScene] - EventLoop测试会动态创建新模型')
  
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
    name: '单位1',
    type: 'test'  // ✅ 标记为测试模型
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
    name: '单位2',
    type: 'test'  // ✅ 标记为测试模型
  })
  
  console.log('[TestScene] 创建了测试单位:', models.map(m => `ID=${m.id}`))
  
  // 默认显示测试模型（向后兼容）
  // 当切换到EventLoop模式时会隐藏它们
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
  
  // 创建地板块缓存（用于显示移动/攻击范围）
  const floorBlocks = new Map() // key: "x,y", value: THREE.Mesh
  
  // 高亮选中的铜偶
  let selectedCopperId = null
  const highlightSelectedCopper = (copperId) => {
    // 清除旧的高亮
    models.forEach(model => {
      if (model.type === 'copper') {
        model.object.scale.set(1, 1, 1)
        if (model.object.material) {
          model.object.material.emissive?.setHex(0x000000)
        }
      }
    })
    
    // 添加新的高亮
    if (copperId !== null) {
      const model = models.find(m => m.id === copperId)
      if (model) {
        model.object.scale.set(1.1, 1.1, 1.1)
        if (model.object.material) {
          model.object.material.emissive?.setHex(0xffff00)
          model.object.material.emissiveIntensity = 0.3
        }
        selectedCopperId = copperId
        console.log(`[TestScene] ✨ 高亮铜偶: ${model.name} (ID=${copperId})`)
      }
    } else {
      selectedCopperId = null
    }
  }
  
  // 创建/更新地板块
  const createOrUpdateFloorBlock = (position, color, type) => {
    const key = `${position[0]},${position[1]}`
    
    // 如果已存在，更新颜色
    if (floorBlocks.has(key)) {
      const block = floorBlocks.get(key)
      block.material.color.setHex(color)
      block.userData.type = type
      return
    }
    
    // 创建新的地板块
    const geometry = new THREE.PlaneGeometry(0.9, 0.9)
    const material = new THREE.MeshBasicMaterial({ 
      color, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    })
    const block = new THREE.Mesh(geometry, material)
    block.rotation.x = -Math.PI / 2
    // ✅ 以(0,0)为中心，地图范围 -7 到 7
    block.position.set(
      (position[0] - 7) * 1.0,
      0.08, // ✅ 高于地图块（0.05），确保可见
      (position[1] - 7) * 1.0
    )
    block.userData = { type, position }
    scene.add(block)
    floorBlocks.set(key, block)
  }
  
  // 清除地板块
  const clearFloorBlock = (position) => {
    const key = `${position[0]},${position[1]}`
    const block = floorBlocks.get(key)
    if (block) {
      scene.remove(block)
      floorBlocks.delete(key)
    }
  }
  
  // 清除所有特定类型的地板块
  const clearFloorBlocksByType = (type) => {
    let count = 0
    floorBlocks.forEach((block, key) => {
      if (block.userData.type === type) {
        scene.remove(block)
        floorBlocks.delete(key)
        count++
      }
    })
    if (count > 0) {
      console.log(`[TestScene] 清除了${count}个${type}地板块`)
    }
  }
  
  // 创建攻击特效（闪光）
  const createAttackEffect = (attackerId, targetPosition) => {
    const attacker = models.find(m => m.id === attackerId)
    if (!attacker) return
    
    // 攻击者闪光
    const originalEmissive = attacker.object.material.emissive?.getHex() || 0x000000
    const originalIntensity = attacker.object.material.emissiveIntensity || 0
    
    if (attacker.object.material.emissive) {
      attacker.object.material.emissive.setHex(0xff0000) // 红色闪光
      attacker.object.material.emissiveIntensity = 0.8
      
      // 500ms后恢复
      setTimeout(() => {
        if (attacker.object?.material?.emissive) {
          attacker.object.material.emissive.setHex(originalEmissive)
          attacker.object.material.emissiveIntensity = originalIntensity
        }
      }, 500)
    }
    
    // 攻击线特效（从攻击者到目标）
    const attackerPos = attacker.object.position
    // ✅ 以(0,0)为中心，地图范围 -7 到 7
    const targetPos = new THREE.Vector3(
      (targetPosition[0] - 7) * 1.0,
      0.4,
      (targetPosition[1] - 7) * 1.0
    )
    
    // 创建闪电线
    const points = [attackerPos, targetPos]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ 
      color: 0xff4444,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    })
    const line = new THREE.Line(geometry, material)
    scene.add(line)
    
    // 创建爆炸圆环
    const ringGeometry = new THREE.RingGeometry(0.2, 0.4, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.copy(targetPos)
    ring.position.y = 0.5
    scene.add(ring)
    
    // 动画：线和圆环淡出
    const startTime = performance.now()
    const duration = 300
    
    function animateEffect() {
      const elapsed = performance.now() - startTime
      const progress = elapsed / duration
      
      if (progress < 1) {
        // 淡出
        const opacity = 1 - progress
        if (material) material.opacity = opacity
        if (ringMaterial) ringMaterial.opacity = opacity
        
        // 圆环扩大
        ring.scale.set(1 + progress * 2, 1 + progress * 2, 1)
        
        requestAnimationFrame(animateEffect)
      } else {
        // 清除
        scene.remove(line)
        scene.remove(ring)
        geometry.dispose()
        material.dispose()
        ringGeometry.dispose()
        ringMaterial.dispose()
      }
    }
    
    animateEffect()
    console.log(`[TestScene] 💥 攻击特效: 攻击者ID=${attackerId} → 目标位置${targetPosition}`)
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
    highlightSelectedCopper,
    floorBlocks,
    createAttackEffect, // 攻击特效
    // 🔥 地板块操作
    onSetMoveBlock: (position) => {
      // ✅ 过滤掉地图外的位置（地图范围：0-14）
      if (position[0] < 0 || position[0] > 14 || position[1] < 0 || position[1] > 14) {
        console.warn(`[TestScene] ⚠️ 忽略地图外的移动范围: ${position}`)
        return
      }
      createOrUpdateFloorBlock(position, 0x44ff44, 'move')
      console.log(`[TestScene] 🟢 显示移动范围: ${position}`)
    },
    onSetAttackBlock: (position) => {
      // ✅ 过滤掉地图外的位置（地图范围：0-14）
      if (position[0] < 0 || position[0] > 14 || position[1] < 0 || position[1] > 14) {
        console.warn(`[TestScene] ⚠️ 忽略地图外的攻击范围: ${position}`)
        return
      }
      createOrUpdateFloorBlock(position, 0xff4444, 'attack')
      console.log(`[TestScene] 🔴 显示攻击范围: ${position}`)
    },
    onClearBlock: (position) => {
      clearFloorBlock(position)
    },
    // 🔥 添加：从后端消息创建铜偶模型
    onSetCopper: (id, position, copper) => {
      console.log(`[TestScene] 创建铜偶模型: id=${copper.id}, pos=${position}`)
      
      // 检查是否已存在
      const existing = models.find(m => m.id === copper.id)
      if (existing) {
        console.log(`[TestScene] 铜偶ID=${copper.id}已存在，跳过`)
        return
      }
      
      // 创建立方体代表铜偶（不同颜色区分类型）
      const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)
      let color = 0x4488ff // 默认蓝色
      
      // 根据铜偶类型选择颜色
      switch(copper.copper.copper_type) {
        case 'IronWall': color = 0x888888; break;    // 灰色-防御
        case 'Arcanist': color = 0xff4488; break;    // 粉红-法师
        case 'Mechanic': color = 0x44ff88; break;    // 绿色-机械
        case 'Resonator': color = 0xffaa44; break;   // 橙色-共鸣
        case 'CraftsMan': color = 0x4444ff; break;   // 蓝色-工匠
      }
      
      const material = new THREE.MeshStandardMaterial({ color })
      const cube = new THREE.Mesh(geometry, material)
      
      // ✅ 以(0,0)为中心，地图范围 -7 到 7
      cube.position.set(
        (position[0] - 7) * 1.0,
        0.4,
        (position[1] - 7) * 1.0
      )
      
      scene.add(cube)
      
      // 添加到models数组
      const modelData = {
        id: copper.id,           // 使用实际的铜偶ID
        object: cube,
        name: copper.copper.copper_info?.name || `Copper_${copper.id}`,
        type: 'copper'
      }
      models.push(modelData)
      
      console.log(`[TestScene] ✅ 铜偶创建成功: ${modelData.name} (ID=${copper.id})`)
    },
    // 🔥 添加：从后端消息创建敌人模型
    onSetEnemy: (id, position, enemy) => {
      console.log(`[TestScene] 创建敌人模型: id=${enemy.id}, pos=${position}`)
      
      // 类似实现...
      const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }) // 红色-敌人
      const cube = new THREE.Mesh(geometry, material)
      
      // ✅ 以(0,0)为中心，地图范围 -7 到 7
      cube.position.set(
        (position[0] - 7) * 1.0,
        0.4,
        (position[1] - 7) * 1.0
      )
      
      scene.add(cube)
      
      models.push({
        id: enemy.id,
        object: cube,
        name: `Enemy_${enemy.id}`,
        type: 'enemy'
      })
      
      console.log(`[TestScene] ✅ 敌人创建成功: Enemy_${enemy.id}`)
    },
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
      // console.log(`[TestScene] 放置地图块: position=${position}`)  // 日志太多，已注释
      const key = `${position[0]},${position[1]}`
      
      // 如果已存在，先移除
      if (mapBlocks.has(key)) {
        const block = mapBlocks.get(key)
        scene.remove(block)
        block.geometry.dispose()
        block.material.dispose()
      }
      
      // 创建地图块（灰色扁平立方体）
      const geometry = new THREE.BoxGeometry(0.9, 0.05, 0.9)  // ⭐ 高度从0.1降到0.05（更扁）
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 })
      const block = new THREE.Mesh(geometry, material)
      
      // ✅ 以(0,0)为中心，地图范围 -7 到 7
      block.position.set(
        (position[0] - 7) * 1.0,  // 格子中心
        0.025,                     // ⭐ 地板中心（高度0.05的一半）
        (position[1] - 7) * 1.0   // 格子中心
      )
      
      scene.add(block)
      mapBlocks.set(key, block)
    },
    // ✅ 移动/攻击范围使用独立的 floorBlocks 系统（在前面已定义）
    // onSetMoveBlock, onSetAttackBlock, onClearBlock 在前面的 messageQueue.setSceneContext 中已定义
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
    },
    // ✅ 模式切换：控制测试模型和EventLoop模型的显示
    setTestMode: (mode) => {
      console.log(`[TestScene] 切换到${mode === 'backend' ? '后端测试' : 'EventLoop测试'}模式`)
      
      models.forEach(model => {
        if (model.type === 'test') {
          // 测试模型：后端测试和自定义测试时显示
          model.object.visible = (mode === 'backend')
        } else if (model.type === 'copper' || model.type === 'enemy') {
          // EventLoop模型：EventLoop测试时显示
          model.object.visible = (mode === 'eventloop')
        }
      })
      
      console.log(`[TestScene] 已${mode === 'backend' ? '显示' : '隐藏'}测试模型，${mode === 'eventloop' ? '显示' : '隐藏'}EventLoop模型`)
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
      <p style="color: #ffd700; font-weight: 600;">💡 两种测试模式：</p>
      
      <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
        <p style="font-weight: 600;">📌 后端测试（旧）</p>
        <p style="font-size: 12px;">🟦 蓝色立方体 = ID:1</p>
        <p style="font-size: 12px;">🟥 红色立方体 = ID:2</p>
      </div>
      
      <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
        <p style="font-weight: 600;">🎮 EventLoop测试（新）</p>
        <p style="font-size: 12px;">1. 点击🧪 → EventLoop</p>
        <p style="font-size: 12px;">2. 点击"🎮 游戏开始"</p>
        <p style="font-size: 12px;">3. 会创建3个新铜偶：</p>
        <p style="font-size: 11px;">⬜ 灰色=IronWall 🟪 粉红=Arcanist 🟦 蓝色=CraftsMan</p>
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

