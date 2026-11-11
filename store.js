import * as THREE from "three";

export let ROOM = Object.freeze({ width: 4, depth: 8, length: 8, height: 2.8, wallThickness: 0.12 });
export const DEFAULT_ROOM_SETTINGS = Object.freeze({
  width: 4,
  depth: 8,
  length: 8,
  height: 2.8,
  frontDoorWidth: 1.2,
  frontDoorOffset: 6.88,
  frontWindowWidth: 5.2,
  frontWindowOffset: 3.48,
  rearDoorEnabled: true,
  rearDoorWall: "back",
  rearDoorWidth: 0.6,
  rearDoorHeight: 2,
  rearDoorOffset: 2.7,
  recessWidth: 1.4,
  recessLength: 2,
  sideWindowCount: 3,
  sideWindowWidth: 0.55,
  sideWindowHeight: 0.4,
  sideWindowTopGap: 0.2,
});
export let ROOM_SETTINGS = Object.freeze({
  ...DEFAULT_ROOM_SETTINGS,
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
  for (const key of [
    "frontDoorWidth", "frontDoorOffset", "frontWindowWidth", "frontWindowOffset",
    "rearDoorWidth", "rearDoorHeight", "rearDoorOffset", "recessWidth", "recessLength",
    "sideWindowCount", "sideWindowWidth", "sideWindowHeight", "sideWindowTopGap",
  ]) {
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
    Number(settings.frontWindowWidth ?? Math.min(5.2, availableWindowWidth)),
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
  const rearDoorWall = ["back", "recess"].includes(settings.rearDoorWall)
    ? settings.rearDoorWall
    : DEFAULT_ROOM_SETTINGS.rearDoorWall;
  const recessWidth = clamp(Number(settings.recessWidth ?? ROOM_SETTINGS.recessWidth), 0.2, width - 0.3);
  const recessLength = clamp(
    Number(settings.recessLength ?? ROOM_SETTINGS.recessLength),
    rearDoorWall === "recess" && settings.rearDoorEnabled !== false ? 0.9 : 0.2,
    depth - 1,
  );
  const rearDoorSpan = rearDoorWall === "recess" ? recessLength : width;
  const rearDoorWidth = clamp(Number(settings.rearDoorWidth ?? ROOM_SETTINGS.rearDoorWidth), 0.6, rearDoorSpan - 0.3);
  const rearDoorHeight = clamp(Number(settings.rearDoorHeight ?? ROOM_SETTINGS.rearDoorHeight), 1.2, height - 0.2);
  const rearDoorOffsetDefault = settings.rearDoorWall === undefined
    ? DEFAULT_ROOM_SETTINGS.rearDoorOffset
    : ROOM_SETTINGS.rearDoorOffset;
  const rearDoorOffset = clamp(
    Number(settings.rearDoorOffset ?? rearDoorOffsetDefault),
    rearDoorWidth / 2 + 0.15,
    rearDoorSpan - rearDoorWidth / 2 - 0.15,
  );
  const sideWindowCount = Math.round(clamp(Number(settings.sideWindowCount ?? ROOM_SETTINGS.sideWindowCount), 0, 8));
  const sideWindowWidth = clamp(Number(settings.sideWindowWidth ?? ROOM_SETTINGS.sideWindowWidth), 0.15, Math.max(0.15, (depth - recessLength - 0.3) / Math.max(sideWindowCount, 1) - 0.1));
  const sideWindowHeight = clamp(Number(settings.sideWindowHeight ?? ROOM_SETTINGS.sideWindowHeight), 0.15, Math.max(0.15, height - 0.8));
  const sideWindowTopGap = clamp(Number(settings.sideWindowTopGap ?? ROOM_SETTINGS.sideWindowTopGap), 0.05, height - sideWindowHeight - 0.2);

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
    rearDoorWall,
    rearDoorWidth,
    rearDoorHeight,
    rearDoorOffset,
    recessWidth,
    recessLength,
    sideWindowCount,
    sideWindowWidth,
    sideWindowHeight,
    sideWindowTopGap,
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
    rearDoorWall: normalized.rearDoorWall,
    rearDoorWidth: normalized.rearDoorWidth,
    rearDoorHeight: normalized.rearDoorHeight,
    rearDoorOffset: normalized.rearDoorOffset,
    recessWidth: normalized.recessWidth,
    recessLength: normalized.recessLength,
    sideWindowCount: normalized.sideWindowCount,
    sideWindowWidth: normalized.sideWindowWidth,
    sideWindowHeight: normalized.sideWindowHeight,
    sideWindowTopGap: normalized.sideWindowTopGap,
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
  const { frontDoorWidth: doorWidth, frontDoorOffset, frontWindowWidth } = ROOM_SETTINGS;
  const doorHeight = Math.min(2, h - 0.4);
  const sillHeight = 0.4;
  const windowTop = h - 0.2;
  const windowHeight = windowTop - sillHeight;
  const glassCenterY = (windowTop + sillHeight) / 2;
  const doorCenterZ = -d / 2 + frontDoorOffset;
  const doorStart = doorCenterZ - doorWidth / 2;
  const windowGap = 0.2;
  const windowStart = -d / 2 + ROOM_SETTINGS.frontWindowOffset - frontWindowWidth / 2;
  const windowWidth = (frontWindowWidth - windowGap) / 2;
  const windowCenters = [
    windowStart + windowWidth / 2,
    windowStart + windowWidth + windowGap + windowWidth / 2,
  ];
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#756a58", roughness: 0.48, metalness: 0.12 });
  const wallColorMaterial = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.86 });
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
  const segment = (startZ, endZ, bottom = 0, top = h) => {
    if (endZ - startZ <= 0.02 || top - bottom <= 0.02) return;
    wall(scene, t, top - bottom, endZ - startZ, sideX, (top + bottom) / 2, (startZ + endZ) / 2, wallColor);
  };
  const sortedOpenings = [
    ...windowCenters.map(center => ({ start: center - windowWidth / 2, end: center + windowWidth / 2, sill: sillHeight, head: windowTop })),
    { start: doorStart, end: doorStart + doorWidth, sill: 0, head: doorHeight },
  ].sort((a, b) => a.start - b.start);
  let cursor = -d / 2;
  for (const opening of sortedOpenings) {
    segment(cursor, opening.start);
    segment(opening.start, opening.end, 0, opening.sill);
    segment(opening.start, opening.end, opening.head, h);
    cursor = opening.end;
  }
  segment(cursor, d / 2);

  for (const centerZ of windowCenters) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth - 0.08, windowHeight - 0.08), glassMaterial);
    pane.rotation.y = Math.PI / 2;
    pane.position.set(faceX - 0.035, glassCenterY, centerZ);
    facade.add(pane);
    for (const z of [centerZ - windowWidth / 2, centerZ + windowWidth / 2]) {
      frame(0.045, windowHeight + 0.04, 0.045, faceX, glassCenterY, z);
    }
    frame(0.045, 0.045, windowWidth, faceX, sillHeight, centerZ);
    frame(0.045, 0.045, windowWidth, faceX, windowTop, centerZ);
  }

  const door = new THREE.Group();
  door.userData.roomPart = "wall";
  for (const z of [doorCenterZ - doorWidth / 2, doorCenterZ + doorWidth / 2]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.055, doorHeight, 0.055), frameMaterial);
    jamb.position.set(faceX, doorHeight / 2, z);
    door.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, doorWidth + 0.055), frameMaterial);
  lintel.position.set(faceX, doorHeight, doorCenterZ);
  door.add(lintel);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth - 0.09, doorHeight - 0.08),
    new THREE.MeshPhysicalMaterial({
      color: "#b9d1c3", transparent: true, opacity: 0.19,
      roughness: 0.12, metalness: 0.1, side: THREE.DoubleSide,
    })
  );
  panel.rotation.y = Math.PI / 2;
  panel.position.set(faceX - 0.035, doorHeight / 2, doorCenterZ);
  door.add(panel);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), frameMaterial);
  handle.position.set(faceX - 0.085, Math.min(1.05, doorHeight / 2), doorCenterZ - doorWidth * 0.28);
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
  const { rearDoorWidth: doorWidth, rearDoorHeight, rearDoorOffset } = ROOM_SETTINGS;
  const doorHeight = Math.min(rearDoorHeight, h - 0.2);
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

