import * as THREE from "three";
import { createEditorScene } from "./scene.js?v=room-settings-3";
import { createEditorControls, constrainFurniture } from "./controls.js?v=room-settings-3";
import { FURNITURE_TYPES, createFurniture, setFurnitureColor, setFurnitureDimensions, templateFor } from "./furniture.js";
import { DEFAULT_ROOM_SETTINGS, ROOM, normalizeRoomSettings, rebuildStore, setRoomColor, setWallsVisible } from "./store.js?v=room-settings-3";
import { createProject, downloadProject, loadSavedProject, parseProjectFile, saveProject } from "./storage.js?v=room-settings-3";

const $ = selector => document.querySelector(selector);
const canvasHost = $("#canvasHost");
const toastElement = $("#toast");
const loadingState = $("#loadingState");
const state = {
  objects: [],
  selected: null,
  title: "Yangi magazin loyihasi",
  preset: "empty",
  colors: { wall: "#ded0ba", floor: "#e0ded6", ceiling: "#e7dcc8" },
  room: normalizeRoomSettings(DEFAULT_ROOM_SETTINGS),
  wallsVisible: true,
  ceilingVisible: false,
  view: "3d",
  theme: localStorage.getItem("magazin3d-theme") || "dark",
};

let editor;
let controls;
let saveTimer;
let toastTimer;

document.body.classList.toggle("light-theme", state.theme === "light");
buildCatalog();

let sceneReady = false;
try {
  editor = createEditorScene(canvasHost);
  controls = createEditorControls({
    ...editor,
    onSelect: setSelected,
    onChange: () => { syncProperties(); clearCollisionReport(); scheduleSave(); },
  });
  editor.room.ceiling.visible = state.ceilingVisible;
  editor.room.ceilingDetails.visible = state.ceilingVisible;
  sceneReady = true;
} catch (error) {
  console.error("3D sahnani ishga tushirib bo‘lmadi:", error);
  loadingState.innerHTML = `<span>3D sahna ishga tushmadi. Internet ulanishi va WebGL’ni tekshiring.</span>`;
  toast("3D modulni yuklab bo‘lmadi");
}

if (sceneReady) {
  try {
    const saved = loadSavedProject();
    if (saved) {
      applyProject(saved);
      toast("Saqlangan loyiha yuklandi");
    } else {
      applyEmptyRoom({ persist: false });
    }
  } catch (error) {
    console.error("Saqlangan loyiha yuklanmadi:", error);
    applyEmptyRoom({ persist: false });
    toast("Saqlangan loyiha buzilgan, bo‘sh xona ochildi");
  }
  loadingState.classList.add("hidden");
}

function buildCatalog() {
  const icons = {
    shelf: '<path d="M7 27V5h28v22M5 11h32M5 19h32M5 27h32M10 6v21m22-21v21"/>',
    gondola: '<path d="M9 29V6m24 23V6M5 9h32M5 17h32M5 25h32M7 29h32"/>',
    cashier: '<path d="M5 12h32v18H5zM3 9h36v4H3zm6 8h13v9H9zm18 1h7m-7 4h7"/>',
    fridge: '<path d="M10 4h24v29H10zM13 8h18v13H13zm0 16h18v6H13zm14-13v8m-14-2h18"/>',
    freezer: '<path d="M5 13h34v18H5zM3 10h38v5H3zm14 1v3m8-3v3m-14 8h22"/>',
    showcase: '<path d="M5 8h34v15H5zM8 11h28v9H8zM7 23v9m30-9v9M5 32h34M5 25h34"/>',
    cabinet: '<path d="M9 4h26v29H9zM22 5v27M12 12h8m5 0h8M12 25h8m5 0h8m-6-8h1"/>',
    sign: '<path d="M5 8h34v18H5zM9 12h26v10H9zm13 14v7m-8 0h16"/>',
    light: '<path d="M5 13h34l-3 9H8zm5 9v6m24-6v6M12 10l-2-3m10 3V5m10 5 2-3"/>',
    camera: '<path d="M8 13h19l9 5-9 5H8zM6 13l-2 2v6l2 2m9-10V9h8v4m-2 10v7m-6 0h12"/>',
  };
  const root = $("#catalogItems");
  FURNITURE_TYPES.forEach(item => {
    const button = document.createElement("button");
    button.className = "catalog-card";
    button.dataset.type = item.type;
    button.innerHTML = `<span class="catalog-icon"><svg viewBox="0 0 44 36" aria-hidden="true">${icons[item.icon]}</svg></span><span>${item.name}</span>`;
    button.title = `${item.name} qo‘shish (${item.width} × ${item.depth} × ${item.height} m)`;
    button.addEventListener("click", () => addFurniture(item.type));
    root.append(button);
  });
}

