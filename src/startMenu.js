// 开始界面的 ThreeJS 渲染场景 只有一个 Logo

import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/DRACOLoader.js";

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
  let baseScale = 1.2;

  // 使用资源加载器获取正确的 URL
  const logoUrl = window.getAssetUrl ? window.getAssetUrl("logo.glb") : "/assets/logo.glb";
  console.log("🔍 开始加载 Logo 模型:", logoUrl);
  loader.load(logoUrl, (gltf) => {
    console.log("✅ Logo 模型加载成功:", gltf);
    gltf.scene.position.set(0, 0, 0);
    scene.add(gltf.scene);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.set(-center.x, -center.y, -center.z);
    // 增大基础缩放，让 Logo 更醒目
    try { gltf.scene.scale.setScalar(baseScale); } catch (_) {}

    logoObject = gltf.scene;
  });

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (logoObject) {
      const time = Date.now() * 0.001;
      logoObject.position.y = Math.sin(time * 0.8) * 0.1;
      logoObject.rotation.y = Math.sin(time * 0.6) * 0.1;
      const scale = baseScale + Math.sin(time * 1.2) * 0.04;
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

  // ---- 覆盖层 UI（标题 + 按钮）----
  let uiRoot = null;
  let uiStyle = null;
  const ensureIntroUI = () => {
    // 样式注入（仅一次）
    if (!document.getElementById('startmenu-style')) {
      uiStyle = document.createElement('style');
      uiStyle.id = 'startmenu-style';
      uiStyle.textContent = `
      .startmenu-ui{position:fixed;left:50%;top:72%;transform:translate(-50%,-50%);z-index:10000;display:flex;flex-direction:column;align-items:center;gap:28px;pointer-events:none}
      .startmenu-btn{pointer-events:auto;padding:20px 64px;border-radius:20px;border:none;background:#2a1a0f;color:#fff;font-size:32px;font-weight:800;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,0.35);width:min(560px,64vw);min-height:72px;transition:transform .12s ease,box-shadow .12s ease}
      .startmenu-btn:hover{transform:translateY(-1px);box-shadow:0 16px 36px rgba(0,0,0,0.32)}
      .startmenu-btn:active{transform:translateY(0)}
      @media (max-width:900px){.startmenu-ui{top:70%}.startmenu-btn{width:86vw;padding:16px 0;font-size:26px;border-radius:16px;min-height:64px}}
      `;
      document.head.appendChild(uiStyle);
    }
    // 根容器
    uiRoot = document.getElementById('startmenu-ui');
    if (!uiRoot) {
      uiRoot = document.createElement('div');
      uiRoot.id = 'startmenu-ui';
      uiRoot.className = 'startmenu-ui';
      // 仅保留按钮（标题交由 Three 背景模型呈现）
      const startBtn = document.createElement('button');
      startBtn.id = 'start-btn';
      startBtn.className = 'startmenu-btn';
      startBtn.setAttribute('aria-label','开始');
      startBtn.textContent = '开始';
      const settingsBtn = document.createElement('button');
      settingsBtn.id = 'settings-btn';
      settingsBtn.className = 'startmenu-btn';
      settingsBtn.setAttribute('aria-label','设置');
      settingsBtn.textContent = '设置';
      uiRoot.appendChild(startBtn);
      uiRoot.appendChild(settingsBtn);
      document.body.appendChild(uiRoot);
    }
  };
  ensureIntroUI();

  sceneInstance = {
    scene,
    camera,
    renderer,
    animationId,
    handleResize,
    uiRoot,
    uiStyle,
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

      // 移除覆盖层 UI 与样式
      try {
        const root = document.getElementById('startmenu-ui');
        if (root && root.parentNode) root.parentNode.removeChild(root);
      } catch (_) {}
      try {
        const style = document.getElementById('startmenu-style');
        if (style && style.parentNode) style.parentNode.removeChild(style);
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
