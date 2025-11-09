<script setup>
import log from '../log.js';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { getAssetUrl } from '../utils/resourceLoader.js';

const emit = defineEmits([
  'startGame',
  'openWarehouse',
  'openTutorial',
  'openEncyclopedia',
  'toggle-music',
]);

const props = defineProps({
  musicOn: {
    type: Boolean,
    default: true,
  },
  paused: {
    type: Boolean,
    default: false,
  },
});

function startGame() {
  emit('startGame');
}
function openWarehouse() {
  emit('openWarehouse');
}
function openTutorial() {
  emit('openTutorial');
}
function openEncyclopedia() {
  emit('openEncyclopedia');
}

const bgStart = ref(getAssetUrl('frontend_resource/start_game.webp'));
const bgWarehouse = ref(getAssetUrl('frontend_resource/copper_warehouse.webp'));
const bgWiki = ref(getAssetUrl('frontend_resource/game_wiki.webp'));
const bgTutorial = ref(getAssetUrl('frontend_resource/Tutorial.webp'));
// 使用 Vite 的静态资源导入方式
const bgHall = ref(
  getAssetUrl('ui/Gemini_Generated_Image_gtrehogtrehogtre (1).png')
);

// 添加图片加载完成状态
const imagesLoaded = ref(false);

// 音乐播放相关
const audioRef = ref(null);
// 音乐文件路径：优先使用本地 assets 文件夹，如果不存在则使用 R2 CDN
const musicUrl = import.meta.env.DEV
  ? '/assets/hall.mp3' // 开发环境使用本地路径
  : getAssetUrl('assets/hall.mp3'); // 生产环境使用 R2 CDN

onMounted(() => {
  // 图片已通过 resourceLoader 预缓存，直接显示 UI
  // 短暂延迟确保 Vue 已渲染 DOM 和应用样式
  setTimeout(() => {
    imagesLoaded.value = true;
    log('Hall界面准备完成，显示UI');
  }, 100);

  // 自动播放音乐（如果音乐开关是开启的且未暂停）
  if (props.musicOn && !props.paused && audioRef.value) {
    const tryPlay = () => {
      if (audioRef.value.readyState >= 2) {
        audioRef.value
          .play()
          .then(() => {
            log('[Hall] 音乐播放成功');
          })
          .catch(err => {
            log('[Hall] 自动播放失败（可能浏览器阻止）:', err);
          });
      } else {
        const onCanPlay = () => {
          audioRef.value
            .play()
            .then(() => {
              log('[Hall] 音频加载完成，播放成功');
            })
            .catch(err => {
              log('[Hall] 播放失败:', err);
            });
          audioRef.value.removeEventListener('canplay', onCanPlay);
        };
        audioRef.value.addEventListener('canplay', onCanPlay, { once: true });
      }
    };

    // 延迟一下确保音频元素已挂载
    setTimeout(tryPlay, 200);
  }
});

// 监听 musicOn 变化
watch(
  () => props.musicOn,
  newVal => {
    if (!audioRef.value) return;

    if (newVal && !props.paused) {
      if (audioRef.value.readyState >= 2) {
        audioRef.value.play().catch(err => {
          log('[Hall] 播放音乐失败:', err);
        });
      } else {
        const playWhenReady = () => {
          audioRef.value.play().catch(err => {
            log('[Hall] 播放音乐失败:', err);
          });
          audioRef.value.removeEventListener('canplay', playWhenReady);
        };
        audioRef.value.addEventListener('canplay', playWhenReady);
      }
    } else {
      audioRef.value.pause();
    }
  }
);

// 监听 paused 变化（当其他界面打开时暂停 Hall 音乐）
watch(
  () => props.paused,
  newVal => {
    if (!audioRef.value) return;

    if (newVal) {
      // 暂停音乐
      audioRef.value.pause();
      log('[Hall] 音乐已暂停（其他界面打开）');
    } else if (props.musicOn) {
      // 恢复播放（如果音乐开关是开启的）
      if (audioRef.value.readyState >= 2) {
        audioRef.value.play().catch(err => {
          log('[Hall] 恢复播放失败:', err);
        });
      } else {
        const playWhenReady = () => {
          audioRef.value.play().catch(err => {
            log('[Hall] 恢复播放失败:', err);
          });
          audioRef.value.removeEventListener('canplay', playWhenReady);
        };
        audioRef.value.addEventListener('canplay', playWhenReady);
      }
      log('[Hall] 音乐已恢复播放');
    }
  }
);

