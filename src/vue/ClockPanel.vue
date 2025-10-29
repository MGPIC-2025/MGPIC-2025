<script setup>
import { onMounted, nextTick } from 'vue';

const props = defineProps({
  copperInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['move-click', 'attack-click', 'wait-click']);

// 获取当前旋转角度
function getCurrentRotation(element) {
  const matrix = window.getComputedStyle(element).transform;
  if (matrix === 'none') return 0;
  const values = matrix.split('(')[1].split(')')[0].split(',');
  const a = values[0];
  const b = values[1];
  return Math.round(Math.atan2(b, a) * (180 / Math.PI));
}

// 初始化钟表指针交互
onMounted(() => {
  nextTick(() => {
    // 使用组件内部的选择器
    const clockPanel = document.querySelector('.clock-panel');
    if (!clockPanel) return;
    
    const decorations = clockPanel.querySelectorAll('.decoration');
    const hands = clockPanel.querySelectorAll('.hand');
    
    if (decorations.length === 0 || hands.length === 0) return;
    
    const restartAnimation = (hand, name, durSec) => {
      // 清除过渡，锁定当前角度
      const currentAngle = getCurrentRotation(hand);
      hand.style.transition = 'none';
      hand.style.transform = `rotate(${currentAngle}deg)`;
      requestAnimationFrame(() => {
        // 移除内联动画，回退到类上的默认动画声明
        hand.style.animation = 'none';
        // 触发重排，保证后续动画能重新应用
        // eslint-disable-next-line no-unused-expressions
        hand.offsetHeight;
        requestAnimationFrame(() => {
          // 清空内联 animation，使用类上的 animation 定义
          hand.style.animation = '';
          // 设置随机负延迟，使动画从随机进度开始
          const randomOffset = Math.random() * durSec;
          hand.style.animationDelay = `-${randomOffset}s`;
          // 清空 transform，让动画接管
          hand.style.transform = '';
        });
      });
    };
    
    decorations.forEach(decoration => {
      decoration.addEventListener('mouseenter', () => {
        const angle = Number(decoration.getAttribute('data-angle'));
        if (isNaN(angle)) return;
        
        const transitionDurations = ['1s', '1.5s', '2s'];
        
        hands.forEach((hand) => {
          // 1) 记录当前角度（在关闭动画之前读取）
          const currentAngle = getCurrentRotation(hand);
          
          // 2) 立即停掉动画并锁定到当前角度（无过渡）
          hand.style.animation = 'none';
          hand.style.animationDelay = '0s';
          hand.style.transition = 'none';
          hand.style.transform = `rotate(${currentAngle}deg)`;
          
          // 3) 下一帧开始设置过渡到目标角度，实现平滑过渡
          const randomDuration = transitionDurations[Math.floor(Math.random() * transitionDurations.length)];
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              hand.style.transition = `transform ${randomDuration} ease`;
              hand.style.transform = `rotate(${angle}deg)`;
            });
          });
        });
      });
      
      decoration.addEventListener('mouseleave', () => {
        hands.forEach(hand => {
          if (hand.classList.contains('hour-hand')) {
            restartAnimation(hand, 'random-hour', 5);
          } else if (hand.classList.contains('minute-hand')) {
            restartAnimation(hand, 'random-minute', 7);
          } else if (hand.classList.contains('second-hand')) {
            restartAnimation(hand, 'random-second', 11);
          }
        });
      });
    });
  });
});

function handleMove() {
  if (!props.copperInfo.canMove) return;
  emit('move-click');
}

function handleAttack() {
  if (!props.copperInfo.canAttack) return;
  emit('attack-click');
}

function handleWait() {
  emit('wait-click');
}
</script>

