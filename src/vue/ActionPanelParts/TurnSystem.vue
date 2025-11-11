<script setup>
import log from '../../log.js';
import { computed, onMounted, ref } from 'vue';
import { eventloop } from '../../glue.js';
import { getAssetUrl } from '../../utils/resourceLoader.js';

const props = defineProps({
  currentCopperId: {
    type: Number,
    default: null,
  },
  copperList: {
    type: Array,
    default: () => [],
  },
  roundNumber: {
    type: Number,
    default: 1,
  },
  isEnemyMoving: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['nextCopper', 'endRound', 'selectCopper']);

const turnSystemRef = ref(null);

// 图片资源路径（<img>标签使用原始URL，CSS需要url()包裹）
const choiceImgSrc = getAssetUrl('ui/choice.png');
const choiceActiveImgSrc = getAssetUrl('ui/choice-active.png');
// CSS background-image和border-image-source需要url()包裹
const ribbonLeftSrc = `url('${getAssetUrl('ui/ribbon-left.png')}')`;
const ribbonMiddleSrc = `url('${getAssetUrl('ui/ribbon-middle.png')}')`;
const ribbonRightSrc = `url('${getAssetUrl('ui/ribbon-right.png')}')`;
const panelSrc = `url('${getAssetUrl('ui/panel.png')}')`;
const round1Src = `url('${getAssetUrl('ui/round1.png')}')`;
const currentCupperSrc = `url('${getAssetUrl('ui/currentcupper.png')}')`;
const btnSrc = `url('${getAssetUrl('ui/btn.png')}')`;

const currentCopperInfo = computed(() => {
  if (!props.currentCopperId) return null;
  const copper = props.copperList.find(c => c.id === props.currentCopperId);
  if (!copper) return null;
  // copperList 中的对象结构是 { id, name, turnDone }
  return {
    id: copper.id,
    name: copper.name || `铜偶 #${copper.id}`,
    level: copper.level || 1,
  };
});

// 依赖模板绑定自动切换选中态，无需手动 DOM 操作

function handleNextCopper() {
  emit('nextCopper');
}

async function handleEndRound() {
  const message = JSON.stringify({ type: 'on_game_round_pass' });
  await eventloop(message);
  emit('endRound');
}

function handleSelectCopper(id) {
  emit('selectCopper', id);
}

// 依据 7/ 的 index.html 动态设置九宫格切片尺寸
onMounted(async () => {
  if (!turnSystemRef.value) return;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = err => {
        log('图片加载失败:', src, err);
        reject(err);
      };
      img.src = src;
    });
  }
  function setCssVar(name, value) {
    // 将 CSS 变量直接设置到组件根元素上，scoped 样式才能访问
    if (turnSystemRef.value) {
      turnSystemRef.value.style.setProperty(name, String(value));
      log(`设置 CSS 变量 ${name} = ${value}`);
    }
  }
  try {
    const [panelImg, btnImg, currentImg] = await Promise.all([
      loadImage(getAssetUrl('ui/panel.png')),
      loadImage(getAssetUrl('ui/btn.png')),
      loadImage(getAssetUrl('ui/currentcupper.png')),
    ]);
    const panelSlice = Math.max(4, Math.round(panelImg.naturalHeight / 4));
    const btnSlice = Math.max(3, Math.round(btnImg.naturalHeight / 3));
    const currentSlice = Math.max(3, Math.round(currentImg.naturalHeight / 4));
    log('图片加载成功，设置切片值:', {
      panelSlice,
      btnSlice,
      currentSlice,
      currentImgSize: `${currentImg.naturalWidth}x${currentImg.naturalHeight}`,
    });
    setCssVar('--panel-slice', panelSlice);
    setCssVar('--btn-slice', btnSlice);
    setCssVar('--current-slice', currentSlice);

    // 验证 CSS 变量是否设置成功
    setTimeout(() => {
      const computed = getComputedStyle(turnSystemRef.value);
      log('CSS 变量验证:', {
        '--current-slice': computed.getPropertyValue('--current-slice'),
        '--panel-slice': computed.getPropertyValue('--panel-slice'),
        '--btn-slice': computed.getPropertyValue('--btn-slice'),
      });
    }, 100);
  } catch (err) {
    log('资源加载失败，使用默认值:', err);
    // 如果资源加载失败，设置默认值以确保边框可以显示
    setCssVar('--panel-slice', '8');
    setCssVar('--btn-slice', '11');
    setCssVar('--current-slice', '8');
  }
});
</script>

