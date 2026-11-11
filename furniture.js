import * as THREE from "three";

export const FURNITURE_TYPES = [
  { type: "wallShelf", name: "Devor javoni", category: "Javonlar", icon: "shelf", width: 1.2, depth: 0.38, height: 1.9, color: "#b88e5d" },
  { type: "gondola", name: "Markaziy javon", category: "Javonlar", icon: "gondola", width: 1.5, depth: 0.85, height: 1.45, color: "#c5a474" },
  { type: "cashier", name: "Kassa stoli", category: "Savdo jihozi", icon: "cashier", width: 1.35, depth: 0.62, height: 0.95, color: "#687b68" },
  { type: "fridge", name: "Ichimlik muzlatkichi", category: "Sovutkichlar", icon: "fridge", width: 0.9, depth: 0.72, height: 1.95, color: "#819b99" },
  { type: "freezer", name: "Muzlatkich vitrinası", category: "Sovutkichlar", icon: "freezer", width: 1.2, depth: 0.72, height: 1.15, color: "#91a8a6" },
  { type: "showcase", name: "Mahsulot vitrinası", category: "Vitrinalar", icon: "showcase", width: 1.2, depth: 0.55, height: 1.15, color: "#a7b3a5" },
  { type: "cabinet", name: "Ombor shkafi", category: "Saqlash", icon: "cabinet", width: 1.1, depth: 0.48, height: 1.8, color: "#9b8064" },
  { type: "sign", name: "Reklama paneli", category: "Boshqa", icon: "sign", width: 1.4, depth: 0.08, height: 0.48, color: "#d0d77f" },
  { type: "light", name: "LED yoritgich", category: "Boshqa", icon: "light", width: 1.2, depth: 0.08, height: 0.06, color: "#f4d889" },
  { type: "camera", name: "Kuzatuv kamerasi", category: "Boshqa", icon: "camera", width: 0.22, depth: 0.18, height: 0.16, color: "#67716d" },
];

export const templateFor = type => FURNITURE_TYPES.find(item => item.type === type);

