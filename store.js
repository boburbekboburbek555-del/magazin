import * as THREE from "three";

export let ROOM = Object.freeze({ width: 4, depth: 7, length: 7, height: 2.8, wallThickness: 0.12 });
export const DEFAULT_ROOM_SETTINGS = Object.freeze({
  width: 4,
  depth: 7,
  length: 7,
  height: 2.8,
  frontDoorWidth: 0.94,
  frontDoorOffset: 5.88,
  frontWindowWidth: 5.19,
  frontWindowOffset: 2.695,
  rearDoorEnabled: true,
  rearDoorWidth: 0.92,
  rearDoorOffset: 1.88,
});
export let ROOM_SETTINGS = Object.freeze({
  frontDoorWidth: 0.94,
  frontDoorOffset: 5.88,
  frontWindowWidth: 5.19,
  frontWindowOffset: 2.695,
  rearDoorEnabled: true,
  rearDoorWidth: 0.92,
  rearDoorOffset: 1.88,
});
const wallMeshes = [];
const wallColorMaterials = [];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function normalizeRoomSettings(settings = {}) {
  const width = Number(settings.width ?? ROOM.width);
  const depth = Number(settings.depth ?? settings.length ?? ROOM.depth);
  const height = Number(settings.height ?? ROOM.height);
  if (!Number.isFinite(width) || width < 2 || width > 12 ||
      !Number.isFinite(depth) || depth < 3 || depth > 20 ||
      !Number.isFinite(height) || height < 2.2 || height > 6) {
    throw new Error("Xona o‘lchamlari: eni 2–12 m, uzunligi 3–20 m, balandligi 2,2–6 m bo‘lishi kerak.");
  }
  for (const key of ["frontDoorWidth", "frontDoorOffset", "frontWindowWidth", "frontWindowOffset", "rearDoorWidth", "rearDoorOffset"]) {
    if (settings[key] !== undefined && !Number.isFinite(Number(settings[key]))) {
      throw new Error("Eshik va oyna o‘lchamlari son bilan kiritilishi kerak.");
    }
  }

  const frontDoorWidth = clamp(Number(settings.frontDoorWidth ?? ROOM_SETTINGS.frontDoorWidth), 0.7, Math.min(1.8, depth - 0.4));
  const frontDoorOffset = clamp(
    Number(settings.frontDoorOffset ?? depth - 1.12),
    frontDoorWidth / 2 + 0.12,
    depth - frontDoorWidth / 2 - 0.12,
  );
  const backWindowCapacity = frontDoorOffset - frontDoorWidth / 2 - 0.22;
  const frontWindowCapacity = depth - frontDoorOffset - frontDoorWidth / 2 - 0.22;
  const availableWindowWidth = Math.max(backWindowCapacity, frontWindowCapacity);
  const frontWindowWidth = clamp(
    Number(settings.frontWindowWidth ?? Math.min(5.19, availableWindowWidth)),
    0.5,
    Math.max(0.5, availableWindowWidth),
  );
  const backWindowMin = 0.1 + frontWindowWidth / 2;
  const backWindowMax = frontDoorOffset - frontDoorWidth / 2 - 0.12 - frontWindowWidth / 2;
  const frontWindowMin = frontDoorOffset + frontDoorWidth / 2 + 0.12 + frontWindowWidth / 2;
  const frontWindowMax = depth - 0.1 - frontWindowWidth / 2;
  const windowFitsBehindDoor = backWindowMax >= backWindowMin;
  const windowFitsAheadOfDoor = frontWindowMax >= frontWindowMin;
  const useBackWindow = windowFitsBehindDoor && (
    !windowFitsAheadOfDoor ||
    (Number.isFinite(Number(settings.frontWindowOffset)) && Number(settings.frontWindowOffset) <= frontDoorOffset)
  );
  const windowMin = useBackWindow ? backWindowMin : frontWindowMin;
  const windowMax = useBackWindow ? backWindowMax : frontWindowMax;
  const frontWindowOffset = clamp(
    Number(settings.frontWindowOffset ?? (windowMin + windowMax) / 2),
    windowMin,
    windowMax,
  );
  const rearDoorWidth = clamp(Number(settings.rearDoorWidth ?? ROOM_SETTINGS.rearDoorWidth), 0.6, width - 0.3);
  const rearDoorOffset = clamp(Number(settings.rearDoorOffset ?? width / 2), rearDoorWidth / 2 + 0.15, width - rearDoorWidth / 2 - 0.15);

  return {
    width,
    depth,
    length: depth,
    height,
    frontDoorWidth,
    frontDoorOffset,
    frontWindowWidth,
    frontWindowOffset,
    rearDoorEnabled: settings.rearDoorEnabled !== false,
    rearDoorWidth,
    rearDoorOffset,
  };
}

