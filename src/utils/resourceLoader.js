/**
 * 资源加载工具
 * 支持R2 CDN，带重试机制和回退策略
 */

import log from '../log.js';

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  timeout: 10000, // 10秒
};

// 资源加载状态缓存
const resourceCache = new Map();

// asset-list.json 缓存
let assetListCache = null;

// 预缓存配置
const PRECACHE_CONFIG = {
  enabled: true,
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  cachePrefix: 'mgpic_',
  version: '1.0.0',
  loadInterval: 50, // 每个资源加载间隔ms
  batchSize: 3, // 每批处理3个资源
};

// 本地缓存管理
class LocalCacheManager {
  constructor() {
    this.cache = new Map();
    this.totalSize = 0;
  }

  // 检查浏览器是否支持缓存API
  isSupported() {
    return 'caches' in window;
  }

  // 获取缓存名称
  getCacheName() {
    return `${PRECACHE_CONFIG.cachePrefix}${PRECACHE_CONFIG.version}`;
  }

  // 检查资源是否已缓存
  async isCached(url) {
    if (!this.isSupported()) return false;

    try {
      const cache = await caches.open(this.getCacheName());
      const response = await cache.match(url);
      return response !== undefined;
    } catch (error) {
      log('检查缓存失败:', error.message);
      return false;
    }
  }

  // 缓存资源
  async cacheResource(url, response) {
    if (!this.isSupported()) return false;

    try {
      const cache = await caches.open(this.getCacheName());

      // 检查是否已经缓存
      const existing = await cache.match(url);
      if (existing) {
        log(`资源已存在于缓存，跳过: ${url}`);
        return true;
      }

      await cache.put(url, response.clone());

      // 更新缓存大小统计
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        this.totalSize += parseInt(contentLength);
      }

      log(`资源已缓存: ${url}`);
      return true;
    } catch (error) {
      log('缓存资源失败:', error.message);
      return false;
    }
  }

  // 从缓存获取资源
  async getCachedResource(url) {
    if (!this.isSupported()) return null;

    try {
      const cache = await caches.open(this.getCacheName());
      return await cache.match(url);
    } catch (error) {
      log('获取缓存资源失败:', error.message);
      return null;
    }
  }

  // 清理过期缓存
  async cleanupCache() {
    if (!this.isSupported()) return;

    try {
      const cacheNames = await caches.keys();
      const currentCacheName = this.getCacheName();

      for (const cacheName of cacheNames) {
        if (
          cacheName.startsWith(PRECACHE_CONFIG.cachePrefix) &&
          cacheName !== currentCacheName
        ) {
          await caches.delete(cacheName);
          log(`清理过期缓存: ${cacheName}`);
        }
      }
    } catch (error) {
      log('清理缓存失败:', error.message);
    }
  }
}

// 创建缓存管理器实例
const cacheManager = new LocalCacheManager();

// 缓存资源基础URL，避免重复计算和日志
let cachedBaseUrl = null;

// 获取资源基础 URL
function getResourceBaseUrl() {
  // 如果已经缓存，直接返回
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  // 统一使用R2，开发和生产环境都使用
  const customDomain = import.meta.env.VITE_R2_CUSTOM_DOMAIN;
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

  if (customDomain) {
    log('使用自定义域名:', customDomain);
    cachedBaseUrl = customDomain;
    return cachedBaseUrl;
  } else {
    // 使用默认R2公共访问URL
    log('使用默认R2 URL');
    cachedBaseUrl = 'https://pub-6f9181bda40946ea92b5e87fe84e27d4.r2.dev';
    return cachedBaseUrl;
  }
}

/**
 * 获取资源完整 URL
 * @param {string} path - 资源相对路径
 * @returns {string} 完整 URL
 */
