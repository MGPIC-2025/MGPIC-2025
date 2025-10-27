<script setup>
import { ref, onMounted, computed } from "vue";
import { get_copper_list, eventloop } from "../glue.js";
import { getAssetUrl } from "../utils/resourceLoader.js";

const emit = defineEmits(["confirm", "close"]);

const loading = ref(true);
const error = ref("");
const copperList = ref([]);
const selectedIds = ref(new Set());

const canConfirm = computed(() => selectedIds.value.size === 3);

function toggleSelect(id) {
  const set = selectedIds.value;
  if (set.has(id)) {
    set.delete(id);
  } else {
    if (set.size >= 3) return; // 最多选择3个
    set.add(id);
  }
  selectedIds.value = new Set(set);
}

async function loadCoppers() {
  loading.value = true;
  error.value = "";
  try {
    const plain = await get_copper_list();
    const arr = Array.isArray(plain?.coppers) ? plain.coppers : [];
    copperList.value = (arr || []).map((c, i) => ({
      id: Number(c?.id ?? (i + 1)),
      name: c?.copper_info?.name || `铜偶#${i + 1}`,
      icon: getAssetUrl(c?.copper_info?.icon_url || ""),
      level: Number(c?.level ?? 1)
    }));
  } catch (e) {
    console.warn('[StartGame] 获取铜偶列表失败', e);
    error.value = "加载失败，请重试";
  } finally {
    loading.value = false;
  }
}

async function startGame() {
  if (selectedIds.value.size !== 3) return;
  const ids = Array.from(selectedIds.value).map(id => String(id));
  try {
    if (!window.__ACTUAL_COPPER_IDS__) window.__ACTUAL_COPPER_IDS__ = [];
    const message = JSON.stringify({ type: 'on_game_start', content: { ids } });
    
    // 不等待eventloop完成，直接发送消息
    // 因为broadcast_room_content会发送大量消息（225个地图块），会阻塞界面
    eventloop(message).catch(e => {
      console.error('[StartGame] eventloop执行失败', e);
    });
    
    // 立即关闭界面，让消息队列在后台处理
    console.log('[StartGame] 游戏开始消息已发送，ID:', ids);
    emit("confirm", { ids });
  } catch (e) {
    console.error('[StartGame] 发送开始游戏消息失败', e);
    emit("confirm", { ids });
  }
}

function close() { emit("close"); }

onMounted(() => { loadCoppers(); });
</script>

<template>
  <div class="startgame-modal">
    <div class="card">
      <div class="card__header">
        <div class="card__title">开始游戏 · Start Game</div>
        <button class="card__close" @click="close" aria-label="关闭">✕</button>
      </div>
      <div class="card__content">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else class="list">
          <div 
            v-for="c in copperList" 
            :key="c.id" 
            class="item" 
            :class="{ 'item--selected': selectedIds.has(c.id) }"
            @click="toggleSelect(c.id)"
          >
            <div class="item__img">
              <img :src="c.icon" :alt="c.name" />
            </div>
            <div class="item__meta">
              <div class="item__name">{{ c.name }}</div>
              <div class="item__level">Lv. {{ c.level }}</div>
            </div>
            <div class="item__tick">{{ selectedIds.has(c.id) ? '✓' : '' }}</div>
          </div>
        </div>
        <div class="hint">从仓库中选择3个铜偶开始游戏。</div>
      </div>
      <div class="card__footer">
        <button class="btn btn--primary" :disabled="!canConfirm" @click="startGame">开始</button>
        <button class="btn" @click="close">返回</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.startgame-modal { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 20000; }
.card { width: min(90vw, 560px); background: #3a2519; color: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden; }
.card__header { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px 0 16px; background: #2b1a11; border-bottom: 1px solid #4b2e1f; }
.card__title { font-size: 18px; font-weight: 800; color: #fff; }
.card__close { width: 36px; height: 36px; border-radius: 8px; background: #4b2e1f; border: 1px solid #5a3525; cursor: pointer; color: #fff; }
.card__close:hover { background: #5a3525; }
.card__content { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.loading { padding: 20px; text-align: center; color: #ccc; }
.error { padding: 12px; color: #ff6b6b; background: #4b2e1f; border: 1px solid #5a3525; border-radius: 8px; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; align-items: stretch; }
.item { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid #4b2e1f; border-radius: 10px; cursor: pointer; background: #4b2e1f; transition: transform .1s ease, box-shadow .1s ease; }
.item:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
.item--selected { box-shadow: 0 0 0 2px #f59e0b inset; }
.item__img { width: 100%; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; background: #2b1a11; display: flex; align-items: center; justify-content: center; }
.item__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.item__meta { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #ccc; }
.item__name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90px; color: #fff; }
.item__level { opacity: .8; color: #ccc; }
.item__tick { position: absolute; top: 8px; right: 10px; font-weight: 900; color: #f59e0b; text-shadow: 0 1px 0 rgba(0,0,0,.6); }
.hint { margin-top: 4px; font-size: 12px; color: #ccc; }
.card__footer { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 14px; border-top: 1px solid #4b2e1f; background: #2b1a11; }
.btn { padding: 8px 14px; border-radius: 10px; border: 1px solid #4b2e1f; background: #4b2e1f; cursor: pointer; color: #fff; }
.btn:hover { background: #5a3525; }
.btn--primary { background: #f59e0b; color: #2b1a11; border-color: #f59e0b; box-shadow: 0 6px 16px rgba(245,158,11,0.3); }
.btn--primary:hover { background: #fbbf24; }
.btn[disabled], .btn:disabled { opacity: .5; cursor: not-allowed; }
</style>

