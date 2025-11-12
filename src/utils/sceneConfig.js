/**
 * 战斗场景配置
 * 包含天空盒和环境光照的配置
 */

import { getAssetUrl } from './resourceLoader.js';

/**
 * 天空盒配置
 */
export const skyboxConfig = {
  // 天空盒图片URL
  url: getAssetUrl('@assets/ui/skybox.jpg'),
  
  // 球体半径，足够大以包围整个场景
  radius: 1000,
  
  // 分段数，值越大越平滑（32-64之间即可，性能会受影响）
  segments: 32,
  
  // 是否使用半球体
  // false = 完整球体（360度包围）
  // true = 半球（只显示上半部分，适合地面场景）
  hemisphere: false,
};

/**
 * 环境光照配置
 */
export const lightingConfig = {
  // 环境光配置
  ambient: {
    color: 0xffffff, // 颜色（白色）
    intensity: 0.5,  // 强度（0-1之间，提供基础照明）
  },

  // 主方向光配置（模拟太阳光）
  mainDirectional: {
    color: 0xffffff,      // 颜色（白色）
    intensity: 1.2,       // 强度
    position: {           // 位置（从顶部偏前方向照射）
      x: 0,
      y: 20,
      z: 5,
    },
    castShadow: true,     // 是否投射阴影（如果启用阴影渲染）
  },

  // 顶部补光配置（增强顶部光影效果）
  topLight: {
    color: 0xffffff,      // 颜色（白色）
    intensity: 0.8,       // 强度
    position: {           // 位置（正上方）
      x: 0,
      y: 30,
      z: 0,
    },
  },

  // 半球光配置（模拟天空和地面的环境光）
  hemisphere: {
    skyColor: 0xffffff,   // 天空颜色（白色）
    groundColor: 0x444444, // 地面颜色（深灰色）
    intensity: 0.6,       // 强度
    position: {           // 位置
      x: 0,
      y: 20,
      z: 0,
    },
  },
};

/**
 * 获取天空盒配置
 * @returns {Object} 天空盒配置对象
 */
export function getSkyboxConfig() {
  return { ...skyboxConfig };
}

/**
 * 相机配置
 */
export const cameraConfig = {
  fov: 60,              // 视野角度
  near: 0.1,            // 近裁剪面
  far: 2000,            // 远裁剪面
  position: {           // 初始位置
    x: 0,
    y: 5,
    z: 10,
  },
};

/**
 * 渲染器配置
 */
export const rendererConfig = {
  antialias: true,      // 抗锯齿
};

/**
 * DRACO加载器配置
 */
export const dracoConfig = {
  decoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
};

/**
 * 控制配置
 */
export const controlConfig = {
  moveSpeed: 0.2,       // 移动速度
  rotationSpeed: 0.003, // 旋转速度
  focusLerpFactor: 0.08, // 聚焦插值因子
};

/**
 * 测试单位配置
 */
export const testUnitsConfig = {
  enabled: true,        // 是否启用测试单位
  units: [
    {
      id: 1,
      name: '单位1',
      color: 0x4488ff,  // 蓝色
      position: { x: 0.5, y: 0.4, z: 0.5 },
      size: 0.8,
    },
    {
      id: 2,
      name: '单位2',
      color: 0xff4444,  // 红色
      position: { x: 4.5, y: 0.4, z: 4.5 },
      size: 0.8,
    },
  ],
};

/**
 * 网格配置
 */
export const gridConfig = {
  floorSize: 10,        // 地板尺寸
  gridCellSize: 1,      // 网格单元大小
};

/**
 * 地图块（网格单元）材质配置
 */
