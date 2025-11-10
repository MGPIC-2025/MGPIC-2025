import * as THREE from 'three';

/**
 * 地板指示器管理 Composable
 * 处理移动范围、攻击范围、召唤范围等地板标记
 */
export function useIndicators(scene) {
  // 指示器存储：{ move: [...], attack: [...], summon: [...], build: [...] }
  const indicators = {
    move: [],
    attack: [],
    summon: [],
    build: [],
  };

  /**
   * 指示器类型配置（匹配GameScene原有颜色）
   */
  const indicatorConfig = {
    move: { color: 0x44ff44, opacity: 0.6 }, // 亮绿色
    attack: { color: 0xff4444, opacity: 0.6 }, // 亮红色
    summon: { color: 0xffff00, opacity: 0.6 }, // 黄色
    build: { color: 0x00ffff, opacity: 0.6 }, // 青色
  };

  /**
   * 创建地板指示器
   */
  function createIndicator(position, type = 'move') {
    const [x, z] = position;
    const config = indicatorConfig[type] || indicatorConfig.move;

    const geometry = new THREE.PlaneGeometry(0.9, 0.9); // 0.9x0.9 以留出网格间隙
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: config.opacity,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2; // 水平放置
    plane.position.set(x, 0.08, z); // 抬高以确保在地图块上方可见
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
    clearIndicatorAt,
    clearIndicators,
    clearAllIndicators,
    hasIndicatorAt,
    dispose,
  };
}
