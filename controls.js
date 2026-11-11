import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { ROOM } from "./store.js?v=room-settings-3";

export function createEditorControls({ scene, camera, renderer, onSelect, onChange }) {
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 1, 0);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.075;
  orbit.minDistance = 4;
  orbit.maxDistance = 22;
  orbit.maxPolarAngle = Math.PI * 0.49;

  const transform = new TransformControls(camera, renderer.domElement);
  transform.setSize(0.78);
  scene.add(transform.getHelper());
  transform.addEventListener("dragging-changed", event => { orbit.enabled = !event.value; });
  transform.addEventListener("objectChange", () => {
    const object = transform.object;
    if (object?.userData.furniture) {
      constrainFurniture(object);
      onChange(object);
    }
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDown;
  renderer.domElement.addEventListener("pointerdown", event => {
    pointerDown = { x: event.clientX, y: event.clientY, button: event.button };
  });
  renderer.domElement.addEventListener("pointerup", event => {
    if (!pointerDown || pointerDown.button !== 0 || event.button !== 0) return;
    if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 4 || transform.dragging) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children.filter(child => child.userData.furniture), true);
    const hit = hits.find(item => item.object.userData.furnitureId);
    if (!hit) {
      onSelect(null);
      return;
    }
    let selected = hit.object;
    while (selected.parent && !selected.userData.furniture) selected = selected.parent;
    onSelect(selected.userData.furniture ? selected : null);
  });

  return {
    orbit,
    transform,
    select(object) {
      if (object) transform.attach(object);
      else transform.detach();
    },
    setMode(mode) {
      transform.setMode(mode);
      transform.showX = mode !== "rotate";
      transform.showY = true;
      transform.showZ = mode !== "rotate";
      if (mode === "scale") transform.setSpace("local");
    },
    setEnabled(enabled) {
      orbit.enabled = enabled;
      if (!enabled) transform.detach();
    },
    setTransformEnabled(enabled) {
      transform.enabled = enabled;
    },
    dispose() {
      transform.dispose();
      orbit.dispose();
    },
  };
}

export function constrainFurniture(object) {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const halfWidth = ROOM.width / 2 - ROOM.wallThickness / 2;
  const halfDepth = ROOM.depth / 2 - ROOM.wallThickness / 2;
  let dx = 0;
  let dz = 0;
  if (bounds.min.x < -halfWidth) dx = -halfWidth - bounds.min.x;
  if (bounds.max.x > halfWidth) dx = halfWidth - bounds.max.x;
  if (bounds.min.z < -halfDepth) dz = -halfDepth - bounds.min.z;
  if (bounds.max.z > halfDepth) dz = halfDepth - bounds.max.z;
  object.position.x += dx;
  object.position.z += dz;

  const floor = object.userData.dimensions.height / 2;
  const ceiling = ROOM.height - floor;
  object.position.y = THREE.MathUtils.clamp(object.position.y, floor, Math.max(floor, ceiling));
  object.updateMatrixWorld(true);
}