onBeforeUnmount(() => {
  if (audioRef.value) {
    audioRef.value.pause();
  }
});
</script>

<template>
  <div class="hall-container">
    <div class="hall-bg" :style="{ backgroundImage: `url('${bgHall}')` }"></div>
    <div class="menu" :class="{ 'menu--loaded': imagesLoaded }">
      <button
        class="tile tile--start"
        :style="{ backgroundImage: `url('${bgStart}')` }"
        @click="startGame"
      >
        <div class="tile__mask"></div>
        <div class="tile__caption tile__caption--bottom">
          <div class="tile__title">开始游戏</div>
          <div class="tile__subtitle">Begin Adventure</div>
        </div>
      </button>
      <button
        class="tile tile--warehouse"
        :style="{ backgroundImage: `url('${bgWarehouse}')` }"
        @click="openWarehouse"
      >
        <div class="tile__mask"></div>
        <div class="tile__caption tile__caption--top">
          <div class="tile__title">铜偶仓库</div>
          <div class="tile__subtitle">Character Collection</div>
        </div>
      </button>
      <button
        class="tile tile--wiki"
        :style="{ backgroundImage: `url('${bgWiki}')` }"
        @click="openEncyclopedia"
      >
        <div class="tile__mask"></div>
        <div class="tile__caption tile__caption--bottom">
          <div class="tile__title">游戏百科</div>
          <div class="tile__subtitle">Encyclopedia</div>
        </div>
      </button>
      <button
        class="tile tile--tutorial"
        :style="{ backgroundImage: `url('${bgTutorial}')` }"
        @click="openTutorial"
      >
        <div class="tile__mask"></div>
        <div class="tile__caption tile__caption--top">
          <div class="tile__title">新手教程</div>
          <div class="tile__subtitle">Tutorial</div>
        </div>
      </button>
    </div>
    <audio ref="audioRef" :src="musicUrl" loop preload="auto"></audio>
  </div>
</template>

<style scoped>
.hall-container {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}
.hall-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: brightness(0.9);
  z-index: 0;
  pointer-events: none;
}
.menu {
  position: absolute;
  left: 50%;
  top: 52%;
  transform: translate(-50%, -50%);
  width: min(1500px, 96vw);
  height: min(560px, 80vh);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 1fr;
  gap: 36px;
  pointer-events: auto;
  transform-style: preserve-3d;
  perspective: 900px;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

.menu--loaded {
  opacity: 1;
}
.tile {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-size: cover;
  background-position: center;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  height: 100%;
  transform: rotateY(0deg);
  transform-origin: center;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    filter 0.3s ease;
  will-change: transform, box-shadow;
}
.tile__mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.05) 30%,
    rgba(0, 0, 0, 0.35) 100%
  );
}
.tile__caption {
  position: absolute;
  left: 18px;
  right: 18px;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}
.tile__caption--bottom {
  bottom: 16px;
}
.tile__caption--top {
  top: 16px;
}
.tile__title {
  font-weight: 800;
  font-size: 28px;
}
.tile__subtitle {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.95;
}
.tile:active {
  transform: translateY(1px);
}
/* 父容器悬停联动与兄弟反向旋转 */
.menu:hover .tile {
  transform: rotateY(18deg);
}
.menu .tile:hover {
  transform: rotateY(0deg) scale(1.12);
  box-shadow: 0 25px 40px rgba(0, 0, 0, 0.35);
  z-index: 1;
}
.menu .tile:hover ~ .tile {
  transform: rotateY(-18deg);
}
@media (max-width: 1200px) {
  .menu {
    width: 94vw;
    gap: 18px;
  }
  .tile__title {
    font-size: 24px;
  }
}
@media (max-width: 992px) {
  .menu {
    grid-template-columns: repeat(2, 1fr);
    height: min(680px, 82vh);
  }
}
@media (max-width: 720px) {
  .menu {
    grid-template-columns: 1fr;
    height: min(720px, 84vh);
    gap: 16px;
  }
  .menu:hover .tile,
  .menu .tile:hover,
  .menu .tile:hover ~ .tile {
    transform: none;
  }
  .tile {
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
  }
}
</style>
