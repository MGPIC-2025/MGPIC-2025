import * as THREE from 'three';

/**
 * 血条管理 Composable
 * 处理单位血条的创建、更新和渲染
 */
export function useHealthBars(scene, camera) {
  // 血条存储：{ unitId: { bar, background, container, maxHp } }
  const healthBars = new Map();

  /**
   * 创建或更新血条
   */
  function createOrUpdateHealthBar(unitId, currentHp, maxHp) {
    if (healthBars.has(unitId)) {
      // 更新现有血条
      const barData = healthBars.get(unitId);
      barData.maxHp = maxHp;
      updateHealthBarValue(unitId, currentHp, maxHp);
      return;
    }

    // 创建新血条
    const barWidth = 1.0;
    const barHeight = 0.1;

    // 背景（红色）- 使用不透明材质避免混合问题
    const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x440000,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: false, // 背景不透明，避免混合
      toneMapped: false,
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);

    // 前景血条（根据血量显示颜色）- 使用不透明材质
    const barGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const barMaterial = new THREE.MeshBasicMaterial({
      color: getHealthColor(currentHp, maxHp),
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: false, // 前景不透明，避免混合
      toneMapped: false, // 禁用色调映射，确保颜色一致
    });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    bar.position.z = 0.001; // 稍微前移，避免Z-fighting

    // 容器
    const container = new THREE.Group();
    container.add(background);
    container.add(bar);
    container.renderOrder = 999; // 确保血条在最上层

    // 设置渲染顺序，确保前景在背景之上
    background.renderOrder = 999;
    bar.renderOrder = 1000; // 前景血条在背景之上

    scene.add(container);

    // 存储
    healthBars.set(unitId, { bar, background, container, maxHp });

    // 初始更新
    updateHealthBarValue(unitId, currentHp, maxHp);
  }

  /**
   * 更新血条数值
   */
  function updateHealthBarValue(unitId, currentHp, maxHp) {
    const barData = healthBars.get(unitId);
    if (!barData) return;

    const { bar } = barData;
    const percentage = Math.max(0, Math.min(1, currentHp / maxHp));

    // 更新宽度
    bar.scale.x = percentage;
    // 更新位置（因为缩放是从中心的，需要调整位置）
    bar.position.x = -(1 - percentage) * 0.5;

    // 更新颜色
    bar.material.color.setHex(getHealthColor(currentHp, maxHp));
  }

  /**
   * 根据血量百分比返回颜色
   */
  function getHealthColor(currentHp, maxHp) {
    const percentage = currentHp / maxHp;
    if (percentage > 0.6) return 0x00ff00; // 绿色
    if (percentage > 0.3) return 0xffff00; // 黄色
    return 0xff0000; // 红色
  }

  /**
   * 移除血条
   */
  function removeHealthBar(unitId) {
    const barData = healthBars.get(unitId);
    if (!barData) return;

    const { bar, background, container } = barData;

    // 清理几何体和材质
    bar.geometry.dispose();
    bar.material.dispose();
    background.geometry.dispose();
    background.material.dispose();

    // 从场景移除
    scene.remove(container);

    // 从Map删除
    healthBars.delete(unitId);
  }

  /**
   * 更新所有血条位置（在渲染循环中调用）
   */
  function updateHealthBarsPosition(models) {
    healthBars.forEach((barData, unitId) => {
      const model = models.find(m => m.id === unitId);
      if (model && model.object) {
        const { container } = barData;

        // 位置：单位上方1.5单位
        const position = model.object.position.clone();
        position.y += 1.5;
        container.position.copy(position);

        // 朝向相机（确保血条始终正面朝向玩家）
        container.lookAt(camera.position);
      }
    });
  }

  /**
   * 清理所有血条（组件卸载时调用）
   */
  function dispose() {
    healthBars.forEach((barData, unitId) => {
      removeHealthBar(unitId);
    });
    healthBars.clear();
  }

  return {
    healthBars,
    createOrUpdateHealthBar,
    updateHealthBarValue,
    removeHealthBar,
    updateHealthBarsPosition,
    dispose,
  };
}
