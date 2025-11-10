import log from './log.js';
import { messageQueue, registerAllHandlers } from './messageQueue.js';

// 立即注册消息处理器
registerAllHandlers();

// 动态导入 main.js，避免在测试分支中因缺少导出而报错
let mainModule = null;
let mainModulePromise = null;

// 使用立即执行的异步函数来处理动态导入
mainModulePromise = (async () => {
  try {
    mainModule = await import('./main.js');
    log('[Glue] main.js 加载成功');
    return mainModule;
  } catch (error) {
    log('[Glue] main.js 导入失败，使用模拟模式:', error.message);
    return null;
  }
})();

// 导出等待函数，让调用者可以等待 main.js 加载完成
export function waitForMainModule() {
  return mainModulePromise;
}

async function gacha() {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.global_gacha) {
    return JSON.parse(mainModule.global_gacha());
  }
  return { type: 'error', content: '后端未加载' };
}

async function get_resource() {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.global_get_resource) {
    return JSON.parse(mainModule.global_get_resource());
  }
  return {};
}

async function craft() {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.global_craft) {
    return JSON.parse(mainModule.global_craft());
  }
  return { type: 'error', content: '后端未加载' };
}

async function get_bag() {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.global_get_bag) {
    return JSON.parse(mainModule.global_get_bag());
  }
  return {};
}

async function get_copper_list() {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.global_get_copper_list) {
    return JSON.parse(mainModule.global_get_copper_list());
  }
  return [];
}

async function upgrade_copper(id) {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.global_upgrade_copper) {
    return JSON.parse(mainModule.global_upgrade_copper(id));
  }
  return { type: 'error', content: '后端未加载' };
}

async function info_subscribe(callback) {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.global_info_subscribe) {
    mainModule.global_info_subscribe(info => {
      const message = JSON.parse(info);
      callback(message);
      // 同时将消息加入队列处理
      messageQueue.enqueue(message);
    });
    log('[Glue] global_info_subscribe 已注册');
  } else {
    log('[Glue] global_info_subscribe 不可用，使用模拟模式');
  }
}

async function eventloop(msg) {
  // 等待 main.js 加载完成
  await mainModulePromise;

  if (mainModule?.eventloop) {
    mainModule.eventloop(msg);
  } else {
    log('[Glue] eventloop 不可用');
  }
}

export {
  gacha,
  craft,
  get_bag,
  get_resource,
  get_copper_list,
  upgrade_copper,
  info_subscribe,
  eventloop,
  messageQueue,
};