<template>
  <div ref="turnSystemRef" class="turn-system">
    <div class="ribbon" aria-hidden="true">
      <div class="ribbon-cap left"></div>
      <div class="ribbon-fill">CONTROL</div>
      <div class="ribbon-cap right"></div>
    </div>

    <div class="panel">
      <div class="panel-inner">
        <section class="section section-header">
          <div
            class="round-header"
            role="img"
            :aria-label="`Round ${roundNumber}`"
          >
            Round {{ roundNumber }}
          </div>
        </section>

        <section class="section section-body">
          <div class="current-doll" role="status" aria-live="polite">
            {{
              currentCopperInfo
                ? `当前铜偶：${currentCopperInfo.name || `铜偶 #${currentCopperId}`}`
                : '当前铜偶：—'
            }}
            （Lv.{{ currentCopperInfo?.level || 1 }}）
          </div>
        </section>

        <section
          class="section section-choices"
          role="group"
          aria-label="Character Queue"
        >
          <button
            v-for="copper in copperList"
            :key="copper.id"
            class="choice"
            type="button"
            :aria-pressed="String(copper.id === currentCopperId)"
            :data-copper-id="copper.id"
            :title="copper.name || `铜偶 #${copper.id}`"
            @click="handleSelectCopper(copper.id)"
          >
            <img
              :alt="copper.name || `Character ${copper.id}`"
              :src="
                copper.id === currentCopperId
                  ? choiceActiveImgSrc
                  : choiceImgSrc
              "
              :data-default-src="choiceImgSrc"
              :data-selected-src="choiceActiveImgSrc"
            />
          </button>
        </section>
      </div>
    </div>

    <div class="actions">
      <button
        class="btn btn-primary"
        @click="handleNextCopper"
        :disabled="!currentCopperId || isEnemyMoving"
      >
        下一个
      </button>
      <button
        class="btn btn-secondary"
        @click="handleEndRound"
        :disabled="isEnemyMoving"
      >
        结束回合
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 位置调整变量 */
.turn-system {
  /* ribbon 位置偏移 */
  --ribbon-offset-x: 65px; /* 水平偏移（负为左，正为右） */
  --ribbon-offset-y: 20px; /* 垂直偏移（负为上，正为下） */

  /* btn/actions 位置偏移 */
  --actions-offset-x: 50px; /* 水平偏移（负为左，正为右） */
  --actions-offset-y: -30px; /* 垂直偏移（负为上，正为下） */

  /* 九宫格切片厚度默认值 */
  --round-slice: 8;
  --panel-slice: 8;
  --btn-slice: 11;
  --current-slice: 8;

  /* panel 内容位置偏移 */
  --panel-content-offset-x: -8px; /* 负值向左，正值向右 */

  /* round 位置偏移 */
  --round-offset-y: 8px; /* 垂直偏移（负为上，正为下） */

  /* current-doll 位置偏移 */
  --current-doll-offset-y: 8px; /* 垂直偏移（负为上，正为下） */

  /* current-doll 尺寸调整 */
  --current-doll-min-width: 280px; /* 最小宽度，用于使边框更长 */
  --current-doll-padding-x: 28px; /* 左右内边距，用于使边框更长 */
}

