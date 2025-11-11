<script setup>
import { ref, computed } from 'vue';
import log from '../log.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['move', 'rotate', 'verticalMove']);

// 移动摇杆状态
const moveJoystickActive = ref(false);
const moveJoystickCenter = ref({ x: 0, y: 0 });
const moveJoystickPosition = ref({ x: 0, y: 0 });
const moveJoystickTouch = ref(null);

// 视角摇杆状态
const rotateJoystickActive = ref(false);
const rotateJoystickCenter = ref({ x: 0, y: 0 });
const rotateJoystickPosition = ref({ x: 0, y: 0 });
const rotateJoystickTouch = ref(null);

// 垂直移动按钮状态
const upButtonPressed = ref(false);
const downButtonPressed = ref(false);

const maxDistance = 50; // 摇杆最大移动距离

// 移动摇杆事件处理
function onMoveJoystickStart(event) {
  event.preventDefault();
  const touch = event.touches[0];
  if (!touch) return;
  
  moveJoystickTouch.value = touch.identifier;
  const rect = event.target.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  moveJoystickCenter.value = { x: centerX, y: centerY };
  moveJoystickActive.value = true;
  
  updateMoveJoystick(touch.clientX, touch.clientY);
}

function onMoveJoystickMove(event) {
  if (!moveJoystickActive.value) return;
  
  const touch = Array.from(event.touches).find(
    t => t.identifier === moveJoystickTouch.value
  );
  if (!touch) return;
  
  updateMoveJoystick(touch.clientX, touch.clientY);
}

function onMoveJoystickEnd(event) {
  const touch = Array.from(event.changedTouches).find(
    t => t.identifier === moveJoystickTouch.value
  );
  if (!touch) return;
  
  moveJoystickActive.value = false;
  moveJoystickPosition.value = { x: 0, y: 0 };
  moveJoystickTouch.value = null;
  
  emit('move', { x: 0, y: 0 });
}

function updateMoveJoystick(clientX, clientY) {
  const deltaX = clientX - moveJoystickCenter.value.x;
  const deltaY = clientY - moveJoystickCenter.value.y;
  
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const clampedDistance = Math.min(distance, maxDistance);
  
  if (distance > 0) {
    const normalizedX = (deltaX / distance) * clampedDistance;
    const normalizedY = (deltaY / distance) * clampedDistance;
    
    moveJoystickPosition.value = { x: normalizedX, y: normalizedY };
    
    // 发送归一化的移动向量（-1到1）
    emit('move', {
      x: normalizedX / maxDistance,
      y: normalizedY / maxDistance,
    });
  }
}

// 视角摇杆事件处理
function onRotateJoystickStart(event) {
  event.preventDefault();
  const touch = event.touches[0];
  if (!touch) return;
  
  rotateJoystickTouch.value = touch.identifier;
  const rect = event.target.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  rotateJoystickCenter.value = { x: centerX, y: centerY };
  rotateJoystickActive.value = true;
  
  updateRotateJoystick(touch.clientX, touch.clientY);
}

function onRotateJoystickMove(event) {
  if (!rotateJoystickActive.value) return;
  
  const touch = Array.from(event.touches).find(
    t => t.identifier === rotateJoystickTouch.value
  );
  if (!touch) return;
  
  updateRotateJoystick(touch.clientX, touch.clientY);
}

function onRotateJoystickEnd(event) {
  const touch = Array.from(event.changedTouches).find(
    t => t.identifier === rotateJoystickTouch.value
  );
  if (!touch) return;
  
  rotateJoystickActive.value = false;
  rotateJoystickPosition.value = { x: 0, y: 0 };
  rotateJoystickTouch.value = null;
  
  emit('rotate', { x: 0, y: 0 });
}

function updateRotateJoystick(clientX, clientY) {
  const deltaX = clientX - rotateJoystickCenter.value.x;
  const deltaY = clientY - rotateJoystickCenter.value.y;
  
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const clampedDistance = Math.min(distance, maxDistance);
  
  if (distance > 0) {
    const normalizedX = (deltaX / distance) * clampedDistance;
    const normalizedY = (deltaY / distance) * clampedDistance;
    
    rotateJoystickPosition.value = { x: normalizedX, y: normalizedY };
    
    // 发送归一化的旋转向量（-1到1）
    emit('rotate', {
      x: normalizedX / maxDistance,
      y: normalizedY / maxDistance,
    });
  }
}

// 垂直移动按钮事件处理
function onUpButtonStart() {
  upButtonPressed.value = true;
  emit('verticalMove', { up: true, down: false });
}

function onUpButtonEnd() {
  upButtonPressed.value = false;
  emit('verticalMove', { up: false, down: downButtonPressed.value });
}

function onDownButtonStart() {
  downButtonPressed.value = true;
  emit('verticalMove', { up: false, down: true });
}

