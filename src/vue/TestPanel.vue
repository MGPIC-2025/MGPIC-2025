<script setup>
import { ref } from 'vue'

const emit = defineEmits(['enter-scene'])

// 测试函数列表
const testFunctions = ref([
  { name: '简单移动', key: 'test_simple_move', desc: '移动单位到(2,2)并改变朝向' },
  { name: '显示状态', key: 'test_display_states', desc: '显示可移动和可攻击圈圈' },
  { name: '清除状态', key: 'test_clear_states', desc: '清除所有状态指示器' },
  { name: '移除单位', key: 'test_remove', desc: '移除ID为2的单位（带淡出动画）' },
  { name: '聚焦单位', key: 'test_camera_control', desc: '相机聚焦到单位1' },
  { name: '复位视角', key: 'test_camera_reset', desc: '相机复位到默认位置' },
  { name: '地图块', key: 'test_blocks', desc: '放置并设置地图块状态' },
  { name: '完整序列', key: 'test_sequence', desc: '演示完整的交互流程（8步）' },
])

const isOpen = ref(false)
const executing = ref(null)
const showCustom = ref(false)

// 自定义测试参数
const customParams = ref({
  moveId: 1,
  moveX: 0,
  moveZ: 0,
  rotateId: 1,
  rotateDir: 'PositiveX',
  removeId: 2,
})

const directions = ['PositiveX', 'NegativeX', 'PositiveY', 'NegativeY']

async function runTest(testKey) {
  try {
    executing.value = testKey
    console.log(`[TestPanel] 执行后端测试: ${testKey}`)
    
    // 动态导入后端编译的 main.js
    const backend = await import('../main.js')
    const testFunc = backend[testKey]
    
    if (testFunc && typeof testFunc === 'function') {
      testFunc()
      console.log(`[TestPanel] 后端测试执行成功: ${testKey}`)
    } else {
      console.error(`[TestPanel] 后端测试函数不存在: ${testKey}`)
      console.log('[TestPanel] 可用的后端函数:', Object.keys(backend).filter(k => k.startsWith('test_')))
    }
  } catch (error) {
    console.error(`[TestPanel] 后端测试执行失败:`, error)
    console.error('[TestPanel] 请确保已编译后端代码: moon build')
  } finally {
    setTimeout(() => {
      executing.value = null
    }, 500)
  }
}

function togglePanel() {
  isOpen.value = !isOpen.value
  showCustom.value = false
}

function toggleCustom() {
  showCustom.value = !showCustom.value
}

async function runCustomMove() {
  try {
    executing.value = 'custom_move'
    console.log(`[TestPanel] 自定义移动: ID=${customParams.value.moveId} 到 (${customParams.value.moveX}, ${customParams.value.moveZ})`)
    
    const backend = await import('../main.js')
    if (backend.move_to_xy) {
      // 使用单独的x, y参数版本
      backend.move_to_xy(customParams.value.moveId, customParams.value.moveX, customParams.value.moveZ)
      console.log('[TestPanel] 自定义移动命令已发送')
    } else {
      console.error('[TestPanel] move_to_xy 函数不存在')
    }
  } catch (error) {
    console.error('[TestPanel] 执行失败:', error)
  } finally {
    setTimeout(() => { executing.value = null }, 500)
  }
}

async function runCustomRotate() {
  try {
    executing.value = 'custom_rotate'
    console.log(`[TestPanel] 自定义旋转: ID=${customParams.value.rotateId} 方向=${customParams.value.rotateDir}`)
    
    const backend = await import('../main.js')
    if (backend.change_direction_str) {
      // 直接传递字符串
      backend.change_direction_str(customParams.value.rotateId, customParams.value.rotateDir)
      console.log('[TestPanel] 自定义旋转命令已发送')
    } else {
      console.error('[TestPanel] change_direction_str 函数不存在')
    }
  } catch (error) {
    console.error('[TestPanel] 执行失败:', error)
  } finally {
    setTimeout(() => { executing.value = null }, 500)
  }
}

async function runCustomRemove() {
  try {
    executing.value = 'custom_remove'
    console.log(`[TestPanel] 自定义移除: ID=${customParams.value.removeId}`)
    
    const backend = await import('../main.js')
    if (backend.remove_unit) {
      backend.remove_unit(customParams.value.removeId)
      console.log('[TestPanel] 自定义移除命令已发送')
    } else {
      console.error('[TestPanel] remove_unit 函数不存在')
    }
  } catch (error) {
    console.error('[TestPanel] 执行失败:', error)
  } finally {
    setTimeout(() => { executing.value = null }, 500)
  }
}
</script>

