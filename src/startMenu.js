// 开始界面的 ThreeJS 渲染场景 只有一个 Logo

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

let sceneInstance = null;

export function startMenu() {
  if (sceneInstance) {
    return sceneInstance;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#a0a0a0");

  const camera = new THREE.PerspectiveCamera(50, 1.333, 0.1, 1000);
  camera.position.set(-3.655, 0.2, -0.006);
  camera.rotation.set(-1.618275, -1.538307, -1.6183, "XYZ");

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: document.getElementById("c"),
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 12.5);
  directionalLight.position.set(-5, -2, 1);
  scene.add(directionalLight);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  let animationId = null;

  let logoObject = null;

  loader.load("/assets/logo.glb", (gltf) => {
    gltf.scene.position.set(0, 0, 0);
    scene.add(gltf.scene);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.set(-center.x, -center.y, -center.z);

    logoObject = gltf.scene;
  });

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (logoObject) {
      const time = Date.now() * 0.001;
      logoObject.position.y = Math.sin(time * 0.8) * 0.1;
      logoObject.rotation.y = Math.sin(time * 0.6) * 0.1;
      const scale = 1 + Math.sin(time * 1.2) * 0.05;
      logoObject.scale.setScalar(scale);
    }

    renderer.render(scene, camera);
  }

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener("resize", handleResize);
  animate();

  sceneInstance = {
    scene,
    camera,
    renderer,
    animationId,
    handleResize,
    pause() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    resume() {
      if (!animationId) {
        animationId = requestAnimationFrame(animate);
      }
    },
    destroy() {
      // 停止渲染循环与事件
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      window.removeEventListener("resize", handleResize);

      // 释放场景资源（几何体/材质/灯光等）
      try {
        scene.traverse((obj) => {
          if (obj.isMesh) {
            if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
            const mat = obj.material;
            if (Array.isArray(mat)) {
              mat.forEach((m) => m && m.dispose && m.dispose());
            } else if (mat && mat.dispose) {
              mat.dispose();
            }
          }
        });
      } catch (_) {}

      // 清空并释放渲染器
      try {
        renderer.clear(true, true, true);
      } catch (_) {}
      try {
        renderer.dispose();
      } catch (_) {}

      // 主动丢失 WebGL 上下文，防止显存泄漏
      try {
        const gl = renderer.getContext && renderer.getContext();
        const lose =
          gl && gl.getExtension && gl.getExtension("WEBGL_lose_context");
        if (lose && lose.loseContext) lose.loseContext();
      } catch (_) {}

      // 从 DOM 移除画布（需求：点击时通过 destroy 完成所有清理）
      try {
        const canvasEl = renderer.domElement || document.getElementById("c");
        if (canvasEl && canvasEl.parentNode) {
          canvasEl.parentNode.removeChild(canvasEl);
        }
      } catch (_) {}

      // 最后清空场景并置空实例
      try {
        scene.clear();
      } catch (_) {}
      sceneInstance = null;
    },
  };

  return sceneInstance;
}

export function destroyStartMenu() {
  if (sceneInstance) {
    sceneInstance.destroy();
  }
}

// 结束开场：对外暴露的便捷 API（等价于销毁）
export function finishStartMenu() {
  if (sceneInstance) {
    sceneInstance.destroy();
  }
}