<template>
  <div class="clock-panel">
    <div class="pocket-watch">
      <!-- 怀表链条 -->
      <div class="chain">
        <div class="chain-link"></div>
        <div class="chain-link"></div>
        <div class="chain-link"></div>
        <div class="chain-link"></div>
        <div class="chain-link"></div>
      </div>
      
      <!-- 怀表主体 -->
      <div class="watch-body">
        <div class="watch-ring"></div>
        
      <!-- 钟表外圈 -->
      <div class="clock-face"></div>
      
        <!-- 数字显示 -->
        <div class="clock-number num-3">III</div>
        <div class="clock-number num-5">V</div>
        <div class="clock-number num-9">IX</div>
        
        <!-- 苔藓和藤蔓装饰 -->
        <div class="moss-container">
          <div class="moss moss-1"></div>
          <div class="moss moss-2"></div>
          <div class="moss moss-3"></div>
          <div class="moss moss-4"></div>
          <div class="vine vine-1"></div>
          <div class="vine vine-2"></div>
      </div>
      
        
        
        <!-- 三个装饰圆圈 - 120度等距分布 -->
      <div class="decoration circle-1" :class="{ 'is-locked': !copperInfo.canMove }" @click="handleMove" :title="copperInfo.canMove ? '移动' : '本回合已移动'" data-position="top" data-angle="0">
        <span class="action-icon">M</span>
          <div class="decoration-ring"></div>
      </div>
        <div class="decoration circle-2" :class="{ 'is-locked': !copperInfo.canAttack }" @click="handleAttack" :title="copperInfo.canAttack ? '攻击' : '本回合已攻击'" data-position="right" data-angle="120">
        <span class="action-icon">A</span>
          <div class="decoration-ring"></div>
      </div>
        <div class="decoration circle-3" @click="handleWait" title="等待" data-position="left" data-angle="240">
        <span class="action-icon">W</span>
          <div class="decoration-ring"></div>
      </div>
      
      <!-- 时针 -->
      <div class="hand hour-hand"></div>
      <!-- 分针 -->
      <div class="hand minute-hand"></div>
      <!-- 秒针 -->
      <div class="hand second-hand"></div>
      
      <!-- 中心状态显示 -->
      <div class="center-dot"></div>
      </div>
      
      <!-- 怀表背面装饰 -->
      <div class="watch-back">
        <div class="back-ornament"></div>
        <div class="back-texture"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 古铜色怀表面板 */
.clock-panel {
  position: absolute;
  right: 29px;
  bottom: 10px;
  z-index: 6000;
  width: 220px;
  height: 260px;
  font-family: "Press Start 2P", "Courier New", monospace;
  image-rendering: pixelated;
}

.pocket-watch {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 怀表链条 */
.chain {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 55px;
  z-index: 1;
}

.chain-link {
  position: absolute;
  width: 12px;
  height: 8px;
  background: #8b6914;
  border: 2px solid #5a4310;
  border-radius: 0;
  box-shadow: 0 2px 0 #3a2a15;
}

.chain-link:nth-child(1) { top: 0; left: -4px; }
.chain-link:nth-child(2) { top: 10px; left: 0px; }
.chain-link:nth-child(3) { top: 20px; left: -4px; }
.chain-link:nth-child(4) { top: 30px; left: 0px; }
.chain-link:nth-child(5) { top: 40px; left: -4px; }

/* 怀表主体 */
.watch-body {
  position: relative;
  width: 220px;
  height: 220px;
}

/* 怀表外圈 */
.watch-ring {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 0;
  background:
    repeating-linear-gradient(
      0deg,
      #b87333 0px,
      #b87333 4px,
      #a7652a 4px,
      #a7652a 8px
    );
  border: 4px solid #5a4310;
  box-shadow: 0 4px 0 #3a2a15, inset 0 2px 0 rgba(255,255,255,0.15);
}

.watch-ring::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 10px;
  border-radius: 50%;
  background: 
    radial-gradient(circle at 20% 20%,
      rgba(139, 105, 20, 0.3) 0%,
      transparent 30%),
    radial-gradient(circle at 80% 80%,
      rgba(107, 78, 8, 0.3) 0%,
      transparent 30%);
  pointer-events: none;
}

