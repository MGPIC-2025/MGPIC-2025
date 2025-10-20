import { messageQueue, registerAllHandlers } from './messageQueue.js'

// 立即注册消息处理器
registerAllHandlers()

// 动态导入 main.js，避免在测试分支中因缺少导出而报错
let mainModule = null

// 使用立即执行的异步函数来处理动态导入
;(async () => {
  try {
    mainModule = await import("./main.js")
    console.log('[Glue] main.js 加载成功')
  } catch (error) {
    console.warn('[Glue] main.js 导入失败，使用模拟模式:', error.message)
  }
})()

function gacha() {
  if (mainModule?.global_gacha) {
    return JSON.parse(mainModule.global_gacha());
  }
  return { type: 'error', content: '后端未加载' }
}

function get_resource() {
  if (mainModule?.global_get_resource) {
    return JSON.parse(mainModule.global_get_resource());
  }
  return {}
}

function get_copper_list() {
  if (mainModule?.global_get_copper_list) {
    return JSON.parse(mainModule.global_get_copper_list());
  }
  return []
}

function upgrade_copper(id) {
  if (mainModule?.global_upgrade_copper) {
    return JSON.parse(mainModule.global_upgrade_copper(id));
  }
  return { type: 'error', content: '后端未加载' }
}

function info_subscribe(callback) {
  if (mainModule?.global_info_subscribe) {
    mainModule.global_info_subscribe((info) => {
      const message = JSON.parse(info)
      callback(message)
      // 同时将消息加入队列处理
      messageQueue.enqueue(message)
    });
  } else {
    console.warn('[Glue] global_info_subscribe 不可用，使用模拟模式')
  }
}

function eventloop(msg) {
  if (mainModule?.eventloop) {
    mainModule.eventloop(msg);
  } else {
    console.warn('[Glue] eventloop 不可用')
  }
}

export { 
  gacha, 
  get_resource, 
  get_copper_list, 
  upgrade_copper, 
  info_subscribe,
  eventloop,
  messageQueue 
};