<template>
  <div class="test-panel" :class="{ 'test-panel--open': isOpen }">
    <button class="test-panel__toggle" @click="togglePanel" :title="isOpen ? '关闭测试面板' : '打开测试面板'">
      {{ isOpen ? '✕' : '🧪' }}
    </button>
    
    <div v-if="isOpen" class="test-panel__content">
      <div class="test-panel__header">
        <h3>消息交互测试</h3>
        <p class="test-panel__subtitle">测试后端到前端的消息通信</p>
        <button class="test-panel__scene-btn" @click="emit('enter-scene')">
          🎮 进入3D场景
        </button>
        <button class="test-panel__custom-toggle" @click="toggleCustom">
          {{ showCustom ? '← 预设测试' : '自定义测试 →' }}
        </button>
      </div>
      
      <!-- 自定义测试 -->
      <div v-if="showCustom" class="test-panel__custom">
        <!-- 移动 -->
        <div class="custom-group">
          <h4>移动单位</h4>
          <div class="custom-inputs">
            <input v-model.number="customParams.moveId" type="number" placeholder="单位ID" class="custom-input" />
            <input v-model.number="customParams.moveX" type="number" placeholder="X坐标" class="custom-input" />
            <input v-model.number="customParams.moveZ" type="number" placeholder="Z坐标" class="custom-input" />
            <button class="custom-btn" @click="runCustomMove" :disabled="executing">移动</button>
          </div>
        </div>
        
        <!-- 旋转 -->
        <div class="custom-group">
          <h4>改变朝向</h4>
          <div class="custom-inputs">
            <input v-model.number="customParams.rotateId" type="number" placeholder="单位ID" class="custom-input" />
            <select v-model="customParams.rotateDir" class="custom-select">
              <option v-for="dir in directions" :key="dir" :value="dir">{{ dir }}</option>
            </select>
            <button class="custom-btn" @click="runCustomRotate" :disabled="executing">旋转</button>
          </div>
        </div>
        
        <!-- 移除 -->
        <div class="custom-group">
          <h4>移除单位</h4>
          <div class="custom-inputs">
            <input v-model.number="customParams.removeId" type="number" placeholder="单位ID" class="custom-input" />
            <button class="custom-btn custom-btn--danger" @click="runCustomRemove" :disabled="executing">移除</button>
          </div>
        </div>
      </div>
      
      <!-- 预设测试 -->
      <div v-else class="test-panel__list">
        <button
          v-for="test in testFunctions"
          :key="test.key"
          class="test-item"
          :class="{ 'test-item--executing': executing === test.key }"
          :disabled="executing === test.key"
          @click="runTest(test.key)"
        >
          <div class="test-item__name">{{ test.name }}</div>
          <div class="test-item__desc">{{ test.desc }}</div>
        </button>
      </div>
      
      <div class="test-panel__footer">
        <p v-if="showCustom">💡 在3D场景中：蓝色=ID:1，红色=ID:2</p>
        <p v-else>💡 提示：确保场景中已有模型ID=1和ID=2</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  pointer-events: auto;
}

.test-panel__toggle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #ff6b6b;
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-panel__toggle:hover {
  background: #ff5252;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.5);
}

.test-panel__toggle:active {
  transform: scale(0.95);
}

.test-panel__content {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 340px;
  max-height: 70vh;
  background: rgba(43, 26, 17, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.test-panel__header {
  padding: 16px 18px;
  background: rgba(31, 19, 12, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.test-panel__header h3 {
  margin: 0 0 4px 0;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.test-panel__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.test-panel__list {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.test-panel__list::-webkit-scrollbar {
  width: 6px;
}

.test-panel__list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.test-panel__list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.test-item {
  background: rgba(58, 37, 25, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  color: #fff;
}

.test-item:hover:not(:disabled) {
  background: rgba(75, 46, 31, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateX(-2px);
}

.test-item:active:not(:disabled) {
  transform: translateX(-1px);
}

.test-item--executing {
  background: rgba(255, 107, 107, 0.3);
  border-color: #ff6b6b;
  pointer-events: none;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.test-item__name {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 4px;
}

.test-item__desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.3;
}

.test-panel__footer {
  padding: 10px 18px;
  background: rgba(31, 19, 12, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.test-panel__footer p {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 200, 100, 0.8);
  line-height: 1.4;
}

.test-panel__scene-btn {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.test-panel__scene-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.test-panel__scene-btn:active {
  transform: translateY(0);
}

.test-panel__custom-toggle {
  width: 100%;
  margin-top: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-panel__custom-toggle:hover {
  background: rgba(255, 255, 255, 0.15);
}

.test-panel__custom {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.custom-group {
  background: rgba(58, 37, 25, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
}

.custom-group h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #fff;
  font-weight: 700;
}

.custom-inputs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.custom-input, .custom-select {
  flex: 1;
  min-width: 60px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
}

.custom-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.custom-btn {
  padding: 6px 16px;
  background: rgba(255, 107, 107, 0.8);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.custom-btn:hover:not(:disabled) {
  background: rgba(255, 107, 107, 1);
  transform: translateY(-1px);
}

.custom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-btn--danger {
  background: rgba(220, 38, 38, 0.8);
}

.custom-btn--danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 1);
}
</style>