/* 装饰花纹 */
.ornament {
  position: absolute;
  background: radial-gradient(circle,
    rgba(184, 149, 104, 0.4) 0%,
    rgba(107, 78, 8, 0.6) 100%);
  border-radius: 50%;
  box-shadow: 
    inset 0 1px 3px rgba(0, 0, 0, 0.5),
    0 1px 2px rgba(212, 175, 84, 0.4);
  z-index: 8;
  pointer-events: none;
}

.ornament-top {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 30px;
  border-radius: 50px;
}

.ornament-bottom {
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 30px;
  border-radius: 50px;
}

.ornament-left {
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  width: 30px;
  height: 60px;
  border-radius: 50px;
}

.ornament-right {
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 30px;
  height: 60px;
  border-radius: 50px;
}

/* 齿轮装饰 */
.gear {
  position: absolute;
  background: 
    radial-gradient(circle,
      rgba(212, 175, 84, 0.5) 0%,
      rgba(107, 78, 8, 0.7) 50%,
      transparent 70%),
    repeating-linear-gradient(0deg,
      transparent 0px,
      transparent 15px,
      rgba(184, 149, 104, 0.4) 15px,
      rgba(184, 149, 104, 0.4) 16px);
  border-radius: 50%;
  opacity: 0.6;
  z-index: 7;
  pointer-events: none;
  filter: blur(0.3px);
}

.gear-1 {
  top: 30px;
  left: 30px;
  width: 30px;
  height: 30px;
  transform: rotate(15deg);
}

.gear-2 {
  top: 30px;
  right: 30px;
  width: 25px;
  height: 25px;
  transform: rotate(-25deg);
}

.gear-3 {
  bottom: 30px;
  left: 35px;
  width: 28px;
  height: 28px;
  transform: rotate(30deg);
}

.gear-4 {
  bottom: 30px;
  right: 35px;
  width: 24px;
  height: 24px;
  transform: rotate(-20deg);
}

/* 钟表外圈 - 白色表面 */
.clock-face {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 192px;
  height: 192px;
  border-radius: 0;
  background: #efe7d3;
  border: 4px solid #7d6b55;
  box-shadow: 0 4px 0 #3a2a15, inset 0 2px 0 rgba(255,255,255,0.12);
  image-rendering: pixelated;
  overflow: hidden;
  z-index: 1;
}

.clock-face::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 0;
  background:
    repeating-linear-gradient(
      90deg,
      rgba(0,0,0,0.03) 0,
      rgba(0,0,0,0.03) 2px,
      transparent 2px,
      transparent 4px
    );
  pointer-events: none;
}

/* 数字显示 */
.clock-number {
  position: absolute;
  font-family: 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 800;
  color: #2a1f08;
  text-shadow: 
    0 2px 4px rgba(255, 255, 255, 0.9),
    0 -1px 2px rgba(0, 0, 0, 0.2);
  letter-spacing: 1px;
  z-index: 200;
  pointer-events: none;
}

.num-3 {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.num-5 {
  top: calc(50% + 40px);
  left: calc(50% + 60px);
  transform: translate(-50%, -50%);
}

.num-9 {
  top: calc(50% + 40px);
  left: calc(50% - 60px);
  transform: translate(-50%, -50%);
}

/* 苔藓容器 */
.moss-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 15;
}

/* 苔藓团 */
.moss {
  position: absolute;
  border-radius: 50%;
  background: 
    radial-gradient(circle at 30% 30%,
      #6b7d50 0%,
      #556243 30%,
      #4a5538 60%,
      #3d4630 100%);
  box-shadow:
    0 0 0 2px rgba(106, 125, 80, 0.3),
    inset 0 2px 5px rgba(0, 0, 0, 0.3),
    inset 0 -2px 3px rgba(109, 133, 75, 0.4);
  filter: blur(0.5px);
}

.moss-1 {
  width: 35px;
  height: 35px;
  bottom: 40px;
  right: 50px;
  transform: rotate(15deg);
}

.moss-2 {
  width: 28px;
  height: 28px;
  bottom: 60px;
  left: 55px;
  transform: rotate(-20deg);
}

.moss-3 {
  width: 32px;
  height: 32px;
  bottom: 30px;
  left: 30px;
  transform: rotate(25deg);
}

.moss-4 {
  width: 40px;
  height: 40px;
  bottom: 50px;
  right: 70px;
  transform: rotate(-10deg);
}

/* 苔藓小点装饰 */
.moss::before,
.moss::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: #7d9360;
  box-shadow: 0 0 2px rgba(125, 147, 96, 0.5);
}

