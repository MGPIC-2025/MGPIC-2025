/**
 * 资源上传配置文件
 * 定义哪些目录需要上传到 R2，哪些需要排除
 */

export const UPLOAD_CONFIG = {
  // 需要上传到 R2 的目录（相对于 assets/）
  include: [
    'copper',           // 铜偶角色模型和图标
    'enemy',            // 敌人模型
    'structure',        // 建筑模型
    'equipment',        // 装备图标
    'resource',         // 游戏资源
    'frontend_resource', // 前端资源
    'ui',               // UI 资源（图标、音频等）
    'logo.glb'         // Logo 模型文件
  ],
  
  // 排除的目录（不上传到 R2）
  exclude: [
    // 暂时不排除任何目录，所有目录都上传
  ],
  
  // 文件类型过滤
  fileTypes: {
    // 允许的文件扩展名
    allowed: ['.glb', '.webp', '.png', '.jpg', '.jpeg', '.js', '.css', '.json', '.ico', '.mp3'],
    // 排除的文件扩展名
    blocked: ['.tmp', '.temp', '.log', '.DS_Store', 'Thumbs.db']
  },
  
  // 上传设置
  settings: {
    // 缓存时间（秒）
    cacheControl: 'public, max-age=31536000', // 1年
    // 是否启用压缩
    enableCompression: true,
    // 最大文件大小（MB）
    maxFileSize: 50
  }
};

/**
 * 检查文件是否应该上传
 * @param {string} filePath - 文件路径
 * @param {string} relativePath - 相对于 assets 的路径
 * @returns {boolean} 是否应该上传
 */
export function shouldUploadFile(filePath, relativePath) {
  const pathParts = relativePath.split('/');
  const topLevelDir = pathParts[0];
  
  // 检查是否在排除列表中
  if (UPLOAD_CONFIG.exclude.includes(topLevelDir)) {
    return false;
  }
  
  // 检查是否在包含列表中
  if (UPLOAD_CONFIG.include.includes(topLevelDir)) {
    return true;
  }
  
  // 检查根目录文件
  if (pathParts.length === 1 && UPLOAD_CONFIG.include.includes(relativePath)) {
    return true;
  }
  
  // 默认情况下，如果不在排除列表中，就允许上传
  // 这样可以包含所有未明确排除的目录
  return !UPLOAD_CONFIG.exclude.includes(topLevelDir);
}

/**
 * 检查文件类型是否允许
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否允许上传
 */
export function isAllowedFileType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const fullExt = '.' + ext;
  
  // 检查是否在排除列表中
  if (UPLOAD_CONFIG.fileTypes.blocked.includes(fullExt)) {
    return false;
  }
  
  // 检查是否在允许列表中
  return UPLOAD_CONFIG.fileTypes.allowed.includes(fullExt);
}

/**
 * 获取文件上传配置
 * @param {string} filePath - 文件路径
 * @returns {object} 上传配置
 */
export function getUploadConfig(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  
  // 根据文件类型设置不同的缓存策略
  let cacheControl = UPLOAD_CONFIG.settings.cacheControl;
  
  if (ext === 'glb') {
    // 3D 模型文件，长期缓存
    cacheControl = 'public, max-age=31536000, immutable';
  } else if (['webp', 'png', 'jpg', 'jpeg'].includes(ext)) {
    // 图片文件，长期缓存
    cacheControl = 'public, max-age=31536000, immutable';
  } else if (['js', 'css'].includes(ext)) {
    // 代码文件，短期缓存
    cacheControl = 'public, max-age=86400'; // 1天
  }
  
  return {
    cacheControl,
    enableCompression: UPLOAD_CONFIG.settings.enableCompression,
    maxFileSize: UPLOAD_CONFIG.settings.maxFileSize * 1024 * 1024 // 转换为字节
  };
}
