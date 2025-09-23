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
    destroy() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      scene.clear();
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