function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove("show"), 2600);
}

function addFurniture(type, placement = {}) {
  if (!editor) return;
  const object = createFurniture(type);
  const defaultY = type === "light" ? ROOM.height - object.userData.dimensions.height / 2 : object.userData.dimensions.height / 2;
  object.position.set(placement.x ?? 0, placement.y ?? defaultY, placement.z ?? 0);
  object.rotation.y = placement.rotation ?? 0;
  editor.scene.add(object);
  state.objects.push(object);
  setSelected(object);
  clearCollisionReport();
  syncStatus();
  scheduleSave();
  return object;
}

function setSelected(object) {
  state.selected = object;
  controls?.select(object);
  const empty = $("#emptyProperties");
  const properties = $("#selectedProperties");
  empty.hidden = Boolean(object);
  properties.hidden = !object;
  $("#duplicateButton").disabled = !object;
  if (object) syncProperties();
  else clearSelectionInputs();
}

function clearSelectionInputs() {
  $("#objectName").textContent = "Jihoz tanlanmagan";
  $("#nearestDistance").innerHTML = "— <small>sm</small>";
}

function syncProperties() {
  const object = state.selected;
  if (!object) return;
  const { dimensions: d } = object.userData;
  $("#objectName").textContent = object.userData.name;
  $("#objectCategory").textContent = object.userData.category;
  $("#selectedIcon").textContent = iconCharacter(object.userData.icon);
  $("#dimWidth").value = d.width.toFixed(2);
  $("#dimDepth").value = d.depth.toFixed(2);
  $("#dimHeight").value = d.height.toFixed(2);
  $("#posX").value = object.position.x.toFixed(2);
  $("#posY").value = object.position.y.toFixed(2);
  $("#posZ").value = object.position.z.toFixed(2);
  const degrees = ((THREE.MathUtils.radToDeg(object.rotation.y) % 360) + 360) % 360;
  $("#rotation").value = String(Math.round(degrees));
  $("#rotationValue").textContent = `${Math.round(degrees)}°`;
  $("#objectColor").value = object.userData.color;
  $("#colorValue").textContent = object.userData.color.toUpperCase();
  const gap = nearestGap(object);
  $("#nearestDistance").innerHTML = gap === null ? "— <small>sm</small>" : `${gap.toFixed(0)} <small>sm</small>`;
}

function iconCharacter(icon) {
  return ({ shelf: "▤", gondola: "▥", cashier: "▰", fridge: "▯", freezer: "▱", showcase: "▣", cabinet: "▤", sign: "▰", light: "☼", camera: "◉" })[icon] || "▤";
}

function nearestGap(object) {
  let nearest = Infinity;
  const own = new THREE.Box3().setFromObject(object);
  for (const other of state.objects) {
    if (other === object) continue;
    const box = new THREE.Box3().setFromObject(other);
    const dx = Math.max(0, own.min.x - box.max.x, box.min.x - own.max.x);
    const dz = Math.max(0, own.min.z - box.max.z, box.min.z - own.max.z);
    nearest = Math.min(nearest, Math.hypot(dx, dz));
  }
  return Number.isFinite(nearest) ? nearest * 100 : null;
}

function syncStatus() {
  $("#furnitureCount").textContent = `${state.objects.length} jihoz`;
  $("#statusDimensions").textContent = `${ROOM.depth.toFixed(2)} m × ${ROOM.width.toFixed(2)} m × ${ROOM.height.toFixed(2)} m`;
  $("#roomArea").textContent = (ROOM.width * ROOM.depth).toFixed(1).replace(/\.0$/, "");
  $("#roomVolume").textContent = (ROOM.width * ROOM.depth * ROOM.height).toFixed(1);
  $("#roomSize").textContent = `${ROOM.depth.toFixed(1)} × ${ROOM.width.toFixed(1)}`;
}

