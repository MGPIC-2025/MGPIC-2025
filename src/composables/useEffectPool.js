import * as THREE from 'three';

/**
 * 特效对象池 - 复用几何体和材质，减少 GC 压力
 */
export function useEffectPool() {
  // 攻击射线对象池
  const attackRayPool = {
    geometries: [],
    materials: [],
    meshes: [],
    maxSize: 10,
  };

  // 爆炸圆环对象池
  const explosionRingPool = {
    geometries: [],
    materials: [],
    meshes: [],
    maxSize: 10,
  };

  /**
   * 获取或创建攻击射线
   */
  function getAttackRay(distance) {
    let cylinder;
    
    if (attackRayPool.meshes.length > 0) {
      // 从池中取出
      cylinder = attackRayPool.meshes.pop();
      // 更新几何体长度
      cylinder.geometry.dispose();
      cylinder.geometry = new THREE.CylinderGeometry(0.05, 0.05, distance, 8);
      // 重置材质透明度
      cylinder.material.opacity = 0.9;
    } else {
      // 创建新的
      const geometry = new THREE.CylinderGeometry(0.05, 0.05, distance, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.9,
        emissive: 0xff4444,
        emissiveIntensity: 0.5,
      });
      cylinder = new THREE.Mesh(geometry, material);
    }
    
    return cylinder;
  }

  /**
   * 回收攻击射线
   */
  function recycleAttackRay(cylinder) {
    if (attackRayPool.meshes.length < attackRayPool.maxSize) {
      attackRayPool.meshes.push(cylinder);
    } else {
      // 池已满，释放资源
      cylinder.geometry.dispose();
      cylinder.material.dispose();
    }
  }

  /**
   * 获取或创建爆炸圆环
   */
  function getExplosionRing() {
    let ring;
    
    if (explosionRingPool.meshes.length > 0) {
      // 从池中取出
      ring = explosionRingPool.meshes.pop();
      // 重置状态
      ring.scale.set(1, 1, 1);
      ring.material.opacity = 0.8;
    } else {
      // 创建新的
      const geometry = new THREE.RingGeometry(0.2, 0.4, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
      });
      ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = -Math.PI / 2; // 水平放置
    }
    
    return ring;
  }

  /**
   * 回收爆炸圆环
   */
  function recycleExplosionRing(ring) {
    if (explosionRingPool.meshes.length < explosionRingPool.maxSize) {
      explosionRingPool.meshes.push(ring);
    } else {
      // 池已满，释放资源
      ring.geometry.dispose();
      ring.material.dispose();
    }
  }

  /**
   * 清理所有对象池（组件卸载时调用）
   */
  function dispose() {
    // 清理攻击射线池
    attackRayPool.meshes.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    attackRayPool.meshes = [];
    attackRayPool.geometries = [];
    attackRayPool.materials = [];

    // 清理爆炸圆环池
    explosionRingPool.meshes.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    explosionRingPool.meshes = [];
    explosionRingPool.geometries = [];
    explosionRingPool.materials = [];
  }

  return {
    getAttackRay,
    recycleAttackRay,
    getExplosionRing,
    recycleExplosionRing,
    dispose,
  };
}