.moss::before {
  width: 4px;
  height: 4px;
  top: 25%;
  left: 30%;
}

.moss::after {
  width: 3px;
  height: 3px;
  top: 60%;
  right: 25%;
  background: #8fa574;
}

/* 藤蔓 */
.vine {
  position: absolute;
  background: 
    linear-gradient(135deg,
      #6b7d50 0%,
      #556243 50%,
      #4a5538 100%);
  border-radius: 10px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.2) inset,
    0 2px 5px rgba(0, 0, 0, 0.4);
  filter: blur(0.5px);
}

.vine-1 {
  width: 8px;
  height: 80px;
  bottom: 0;
  right: 60px;
  transform: rotate(-15deg);
  border-radius: 0 0 10px 10px;
}

.vine-2 {
  width: 8px;
  height: 70px;
  bottom: 5px;
  left: 50px;
  transform: rotate(20deg);
  border-radius: 0 0 10px 10px;
}

/* 藤蔓上的小花朵/叶片 */
.vine::before,
.vine::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: #a8c488;
  box-shadow:
    0 0 3px rgba(168, 196, 136, 0.4),
    inset 0 0 2px rgba(255, 255, 255, 0.3);
}

.vine-1::before {
  width: 8px;
  height: 8px;
  top: 20px;
  right: -3px;
}

.vine-1::after {
  width: 6px;
  height: 6px;
  top: 50px;
  left: -2px;
  background: #9db675;
}

.vine-2::before {
  width: 7px;
  height: 7px;
  top: 15px;
  left: -2px;
}

.vine-2::after {
  width: 8px;
  height: 8px;
  top: 45px;
  right: -3px;
  background: #a8c488;
}

