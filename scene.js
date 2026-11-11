import * as THREE from "three";
import { createStore } from "./store.js?v=room-settings-1";

export function createEditorScene(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dfe4df");
  scene.fog = new THREE.Fog("#dfe4df", 16, 34);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(8.6, 6, 4.2);
  camera.lookAt(0, 1.1, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-label", "Magazin 3D sahnasi. Sichqoncha bilan orbit va jihozlarni tanlang.");
  host.appendChild(renderer.domElement);

  const room = createStore(scene);
  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  });
  resizeObserver.observe(host);

  let animationId;
  const render = () => {
    animationId = requestAnimationFrame(render);
    renderer.render(scene, camera);
  };
  render();

  return {
    scene,
    camera,
    renderer,
    room,
    dispose() {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