function addRearDoorAtRecess(scene, wallColor, recessX, recessZ, frontZ) {
  const { height: h, wallThickness: t } = ROOM;
  const { rearDoorWidth: doorWidth, rearDoorHeight, rearDoorOffset } = ROOM_SETTINGS;
  const doorHeight = Math.min(rearDoorHeight, h - 0.2);
  const doorCenterZ = recessZ + rearDoorOffset;
  const doorStart = doorCenterZ - doorWidth / 2;
  const doorEnd = doorCenterZ + doorWidth / 2;
  const leftWidth = doorStart - recessZ;
  const rightWidth = frontZ - doorEnd;
  wall(scene, t, h, leftWidth, recessX, h / 2, recessZ + leftWidth / 2, wallColor);
  wall(scene, t, h, rightWidth, recessX, h / 2, doorEnd + rightWidth / 2, wallColor);
  wall(scene, t, h - doorHeight, doorWidth, recessX, doorHeight + (h - doorHeight) / 2, doorCenterZ, wallColor);

  const faceX = recessX + t / 2 + 0.025;
  const rearDoorGroup = new THREE.Group();
  rearDoorGroup.userData.roomPart = "wall";
  const darkOpening = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth, doorHeight),
    new THREE.MeshStandardMaterial({ color: "#38332d", roughness: 0.92, side: THREE.DoubleSide })
  );
  darkOpening.rotation.y = Math.PI / 2;
  darkOpening.position.set(faceX, doorHeight / 2, doorCenterZ);
  rearDoorGroup.add(darkOpening);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#716755", roughness: 0.55 });
  for (const z of [doorStart, doorEnd]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.055, doorHeight, 0.055), frameMaterial);
    jamb.position.set(faceX, doorHeight / 2, z);
    rearDoorGroup.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, doorWidth + 0.055), frameMaterial);
  lintel.position.set(faceX, doorHeight, doorCenterZ);
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

