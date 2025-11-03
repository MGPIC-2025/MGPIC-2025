<script setup>
import log from '../log.js';
import { ref, nextTick } from 'vue';
import { getAssetUrl } from '../utils/resourceLoader.js';
import { gacha, get_resource } from '../glue.js';

const emit = defineEmits(['draw']);

const isDrawing = ref(false);
const canDraw = ref(true);
const showTempCard = ref(false);
const tempName = ref('抽卡展示');
const tempIcon = ref('✨');
const tempImage = ref('');
const tempRect = ref({ left: 0, top: 0, width: 0, height: 0 });

const infoVisible = ref(false);
const cardFlipped = ref(false);

const toastVisible = ref(false);
const toastText = ref('');
function showToast(text) {
  toastText.value = text || '提示';
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 1800);
}

async function refreshCanDraw() {
  try {
    const data = await get_resource();
    const plain = data;
    const spark = Number(plain?.SpiritalSpark ?? 0);
    canDraw.value = spark >= 10;
  } catch (_) {
    // 若获取失败，保守禁用
    canDraw.value = false;
  }
}

function onCloseResult() {
  // 点击空白处关闭结果层，返回抽卡界面
  showTempCard.value = false;
  infoVisible.value = false;
  cardFlipped.value = false;
}

function runDrawSequence() {
  if (isDrawing.value) return;
  // 进入前先校验资源是否足够
  // 异步刷新，但此处也基于当前 canDraw 拦截一次
  refreshCanDraw();
  if (!canDraw.value) {
    showToast('资源不足');
    return;
  }
  isDrawing.value = true;
  log('[DrawScreen] runDrawSequence start');

  const pack = document.querySelector('.draw-card');
  if (pack) {
    pack.classList.add('is-shaking');
    setTimeout(() => pack.classList.remove('is-shaking'), 500);
    const r = pack.getBoundingClientRect();
    // 将页面坐标转换为相对视口的绝对定位矩形
    tempRect.value = {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  setTimeout(async () => {
    showTempCard.value = true;
    infoVisible.value = false;
    // 初始先展示卡背
    cardFlipped.value = true;
    try {
      const data = await gacha();
      if (
        data &&
        data.type === 'success' &&
        data.copper &&
        data.copper.copper_info
      ) {
        const info = data.copper.copper_info;
        tempName.value = info.name || '新铜偶';
        tempIcon.value = '';
        tempImage.value = getAssetUrl(info.icon_url || '');
        log('[DrawScreen] tempImage resolved:', tempImage.value);
        await nextTick();
        // 自动从背面翻转到正面并显示结果信息
        setTimeout(() => {
          cardFlipped.value = false;
          setTimeout(() => {
            infoVisible.value = true;
          }, 350);
        }, 450);
        emit('draw', { name: info.name, image: info.icon_url || '' });
        // 成功后刷新可抽状态
        refreshCanDraw();
      } else if (data && data.type === 'error') {
        // 使用 Toast 提示，不再在卡面显示错误
        showTempCard.value = false;
        infoVisible.value = false;
        cardFlipped.value = false;
        showToast(data.content || '资源不足');
        emit('draw', { error: true });
        refreshCanDraw();
      }
    } catch (e) {
      showTempCard.value = false;
      infoVisible.value = false;
      cardFlipped.value = false;
      showToast('抽卡失败');
      emit('draw', { error: true });
      refreshCanDraw();
    } finally {
      setTimeout(() => {
        isDrawing.value = false;
        // 展示保留一会儿，由父组件控制是否关闭界面
      }, 800);
    }
  }, 600);
}
</script>

<template>
  <div class="draw-screen">
    <div class="draw-screen__body">
      <div class="draw-card">
        <!-- 动态出现的卡片展示覆盖在卡包上方：加入全屏调暗与卡片下方名称 -->
        <div v-if="showTempCard" class="draw-temp" @click="onCloseResult">
          <div class="dim-backdrop"></div>
          <div
            class="temp-stack"
            :style="{
              left: tempRect.left + 'px',
              top: tempRect.top + 'px',
              width: tempRect.width + 'px',
              height: tempRect.height + 'px',
            }"
            @click.stop
          >
            <div
              class="card"
              :class="{ flipped: cardFlipped }"
              @click.stop="cardFlipped = !cardFlipped"
            >
              <div class="card-face card-back">
                <img
                  :src="getAssetUrl('frontend_resource/gacha.webp')"
                  alt="back"
                />
              </div>
              <div class="card-face card-front">
                <img
                  v-if="tempImage"
                  :src="tempImage"
                  alt="copper"
                  class="card-front-img"
                />
                <div v-else class="card-icon">{{ tempIcon || '🎴' }}</div>
              </div>
            </div>
            <div
              class="card-name-below"
              :class="{ show: infoVisible }"
              @click.stop
            >
              {{ tempName }}
            </div>
          </div>
        </div>
        <img
          class="draw-card__img"
          :src="getAssetUrl('frontend_resource/gacha.webp')"
          alt="card"
        />
      </div>
      <div class="draw-cost">
        <img
          class="draw-cost__icon"
          :src="getAssetUrl('resource/spiritual_spark.webp')"
          alt="cost"
        />
        <span class="draw-cost__times">X 10</span>
      </div>
      <button
        class="draw-action"
        :disabled="isDrawing || !canDraw"
        :title="!canDraw ? '资源不足' : ''"
        @click="runDrawSequence"
      >
        抽取卡牌
      </button>
      <div v-if="toastVisible" class="toast">{{ toastText }}</div>
    </div>
  </div>
</template>

<style scoped>
/* 抽卡全屏界面 */
.draw-screen {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 8px;
}
.draw-screen__header {
  display: none;
}
.draw-back {
  display: none;
}
.draw-screen__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.draw-card {
  width: 520px;
  height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.draw-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.draw-card.is-shaking {
  animation: shake 0.5s ease-in-out;
}
.draw-cost {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}
.draw-cost__icon {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.draw-cost__times {
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}
.draw-action {
  margin-top: 6px;
  background: #3a2519;
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 12px 44px;
  font-size: 26px;
  cursor: pointer;
}
.draw-action:hover {
  background: #5a3525;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2200;
}

/* 临时卡片展示（出现动画，覆盖在卡包上方） */
.draw-temp {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 2000;
}
.dim-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
}
.temp-stack {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  pointer-events: none;
  perspective: 1000px;
  box-sizing: border-box;
}
.card {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: appear 0.6s ease forwards;
  cursor: pointer;
  pointer-events: auto;
}
.card-face {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  backface-visibility: hidden;
  transition: transform 0.5s ease;
}
.card-back {
  background: #4b2e1f;
  transform: rotateY(180deg);
  overflow: hidden;
}
.card-back img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-front {
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
}
.card.flipped .card-back {
  transform: rotateY(0deg);
}
.card.flipped .card-front {
  transform: rotateY(180deg);
}
.card-icon {
  font-size: 52px;
}
.card-title {
  font-size: 18px;
}
.card-front-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-name-overlay {
  display: none;
}
.card-name-below {
  pointer-events: none;
  color: #fff;
  font-weight: 900;
  letter-spacing: 0.5px;
  font-size: 22px;
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
}
.card-name-below.show {
  opacity: 1;
  transform: translateY(0);
}

.result-info {
  position: absolute;
  bottom: -56px;
  left: 50%;
  transform: translateX(-50%) translateY(10px);
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  padding: 8px 14px;
  border-radius: 12px;
  opacity: 0;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  font-weight: 700;
}
.result-info.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-6px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(6px);
  }
}

@keyframes appear {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