function scheduleSave() {
  if (!editor) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      saveProject(makeProject());
      $("#lastSaved").textContent = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      console.error("Loyiha avtomatik saqlanmadi:", error);
      $("#lastSaved").textContent = "Saqlanmadi";
      toast("Avtomatik saqlash amalga oshmadi");
    }
  }, 300);
}

function makeProject() {
  return createProject({ objects: state.objects, colors: state.colors, title: state.title, preset: state.preset, room: state.room });
}

function syncRoomInputs() {
  const { width, depth, height, ...openings } = state.room;
  $("#roomLength").value = depth.toFixed(2);
  $("#roomWidth").value = width.toFixed(2);
  $("#roomHeight").value = height.toFixed(2);
  $("#frontDoorWidth").value = openings.frontDoorWidth.toFixed(2);
  $("#frontDoorOffset").value = openings.frontDoorOffset.toFixed(2);
  $("#frontWindowWidth").value = openings.frontWindowWidth.toFixed(2);
  $("#frontWindowOffset").value = openings.frontWindowOffset.toFixed(2);
  $("#rearDoorEnabled").checked = openings.rearDoorEnabled;
  $("#rearDoorWidth").value = openings.rearDoorWidth.toFixed(2);
  $("#rearDoorOffset").value = openings.rearDoorOffset.toFixed(2);

  $("#frontDoorWidth").max = Math.min(1.8, depth - 0.4).toFixed(2);
  $("#frontDoorOffset").min = (openings.frontDoorWidth / 2 + 0.12).toFixed(2);
  $("#frontDoorOffset").max = (depth - openings.frontDoorWidth / 2 - 0.12).toFixed(2);
  $("#frontWindowWidth").max = Math.max(
    0.5,
    openings.frontDoorOffset - openings.frontDoorWidth / 2 - 0.22,
    depth - openings.frontDoorOffset - openings.frontDoorWidth / 2 - 0.22,
  ).toFixed(2);
  $("#frontWindowOffset").min = (0.1 + openings.frontWindowWidth / 2).toFixed(2);
  $("#frontWindowOffset").max = (depth - 0.1 - openings.frontWindowWidth / 2).toFixed(2);
  $("#rearDoorWidth").max = (width - 0.3).toFixed(2);
  $("#rearDoorOffset").min = (openings.rearDoorWidth / 2 + 0.15).toFixed(2);
  $("#rearDoorOffset").max = (width - openings.rearDoorWidth / 2 - 0.15).toFixed(2);
  for (const id of ["rearDoorWidth", "rearDoorOffset"]) $(`#${id}`).disabled = !openings.rearDoorEnabled;
  syncStatus();
}

function applyRoomSettings(settings) {
  state.room = normalizeRoomSettings(settings);
  editor.room = rebuildStore(editor.scene, editor.room, state.colors, state.room);
  editor.room.ceiling.visible = state.ceilingVisible;
  editor.room.ceilingDetails.visible = state.ceilingVisible;
  setWallsVisible(state.wallsVisible);
  state.objects.forEach(constrainFurniture);
  syncRoomInputs();
  clearCollisionReport();
  setView(state.view);
  scheduleSave();
}

function updateSelectedPosition(axis, value) {
  if (!state.selected || !Number.isFinite(value)) return;
  state.selected.position[axis] = value;
  constrainFurniture(state.selected);
  syncProperties();
  clearCollisionReport();
  scheduleSave();
}

function removeSelected() {
  if (!state.selected) return;
  editor.scene.remove(state.selected);
  disposeFurniture(state.selected);
  state.objects = state.objects.filter(object => object !== state.selected);
  setSelected(null);
  syncStatus();
  clearCollisionReport();
  scheduleSave();
}

function disposeFurniture(object) {
  object.traverse(child => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
    else child.material.dispose();
  });
}

function duplicateSelected() {
  if (!state.selected) return;
  const source = state.selected;
  const clone = addFurniture(source.userData.type, { x: source.position.x + 0.35, z: source.position.z + 0.35, rotation: source.rotation.y });
  setFurnitureDimensions(clone, source.userData.dimensions);
  setFurnitureColor(clone, source.userData.color);
  constrainFurniture(clone);
  syncProperties();
  scheduleSave();
}

