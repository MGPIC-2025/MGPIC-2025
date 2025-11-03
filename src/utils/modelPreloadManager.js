/**
 * 模型预加载管理器
 * 在游戏启动时预加载常用模型，提升游戏体验
 */

import log from '../log.js';
import modelCache from './modelCache.js';
import { getModelUrlsByPriority } from './modelPreloadConfig.js';

class ModelPreloadManager {
  constructor() {
    this.isPreloading = false;
    this.preloadProgress = 0;
    this.preloadCallbacks = [];
  }

  /**
   * 开始预加载模型
   * @param {Array<string>} priorities - 优先级数组 ['high', 'medium', 'low']
   * @param {Function} onProgress - 进度回调 (loaded, total, percentage)
   * @returns {Promise<void>}
   */
  async startPreload(priorities = ['high', 'medium'], onProgress = null) {
    if (this.isPreloading) {
      log('[ModelPreloadManager] 预加载已在进行中');
      return;
    }

    this.isPreloading = true;
    this.preloadProgress = 0;

    try {
      // 获取要预加载的模型URL
      const urls = getModelUrlsByPriority(priorities);
      log(
        `[ModelPreloadManager] 开始预加载 ${urls.length} 个模型 (优先级: ${priorities.join(', ')})`
      );

      // 注册进度回调
      if (onProgress) {
        this.preloadCallbacks.push(onProgress);
      }

      // 开始预加载
      await modelCache.preloadModels(urls, (loaded, total, percentage) => {
        this.preloadProgress = percentage;
        this.notifyProgress(loaded, total, percentage);
      });

      log('[ModelPreloadManager] 预加载完成');
    } catch (error) {
      log('[ModelPreloadManager] 预加载失败:', error);
    } finally {
      this.isPreloading = false;
      this.preloadCallbacks = [];
    }
  }

  /**
   * 通知进度更新
   * @param {number} loaded - 已加载数量
   * @param {number} total - 总数量
   * @param {number} percentage - 百分比
   */
  notifyProgress(loaded, total, percentage) {
    this.preloadCallbacks.forEach(callback => {
      try {
        callback(loaded, total, percentage);
      } catch (error) {
        log('[ModelPreloadManager] 进度回调错误:', error);
      }
    });
  }

  /**
   * 获取预加载状态
   * @returns {Object} 预加载状态
   */
  getStatus() {
    return {
      isPreloading: this.isPreloading,
      progress: this.preloadProgress,
      cacheStatus: modelCache.getCacheStatus(),
    };
  }

  /**
   * 检查模型是否已预加载
   * @param {string} url - 模型URL
   * @returns {boolean} 是否已预加载
   */
  isModelPreloaded(url) {
    return modelCache.isPreloaded(url);
  }

  /**
   * 预加载特定模型（按需加载）
   * @param {string} url - 模型URL
   * @returns {Promise<void>}
   */
  async preloadModel(url) {
    try {
      await modelCache.loadModel(url, true);
      log(`[ModelPreloadManager] 按需预加载完成: ${url}`);
    } catch (error) {
      log(`[ModelPreloadManager] 按需预加载失败: ${url}`, error);
    }
  }

  /**
   * 预加载模型列表（按需加载）
   * @param {Array<string>} urls - 模型URL列表
   * @returns {Promise<void>}
   */
  async preloadModels(urls) {
    const promises = urls.map(url => this.preloadModel(url));
    await Promise.all(promises);
    log(`[ModelPreloadManager] 批量按需预加载完成: ${urls.length} 个模型`);
  }
}

// 创建全局实例
const modelPreloadManager = new ModelPreloadManager();

// 导出API
export { modelPreloadManager, ModelPreloadManager };

// 默认导出
export default modelPreloadManager;