.turn-system {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4000;
  color: #1a0f00;
  min-width: 320px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* 引入 7/ 的模块化样式，适配为悬浮卡片 */
.ribbon {
  display: flex;
  align-items: stretch;
  height: 48px;
  margin-bottom: 4px;
  position: relative;
  left: var(--ribbon-offset-x, 500px);
  top: var(--ribbon-offset-y, 0px);
  z-index: 1;
}
.ribbon-cap {
  width: 56px;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
.ribbon-cap.left {
  background-image: v-bind(ribbonLeftSrc);
}
.ribbon-cap.right {
  background-image: v-bind(ribbonRightSrc);
}
.ribbon-fill {
  min-width: 80px;
  padding: 0 12px;
  color: #fff3ef;
  font-weight: 800;
  letter-spacing: 2px;
  text-align: center;
  line-height: 48px;
  background-image: v-bind(ribbonMiddleSrc);
  background-repeat: repeat-x;
  background-size: auto 100%;
  background-origin: border-box;
  text-shadow: 0 2px 0 rgba(120, 0, 0, 0.35);
}

.panel {
  position: relative;
  width: 360px;
  box-sizing: border-box;
  border-style: solid;
  border-width: var(--panel-slice, 8px);
  border-image-source: v-bind(panelSrc);
  border-image-slice: var(--panel-slice, 8) fill;
  border-image-width: var(--panel-slice, 8);
  border-image-outset: 0;
  border-image-repeat: stretch;
  background-color: transparent;
}
.panel-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: flex-start;
  padding: 12px;
  transform: translateX(var(--panel-content-offset-x, 0px));
}
.section {
  width: 100%;
}
.section-header {
  display: flex;
  justify-content: center;
}
.section-body {
  display: flex;
  justify-content: center;
}
.round-header {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
  height: 28px;
  padding: 2px 10px;
  color: #6a4931;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  box-sizing: border-box;
  border-style: solid;
  border-width: var(--round-slice, 8px);
  border-image-source: v-bind(round1Src);
  border-image-slice: var(--round-slice, 8) fill;
  border-image-width: var(--round-slice, 8);
  border-image-outset: 0;
  border-image-repeat: stretch;
  transform: translateY(var(--round-offset-y, 0px));
}
.current-doll {
  min-height: 28px;
  min-width: var(--current-doll-min-width, auto);
  padding: 2px var(--current-doll-padding-x, 8px);
  color: #6a4931;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-style: solid;
  border-width: var(--current-slice, var(--round-slice, 8px));
  border-image-source: v-bind(currentCupperSrc);
  border-image-slice: var(--current-slice, var(--round-slice, 8)) fill;
  border-image-width: var(--current-slice, var(--round-slice, 8));
  border-image-outset: 0;
  border-image-repeat: stretch;
  background: transparent;
  position: relative;
  transform: translateY(var(--current-doll-offset-y, 0px));
}
.section-choices {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}
.choice {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  line-height: 0;
  transition: transform 80ms ease;
  will-change: transform;
}
.choice[aria-pressed='true'] {
  transform: translateY(-1px) scale(1.02);
  animation:
    choice-pop 200ms ease-out,
    choice-bob 1200ms ease-in-out 200ms infinite;
}
.choice img {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

@keyframes choice-pop {
  0% {
    transform: translateY(0) scale(0.98);
  }
  60% {
    transform: translateY(-2px) scale(1.04);
  }
  100% {
    transform: translateY(-1px) scale(1.02);
  }
}

@keyframes choice-bob {
  0% {
    transform: translateY(-1px) scale(1.02) rotate(0.2deg);
  }
  50% {
    transform: translateY(-3px) scale(1.02) rotate(-0.2deg);
  }
  100% {
    transform: translateY(-1px) scale(1.02) rotate(0.2deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .choice[aria-pressed='true'] {
    animation: none;
  }
}

.actions {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  position: relative;
  left: var(--actions-offset-x, 0px);
  top: var(--actions-offset-y, 0px);
}
.btn {
  min-width: 120px;
  height: 44px;
  padding: 0 16px;
  border-style: solid;
  box-sizing: border-box;
  border-width: var(--btn-slice, 11px);
  border-image-source: v-bind(btnSrc);
  border-image-slice: var(--btn-slice, 11) fill;
  border-image-width: var(--btn-slice, 11);
  border-image-outset: 0;
  border-image-repeat: stretch;
  color: #fff3ef;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
  background: none;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-primary {
  color: #fef7f5;
}
.btn-secondary {
  color: #fef7f5;
  filter: brightness(0.92);
}
</style>
