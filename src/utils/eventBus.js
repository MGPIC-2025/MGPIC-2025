import mitt from 'mitt';

/**
 * 全局事件总线
 * 用于替代 window.__XXX__ 全局变量，提供类型安全和更好的解耦
 */
const eventBus = mitt();

/**
 * 事件类型定义（用于文档和IDE提示）
 */
export const EventTypes = {
  // 资源相关
  UPDATE_RESOURCES: 'update:resources',
  RESOURCES_UPDATED: 'resources:updated',
  
  // 铜偶相关
  COPPER_ID_ADDED: 'copper:id:added',
  
  // 菜单/场景控制
  START_MENU_PAUSE: 'menu:pause',
  START_MENU_RESUME: 'menu:resume',
  START_MENU_STARTED: 'menu:started',
  
  // 控制模式
  CONTROL_MODE_CHANGED: 'control:mode:changed',
  
  // 游戏流程
  GAME_STARTED: 'game:started',
  GAME_ENDED: 'game:ended',
};

/**
 * 类型安全的事件发射器
 */
export const emitEvent = (type, data) => {
  eventBus.emit(type, data);
};

/**
 * 类型安全的事件监听器
 */
export const onEvent = (type, handler) => {
  eventBus.on(type, handler);
};

/**
 * 移除事件监听器
 */
export const offEvent = (type, handler) => {
  eventBus.off(type, handler);
};

/**
 * 移除所有监听器
 */
export const clearAllEvents = () => {
  eventBus.all.clear();
};

export default eventBus;