export function setRoomSettings(settings) {
  const normalized = normalizeRoomSettings(settings);
  ROOM = Object.freeze({
    width: normalized.width,
    depth: normalized.depth,
    length: normalized.depth,
    height: normalized.height,
    wallThickness: ROOM.wallThickness,
  });
  ROOM_SETTINGS = Object.freeze({
    frontDoorWidth: normalized.frontDoorWidth,
    frontDoorOffset: normalized.frontDoorOffset,
    frontWindowWidth: normalized.frontWindowWidth,
    frontWindowOffset: normalized.frontWindowOffset,
    rearDoorEnabled: normalized.rearDoorEnabled,
    rearDoorWidth: normalized.rearDoorWidth,
    rearDoorOffset: normalized.rearDoorOffset,
  });
  return { ...ROOM, ...ROOM_SETTINGS };
}

function wall(scene, width, height, depth, x, y, z, color, rotationY = 0) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.86, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.roomPart = "wall";
  scene.add(mesh);
  wallMeshes.push(mesh);
  wallColorMaterials.push(material);
  return mesh;
}

function addLongFacade(scene, wallColor, sideX) {
  const { width: w, depth: d, height: h, wallThickness: t } = ROOM;
  const { frontDoorWidth: doorWidth, frontDoorOffset, frontWindowWidth, frontWindowOffset } = ROOM_SETTINGS;
  const doorHeight = Math.min(2.3, h - 0.4);
  const glassHeight = doorHeight - 0.02;
  const glassCenterY = glassHeight / 2 + 0.08;
  const doorCenterZ = -d / 2 + frontDoorOffset;
  const doorStart = doorCenterZ - doorWidth / 2;
  const windowStart = -d / 2 + frontWindowOffset - frontWindowWidth / 2;
  const windowEnd = windowStart + frontWindowWidth;
  const windowLength = frontWindowWidth;
  const wallColorMaterial = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.86 });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#756a58", roughness: 0.48, metalness: 0.12 });
  wallColorMaterials.push(wallColorMaterial);
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: "#d7e8e4", transparent: true, opacity: 0.24, roughness: 0.12,
    metalness: 0.08, side: THREE.DoubleSide, depthWrite: false,
  });
  const facade = new THREE.Group();
  facade.userData.roomPart = "wall";
  const faceX = sideX - Math.sign(sideX) * 0.025;
  const frame = (depth, height, width, x, y, z, material = frameMaterial) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(depth, height, width), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    facade.add(mesh);
    return mesh;
  };
  const pane = (length, centerZ) => frame(0.025, glassHeight, length, faceX, glassCenterY, centerZ, glassMaterial);
  const sill = (length, centerZ) => frame(t, 0.12, length, sideX, 0.06, centerZ, wallColorMaterial);

  wall(scene, t, h - doorHeight - 0.12, d, sideX, (h + doorHeight + 0.12) / 2, 0, wallColor);
  wall(scene, t, doorHeight + 0.16, 0.18, sideX, (doorHeight + 0.16) / 2, -d / 2 + 0.09, wallColor);
  wall(scene, t, doorHeight + 0.16, 0.18, sideX, (doorHeight + 0.16) / 2, d / 2 - 0.09, wallColor);
  sill(windowLength + 0.12, (windowStart + windowEnd) / 2);
  sill(doorWidth + 0.12, doorCenterZ);
  const endWindowStart = doorCenterZ + doorWidth / 2 + 0.12;
  const endWindowLength = d / 2 - 0.1 - endWindowStart;
  const mainWindowOverlapsEndSection = windowStart < d / 2 - 0.1 && windowEnd > endWindowStart;
  if (endWindowLength > 0.14 && !mainWindowOverlapsEndSection) {
    pane(endWindowLength, endWindowStart + endWindowLength / 2);
    sill(endWindowLength + 0.04, endWindowStart + endWindowLength / 2);
    frame(0.045, glassHeight + 0.06, 0.045, faceX, glassCenterY, endWindowStart);
    frame(0.045, glassHeight + 0.06, 0.045, faceX, glassCenterY, d / 2 - 0.1);
    frame(0.045, 0.045, endWindowLength, faceX, 0.08, endWindowStart + endWindowLength / 2);
    frame(0.045, 0.045, endWindowLength, faceX, glassHeight + 0.08, endWindowStart + endWindowLength / 2);
  }

  const paneLength = (windowLength - 0.12) / 3;
  for (let index = 0; index < 3; index++) {
    pane(paneLength, windowStart + paneLength / 2 + index * (paneLength + 0.06));
  }
  for (let index = 0; index <= 3; index++) {
    const z = windowStart + index * (paneLength + 0.06);
    frame(0.045, glassHeight + 0.06, 0.045, faceX, glassCenterY, z);
  }
  frame(0.045, 0.045, windowLength, faceX, 0.08, (windowStart + windowEnd) / 2);
  frame(0.045, 0.045, windowLength, faceX, glassHeight + 0.08, (windowStart + windowEnd) / 2);

  const door = new THREE.Group();
  door.userData.roomPart = "wall";
  for (const z of [doorCenterZ - doorWidth / 2, doorCenterZ + doorWidth / 2]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.055, doorHeight, 0.055), frameMaterial);
    jamb.position.set(faceX, doorHeight / 2 + 0.06, z);
    door.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, doorWidth + 0.055), frameMaterial);
  lintel.position.set(faceX, doorHeight + 0.12, doorCenterZ);
  door.add(lintel);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth - 0.09, doorHeight - 0.12),
    new THREE.MeshPhysicalMaterial({
      color: "#b9d1c3", transparent: true, opacity: 0.19,
      roughness: 0.12, metalness: 0.1, side: THREE.DoubleSide,
    })
  );
  panel.rotation.y = Math.PI / 2;
  panel.position.set(faceX - 0.035, doorHeight / 2 + 0.06, doorCenterZ);
  door.add(panel);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), frameMaterial);
  handle.position.set(faceX - 0.085, Math.min(1.12, doorHeight / 2), doorCenterZ - doorWidth * 0.28);
  door.add(handle);
  door.userData.roomPart = "wall";
  scene.add(door);
  scene.add(facade);
  wallMeshes.push(facade, door);
  return door;
}

