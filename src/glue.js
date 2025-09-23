import { createApp } from 'vue'
import App from './App.vue'
import { startMenu, finishStartMenu } from './startMenu.js'

// 启动 Three 开场动画
const startScene = startMenu()

// 首次点击画布后：销毁开场动画并挂载 Vue 覆盖层
let mounted = false
function mountAfterIntro() {
  if (mounted) return
  mounted = true
  // 优先销毁已创建的开场动画实例
  // 仅调用销毁逻辑，由渲染器/场景自行清理
  finishStartMenu()
  let appRoot = document.getElementById('app')
  if (!appRoot) {
    appRoot = document.createElement('div')
    appRoot.id = 'app'
    document.body.appendChild(appRoot)
  }
  createApp(App).mount('#app')
}

const canvas = document.getElementById('c')
if (canvas) {
  const onceClick = () => {
    mountAfterIntro()
    canvas.removeEventListener('click', onceClick)
    canvas.removeEventListener('touchstart', onceClick)
  }
  canvas.addEventListener('click', onceClick, { once: false })
  canvas.addEventListener('touchstart', onceClick, { once: false })
}

// 提供全局暂停/恢复 API 给 Vue 覆盖层使用（当 Vue 挂载后再调用）
window.__START_MENU_PAUSE__ = () => {
  if (startScene && startScene.pause) startScene.pause()
}
window.__START_MENU_RESUME__ = () => {
  if (startScene && startScene.resume) startScene.resume()
}