/* 刻度线 */
.hour-marks {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.hour-marks .mark {
  position: absolute;
  width: 3px;
  height: 12px;
  background: 
    linear-gradient(180deg, 
      #7d6b55 0%,
      #5a4a38 50%,
      #4a3d2e 100%);
  border: 0.5px solid rgba(0,0,0,0.2);
  border-radius: 1.5px;
  left: 50%;
  top: 15px;
  margin-left: -1.5px;
  box-shadow: 
    0 1px 2px rgba(0,0,0,0.3);
}

.hour-marks .mark:nth-child(1) { transform: rotate(0deg); }
.hour-marks .mark:nth-child(2) { transform: rotate(30deg); }
.hour-marks .mark:nth-child(3) { transform: rotate(60deg); }
.hour-marks .mark:nth-child(4) { transform: rotate(90deg); }
.hour-marks .mark:nth-child(5) { transform: rotate(120deg); }
.hour-marks .mark:nth-child(6) { transform: rotate(150deg); }
.hour-marks .mark:nth-child(7) { transform: rotate(180deg); }
.hour-marks .mark:nth-child(8) { transform: rotate(210deg); }
.hour-marks .mark:nth-child(9) { transform: rotate(240deg); }
.hour-marks .mark:nth-child(10) { transform: rotate(270deg); }
.hour-marks .mark:nth-child(11) { transform: rotate(300deg); }
.hour-marks .mark:nth-child(12) { transform: rotate(330deg); }

/* 装饰圆圈 */
.decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 32px;
  height: 32px;
  border-radius: 0;
  background: #c9a961;
  border: 3px solid #5a4310;
  box-shadow: 0 3px 0 #3a2a15;
  transition: transform 0.15s ease;
  cursor: pointer;
  z-index: 15;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
}

/* 装饰圆圈的外环 */
.decoration-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 36px;
  height: 36px;
  border-radius: 0;
  border: 2px solid #9a7d5a;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 三个装饰圆圈的位置 - 120度等距分布 */
.circle-1 { 
  transform: translate(-50%, -125px); /* 0度 */
}

.circle-2 { 
  transform: translate(calc(-50% + 108px), calc(-50% + 62px)); /* 120度 */
}

.circle-3 { 
  transform: translate(calc(-50% - 108px), calc(-50% + 62px)); /* 240度 */
}

/* 锁定状态 */
.decoration.is-locked {
  background: radial-gradient(circle at 30% 30%,
    #6b5a48 0%,
    #4a3a29 50%,
    #2a1f14 100%);
  border-color: #3a2a15;
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow:
    0 0 4px rgba(106, 88, 8, 0.3),
    0 1px 3px rgba(0,0,0,0.5);
}

/* 鼠标悬浮时单个圆圈变大 */
.decoration:hover:not(.is-locked) {
  border-color: #9a7d5a;
}

.decoration:hover:not(.is-locked) .decoration-ring {
  width: 40px;
  height: 40px;
  border-color: #b89b78;
}

/* 操作图标 */
.action-icon {
  font-family: "Press Start 2P", monospace;
  font-size: 10px;
  font-weight: 900;
  color: #2a1f08;
  letter-spacing: 0;
}

.decoration.is-locked .action-icon {
  color: #5a4a35;
  opacity: 0.5;
  text-shadow: none;
}

/* 指针样式 */
.hand {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center bottom;
  border-radius: 0;
  box-shadow: none;
  z-index: 10;
}

/* 时针 */
.hour-hand {
  width: 6px;
  height: 50px;
  margin-left: -3px;
  margin-top: -50px;
  background: #3a3026;
  border: 2px solid #2a1f14;
  animation: random-hour 5s ease-in-out infinite;
}

/* 分针 */
.minute-hand {
  width: 4px;
  height: 65px;
  margin-left: -2px;
  margin-top: -65px;
  background: #3a3026;
  border: 2px solid #2a1f14;
  z-index: 11;
  animation: random-minute 7s ease-in-out infinite;
}

/* 秒针 */
.second-hand {
  width: 2px;
  height: 80px;
  margin-left: -1px;
  margin-top: -80px;
  background: #5a4a38;
  border: 2px solid #3a2a18;
  z-index: 12;
  animation: random-second 11s ease-in-out infinite;
}

@keyframes random-hour {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(120deg); }
  50% { transform: rotate(240deg); }
  75% { transform: rotate(60deg); }
  100% { transform: rotate(0deg); }
}

@keyframes random-minute {
  0% { transform: rotate(45deg); }
  33% { transform: rotate(200deg); }
  66% { transform: rotate(320deg); }
  100% { transform: rotate(45deg); }
}

@keyframes random-second {
  0% { transform: rotate(90deg); }
  30% { transform: rotate(180deg); }
  60% { transform: rotate(270deg); }
  100% { transform: rotate(90deg); }
}

/* 中心点 */
.center-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 0;
  background: #7d6b55;
  border: 2px solid #2a1f08;
  box-shadow: 0 2px 0 #3a2a15;
  z-index: 20;
}

/* 怀表背面装饰 */
.watch-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: 
    radial-gradient(circle at 30% 30%,
      #8b6914 0%,
      #6b4e08 30%,
      #5a4310 60%,
      #4a3709 100%);
  border: 4px solid #3a2814;
  box-shadow:
    inset 0 0 40px rgba(0,0,0,0.7),
    0 5px 25px rgba(0,0,0,0.6);
  transform: translateZ(-1px);
  opacity: 0.3;
  z-index: -1;
}

.back-ornament {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: 
    repeating-conic-gradient(
      from 0deg at 50% 50%,
      transparent 0deg,
      rgba(139, 105, 20, 0.3) 10deg,
      transparent 20deg);
  opacity: 0.4;
}

.back-texture {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: 
    radial-gradient(
      circle at 30% 30%,
      rgba(184, 149, 104, 0.2) 0%,
      transparent 50%);
  opacity: 0.5;
}
</style>