function onDownButtonEnd() {
  downButtonPressed.value = false;
  emit('verticalMove', { up: upButtonPressed.value, down: false });
}

// 计算摇杆把手的位置样式
const moveStickStyle = computed(() => ({
  transform: `translate(${moveJoystickPosition.value.x}px, ${moveJoystickPosition.value.y}px)`,
}));

const rotateStickStyle = computed(() => ({
  transform: `translate(${rotateJoystickPosition.value.x}px, ${rotateJoystickPosition.value.y}px)`,
}));
</script>

<template>
  <div v-if="visible" class="virtual-controls">
    <!-- 左侧移动摇杆 -->
    <div class="joystick-container joystick-left">
      <div class="joystick-label">移动</div>
      <div
        class="joystick-base"
        @touchstart="onMoveJoystickStart"
        @touchmove="onMoveJoystickMove"
        @touchend="onMoveJoystickEnd"
        @touchcancel="onMoveJoystickEnd"
      >
        <div
          class="joystick-stick"
          :class="{ active: moveJoystickActive }"
          :style="moveStickStyle"
        ></div>
      </div>
    </div>

    <!-- 右侧视角摇杆 -->
    <div class="joystick-container joystick-right">
      <div class="joystick-label">视角</div>
      <div
        class="joystick-base"
        @touchstart="onRotateJoystickStart"
        @touchmove="onRotateJoystickMove"
        @touchend="onRotateJoystickEnd"
        @touchcancel="onRotateJoystickEnd"
      >
        <div
          class="joystick-stick"
          :class="{ active: rotateJoystickActive }"
          :style="rotateStickStyle"
        ></div>
      </div>
    </div>

    <!-- 垂直移动按钮 -->
    <div class="vertical-buttons">
      <button
        class="vertical-button up-button"
        :class="{ pressed: upButtonPressed }"
        @touchstart.prevent="onUpButtonStart"
        @touchend.prevent="onUpButtonEnd"
        @touchcancel.prevent="onUpButtonEnd"
      >
        ▲
      </button>
      <button
        class="vertical-button down-button"
        :class="{ pressed: downButtonPressed }"
        @touchstart.prevent="onDownButtonStart"
        @touchend.prevent="onDownButtonEnd"
        @touchcancel.prevent="onDownButtonEnd"
      >
        ▼
      </button>
    </div>
  </div>
</template>

<style scoped>
.virtual-controls {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 280px;
  pointer-events: none;
  z-index: 3000;
  user-select: none;
  -webkit-user-select: none;
}

.joystick-container {
  position: absolute;
  bottom: 40px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.joystick-left {
  left: 40px;
}

.joystick-right {
  right: 40px;
}

.joystick-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.joystick-base {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border: 3px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  touch-action: none;
}

.joystick-stick {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(200, 200, 200, 0.7) 100%
  );
  border: 3px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
  transition: all 0.1s ease;
  position: relative;
}

.joystick-stick.active {
  background: radial-gradient(
    circle,
    rgba(100, 200, 255, 0.9) 0%,
    rgba(50, 150, 255, 0.7) 100%
  );
  border-color: rgba(100, 200, 255, 1);
  box-shadow:
    0 4px 12px rgba(50, 150, 255, 0.6),
    inset 0 2px 4px rgba(255, 255, 255, 0.4);
}

.vertical-buttons {
  position: absolute;
  right: 180px;
  bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto;
}

.vertical-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  border: 3px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.vertical-button.pressed {
  background: radial-gradient(
    circle,
    rgba(100, 200, 255, 0.4) 0%,
    rgba(50, 150, 255, 0.2) 100%
  );
  border-color: rgba(100, 200, 255, 1);
  box-shadow:
    0 4px 12px rgba(50, 150, 255, 0.6),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

/* 针对小屏幕设备的适配 */
@media (max-width: 768px) {
  .virtual-controls {
    height: 240px;
  }

  .joystick-left {
    left: 20px;
  }

  .joystick-right {
    right: 20px;
  }

  .joystick-base {
    width: 100px;
    height: 100px;
  }

  .joystick-stick {
    width: 40px;
    height: 40px;
  }

  .vertical-buttons {
    right: 140px;
    bottom: 30px;
  }

  .vertical-button {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
}

/* 针对超小屏幕的适配 */
@media (max-width: 480px) {
  .joystick-left {
    left: 15px;
  }

  .joystick-right {
    right: 15px;
  }

  .joystick-base {
    width: 90px;
    height: 90px;
  }

  .joystick-stick {
    width: 36px;
    height: 36px;
  }

  .vertical-buttons {
    right: 120px;
    bottom: 25px;
    gap: 8px;
  }

  .vertical-button {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }

  .joystick-label {
    font-size: 12px;
    padding: 3px 10px;
  }
}
</style>

