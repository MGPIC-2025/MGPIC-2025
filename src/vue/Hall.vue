<script setup>
import log from '../log.js';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { getAssetUrl } from '../utils/resourceLoader.js';
import './Hall.css';

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
  const encyclopediaUrl = 'https://mgpic-2025.github.io/CopperPuppetry-Wiki/';
  log(`[Hall] 打开游戏百科: ${encyclopediaUrl}`);
  if (window?.open) {
    window.open(encyclopediaUrl, '_blank', 'noopener');
  } else {
    window.location.href = encyclopediaUrl;
  }
}

const bgStart = ref(getAssetUrl('@assets/frontend_resource/start_game.webp'));
const bgWarehouse = ref(
  getAssetUrl('@assets/frontend_resource/copper_warehouse.webp')
);
const bgWiki = ref(getAssetUrl('@assets/frontend_resource/game_wiki.webp'));
const bgTutorial = ref(getAssetUrl('@assets/frontend_resource/Tutorial.webp'));
// 使用 Vite 的静态资源导入方式
const bgHall = ref(
  getAssetUrl('ui/Gemini_Generated_Image_gtrehogtrehogtre (1).png')
);

// 添加图片加载完成状态
const imagesLoaded = ref(false);

// 音乐播放相关
const audioRef = ref(null);
// 音乐文件路径：优先使用本地 assets 文件夹，如果不存在则使用 R2 CDN
const musicUrl = getAssetUrl('@assets/frontend_resource/hall.mp3');

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
