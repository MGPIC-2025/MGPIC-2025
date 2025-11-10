import * as THREE from 'three';
import { useEffectPool } from './useEffectPool.js';
import { getResourceName } from '../utils/resourceMeta.js';

/**
 * 特效管理 Composable
 * 使用对象池管理攻击、爆炸等特效
 */
export function useEffects(scene) {
  const effectPool = useEffectPool();

  /**
   * 创建攻击特效（射线 + 爆炸圆环）
   */
  function createAttackEffect(startPosition, targetPosition) {
    const start = new THREE.Vector3(startPosition[0], 0.5, startPosition[1]);
    const target = new THREE.Vector3(targetPosition[0], 0.5, targetPosition[1]);
    const distance = start.distanceTo(target);

    // 1. 攻击射线
    const line = effectPool.getAttackRay(distance);
    
    // 设置位置和方向
    const midpoint = new THREE.Vector3().addVectors(start, target).multiplyScalar(0.5);
    line.position.copy(midpoint);
    
    // 计算旋转
    const direction = new THREE.Vector3().subVectors(target, start).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    line.quaternion.copy(quaternion);

    scene.add(line);

    // 动画：淡出后回收
    let opacity = 0.9;
    const fadeOut = () => {
      opacity -= 0.05;
      line.material.opacity = opacity;
      
      if (opacity <= 0) {
        scene.remove(line);
        effectPool.recycleAttackRay(line);
      } else {
        requestAnimationFrame(fadeOut);
      }
    };
    
    setTimeout(fadeOut, 300);

    // 2. 爆炸圆环
    const ring = effectPool.getExplosionRing();
    ring.position.set(targetPosition[0], 0.1, targetPosition[1]);
    scene.add(ring);

    // 动画：放大 + 淡出后回收
    let scale = 1;
    let ringOpacity = 0.8;
    const expand = () => {
      scale += 0.1;
      ringOpacity -= 0.08;
      
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = ringOpacity;
      
      if (ringOpacity <= 0) {
        scene.remove(ring);
        effectPool.recycleExplosionRing(ring);
      } else {
        requestAnimationFrame(expand);
      }
    };
    
    expand();
  }

  /**
   * 创建资源获取特效（浮动文本）
   */
  function createResourceGainEffect(position, resourceChanges) {
    const messages = Object.entries(resourceChanges)
      .filter(([_, amount]) => amount > 0)
      .map(([resourceType, amount]) => {
        const name = getResourceName(resourceType);
        return `+${amount} ${name}`;
      });

    if (messages.length === 0) return;

    const text = messages.join('\n');
    
    // 创建Canvas文本纹理
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 48px Arial';
    context.fillStyle = '#ffff00';
    context.strokeStyle = '#000000';
    context.lineWidth = 4;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    const lines = text.split('\n');
    const lineHeight = 60;
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
      context.strokeText(line, canvas.width / 2, y);
      context.fillText(line, canvas.width / 2, y);
    });

    // 创建精灵
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    sprite.position.set(position[0], 1.5, position[1]);
    scene.add(sprite);

    // 动画：上升 + 淡出
    let y = 1.5;
    let opacity = 1.0;
    const rise = () => {
      y += 0.02;
      opacity -= 0.01;
      
      sprite.position.y = y;
      sprite.material.opacity = opacity;
      
      if (opacity <= 0) {
        scene.remove(sprite);
        sprite.material.map.dispose();
        sprite.material.dispose();
      } else {
        requestAnimationFrame(rise);
      }
    };
    
    rise();
  }

  /**
   * 清理所有资源（组件卸载时调用）
   */
  function dispose() {
    effectPool.dispose();
  }

  return {
    createAttackEffect,
    createResourceGainEffect,
    dispose,
  };
}