export function getAssetUrl(path) {
  let clean_path = path;
  if (path.startsWith('/assets/')) {
    clean_path = path.slice(7);
  } else if (path.startsWith('@assets/')) {
    clean_path = path.slice(8);
  }
  const baseUrl = getResourceBaseUrl();
  const cleanPath = clean_path.startsWith('/')
    ? clean_path.slice(1)
    : clean_path;
  const fullUrl = `${baseUrl}/${cleanPath}`;
  return fullUrl;
}

/**
 * 带重试机制的资源加载
 * @param {string} url - 资源URL
 * @param {Object} options - 加载选项
 * @returns {Promise<Response>} 响应对象
 */
async function loadResourceWithRetry(url, options = {}) {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    retryDelay = RETRY_CONFIG.retryDelay,
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`尝试加载资源 (${attempt}/${maxRetries}): ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        RETRY_CONFIG.timeout
      );

      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache', // 防止使用没有CORS头部的缓存响应
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        log(`资源加载成功: ${url}`);
        resourceCache.set(url, { success: true, timestamp: Date.now() });
        return response;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      log(`资源加载失败 (${attempt}/${maxRetries}): ${url}`, error.message);

      if (attempt === maxRetries) {
        log(` 资源加载最终失败: ${url}`, error.message);
        resourceCache.set(url, {
          success: false,
          timestamp: Date.now(),
          error: error.message,
        });
        throw error;
      }

      // 等待后重试
      log(` 等待 ${retryDelay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // 递增延迟
    }
  }
}

/**
 * 带缓存的资源加载（带重试机制）
 * @param {string} url - 资源URL
 * @param {Object} options - 加载选项
 * @returns {Promise<Response>} 响应对象
 */
