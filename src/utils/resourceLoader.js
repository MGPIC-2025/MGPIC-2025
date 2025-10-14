/**
 * 资源加载工具
 * 支持本地开发和 CDN 生产环境
 */

// 获取资源基础 URL
function getResourceBaseUrl() {
  // 生产环境使用 CDN
  if (import.meta.env.PROD) {
    const customDomain = import.meta.env.VITE_R2_CUSTOM_DOMAIN;
    const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    
    if (customDomain) {
      return customDomain;
    } else if (publicUrl) {
      // 确保 URL 格式正确，移除可能的凭据信息
      let url = publicUrl;
      if (url.includes('@')) {
        // 如果 URL 包含 @ 符号，说明格式错误，暂时使用本地路径
        console.warn('R2 URL 格式错误，使用本地路径');
        return '/assets';
      }
      return url;
    } else {
      // 默认使用 GitHub Pages 路径
      return '/MGPIC-2025/assets';
    }
  }
  
  // 开发环境使用本地路径
  return '/assets';
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
 * 预加载资源
 * @param {string[]} paths - 资源路径数组
 * @returns {Promise<void>}
 */
export async function preloadAssets(paths) {
  const promises = paths.map(path => {
    return new Promise((resolve, reject) => {
      const url = getAssetUrl(path);
      
      // 根据文件类型选择预加载方式
      if (path.endsWith('.glb')) {
        // 3D 模型预加载
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to preload ${url}`));
        document.head.appendChild(link);
      } else if (path.match(/\.(webp|png|jpg|jpeg)$/)) {
        // 图片预加载
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload ${url}`));
        img.src = url;
      } else {
        // 其他资源
        fetch(url, { method: 'HEAD' })
          .then(() => resolve())
          .catch(() => reject(new Error(`Failed to preload ${url}`)));
      }
    });
  });
  
  try {
    await Promise.all(promises);
    console.log(`✅ 成功预加载 ${paths.length} 个资源`);
  } catch (error) {
    console.warn('⚠️ 资源预加载失败:', error.message);
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
