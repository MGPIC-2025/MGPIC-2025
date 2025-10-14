import { createApp } from "https://unpkg.com/vue@3.5.21/dist/vue.esm-browser.js";
import App from "./App.vue";
import { finishStartMenu } from "./startMenu.js";

// 导出供 index.html 调用的 UI 挂载函数
export function setupUI(startScene) {
  let mounted = false;
  function mountAfterIntro() {
    if (mounted) return;
    mounted = true;
    // 优先销毁已创建的开场动画实例
    try {
      finishStartMenu();
    } catch (_) {}
    let appRoot = document.getElementById("app");
    if (!appRoot) {
      appRoot = document.createElement("div");
      appRoot.id = "app";
      document.body.appendChild(appRoot);
    }
    createApp(App).mount("#app");
    // 移除开始按钮和设置按钮
    const startBtn = document.getElementById("start-btn");
    if (startBtn && startBtn.parentNode) {
      startBtn.parentNode.removeChild(startBtn);
    }
    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn && settingsBtn.parentNode) {
      settingsBtn.parentNode.removeChild(settingsBtn);
    }
  }

  // 绑定开始按钮事件（替代点击画布进入）
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    const onStart = () => {
      mountAfterIntro();
      startBtn.removeEventListener("click", onStart);
      startBtn.removeEventListener("touchstart", onStart);
    };
    startBtn.addEventListener("click", onStart, { once: false });
    startBtn.addEventListener("touchstart", onStart, { once: false });
  }

  // 提供全局暂停/恢复 API 给 Vue 覆盖层使用（当 Vue 挂载后再调用）
  window.__START_MENU_PAUSE__ = () => {
    if (startScene && startScene.pause) startScene.pause();
  };
  window.__START_MENU_RESUME__ = () => {
    if (startScene && startScene.resume) startScene.resume();
  };
}