function box(group, material, width, height, depth, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function material(color, roughness = 0.65, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function createFurniture(type, id = crypto.randomUUID()) {
  const template = templateFor(type);
  if (!template) throw new Error(`Unknown furniture type: ${type}`);

  const group = new THREE.Group();
  const { width: w, depth: d, height: h } = template;
  const body = material(template.color);
  body.userData.colorable = true;
  const trim = material("#e0d9c9", 0.42);
  const dark = material("#414a45", 0.42, 0.16);
  const glass = new THREE.MeshPhysicalMaterial({ color: "#d9eff0", transparent: true, opacity: 0.33, roughness: 0.13, metalness: 0.08, depthWrite: false });
  const led = new THREE.MeshStandardMaterial({ color: "#fff2bc", emissive: "#fff0a8", emissiveIntensity: 1.1, roughness: 0.3 });

  switch (type) {
    case "wallShelf": {
      for (const x of [-w * 0.46, w * 0.46]) box(group, dark, 0.045, h, 0.045, x, 0, 0);
      for (const y of [-h * 0.43, -h * 0.12, h * 0.18, h * 0.43]) {
        box(group, body, w, 0.055, d, 0, y, 0);
        box(group, trim, w * 0.94, 0.012, 0.018, 0, y + 0.034, d * 0.44, false);
      }
      box(group, body, w, 0.07, 0.055, 0, -h * 0.5 + 0.035, 0);
      break;
    }
    case "gondola": {
      box(group, body, w * 0.9, 0.08, d * 0.88, 0, -h * 0.45, 0);
      for (const z of [-d * 0.38, d * 0.38]) {
        for (const x of [-w * 0.44, w * 0.44]) box(group, dark, 0.035, h * 0.91, 0.035, x, 0, z);
        for (const y of [-h * 0.31, 0, h * 0.29]) box(group, body, w * 0.94, 0.055, d * 0.44, 0, y, z);
        box(group, trim, w * 0.88, 0.018, 0.02, 0, -h * 0.31 + 0.035, z + Math.sign(z) * d * 0.19, false);
      }
      box(group, dark, w * 0.8, 0.045, d * 0.72, 0, h * 0.47, 0);
      break;
    }
    case "cashier": {
      box(group, body, w, h * 0.8, d * 0.83, 0, -h * 0.1, 0);
      box(group, trim, w * 1.03, 0.07, d, 0, h * 0.39, 0);
      box(group, dark, w * 0.28, 0.16, 0.11, w * 0.23, h * 0.51, 0);
      box(group, trim, 0.22, 0.13, 0.15, -w * 0.27, h * 0.49, -d * 0.05);
      break;
    }
    case "fridge": {
      box(group, dark, w * 0.95, h * 0.98, d * 0.94, 0, 0, 0);
      box(group, body, w * 0.88, h * 0.93, d * 0.82, 0, -0.015, 0);
      box(group, glass, w * 0.76, h * 0.78, 0.018, 0, -h * 0.015, d * 0.43);
      for (const y of [-h * 0.25, 0, h * 0.25]) box(group, trim, w * 0.7, 0.022, d * 0.035, 0, y, d * 0.45);
      box(group, dark, 0.025, h * 0.75, 0.027, w * 0.31, 0, d * 0.46);
      box(group, led, w * 0.7, 0.025, 0.025, 0, h * 0.44, d * 0.45, false);
      break;
    }
    case "freezer": {
      box(group, dark, w * 0.98, h * 0.84, d * 0.9, 0, -h * 0.08, 0);
      box(group, body, w * 0.93, h * 0.75, d * 0.85, 0, -h * 0.12, 0);
      box(group, glass, w * 0.94, 0.045, d * 0.8, 0, h * 0.37, 0);
      box(group, trim, w * 0.93, 0.07, d * 0.88, 0, h * 0.44, 0);
      for (const x of [-w * 0.2, w * 0.2]) box(group, dark, 0.018, 0.02, d * 0.72, x, h * 0.405, 0);
      break;
    }
    case "showcase": {
      box(group, body, w * 0.92, h * 0.48, d * 0.88, 0, -h * 0.24, 0);
      box(group, dark, w * 0.96, 0.06, d * 0.94, 0, -h * 0.48, 0);
      box(group, glass, w * 0.9, h * 0.42, d * 0.83, 0, h * 0.03, 0);
      box(group, trim, w * 0.98, 0.045, d * 0.96, 0, h * 0.28, 0);
      box(group, trim, w * 0.92, 0.025, d * 0.86, 0, -h * 0.06, 0);
      break;
    }
    case "cabinet": {
      box(group, body, w, h, d, 0, 0, 0);
      box(group, trim, w * 0.88, 0.025, 0.025, 0, h * 0.18, d * 0.51);
      box(group, trim, w * 0.88, 0.025, 0.025, 0, -h * 0.18, d * 0.51);
      box(group, dark, 0.018, h * 0.8, 0.02, 0, 0, d * 0.515);
      for (const x of [-0.06, 0.06]) box(group, trim, 0.018, 0.07, 0.025, x, 0, d * 0.53);
      break;
    }
    case "sign": {
      box(group, dark, w, h, d, 0, 0, 0);
      box(group, body, w * 0.94, h * 0.82, d * 0.7, 0, 0, d * 0.22);
      box(group, led, w * 0.42, 0.025, 0.012, 0, 0, d * 0.61, false);
      break;
    }
    case "light": {
      box(group, dark, w, h, d, 0, 0, 0);
      box(group, led, w * 0.86, h * 0.52, d * 0.7, 0, -h * 0.1, 0, false);
      break;
    }
    case "camera": {
      box(group, dark, w * 0.7, h * 0.74, d * 0.68, 0, -h * 0.12, 0);
      box(group, body, w, h * 0.65, d * 0.48, 0, h * 0.06, d * 0.24);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.035, 12), material("#1a2420", 0.2));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, h * 0.06, d * 0.51);
      group.add(lens);
      break;
    }
  }

  group.position.y = h / 2;
  group.userData = {
    furniture: true,
    id,
    type,
    name: template.name,
    category: template.category,
    icon: template.icon,
    dimensions: { width: w, depth: d, height: h },
    baseDimensions: { width: w, depth: d, height: h },
    color: template.color,
  };
  group.traverse(child => { if (child.isMesh) child.userData.furnitureId = id; });
  return group;
}

export function serializeFurniture(group) {
  const d = group.userData.dimensions;
  return {
    id: group.userData.id,
    type: group.userData.type,
    position: group.position.toArray(),
    rotation: group.rotation.y,
    dimensions: { ...d },
    color: group.userData.color,
  };
}

export function restoreFurniture(data) {
  const group = createFurniture(data.type, data.id);
  if (Array.isArray(data.position) && data.position.length === 3 && data.position.every(Number.isFinite)) group.position.fromArray(data.position);
  if (Number.isFinite(data.rotation)) group.rotation.y = data.rotation;
  if (data.dimensions) setFurnitureDimensions(group, data.dimensions);
  if (typeof data.color === "string") setFurnitureColor(group, data.color);
  return group;
}

export function setFurnitureDimensions(group, dimensions) {
  const base = group.userData.baseDimensions;
  const next = {
    width: THREE.MathUtils.clamp(Number(dimensions.width) || base.width, 0.2, 6.8),
    depth: THREE.MathUtils.clamp(Number(dimensions.depth) || base.depth, 0.2, 3.8),
    height: THREE.MathUtils.clamp(Number(dimensions.height) || base.height, 0.2, 2.7),
  };
  group.scale.set(next.width / base.width, next.height / base.height, next.depth / base.depth);
  group.position.y += (next.height - group.userData.dimensions.height) / 2;
  group.userData.dimensions = next;
}

export function setFurnitureColor(group, color) {
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error("Invalid furniture color");
  group.userData.color = color;
  const mainColor = new THREE.Color(color);
  group.traverse(child => {
    if (!child.isMesh || !child.material.userData.colorable) return;
    child.material.color.copy(mainColor);
  });
}
