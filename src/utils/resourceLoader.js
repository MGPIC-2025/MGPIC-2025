/**
 * 资源加载工具
 * 支持R2 CDN，带重试机制和回退策略
 */

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  timeout: 10000,   // 10秒
};

// 资源加载状态缓存
const resourceCache = new Map();

// 获取资源基础 URL
function getResourceBaseUrl() {
  // 统一使用R2，开发和生产环境都使用
  const customDomain = import.meta.env.VITE_R2_CUSTOM_DOMAIN;
  const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  
  if (customDomain) {
    return customDomain;
  } else if (publicUrl) {
    // 确保 URL 格式正确，移除可能的凭据信息
    let url = publicUrl;
    if (url.includes('@')) {
      // 如果 URL 包含 @ 符号，说明格式错误，使用默认R2
      console.warn('R2 URL 格式错误，使用默认R2');
      return 'https://pub-6f9181bda40946ea92b5e87fe84e27d4.r2.dev';
    }
    console.log('☁️ 使用配置的R2 URL:', url);
    return url;
  } else {
    // 使用默认R2公共访问URL
    console.log('☁️ 使用默认R2 URL');
    return 'https://pub-6f9181bda40946ea92b5e87fe84e27d4.r2.dev';
  }
}

/**
 * 获取资源完整 URL
 * @param {string} path - 资源相对路径
 * @returns {string} 完整 URL
 */
export function getAssetUrl(path) {
  const baseUrl = getResourceBaseUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * 带重试机制的资源加载
 * @param {string} url - 资源URL
 * @param {Object} options - 加载选项
 * @returns {Promise<Response>} 响应对象
 */
async function loadResourceWithRetry(url, options = {}) {
  const { maxRetries = RETRY_CONFIG.maxRetries, retryDelay = RETRY_CONFIG.retryDelay } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`尝试加载资源 (${attempt}/${maxRetries}): ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
        ...options
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`资源加载成功: ${url}`);
        resourceCache.set(url, { success: true, timestamp: Date.now() });
        return response;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`资源加载失败 (${attempt}/${maxRetries}): ${url}`, error.message);
      
      if (attempt === maxRetries) {
        console.error(` 资源加载最终失败: ${url}`, error.message);
        resourceCache.set(url, { success: false, timestamp: Date.now(), error: error.message });
        throw error;
      }
      
      // 等待后重试
      console.log(` 等待 ${retryDelay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // 递增延迟
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
  console.log(` 开始预加载 ${paths.length} 个资源`);
  
  const promises = paths.map(async path => {
    const url = getAssetUrl(path);
    console.log(` 预加载资源: ${path} -> ${url}`);
    
    try {
      // 根据文件类型选择预加载方式
      if (path.endsWith('.glb')) {
        // 3D 模型预加载 - 使用重试机制
        await loadResourceWithRetry(url);
        console.log(` 3D模型预加载成功: ${url}`);
      } else if (path.match(/\.(webp|png|jpg|jpeg)$/)) {
        // 图片预加载 - 使用重试机制
        await loadResourceWithRetry(url);
        console.log(` 图片预加载成功: ${url}`);
      } else {
        // 其他资源 - 使用重试机制
        await loadResourceWithRetry(url);
        console.log(` 资源预加载成功: ${url}`);
      }
    } catch (error) {
      console.warn(` 资源预加载失败: ${url}`, error.message);
      // 预加载失败不影响主要功能，继续处理其他资源
    }
  });
  
  try {
    await Promise.all(promises);
    console.log(` 资源预加载完成`);
  } catch (error) {
    console.warn(' 资源预加载过程中出现错误:', error.message);
  }
}

/**
 * 获取铜偶模型 URL
 * @param {string} copperType - 铜偶类型
 * @param {string} copperName - 铜偶名称
 * @returns {string} 模型 URL
 */
export function getCopperModelUrl(copperType, copperName) {
  return getAssetUrl(`copper/${copperType.toLowerCase()}/${copperName}/${copperName}.glb`);
}

/**
 * 获取铜偶图标 URL
 * @param {string} copperType - 铜偶类型
 * @param {string} copperName - 铜偶名称
 * @returns {string} 图标 URL
 */
export function getCopperIconUrl(copperType, copperName) {
  return getAssetUrl(`copper/${copperType.toLowerCase()}/${copperName}/${copperName}.webp`);
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
    console.warn(`⚠️ 图片加载失败，使用原始URL: ${url}`, error.message);
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
    console.warn(`⚠️ 3D模型加载失败，使用原始URL: ${url}`, error.message);
    return url; // 即使检查失败也返回URL，让Three.js处理
  }
}