function applyPreset(name, persist = true) {
  if (!editor) return;
  state.objects.forEach(object => { editor.scene.remove(object); disposeFurniture(object); });
  state.objects = [];
  state.preset = name;
  setSelected(null);
  const layouts = {
    classic: [
      ["wallShelf", -1.72, -2.4, Math.PI / 2], ["wallShelf", -1.72, -0.95, Math.PI / 2],
      ["wallShelf", -1.72, 0.5, Math.PI / 2], ["wallShelf", -1.72, 1.95, Math.PI / 2],
      ["wallShelf", 0.92, -3.12, 0],
      ["gondola", 0, -1.45, 0], ["gondola", 0, 0.1, 0],
      ["cashier", 0.8, 2.35, 0], ["fridge", 0.95, -2.28, Math.PI / 2],
      ["camera", 1.72, 3.12, Math.PI, 2.66],
    ],
    minimal: [
      ["wallShelf", -1.72, -2.1, Math.PI / 2], ["wallShelf", -1.72, -0.2, Math.PI / 2],
      ["wallShelf", 0.92, -3.12, 0], ["gondola", 0, -0.95, 0],
      ["cashier", 0.8, 2.35, 0], ["fridge", 0.95, -2.25, Math.PI / 2],
      ["light", -0.65, -1.8, Math.PI / 2, 2.72], ["light", 0.65, -1.8, Math.PI / 2, 2.72],
      ["light", -0.65, 0.4, Math.PI / 2, 2.72], ["light", 0.65, 0.4, Math.PI / 2, 2.72],
      ["sign", 0, -3.35, 0, 2.25],
    ],
    mini: [
      ["wallShelf", -1.72, -2.55, Math.PI / 2], ["wallShelf", -1.72, -1.2, Math.PI / 2],
      ["wallShelf", -1.72, 0.15, Math.PI / 2], ["wallShelf", -1.72, 1.5, Math.PI / 2],
      ["wallShelf", 0.92, -3.12, 0],
      ["gondola", 0, -1.55, 0], ["gondola", 0, 0, 0],
      ["cashier", 0.8, 2.35, 0], ["fridge", 0.95, -2.25, Math.PI / 2],
      ["fridge", 0.95, 1.1, Math.PI / 2], ["freezer", -0.7, 1.3, 0],
      ["camera", 1.72, 3.12, Math.PI, 2.66], ["sign", 0, -3.35, 0, 2.25],
    ],
  };
  for (const [type, x, z, rotation, y] of layouts[name]) addFurniture(type, { x, y, z, rotation });
  setSelected(null);
  document.querySelectorAll(".preset-card").forEach(card => card.classList.toggle("selected", card.dataset.preset === name));
  clearCollisionReport();
  syncStatus();
  if (persist) scheduleSave();
  toast(`${name === "classic" ? "Klassik magazin" : name === "minimal" ? "Minimalist magazin" : "Mini market"} joylashuvi yuklandi`);
}

function applyEmptyRoom({ persist = true, notify = false } = {}) {
  if (!editor) return;
  state.objects.forEach(object => { editor.scene.remove(object); disposeFurniture(object); });
  state.objects = [];
  state.room = normalizeRoomSettings(DEFAULT_ROOM_SETTINGS);
  state.colors = { wall: "#ded0ba", floor: "#e0ded6", ceiling: "#e7dcc8" };
  state.wallsVisible = true;
  state.ceilingVisible = false;
  editor.room = rebuildStore(editor.scene, editor.room, state.colors, state.room);
  editor.room.ceiling.visible = false;
  editor.room.ceilingDetails.visible = false;
  setWallsVisible(true);
  $("#wallColor").value = state.colors.wall;
  $("#floorColor").value = state.colors.floor;
  $("#ceilingColor").value = state.colors.ceiling;
  state.preset = "empty";
  setSelected(null);
  document.querySelectorAll(".preset-card").forEach(card => card.classList.remove("selected"));
  clearCollisionReport();
  syncRoomInputs();
  setView("3d");
  if (persist) scheduleSave();
  if (notify) toast("Bo‘sh magazin xonasi tayyor");
}