function addRearDoor(scene, wallColor, backZ) {
  const rearDoorGroup = new THREE.Group();
  rearDoorGroup.userData.roomPart = "wall";
  const { width: w, height: h, wallThickness: t } = ROOM;
  const { rearDoorWidth: doorWidth, rearDoorOffset } = ROOM_SETTINGS;
  const doorHeight = Math.min(2.08, h - 0.4);
  const doorCenterX = -w / 2 + rearDoorOffset;
  const leftWidth = doorCenterX - doorWidth / 2 + w / 2;
  const rightWidth = w / 2 - (doorCenterX + doorWidth / 2);
  wall(scene, leftWidth, h, t, -w / 2 + leftWidth / 2, h / 2, backZ, wallColor);
  wall(scene, rightWidth, h, t, doorCenterX + doorWidth / 2 + rightWidth / 2, h / 2, backZ, wallColor);
  wall(scene, doorWidth, h - doorHeight, t, doorCenterX, doorHeight + (h - doorHeight) / 2, backZ, wallColor);

  const darkOpening = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth, doorHeight),
    new THREE.MeshStandardMaterial({ color: "#38332d", roughness: 0.92, side: THREE.DoubleSide })
  );
  darkOpening.position.set(doorCenterX, doorHeight / 2, backZ + t / 2 + 0.01);
  rearDoorGroup.add(darkOpening);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#716755", roughness: 0.55 });
  for (const x of [doorCenterX - doorWidth / 2, doorCenterX + doorWidth / 2]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.055, doorHeight, 0.055), frameMaterial);
    jamb.position.set(x, doorHeight / 2, backZ + 0.035);
    rearDoorGroup.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.055, 0.055, 0.055), frameMaterial);
  lintel.position.set(doorCenterX, doorHeight, backZ + 0.035);
  rearDoorGroup.add(lintel);
  scene.add(rearDoorGroup);
  wallMeshes.push(rearDoorGroup);
}

function createFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 896;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f4f3ef";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#9c9b95";
  context.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += canvas.width / 10) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += canvas.height / 18) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.fillStyle = "#373732";
  const tileWidth = canvas.width / 10;
  const tileHeight = canvas.height / 18;
  for (let x = 0; x <= 10; x += 2) {
    for (let y = 0; y <= 18; y += 2) {
      context.fillRect(x * tileWidth - 6, y * tileHeight - 6, 12, 12);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addCeilingDetails(scene) {
  const group = new THREE.Group();
  group.userData.roomPart = "ceiling";
  const { width: w, depth: d, height: h } = ROOM;
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#b1a58f", roughness: 0.72, side: THREE.DoubleSide });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: "#fff8e7", emissive: "#fff0c8", emissiveIntensity: 0.7,
    roughness: 0.28, side: THREE.DoubleSide,
  });
  const bar = (width, depth, x, z, material, height = 0.025) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, h - height / 2 + 0.003, z);
    group.add(mesh);
  };

  const insetX = w * 0.37;
  const insetZ = d * 0.39;
  bar(insetX * 2, 0.035, 0, -insetZ, railMaterial);
  bar(insetX * 2, 0.035, 0, insetZ, railMaterial);
  bar(0.035, insetZ * 2, -insetX, 0, railMaterial);
  bar(0.035, insetZ * 2, insetX, 0, railMaterial);
  for (const x of [-0.62, 0.62]) {
    for (const z of [-1.8, 0, 1.8]) {
      bar(0.12, 1.25, x, z, lightMaterial, 0.035);
    }
  }
  for (const z of [-2.4, -0.8, 0.8, 2.4]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.28), lightMaterial);
    panel.position.set(0, h - 0.006, z);
    group.add(panel);
  }
  scene.add(group);
  return group;
}