export async function loadResourceWithCache(url, options = {}) {
  // 首先检查本地缓存（Cache Storage API）
  if (cacheManager.isSupported()) {
    const cachedResponse = await cacheManager.getCachedResource(url);
    if (cachedResponse) {
      log(`从 Cache Storage 加载: ${url}`);
      return cachedResponse;
    }
  }

  // 缓存中没有，从网络加载（带重试机制）
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    retryDelay = RETRY_CONFIG.retryDelay,
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`尝试加载资源 (${attempt}/${maxRetries}): ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        RETRY_CONFIG.timeout
      );

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache', // 防止使用没有CORS头部的缓存响应
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // 缓存到 Cache Storage
        if (cacheManager.isSupported()) {
          await cacheManager.cacheResource(url, response);
        }

        log(`资源加载并缓存成功: ${url}`);
        return response;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      log(`资源加载失败 (${attempt}/${maxRetries}): ${url}`, error.message);

      if (attempt === maxRetries) {
        log(`资源加载最终失败: ${url}`, error.message);
        throw error;
      }

      // 等待后重试（递增延迟）
      const waitTime = retryDelay * attempt;
      log(`等待 ${waitTime}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * 检查资源是否可用（带缓存）
 * @param {string} url - 资源URL
 * @returns {Promise<boolean>} 是否可用
 */
async function checkResourceAvailability(url) {
  // 检查缓存
  if (resourceCache.has(url)) {
    const cached = resourceCache.get(url);
    const now = Date.now();
    // 缓存5分钟
    if (now - cached.timestamp < 5 * 60 * 1000) {
      return cached.success;
    }
  }

  try {
    await loadResourceWithRetry(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 预加载资源（带重试机制）
 * @param {string[]} paths - 资源路径数组
 * @returns {Promise<void>}
 */
export async function preloadAssets(paths) {
  log(` 开始预加载 ${paths.length} 个资源`);

  const promises = paths.map(async path => {
    const url = getAssetUrl(path);
    log(` 预加载资源: ${path} -> ${url}`);

    try {
      // 根据文件类型选择预加载方式
      if (path.endsWith('.glb')) {
        // 3D 模型预加载 - 使用重试机制
        await loadResourceWithRetry(url);
        log(` 3D模型预加载成功: ${url}`);
      } else if (path.match(/\.(webp|png|jpg|jpeg)$/)) {
        // 图片预加载 - 使用重试机制
        await loadResourceWithRetry(url);
        log(` 图片预加载成功: ${url}`);
      } else {
        // 其他资源 - 使用重试机制
        await loadResourceWithRetry(url);
        log(` 资源预加载成功: ${url}`);
      }
    } catch (error) {
      log(` 资源预加载失败: ${url}`, error.message);
      // 预加载失败不影响主要功能，继续处理其他资源
    }
  });

  try {
    await Promise.all(promises);
    log(` 资源预加载完成`);
  } catch (error) {
    log(' 资源预加载过程中出现错误:', error.message);
  }
}

/**
 * 从自动生成的资源列表中加载资源路径
 * @param {Array<string>} priorities - 要加载的优先级 ['high', 'medium', 'low']
 * @returns {Promise<Array<string>>} 资源路径数组
 */
async function loadAssetList(priorities = ['high', 'medium']) {
  try {
    // 检查内存缓存
    if (assetListCache) {
      log('使用内存缓存的资源列表');
      const resources = extractResourcesFromAssetList(
        assetListCache,
        priorities
      );
      log(
        `从缓存的资源列表加载 ${resources.length} 个资源 (优先级: ${priorities.join(', ')})`
      );
      return resources;
    }

    // 尝试从 R2 CDN 加载资源列表（使用缓存机制）
    const assetListUrl = getAssetUrl('asset-list.json');
    log(`从 R2 CDN 加载资源列表: ${assetListUrl}`);

    // 使用带缓存和重试的加载方式
    const response = await loadResourceWithCache(assetListUrl);

    if (!response.ok) {
      throw new Error(`资源列表加载失败: HTTP ${response.status}`);
    }

    const assetList = await response.json();

    // 缓存到内存（用于当前会话的快速访问）
    assetListCache = assetList;
    log('资源列表已缓存到内存');

    const resources = extractResourcesFromAssetList(assetList, priorities);
    log(
      `从资源列表加载 ${resources.length} 个资源 (优先级: ${priorities.join(', ')})`
    );
    return resources;
  } catch (error) {
    log('无法加载自动生成的资源列表，使用备用列表:', error.message);

    // 备用资源列表（如果自动生成失败）
    return [
      'logo.glb',
      'frontend_resource/start_game.webp',
      'frontend_resource/copper_warehouse.webp',
      'frontend_resource/game_wiki.webp',
      'frontend_resource/Tutorial.webp',
      'frontend_resource/gacha.webp',
    ];
  }
}

/**
 * 从资源列表中提取指定优先级的资源路径
 * @param {Object} assetList - 资源列表对象
 * @param {Array<string>} priorities - 要加载的优先级
 * @returns {Array<string>} 资源路径数组
 */
function extractResourcesFromAssetList(assetList, priorities) {
  const resources = [];

  // 根据优先级收集资源
  for (const priority of priorities) {
    if (assetList.categories && assetList.categories[priority]) {
      const categoryResources = assetList.categories[priority].resources || [];
      resources.push(...categoryResources.map(r => r.path));
    }
  }

  return resources;
}

/**
 * 预缓存所有游戏资源（带间隔控制和进度回调）
 * @param {Function} onProgress - 进度回调函数 (current, total, percentage)
 * @param {Array<string>} priorities - 要加载的优先级 ['high', 'medium', 'low']
 * @returns {Promise<void>}
 */
export async function precacheAllResources(
  onProgress = null,
  priorities = ['high', 'medium']
) {
  if (!PRECACHE_CONFIG.enabled) {
    log('预缓存已禁用');
    return;
  }

  log('开始预缓存游戏资源...');

  // 清理过期缓存
  await cacheManager.cleanupCache();

  // 从自动生成的列表加载资源
  const allResources = await loadAssetList(priorities);

  // 分批处理资源，避免请求过于频繁
  const batchSize = PRECACHE_CONFIG.batchSize;
  const loadInterval = PRECACHE_CONFIG.loadInterval;
  const totalResources = allResources.length;
  let loadedCount = 0;

  // 初始进度回调
  if (onProgress) {
    onProgress(0, totalResources, 0);
  }

  for (let i = 0; i < allResources.length; i += batchSize) {
    const batch = allResources.slice(i, i + batchSize);
    log(
      `处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(allResources.length / batchSize)}: ${batch.length} 个资源`
    );

    // 并行处理当前批次
    const batchPromises = batch.map(async (path, index) => {
      const url = getAssetUrl(path);

      try {
        // 检查是否已在Cache Storage中缓存
        const isCached = await cacheManager.isCached(url);
        if (isCached) {
          log(`资源已在Cache Storage中，跳过: ${path}`);
          return { success: true, path, cached: true, source: 'cache' };
        }

        // 尝试从网络加载（浏览器可能有HTTP缓存）
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          RETRY_CONFIG.timeout
        );

        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache', // 防止使用没有CORS头部的缓存响应
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // 检查是否来自缓存
          const fromCache =
            response.headers.get('x-cache') ||
            response.headers.get('cf-cache-status') ||
            (response.type === 'basic' && !response.redirected);

          // 保存到Cache Storage
          if (cacheManager.isSupported()) {
            await cacheManager.cacheResource(url, response);
          }

          log(`资源预缓存成功: ${path}${fromCache ? ' (使用浏览器缓存)' : ''}`);
          return {
            success: true,
            path,
            cached: false,
            fromBrowserCache: !!fromCache,
          };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        log(`资源预缓存失败: ${path}`, error.message);
        return { success: false, path, error: error.message };
      }
    });

    // 等待当前批次完成
    const results = await Promise.all(batchPromises);

    // 更新已加载计数
    loadedCount += batch.length;
    const percentage = Math.round((loadedCount / totalResources) * 100);

    // 进度回调
    if (onProgress) {
      onProgress(loadedCount, totalResources, percentage);
    }

    // 统计当前批次结果
    const successCount = results.filter(r => r.success).length;
    const cachedCount = results.filter(r => r.cached).length;
    const browserCacheCount = results.filter(r => r.fromBrowserCache).length;
    const errorCount = results.filter(r => !r.success).length;

    log(
      `批次完成: 成功 ${successCount}, Cache Storage已有 ${cachedCount}, 浏览器缓存 ${browserCacheCount}, 失败 ${errorCount}`
    );

    // 如果不是最后一批，等待间隔时间
    if (i + batchSize < allResources.length) {
      log(`等待 ${loadInterval}ms 后处理下一批...`);
      await new Promise(resolve => setTimeout(resolve, loadInterval));
    }
  }

  log('所有资源预缓存完成');

  // 最终进度回调（确保显示100%）
  if (onProgress) {
    onProgress(totalResources, totalResources, 100);
  }
}

/**
 * 获取缓存状态
 * @returns {Object} 缓存状态信息
 */
export async function getCacheStatus() {
  if (!cacheManager.isSupported()) {
    return { supported: false, message: '浏览器不支持缓存API' };
  }

  try {
    const cache = await caches.open(cacheManager.getCacheName());
    const keys = await cache.keys();

    return {
      supported: true,
      cacheName: cacheManager.getCacheName(),
      resourceCount: keys.length,
      totalSize: cacheManager.totalSize,
      maxSize: PRECACHE_CONFIG.maxCacheSize,
    };
  } catch (error) {
    return { supported: true, error: error.message };
  }
}

/**
 * 更新预缓存配置
 * @param {Object} config - 新的配置选项
 */
export function updatePrecacheConfig(config) {
  if (config.loadInterval !== undefined) {
    PRECACHE_CONFIG.loadInterval = Math.max(100, config.loadInterval); // 最小100ms
  }
  if (config.batchSize !== undefined) {
    PRECACHE_CONFIG.batchSize = Math.max(1, Math.min(10, config.batchSize)); // 1-10之间
  }
  if (config.enabled !== undefined) {
    PRECACHE_CONFIG.enabled = config.enabled;
  }

  log('预缓存配置已更新:', PRECACHE_CONFIG);
}

/**
 * 获取预缓存配置
 * @returns {Object} 当前配置
 */
export function getPrecacheConfig() {
  return { ...PRECACHE_CONFIG };
}

/**
 * 清除资源列表缓存
 * 用于强制重新加载 asset-list.json
 */
export function clearAssetListCache() {
  assetListCache = null;
  log('资源列表缓存已清除');
}

/**
 * 获取铜偶模型 URL
 * @param {string} copperType - 铜偶类型
 * @param {string} copperName - 铜偶名称
 * @returns {string} 模型 URL
 */
export function getCopperModelUrl(copperType, copperName) {
  return getAssetUrl(
    `copper/${copperType.toLowerCase()}/${copperName}/${copperName}.glb`
  );
}

/**
 * 获取铜偶图标 URL
 * @param {string} copperType - 铜偶类型
 * @param {string} copperName - 铜偶名称
 * @returns {string} 图标 URL
 */
export function getCopperIconUrl(copperType, copperName) {
  return getAssetUrl(
    `copper/${copperType.toLowerCase()}/${copperName}/${copperName}.webp`
  );
}

/**
 * 获取敌人模型 URL
 * @param {string} enemyName - 敌人名称
 * @returns {string} 模型 URL
 */
export function getEnemyModelUrl(enemyName) {
  return getAssetUrl(`enemy/${enemyName}/${enemyName}.glb`);
}

/**
 * 获取建筑模型 URL
 * @param {string} structureName - 建筑名称
 * @returns {string} 模型 URL
 */
export function getStructureModelUrl(structureName) {
  return getAssetUrl(`structure/${structureName}/${structureName}.glb`);
}

/**
 * 获取矿物/资源模型 URL
 * @param {string} resourceName - 资源名称
 * @returns {string} 模型 URL
 */
export function getResourceModelUrl(resourceName) {
  return getAssetUrl(`resource/${resourceName}/${resourceName}.glb`);
}

/**
 * 获取矿物模型 URL
 * @param {string} modelUrl - 矿物模型相对路径（如 "assets/refined_copper_ingot/refined_copper_ingot.glb"）
 * @returns {string} 模型 URL
 */
export function getMaterialModelUrl(modelUrl) {
  return getAssetUrl(modelUrl);
}

/**
 * 获取装备图标 URL
 * @param {string} equipmentName - 装备名称
 * @returns {string} 图标 URL
 */
export function getEquipmentIconUrl(equipmentName) {
  return getAssetUrl(`equipment/${equipmentName}.webp`);
}

/**
 * 带重试机制的图片加载
 * @param {string} path - 图片路径
 * @returns {Promise<string>} 可用的图片URL
 */
export async function loadImageWithRetry(path) {
  const url = getAssetUrl(path);

  try {
    // 检查资源是否可用
    const isAvailable = await checkResourceAvailability(url);
    if (isAvailable) {
      return url;
    } else {
      throw new Error('Resource not available');
    }
  } catch (error) {
    log(`图片加载失败，使用原始URL: ${url}`, error.message);
    return url; // 即使检查失败也返回URL，让浏览器处理
  }
}

/**
 * 带重试机制的3D模型加载
 * @param {string} path - 模型路径
 * @returns {Promise<string>} 可用的模型URL
 */
export async function loadModelWithRetry(path) {
  const url = getAssetUrl(path);

  try {
    // 检查资源是否可用
    const isAvailable = await checkResourceAvailability(url);
    if (isAvailable) {
      return url;
    } else {
      throw new Error('Resource not available');
    }
  } catch (error) {
    log(`3D模型加载失败，使用原始URL: ${url}`, error.message);
    return url; // 即使检查失败也返回URL，让Three.js处理
  }
}