function footprintShape() {
  const { width: w, depth: d } = ROOM;
  const { recessWidth, recessLength } = ROOM_SETTINGS;
  const leftX = -w / 2;
  const recessX = leftX + recessWidth;
  const frontZ = d / 2;
  const recessZ = frontZ - recessLength;
  const shape = new THREE.Shape();
  shape.moveTo(leftX, d / 2);
  shape.lineTo(w / 2, d / 2);
  shape.lineTo(w / 2, -d / 2);
  shape.lineTo(leftX, -d / 2);
  shape.lineTo(leftX, -recessZ);
  shape.lineTo(recessX, -recessZ);
  shape.lineTo(recessX, -frontZ);
  shape.lineTo(leftX, -frontZ);
  shape.closePath();
  return shape;
}

function addUpperSideWindows(scene, wallColor) {
  const { width: w, depth: d, height: h, wallThickness: t } = ROOM;
  const { sideWindowCount: count, sideWindowWidth: windowWidth, sideWindowHeight, sideWindowTopGap } = ROOM_SETTINGS;
  const x = -w / 2;
  const startZ = -d / 2;
  const endZ = d / 2 - ROOM_SETTINGS.recessLength;
  const span = endZ - startZ;
  const windowHeight = Math.min(sideWindowHeight, h - sideWindowTopGap - 0.2);
  const windowBottom = h - sideWindowTopGap - windowHeight;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#756a58", roughness: 0.48, metalness: 0.12 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: "#d7e8e4", transparent: true, opacity: 0.24, roughness: 0.12,
    metalness: 0.08, side: THREE.DoubleSide, depthWrite: false,
  });
  const centers = count
    ? Array.from({ length: count }, (_, i) => startZ + span * (i + 1) / (count + 1))
    : [];
  let cursor = startZ;
  for (const centerZ of centers) {
    const openingStart = centerZ - windowWidth / 2;
    const openingEnd = centerZ + windowWidth / 2;
    if (openingStart > cursor) wall(scene, t, h, openingStart - cursor, x, h / 2, (cursor + openingStart) / 2, wallColor);
    wall(scene, t, windowBottom, windowWidth, x, windowBottom / 2, centerZ, wallColor);
    wall(scene, t, h - windowBottom - windowHeight, windowWidth, x, windowBottom + windowHeight + (h - windowBottom - windowHeight) / 2, centerZ, wallColor);

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth - 0.06, windowHeight - 0.06), glassMaterial);
    pane.rotation.y = Math.PI / 2;
    pane.position.set(x - Math.sign(x) * 0.035, windowBottom + windowHeight / 2, centerZ);
    scene.add(pane);
    wallMeshes.push(pane);
    for (const z of [openingStart, openingEnd]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.045, windowHeight, 0.045), frameMaterial);
      jamb.position.set(x - Math.sign(x) * 0.035, windowBottom + windowHeight / 2, z);
      scene.add(jamb);
      wallMeshes.push(jamb);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, windowWidth), frameMaterial);
    sill.position.set(x, windowBottom, centerZ);
    scene.add(sill);
    wallMeshes.push(sill);
    const lintel = sill.clone();
    lintel.position.y = windowBottom + windowHeight;
    scene.add(lintel);
    wallMeshes.push(lintel);
    cursor = openingEnd;
  }
  if (endZ > cursor) wall(scene, t, h, endZ - cursor, x, h / 2, (cursor + endZ) / 2, wallColor);
}