export function createStore(scene, colors = {}, settings = {}) {
  setRoomSettings(settings);
  wallMeshes.length = 0;
  wallColorMaterials.length = 0;
  const root = new THREE.Group();
  const floorColor = colors.floor || "#e0ded6";
  const wallColor = colors.wall || "#ded0ba";
  const ceilingColor = colors.ceiling || "#e7dcc8";

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.width, 0.12, ROOM.depth),
    new THREE.MeshStandardMaterial({ color: floorColor, map: createFloorTexture(), roughness: 0.78 })
  );
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  floor.userData.roomPart = "floor";
  root.add(floor);

  const gridPositions = [];
  const spacing = 0.25;
  const xSteps = Math.round(ROOM.width / spacing);
  const zSteps = Math.round(ROOM.depth / spacing);
  for (let i = 0; i <= xSteps; i++) {
    const x = -ROOM.width / 2 + i * spacing;
    gridPositions.push(x, 0.006, -ROOM.depth / 2, x, 0.006, ROOM.depth / 2);
  }
  for (let i = 0; i <= zSteps; i++) {
    const z = -ROOM.depth / 2 + i * spacing;
    gridPositions.push(-ROOM.width / 2, 0.006, z, ROOM.width / 2, 0.006, z);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
  const grid = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: "#849182", transparent: true, opacity: 0.18 }));
  grid.userData.roomPart = "grid";
  root.add(grid);

  const { width: w, depth: d, height: h, wallThickness: t } = ROOM;
  const backZ = -d / 2;
  const frontZ = d / 2;
  const sideMaterial = new THREE.MeshStandardMaterial({ color: ceilingColor, roughness: 0.82, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), sideMaterial);
  ceiling.position.y = h + 0.04;
  ceiling.userData.roomPart = "ceiling";
  root.add(ceiling);
  const ceilingDetails = addCeilingDetails(root);

  if (ROOM_SETTINGS.rearDoorEnabled) addRearDoor(root, wallColor, backZ);
  else wall(root, w + t, h, t, 0, h / 2, backZ, wallColor);
  wall(root, w + t, h, t, 0, h / 2, frontZ, wallColor);
  wall(root, t, h, d + t, -w / 2, h / 2, 0, wallColor);
  const doorGroup = addLongFacade(root, wallColor, w / 2);

  addRoomLights(root);
  scene.add(root);
  return { root, floor, grid, ceiling, ceilingDetails, doorGroup };
}

export function rebuildStore(scene, previousRoom, colors = {}, settings = {}) {
  if (previousRoom?.root) {
    previousRoom.root.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose();
    });
    scene.remove(previousRoom.root);
  }
  return createStore(scene, colors, settings);
}

function addRoomLights(scene) {
  const ambient = new THREE.HemisphereLight("#f4f7ed", "#776650", 2.1);
  ambient.position.set(0, 6, 0);
  scene.add(ambient);
  const key = new THREE.DirectionalLight("#fff5df", 3);
  key.position.set(-4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.00015;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#e3eee8", 1.1);
  fill.position.set(2, 4, -4);
  scene.add(fill);
  const points = [
    [-1.2, 2.5, -2.3], [0, 2.5, -2.3], [1.2, 2.5, -2.3],
    [-1.2, 2.5, 0], [0, 2.5, 0], [1.2, 2.5, 0],
    [-1.2, 2.5, 2.2], [0, 2.5, 2.2], [1.2, 2.5, 2.2],
  ];
  points.forEach(([x, y, z]) => {
    const light = new THREE.PointLight("#fff6dd", 0.48, 4, 2);
    light.position.set(x, y, z);
    scene.add(light);
  });
}

export function setWallsVisible(visible) {
  wallMeshes.forEach(mesh => { mesh.visible = visible; });
}

export function setWallsOpacity(opacity) {
  wallMeshes.forEach(mesh => {
    if (mesh.material?.opacity !== undefined) mesh.material.opacity = opacity;
  });
}

export function setRoomColor(roomParts, part, color) {
  if (!/^#[\da-f]{6}$/i.test(color)) throw new Error("Invalid room color");
  if (part === "wall") {
    wallColorMaterials.forEach(material => material.color.set(color));
    return;
  }
  const mesh = roomParts[part];
  if (mesh?.material?.color) mesh.material.color.set(color);
}