export const gridCellMaterialConfig = {
  // 是否启用地图块材质
  enabled: true,
  
  // 材质类型：'basic' | 'standard' | 'texture'
  materialType: 'standard',
  
  // 基础颜色材质配置（materialType === 'basic' 时使用）
  basic: {
    color: 0x4a4a4a,    // 基础颜色
    opacity: 0.8,       // 透明度
  },
  
  // 标准材质配置（materialType === 'standard' 时使用，支持光照）
  standard: {
    color: 0x5a5a6a,    // 基础颜色（偏蓝灰色，更有金属感）
    roughness: 0.3,     // 粗糙度（降低以增加光泽）
    metalness: 0.7,     // 金属度（增加以增强金属感）
    opacity: 0.8,       // 透明度
  },
  
  // 纹理材质配置（materialType === 'texture' 时使用）
  texture: {
    url: null,          // 纹理图片URL
    repeat: { x: 1, y: 1 },  // 纹理重复次数
  },
  
  // 地图块尺寸（相对于网格单元）
  size: 0.95,           // 0.95 留出网格间隙
  height: 0.05,         // 地图块高度
  yOffset: -0.02,       // Y轴偏移（负值降低，避免遮挡血条，进一步降低）
};

/**
 * 地板配置
 */
export const floorConfig = {
  // 是否启用地板
  enabled: false,
  
  // 地板尺寸
  size: 100,            // 地板大小（建议比网格大很多，确保覆盖整个场景）
  
  // 材质类型：'texture' | 'color' | 'standard'
  materialType: 'standard',
  
  // 纹理配置（materialType === 'texture' 时使用）
  texture: {
    url: null,          // 纹理图片URL，例如：getAssetUrl('@assets/floor_texture.jpg')
    repeat: {           // 纹理重复次数
      x: 10,
      y: 10,
    },
    wrapS: 'RepeatWrapping',  // 'RepeatWrapping' | 'ClampToEdgeWrapping'
    wrapT: 'RepeatWrapping',
  },
  
  // 颜色配置（materialType === 'color' 时使用）
  color: {
    value: 0x2a2a2a,    // 地板颜色（深灰色）
  },
  
  // 标准材质配置（materialType === 'standard' 时使用，支持光照）
  standard: {
    color: 0x3a3a3a,    // 基础颜色
    roughness: 0.8,     // 粗糙度（0-1，值越大越粗糙）
    metalness: 0.1,     // 金属度（0-1，值越大越像金属）
    // 可选：法线贴图
    normalMap: null,    // 法线贴图URL
    normalScale: { x: 1, y: 1 },
    // 可选：粗糙度贴图
    roughnessMap: null,
    // 可选：环境光遮蔽贴图
    aoMap: null,
  },
  
  // 位置和旋转
  position: {
    x: 0,
    y: 0,
    z: 0,
  },
  rotation: {
    x: -Math.PI / 2,    // 旋转90度变成水平面
    y: 0,
    z: 0,
  },
};

/**
 * 获取环境光照配置
 * @returns {Object} 环境光照配置对象
 */
export function getLightingConfig() {
  return { ...lightingConfig };
}

/**
 * 获取相机配置
 * @returns {Object} 相机配置对象
 */
export function getCameraConfig() {
  return { ...cameraConfig };
}

/**
 * 获取渲染器配置
 * @returns {Object} 渲染器配置对象
 */
export function getRendererConfig() {
  return { ...rendererConfig };
}

/**
 * 获取DRACO配置
 * @returns {Object} DRACO配置对象
 */
export function getDracoConfig() {
  return { ...dracoConfig };
}

/**
 * 获取控制配置
 * @returns {Object} 控制配置对象
 */
export function getControlConfig() {
  return { ...controlConfig };
}

/**
 * 获取测试单位配置
 * @returns {Object} 测试单位配置对象
 */
export function getTestUnitsConfig() {
  return { ...testUnitsConfig };
}

/**
 * 获取网格配置
 * @returns {Object} 网格配置对象
 */
export function getGridConfig() {
  return { ...gridConfig };
}

/**
 * 获取地板配置
 * @returns {Object} 地板配置对象
 */
export function getFloorConfig() {
  return { ...floorConfig };
}

/**
 * 获取地图块材质配置
 * @returns {Object} 地图块材质配置对象
 */
export function getGridCellMaterialConfig() {
  return { ...gridCellMaterialConfig };
}