export function createStore(scene, colors = {}, settings = {}) {
  setRoomSettings(settings);
  wallMeshes.length = 0;
  wallColorMaterials.length = 0;
  const root = new THREE.Group();
  const floorColor = colors.floor || "#e0ded6";
  const wallColor = colors.wall || "#ded0ba";
  const ceilingColor = colors.ceiling || "#e7dcc8";

  const floorGeometry = new THREE.ShapeGeometry(footprintShape());
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(
    floorGeometry,
    new THREE.MeshStandardMaterial({ color: floorColor, map: createFloorTexture(), roughness: 0.78 })
  );
  floor.position.y = 0;
  floor.receiveShadow = true;
  floor.userData.roomPart = "floor";
  root.add(floor);

  const gridPositions = [];
  const spacing = 0.25;
  const xSteps = Math.round(ROOM.width / spacing);
  const zSteps = Math.round(ROOM.depth / spacing);
  for (let i = 0; i <= xSteps; i++) {
    const x = -ROOM.width / 2 + i * spacing;
    const zEnd = x < -ROOM.width / 2 + ROOM_SETTINGS.recessWidth ? ROOM.depth / 2 - ROOM_SETTINGS.recessLength : ROOM.depth / 2;
    gridPositions.push(x, 0.006, -ROOM.depth / 2, x, 0.006, zEnd);
  }
  for (let i = 0; i <= zSteps; i++) {
    const z = -ROOM.depth / 2 + i * spacing;
    const xStart = z > ROOM.depth / 2 - ROOM_SETTINGS.recessLength ? -ROOM.width / 2 + ROOM_SETTINGS.recessWidth : -ROOM.width / 2;
    gridPositions.push(xStart, 0.006, z, ROOM.width / 2, 0.006, z);
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
  const ceilingGeometry = new THREE.ShapeGeometry(footprintShape());
  ceilingGeometry.rotateX(-Math.PI / 2);
  const ceiling = new THREE.Mesh(ceilingGeometry, sideMaterial);
  ceiling.position.y = h + 0.04;
  ceiling.userData.roomPart = "ceiling";
  root.add(ceiling);
  const ceilingDetails = addCeilingDetails(root);

  if (ROOM_SETTINGS.rearDoorEnabled && ROOM_SETTINGS.rearDoorWall === "back") addRearDoor(root, wallColor, backZ);
  else wall(root, w + t, h, t, 0, h / 2, backZ, wallColor);
  const recessX = -w / 2 + ROOM_SETTINGS.recessWidth;
  const recessZ = frontZ - ROOM_SETTINGS.recessLength;
  wall(root, w - ROOM_SETTINGS.recessWidth + t, h, t, (recessX + w / 2) / 2, h / 2, frontZ, wallColor);
  wall(root, t, h, d - ROOM_SETTINGS.recessLength + t, -w / 2, h / 2, (backZ + recessZ) / 2, wallColor);
  wall(root, ROOM_SETTINGS.recessWidth, h, t, (-w / 2 + recessX) / 2, h / 2, recessZ, wallColor);
  if (ROOM_SETTINGS.rearDoorEnabled && ROOM_SETTINGS.rearDoorWall === "recess") {
    addRearDoorAtRecess(root, wallColor, recessX, recessZ, frontZ);
  } else {
    wall(root, t, h, ROOM_SETTINGS.recessLength + t, recessX, h / 2, (recessZ + frontZ) / 2, wallColor);
  }
  addUpperSideWindows(root, wallColor);
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
