import * as THREE from 'three';
import { getGridCellMaterialConfig } from '../utils/sceneConfig.js';

/**
 * 地板指示器管理 Composable
 * 处理移动范围、攻击范围、召唤范围等地板标记
 */
export function useIndicators(scene) {
  // 指示器存储：{ move: [...], attack: [...], summon: [...] }
  const indicators = {
    move: [],
    attack: [],
    summon: [], // 召唤和建造共用此类型
  };

  // 地图块材质配置
  const cellMaterialConfig = getGridCellMaterialConfig();

  /**
   * 创建地图块材质
   * @param {Object} customConfig - 自定义配置（可选）
   * @returns {THREE.Material} 材质对象
   */
  function createCellMaterial(customConfig = {}) {
    const config = { ...cellMaterialConfig, ...customConfig };

    if (!config.enabled) {
      // 如果未启用，返回透明材质
      return new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
      });
    }

    if (config.materialType === 'texture' && config.texture.url) {
      // 纹理材质
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(config.texture.url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(config.texture.repeat.x, config.texture.repeat.y);

      return new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: config.standard?.opacity || 1.0,
      });
    } else if (config.materialType === 'standard') {
      // 标准材质（支持光照）
      return new THREE.MeshStandardMaterial({
        color: config.standard.color,
        roughness: config.standard.roughness,
        metalness: config.standard.metalness,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: config.standard.opacity,
      });
    } else {
      // 基础材质
      return new THREE.MeshBasicMaterial({
        color: config.basic.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: config.basic.opacity,
      });
    }
  }

  /**
   * 指示器类型配置（匹配GameScene原有颜色）
   */
  const indicatorConfig = {
    move: { color: 0x44ff44, opacity: 0.6 }, // 亮绿色
    attack: { color: 0xff4444, opacity: 0.6 }, // 亮红色
    summon: { color: 0xffff00, opacity: 0.6 }, // 黄色（召唤和建造共用）
  };

  /**
   * 创建地板指示器
   */
  function createIndicator(position, type = 'move') {
    const [x, z] = position;
    const config = indicatorConfig[type] || indicatorConfig.move;

    // 使用地图块材质配置的尺寸
    const size = cellMaterialConfig.size || 0.9;
    const height = cellMaterialConfig.height || 0.08;

    const geometry = new THREE.PlaneGeometry(size, size);

    // 创建指示器材质（保持原有的半透明效果）
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: config.opacity,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2; // 水平放置
    plane.position.set(x, height, z); // 使用配置的高度
    plane.userData = { position, type };

    scene.add(plane);
    indicators[type].push(plane);

    return plane;
  }

  /**
   * 清除指定位置的指示器
   */
  function clearIndicatorAt(position) {
    const [x, z] = position;
    let cleared = false;

    Object.keys(indicators).forEach(type => {
      const index = indicators[type].findIndex(plane => {
        const pos = plane.userData.position;
        return pos[0] === x && pos[1] === z;
      });

      if (index !== -1) {
        const plane = indicators[type][index];
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();
        indicators[type].splice(index, 1);
        cleared = true;
      }
    });

    return cleared;
  }

  /**
   * 清除指定类型的所有指示器
   */
  function clearIndicators(type) {
    if (!indicators[type]) return;

    indicators[type].forEach(plane => {
      scene.remove(plane);
      plane.geometry.dispose();
      plane.material.dispose();
    });

    indicators[type] = [];
  }

  /**
   * 清除所有类型的指示器
   */
  function clearAllIndicators() {
    Object.keys(indicators).forEach(type => {
      clearIndicators(type);
    });
  }

  /**
   * 检查某个位置是否有指示器
   */
  function hasIndicatorAt(position, type) {
    const [x, z] = position;
    return indicators[type]?.some(plane => {
      const pos = plane.userData.position;
      return pos[0] === x && pos[1] === z;
    });
  }

  /**
   * 清理所有资源（组件卸载时调用）
   */
  function dispose() {
    clearAllIndicators();
  }

  return {
    indicators,
    createIndicator,
    createCellMaterial,
    clearIndicatorAt,
    clearIndicators,
    clearAllIndicators,
    hasIndicatorAt,
    dispose,
  };
}