function applyProject(project) {
  state.objects.forEach(object => { editor.scene.remove(object); disposeFurniture(object); });
  state.objects = [];
  state.room = normalizeRoomSettings(project.room || DEFAULT_ROOM_SETTINGS);
  editor.room = rebuildStore(editor.scene, editor.room, project.colors, state.room);
  editor.room.ceiling.visible = state.ceilingVisible;
  editor.room.ceilingDetails.visible = state.ceilingVisible;
  setWallsVisible(state.wallsVisible);
  project.objects.forEach(object => {
    editor.scene.add(object);
    state.objects.push(object);
    constrainFurniture(object);
  });
  state.title = project.title;
  state.preset = project.preset;
  state.colors = { ...project.colors };
  $("#projectTitle").textContent = state.title;
  $("#wallColor").value = state.colors.wall;
  $("#floorColor").value = state.colors.floor;
  $("#ceilingColor").value = state.colors.ceiling;
  syncRoomInputs();
  setView(state.view);
  document.querySelectorAll(".preset-card").forEach(card => card.classList.toggle("selected", card.dataset.preset === state.preset));
  setSelected(null);
  syncStatus();
  scheduleSave();
}

function checkCollisions() {
  const collisions = [];
  for (let i = 0; i < state.objects.length; i++) {
    const first = new THREE.Box3().setFromObject(state.objects[i]);
    for (let j = i + 1; j < state.objects.length; j++) {
      const second = new THREE.Box3().setFromObject(state.objects[j]);
      const overlapX = Math.min(first.max.x, second.max.x) - Math.max(first.min.x, second.min.x);
      const overlapZ = Math.min(first.max.z, second.max.z) - Math.max(first.min.z, second.min.z);
      const overlapY = Math.min(first.max.y, second.max.y) - Math.max(first.min.y, second.min.y);
      if (overlapX > 0.035 && overlapZ > 0.035 && overlapY > 0.02) collisions.push([state.objects[i], state.objects[j]]);
    }
  }
  const banner = $("#collisionBanner");
  banner.hidden = false;
  banner.classList.toggle("ok", collisions.length === 0);
  banner.textContent = collisions.length ? `${collisions.length} ta jihoz to‘qnashuvi topildi — jihozlarni tekshiring` : "Ajoyib! Jihozlar o‘zaro to‘qnashmayapti";
  setTimeout(() => { banner.hidden = true; }, 4500);
  return collisions;
}

function clearCollisionReport() {
  $("#collisionBanner").hidden = true;
}

function setView(view) {
  if (!editor || !controls) return;
  state.view = view;
  document.querySelectorAll(".view-button").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#activeViewName").textContent = view === "3d" ? "3D ko‘rinish" : view === "plan" ? "2D reja" : "Ichki ko‘rinish";
  const target = controls.orbit.target;
  if (view === "plan") {
    target.set(0, 0, 0);
    editor.camera.up.set(0, 0, -1);
    const aspect = editor.camera.aspect;
    const viewHeight = Math.max(ROOM.depth, ROOM.width / aspect) * 1.25;
    const distance = viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(editor.camera.fov / 2)));
    editor.camera.position.set(0, distance, 0.001);
    controls.orbit.enabled = false;
    controls.setTransformEnabled(false);
  } else if (view === "inside") {
    target.set(0, 1.55, 0.5);
    editor.camera.up.set(0, 1, 0);
    editor.camera.position.set(0, 1.55, Math.max(0.5, ROOM.depth / 2 - 0.3));
    controls.orbit.enabled = true;
    controls.setTransformEnabled(true);
    controls.orbit.minDistance = 0.5;
    controls.orbit.maxDistance = Math.max(8, Math.max(ROOM.depth, ROOM.width) * 1.2);
    controls.orbit.maxPolarAngle = Math.PI * 0.82;
  } else {
    target.set(0, 1, 0);
    editor.camera.up.set(0, 1, 0);
    const scale = Math.max(1, ROOM.depth / 7, ROOM.width / 4);
    editor.camera.position.set(8.6 * scale, 6 * scale, 4.2 * scale);
    controls.orbit.enabled = true;
    controls.setTransformEnabled(true);
    controls.orbit.minDistance = 4;
    controls.orbit.maxDistance = Math.max(22, Math.max(ROOM.depth, ROOM.width) * 3);
    controls.orbit.maxPolarAngle = Math.PI * 0.49;
  }
  editor.camera.lookAt(target);
  controls.orbit.update();
}

