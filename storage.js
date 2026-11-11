import { FURNITURE_TYPES, restoreFurniture, serializeFurniture } from "./furniture.js";
import { ROOM, ROOM_SETTINGS, normalizeRoomSettings } from "./store.js";

const STORAGE_KEY = "magazin3d-design-project-v1";
const allowedTypes = new Set(FURNITURE_TYPES.map(item => item.type));
const validColor = value => typeof value === "string" && /^#[\da-f]{6}$/i.test(value);

export function createProject({ objects, colors, title, preset, room }) {
  return {
    format: "magazin3d-design",
    version: 1,
    title,
    preset,
    room: room ? normalizeRoomSettings(room) : { ...ROOM, ...ROOM_SETTINGS },
    colors: { ...colors },
    objects: objects.map(serializeFurniture),
    updatedAt: new Date().toISOString(),
  };
}

export function saveProject(project) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadSavedProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return validateProject(JSON.parse(raw));
}

export function validateProject(project) {
  if (!project || project.format !== "magazin3d-design" || project.version !== 1 || !Array.isArray(project.objects)) {
    throw new Error("JSON loyiha formati tanilmadi.");
  }
  const colors = project.colors || {};
  for (const part of ["wall", "floor", "ceiling"]) {
    if (colors[part] !== undefined && !validColor(colors[part])) throw new Error(`Loyiha faylida ${part} rangi noto‘g‘ri.`);
  }
  const objects = project.objects.map(item => {
    if (!item || !allowedTypes.has(item.type)) throw new Error("Loyiha ichida noma’lum jihoz turi bor.");
    if (item.position && (!Array.isArray(item.position) || item.position.length !== 3 || !item.position.every(Number.isFinite))) {
      throw new Error("Loyiha ichida jihoz koordinatalari noto‘g‘ri.");
    }
    if (item.rotation !== undefined && !Number.isFinite(item.rotation)) throw new Error("Aylanish qiymati noto‘g‘ri.");
    if (item.color !== undefined && !validColor(item.color)) throw new Error("Jihoz rang qiymati noto‘g‘ri.");
    if (item.dimensions) {
      for (const dimension of ["width", "depth", "height"]) {
        if (!Number.isFinite(item.dimensions[dimension]) || item.dimensions[dimension] <= 0) {
          throw new Error("Jihoz o‘lchami noto‘g‘ri.");
        }
      }
    }
    return item;
  });
  const legacyOrientation = project.room?.width === 7 && project.room?.depth === 4;
  const room = normalizeRoomSettings(legacyOrientation
    ? { ...project.room, width: 4, depth: 7, length: 7 }
    : project.room);
  return {
    format: "magazin3d-design",
    version: 1,
    title: typeof project.title === "string" ? project.title.slice(0, 80) : "Yangi magazin loyihasi",
    preset: ["empty", "classic", "minimal", "mini"].includes(project.preset) ? project.preset : "empty",
    colors: {
      wall: colors.wall || "#ded0ba",
      floor: colors.floor || "#e0ded6",
      ceiling: colors.ceiling || "#e7dcc8",
    },
    room,
    objects: objects.map(item => restoreFurniture(legacyOrientation ? {
      ...item,
      position: item.position ? [item.position[2], item.position[1], -item.position[0]] : item.position,
      rotation: Number.isFinite(item.rotation) ? item.rotation - Math.PI / 2 : item.rotation,
    } : item)),
  };
}

export function downloadProject(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(project.title)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value) {
  return (value || "magazin-3d-loyiha").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "magazin-3d-loyiha";
}

export function parseProjectFile(file) {
  return file.text().then(text => validateProject(JSON.parse(text)));
}
