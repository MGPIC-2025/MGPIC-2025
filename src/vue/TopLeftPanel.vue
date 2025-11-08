<script setup>
defineProps({
  musicOn: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['back', 'open-settings', 'toggle-music']);
</script>

<template>
  <div class="panel" style="left: 24px; right: auto">
    <button class="btn" @click="$emit('back')" title="返回">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 18L9 12L15 6"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="sr-only">返回</span>
    </button>
    <button
      class="btn"
      @click="$emit('toggle-music')"
      :title="musicOn ? '关闭音乐' : '开启音乐'"
    >
      <svg
        v-if="musicOn"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- 音乐播放图标 -->
        <path
          d="M9 18V5L21 3V16"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="6" cy="18" r="3" stroke="#ffffff" stroke-width="2" />
        <circle cx="18" cy="16" r="3" stroke="#ffffff" stroke-width="2" />
      </svg>
      <svg
        v-else
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- 音乐关闭图标 -->
        <path
          d="M9 18V5L21 3V16"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="6" cy="18" r="3" stroke="#ffffff" stroke-width="2" />
        <circle cx="18" cy="16" r="3" stroke="#ffffff" stroke-width="2" />
        <line
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <span class="sr-only">{{ musicOn ? '关闭音乐' : '开启音乐' }}</span>
    </button>
    <button class="btn" @click="$emit('open-settings')" title="设置">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
          stroke="#ffffff"
          stroke-width="2"
        />
        <path
          d="M19.4 15A7.964 7.964 0 0 0 20 12C20 11.49 19.95 10.99 19.86 10.5L22 8.5L20 5.5L17.34 6.07C16.78 5.58 16.14 5.18 15.44 4.9L15 2H9L8.56 4.9C7.86 5.18 7.22 5.58 6.66 6.07L4 5.5L2 8.5L4.14 10.5C4.05 10.99 4 11.49 4 12C4 12.51 4.05 13.01 4.14 13.5L2 15.5L4 18.5L6.66 17.93C7.22 18.42 7.86 18.82 8.56 19.1L9 22H15L15.44 19.1C16.14 18.82 16.78 18.42 17.34 17.93L20 18.5L22 15.5L19.86 13.5C19.95 13.01 20 12.51 20 12"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="sr-only">设置</span>
    </button>
  </div>
</template>

<style scoped>
.panel {
  position: absolute;
  top: 16px;
  right: 56px;
  display: flex;
  gap: 12px;
  z-index: 40000;
  user-select: none;
  -webkit-user-select: none;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  padding: 8px 10px;
  border-radius: 10px;
  box-shadow: none;
  pointer-events: auto;
}
.btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #3a2519;
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.btn:hover {
  background: #2f1e14;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