function doScreenshot() {
  try {
    const link = document.createElement("a");
    link.download = "magazin-3d-ko‘rinish.png";
    link.href = editor.renderer.domElement.toDataURL("image/png");
    link.click();
    toast("PNG rasm saqlandi");
  } catch (error) {
    console.error("Skrinshot yaratilmadi:", error);
    toast("Rasm saqlanmadi");
  }
}

function exportJson() {
  try {
    const project = makeProject();
    saveProject(project);
    downloadProject(project);
    toast("Loyiha JSON faylga saqlandi");
  } catch (error) {
    console.error("Loyiha eksport qilinmadi:", error);
    toast("JSON eksport amalga oshmadi");
  }
}

document.querySelectorAll(".view-button").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelectorAll(".mode-button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".mode-button").forEach(item => item.classList.toggle("active", item === button));
  controls?.setMode(button.dataset.mode);
}));
document.querySelectorAll(".preset-card").forEach(button => button.addEventListener("click", () => applyPreset(button.dataset.preset)));

$("#wallsButton").addEventListener("click", event => {
  state.wallsVisible = !state.wallsVisible;
  setWallsVisible(state.wallsVisible);
  event.currentTarget.classList.toggle("active", state.wallsVisible);
  event.currentTarget.querySelector("span").textContent = state.wallsVisible ? "Devorlar" : "Devorlar yo‘q";
});
$("#ceilingButton").addEventListener("click", event => {
  state.ceilingVisible = !state.ceilingVisible;
  editor.room.ceiling.visible = state.ceilingVisible;
  editor.room.ceilingDetails.visible = state.ceilingVisible;
  event.currentTarget.classList.toggle("active", state.ceilingVisible);
});
$("#collisionButton").addEventListener("click", checkCollisions);
$("#fullscreenButton").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $(".canvas-area").requestFullscreen();
  } catch (error) {
    console.error("To‘liq ekran rejimi yoqilmadi:", error);
    toast("To‘liq ekran rejimini ochib bo‘lmadi");
  }
});
$("#saveButton").addEventListener("click", exportJson);
$("#loadButton").addEventListener("click", () => $("#projectFile").click());
$("#projectFile").addEventListener("change", async event => {
  const input = event.currentTarget;
  const [file] = input.files;
  if (!file) return;
  try {
    applyProject(await parseProjectFile(file));
    toast("JSON loyiha muvaffaqiyatli yuklandi");
  } catch (error) {
    console.error("Loyiha fayli yuklanmadi:", error);
    toast(error instanceof SyntaxError ? "JSON faylini o‘qib bo‘lmadi" : error.message);
  } finally {
    input.value = "";
  }
});
$("#screenshotButton").addEventListener("click", doScreenshot);
$("#themeButton").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.body.classList.toggle("light-theme", state.theme === "light");
  localStorage.setItem("magazin3d-theme", state.theme);
  $("#themeButton").textContent = state.theme === "dark" ? "☼" : "☾";
});
$("#resetButton").addEventListener("click", () => {
  if (confirm("Joriy joylashuv o‘chiriladi. Bo‘sh magazin xonasiga qaytaramizmi?")) applyEmptyRoom({ notify: true });
});
$("#renameProject").addEventListener("click", () => {
  const title = prompt("Loyiha nomi:", state.title);
  if (title?.trim()) {
    state.title = title.trim().slice(0, 80);
    $("#projectTitle").textContent = state.title;
    scheduleSave();
  }
});
$("#duplicateButton").addEventListener("click", duplicateSelected);
$("#duplicateAction").addEventListener("click", duplicateSelected);
$("#deleteButton").addEventListener("click", removeSelected);
$("#deleteAction").addEventListener("click", removeSelected);
$("#resetColor").addEventListener("click", () => {
  if (!state.selected) return;
  setFurnitureColor(state.selected, templateFor(state.selected.userData.type).color);
  syncProperties();
  scheduleSave();
});
$("#objectColor").addEventListener("input", event => {
  if (!state.selected) return;
  setFurnitureColor(state.selected, event.target.value);
  syncProperties();
  scheduleSave();
});
$("#rotation").addEventListener("input", event => {
  if (!state.selected) return;
  state.selected.rotation.y = THREE.MathUtils.degToRad(Number(event.target.value));
  syncProperties();
  scheduleSave();
});
$("#dimWidth").addEventListener("change", () => updateDimensions());
$("#dimDepth").addEventListener("change", () => updateDimensions());
$("#dimHeight").addEventListener("change", () => updateDimensions());
function updateDimensions() {
  if (!state.selected) return;
  setFurnitureDimensions(state.selected, { width: Number($("#dimWidth").value), depth: Number($("#dimDepth").value), height: Number($("#dimHeight").value) });
  constrainFurniture(state.selected);
  syncProperties();
  clearCollisionReport();
  scheduleSave();
}
["X", "Y", "Z"].forEach((axis, index) => {
  $(`#pos${axis}`).addEventListener("change", event => updateSelectedPosition(["x", "y", "z"][index], Number(event.target.value)));
});
for (const part of ["wall", "floor", "ceiling"]) {
  $(`#${part}Color`).addEventListener("input", event => {
    state.colors[part] = event.target.value;
    setRoomColor(editor.room, part, event.target.value);
    scheduleSave();
  });
}
const roomInputIds = [
  "roomLength", "roomWidth", "roomHeight", "frontDoorWidth", "frontDoorOffset",
  "frontWindowWidth", "frontWindowOffset", "rearDoorWidth", "rearDoorOffset",
];
const updateRoomFromInputs = () => {
  try {
    applyRoomSettings({
      ...state.room,
      width: Number($("#roomWidth").value),
      depth: Number($("#roomLength").value),
      height: Number($("#roomHeight").value),
      frontDoorWidth: Number($("#frontDoorWidth").value),
      frontDoorOffset: Number($("#frontDoorOffset").value),
      frontWindowWidth: Number($("#frontWindowWidth").value),
      frontWindowOffset: Number($("#frontWindowOffset").value),
      rearDoorEnabled: $("#rearDoorEnabled").checked,
      rearDoorWidth: Number($("#rearDoorWidth").value),
      rearDoorOffset: Number($("#rearDoorOffset").value),
    });
  } catch (error) {
    console.error("Xona geometriyasi o‘zgartirilmadi:", error);
    toast(error.message || "Xona sozlamalarini o‘zgartirib bo‘lmadi");
    syncRoomInputs();
  }
};
roomInputIds.forEach(id => $(`#${id}`).addEventListener("change", updateRoomFromInputs));
$("#rearDoorEnabled").addEventListener("change", updateRoomFromInputs);
$("#catalogSearch").addEventListener("input", event => {
  const query = event.target.value.toLocaleLowerCase("uz");
  document.querySelectorAll(".catalog-card").forEach(card => {
    card.hidden = !card.textContent.toLocaleLowerCase("uz").includes(query);
  });
});
$("#collapseCatalog").addEventListener("click", () => {
  const panel = $(".left-panel");
  panel.classList.toggle("collapsed");
  if (panel.classList.contains("collapsed")) {
    panel.style.width = "0";
    panel.style.flexBasis = "0";
    panel.style.overflow = "hidden";
  } else {
    panel.style.width = "";
    panel.style.flexBasis = "";
    panel.style.overflow = "";
  }
});
$("#zoomIn").addEventListener("click", () => zoom(0.82));
$("#zoomOut").addEventListener("click", () => zoom(1.22));
$("#fitView").addEventListener("click", () => setView(state.view === "inside" ? "3d" : state.view));
function zoom(factor) {
  const target = controls.orbit.target;
  const direction = editor.camera.position.clone().sub(target).multiplyScalar(factor);
  editor.camera.position.copy(target).add(direction);
  controls.orbit.update();
  const relative = Math.round(100 * 8 / editor.camera.position.distanceTo(target));
  $("#zoomLabel").textContent = `${Math.max(50, Math.min(200, relative))}%`;
}

window.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#catalogSearch").focus();
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (!["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) removeSelected();
  }
  if (event.key === "Escape" && state.selected) setSelected(null);
});

syncStatus();
if (state.theme === "light") $("#themeButton").textContent = "☾";
