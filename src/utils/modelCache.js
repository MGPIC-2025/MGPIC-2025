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

    // 模型实例池 (URL -> 原始模型实例)
    this.modelPool = new Map();

    // 实例化网格缓存 (URL -> InstancedMesh)
    this.instancedMeshes = new Map();

    // 全局GLTF加载器（复用）
    this.gltfLoader = null;
    this.dracoLoader = null;

    // 缓存配置
    this.maxCacheSize = 50; // 最大缓存50个模型
    this.maxInstancesPerModel = 1000; // 每个模型最大实例数

    // 预加载状态
    this.preloadStatus = new Map(); // URL -> 加载状态
    this.preloadQueue = []; // 预加载队列

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
   * 加载GLTF模型（带缓存和实例池）
   * @param {string} url - 模型URL
   * @param {boolean} useInstancePool - 是否使用实例池（默认true）
   * @returns {Promise<THREE.Object3D>} 模型实例
   */
  async loadModel(url, useInstancePool = true) {
    // 检查模型池
    if (useInstancePool && this.modelPool.has(url)) {
      const poolInstance = this.modelPool.get(url);
      console.log(`[ModelCache] 从模型池克隆: ${url}`);
      return poolInstance.clone(true);
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

    // 添加到模型池
    if (useInstancePool) {
      this.addToModelPool(url, instance);
    }

    return instance;
  }

  /**
   * 创建实例化网格（用于大量相同模型）
   * @param {string} url - 模型URL
   * @param {number} maxInstances - 最大实例数
   * @returns {Promise<THREE.InstancedMesh>} 实例化网格
   */
  async createInstancedMesh(url, maxInstances = 100) {
    // 检查是否已有实例化网格
    if (this.instancedMeshes.has(url)) {
      console.log(`[ModelCache] 返回现有实例化网格: ${url}`);
      return this.instancedMeshes.get(url);
    }

    // 加载模型
    const model = await this.loadModel(url, true);

    // 提取所有网格
    const meshes = [];
    model.traverse((child) => {
      if (child.isMesh) {
        meshes.push(child);
      }
    });

    if (meshes.length === 0) {
      throw new Error(`[ModelCache] 模型中没有网格: ${url}`);
    }

    // 创建实例化网格（使用第一个网格作为模板）
    const templateMesh = meshes[0];
    const instancedMesh = new THREE.InstancedMesh(
      templateMesh.geometry,
      templateMesh.material,
      maxInstances
    );

    // 设置实例矩阵
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < maxInstances; i++) {
      matrix.setPosition(0, -1000, 0); // 初始位置在远处
      instancedMesh.setMatrixAt(i, matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    // 缓存实例化网格
    this.instancedMeshes.set(url, instancedMesh);
    console.log(
      `[ModelCache] 创建实例化网格: ${url}, 最大实例数: ${maxInstances}`
    );

    return instancedMesh;
  }

  /**
   * 更新实例化网格的实例
   * @param {string} url - 模型URL
   * @param {number} instanceIndex - 实例索引
   * @param {THREE.Vector3} position - 位置
   * @param {THREE.Euler} rotation - 旋转
   * @param {THREE.Vector3} scale - 缩放
   */
  updateInstancedMeshInstance(url, instanceIndex, position, rotation, scale) {
    const instancedMesh = this.instancedMeshes.get(url);
    if (!instancedMesh) {
      console.warn(`[ModelCache] 实例化网格不存在: ${url}`);
      return;
    }

    if (instanceIndex >= instancedMesh.count) {
      console.warn(
        `[ModelCache] 实例索引超出范围: ${instanceIndex}/${instancedMesh.count}`
      );
      return;
    }

    const matrix = new THREE.Matrix4();
    matrix.compose(
      position,
      new THREE.Quaternion().setFromEuler(rotation),
      scale
    );
    instancedMesh.setMatrixAt(instanceIndex, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 隐藏实例化网格的实例
   * @param {string} url - 模型URL
   * @param {number} instanceIndex - 实例索引
   */
  hideInstancedMeshInstance(url, instanceIndex) {
    const instancedMesh = this.instancedMeshes.get(url);
    if (!instancedMesh) return;

    const matrix = new THREE.Matrix4();
    matrix.setPosition(0, -1000, 0); // 移动到远处
    instancedMesh.setMatrixAt(instanceIndex, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
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
   * 添加到模型池
   * @param {string} url - 模型URL
   * @param {THREE.Object3D} instance - 模型实例
   */
  addToModelPool(url, instance) {
    // 检查缓存大小限制
    if (this.modelPool.size >= this.maxCacheSize) {
      // 删除最旧的缓存项
      const firstKey = this.modelPool.keys().next().value;
      const oldInstance = this.modelPool.get(firstKey);
      this.disposeModel(oldInstance);
      this.modelPool.delete(firstKey);
      console.log(`[ModelCache] 删除旧模型池项: ${firstKey}`);
    }

    this.modelPool.set(url, instance);
    console.log(`[ModelCache] 模型已添加到池: ${url}`);
  }

  /**
   * 预加载模型列表
   * @param {Array<string>} urls - 模型URL列表
   * @param {Function} onProgress - 进度回调 (loaded, total, percentage)
   * @returns {Promise<void>}
   */
  async preloadModels(urls, onProgress = null) {
    console.log(`[ModelCache] 开始预加载 ${urls.length} 个模型`);

    const total = urls.length;
    let loaded = 0;

    // 过滤已加载的模型
    const urlsToLoad = urls.filter((url) => {
      const status = this.preloadStatus.get(url);
      return !status || status === "failed";
    });

    console.log(`[ModelCache] 需要加载 ${urlsToLoad.length} 个新模型`);

    // 批量加载
    const batchSize = 3; // 每批3个
    for (let i = 0; i < urlsToLoad.length; i += batchSize) {
      const batch = urlsToLoad.slice(i, i + batchSize);

      const promises = batch.map(async (url) => {
        try {
          this.preloadStatus.set(url, "loading");
          await this.loadModel(url, true);
          this.preloadStatus.set(url, "loaded");
          loaded++;

          if (onProgress) {
            onProgress(loaded, total, Math.round((loaded / total) * 100));
          }

          console.log(`[ModelCache] 预加载完成: ${url} (${loaded}/${total})`);
        } catch (error) {
          console.warn(`[ModelCache] 预加载失败: ${url}`, error);
          this.preloadStatus.set(url, "failed");
          loaded++;

          if (onProgress) {
            onProgress(loaded, total, Math.round((loaded / total) * 100));
          }
        }
      });

      await Promise.all(promises);

      // 批次间延迟，避免阻塞
      if (i + batchSize < urlsToLoad.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[ModelCache] 预加载完成: ${loaded}/${total} 个模型`);
  }

  /**
   * 检查模型是否已预加载
   * @param {string} url - 模型URL
   * @returns {boolean} 是否已加载
   */
  isPreloaded(url) {
    const status = this.preloadStatus.get(url);
    return status === "loaded";
  }

  /**
   * 获取预加载状态
   * @returns {Object} 预加载状态统计
   */
  getPreloadStatus() {
    const stats = {
      total: this.preloadStatus.size,
      loaded: 0,
      loading: 0,
      failed: 0,
    };

    for (const status of this.preloadStatus.values()) {
      stats[status]++;
    }

    return stats;
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

    // 清理模型池
    this.modelPool.forEach((instance) => {
      this.disposeModel(instance);
    });
    this.modelPool.clear();

    // 清理实例化网格
    this.instancedMeshes.forEach((mesh) => {
      this.disposeModel(mesh);
    });
    this.instancedMeshes.clear();

    // 清理GLTF缓存
    this.gltfCache.clear();

    // 清理预加载状态
    this.preloadStatus.clear();

    console.log("[ModelCache] 缓存清理完成");
  }

  /**
   * 获取缓存状态
   * @returns {Object} 缓存状态信息
   */
  getCacheStatus() {
    return {
      gltfCacheSize: this.gltfCache.size,
      modelPoolSize: this.modelPool.size,
      instancedMeshesSize: this.instancedMeshes.size,
      preloadStatus: this.getPreloadStatus(),
      maxCacheSize: this.maxCacheSize,
      maxInstancesPerModel: this.maxInstancesPerModel,
      gltfLoaderInitialized: !!this.gltfLoader,
      dracoLoaderInitialized: !!this.dracoLoader,
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
    if (config.maxInstancesPerModel !== undefined) {
      this.maxInstancesPerModel = Math.max(10, config.maxInstancesPerModel);
    }
    console.log("[ModelCache] 配置已更新:", this.getCacheStatus());
  }
}

// 创建全局实例
const modelCache = new ModelCacheManager();

// 导出API
export { modelCache, ModelCacheManager };

// 默认导出
export default modelCache;
