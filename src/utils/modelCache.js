/**
 * 全局模型缓存管理器
 * 统一管理所有3D模型的加载、缓存和清理
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// 全局缓存实例
class ModelCacheManager {
  constructor() {
    // GLTF模型缓存 (URL -> GLTF对象)
    this.gltfCache = new Map();
    
    // 模型实例缓存 (URL -> 克隆的模型实例)
    this.instanceCache = new Map();
    
    // 全局GLTF加载器（复用）
    this.gltfLoader = null;
    this.dracoLoader = null;
    
    // 缓存配置
    this.maxCacheSize = 50; // 最大缓存50个模型
    this.maxInstanceSize = 100; // 最大缓存100个实例
    
    // 初始化加载器
    this.initLoaders();
  }

  /**
   * 初始化GLTF和Draco加载器
   */
  initLoaders() {
    if (!this.gltfLoader) {
      this.gltfLoader = new GLTFLoader();
      this.gltfLoader.setCrossOrigin("anonymous");
      
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
      );
      this.dracoLoader.setCrossOrigin("anonymous");
      
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
      console.log("[ModelCache] GLTF和Draco加载器已初始化");
    }
  }

  /**
   * 加载GLTF模型（带缓存）
   * @param {string} url - 模型URL
   * @returns {Promise<THREE.Object3D>} 模型实例
   */
  async loadModel(url) {
    // 检查实例缓存
    if (this.instanceCache.has(url)) {
      const cachedInstance = this.instanceCache.get(url);
      console.log(`[ModelCache] 从实例缓存加载: ${url}`);
      return cachedInstance.clone(true);
    }

    // 检查GLTF缓存
    let gltf;
    if (this.gltfCache.has(url)) {
      console.log(`[ModelCache] 从GLTF缓存加载: ${url}`);
      gltf = this.gltfCache.get(url);
    } else {
      // 从网络加载
      console.log(`[ModelCache] 从网络加载: ${url}`);
      try {
        gltf = await this.gltfLoader.loadAsync(url);
        
        // 缓存GLTF对象
        this.cacheGLTF(url, gltf);
      } catch (error) {
        console.error(`[ModelCache] 模型加载失败: ${url}`, error);
        throw error;
      }
    }

    // 创建模型实例
    const instance = gltf.scene.clone(true);
    
    // 缓存实例
    this.cacheInstance(url, instance);
    
    return instance;
  }

  /**
   * 缓存GLTF对象
   * @param {string} url - 模型URL
   * @param {Object} gltf - GLTF对象
   */
  cacheGLTF(url, gltf) {
    // 检查缓存大小限制
    if (this.gltfCache.size >= this.maxCacheSize) {
      // 删除最旧的缓存项
      const firstKey = this.gltfCache.keys().next().value;
      this.gltfCache.delete(firstKey);
      console.log(`[ModelCache] 删除旧GLTF缓存: ${firstKey}`);
    }
    
    this.gltfCache.set(url, gltf);
    console.log(`[ModelCache] GLTF已缓存: ${url}`);
  }

  /**
   * 缓存模型实例
   * @param {string} url - 模型URL
   * @param {THREE.Object3D} instance - 模型实例
   */
  cacheInstance(url, instance) {
    // 检查缓存大小限制
    if (this.instanceCache.size >= this.maxInstanceSize) {
      // 删除最旧的缓存项
      const firstKey = this.instanceCache.keys().next().value;
      const oldInstance = this.instanceCache.get(firstKey);
      this.disposeModel(oldInstance);
      this.instanceCache.delete(firstKey);
      console.log(`[ModelCache] 删除旧实例缓存: ${firstKey}`);
    }
    
    this.instanceCache.set(url, instance);
    console.log(`[ModelCache] 实例已缓存: ${url}`);
  }

  /**
   * 释放模型资源
   * @param {THREE.Object3D} model - 模型对象
   */
  disposeModel(model) {
    if (!model) return;
    
    model.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) m.map.dispose();
              if (m.dispose) m.dispose();
            });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            if (obj.material.dispose) obj.material.dispose();
          }
        }
      }
    });
  }

  /**
   * 清理所有缓存
   */
  clearCache() {
    console.log("[ModelCache] 清理所有缓存...");
    
    // 清理实例缓存
    this.instanceCache.forEach((instance) => {
      this.disposeModel(instance);
    });
    this.instanceCache.clear();
    
    // 清理GLTF缓存
    this.gltfCache.clear();
    
    console.log("[ModelCache] 缓存清理完成");
  }

  /**
   * 获取缓存状态
   * @returns {Object} 缓存状态信息
   */
  getCacheStatus() {
    return {
      gltfCacheSize: this.gltfCache.size,
      instanceCacheSize: this.instanceCache.size,
      maxCacheSize: this.maxCacheSize,
      maxInstanceSize: this.maxInstanceSize,
      gltfLoaderInitialized: !!this.gltfLoader,
      dracoLoaderInitialized: !!this.dracoLoader
    };
  }

  /**
   * 更新缓存配置
   * @param {Object} config - 新的配置
   */
  updateConfig(config) {
    if (config.maxCacheSize !== undefined) {
      this.maxCacheSize = Math.max(10, config.maxCacheSize);
    }
    if (config.maxInstanceSize !== undefined) {
      this.maxInstanceSize = Math.max(20, config.maxInstanceSize);
    }
    console.log("[ModelCache] 配置已更新:", this.getCacheStatus());
  }
}

// 创建全局实例
const modelCache = new ModelCacheManager();

// 导出API
export {
  modelCache,
  ModelCacheManager
};

// 默认导出
export default modelCache;
