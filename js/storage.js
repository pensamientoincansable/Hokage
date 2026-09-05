import { DEFAULT_APPEARANCE, DEFAULT_SETTINGS, DEFAULT_BINDS, ELEMENT_IDS, DIFFICULTY, QUALITY } from "./config.js";

const KEY = "hokage.save.v1";
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const clamp = (value, min, max, fallback) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function normalizeSave(data, settingsDefaults = DEFAULT_SETTINGS) {
  const raw = object(data);
  const savedAppearance = object(raw.appearance);
  const appearance = { ...DEFAULT_APPEARANCE, ...savedAppearance };
  for (const [key, fallback] of Object.entries(DEFAULT_APPEARANCE)) {
    if (!Array.isArray(fallback) && typeof appearance[key] !== typeof fallback) appearance[key] = fallback;
    if ((key.endsWith("Color") || key === "skin" || key === "hairAccent") && !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(appearance[key])) appearance[key] = fallback;
  }
  appearance.model = savedAppearance.model === "custom" ? "custom" : "naruto";
  appearance.name = typeof appearance.name === "string" ? appearance.name.trim().slice(0, 18) || "Naruto" : "Naruto";
  appearance.height = clamp(appearance.height, 0.9, 1.12, 1);
  const elements = [...new Set(Array.isArray(appearance.elements) ? appearance.elements.filter((id) => ELEMENT_IDS.includes(id)) : [])].slice(0, 2);
  for (const id of DEFAULT_APPEARANCE.elements) if (elements.length < 2 && !elements.includes(id)) elements.push(id);
  appearance.elements = elements;
  const settings = { ...settingsDefaults, ...object(raw.settings) };
  settings.quality = Object.hasOwn(QUALITY, settings.quality) ? settings.quality : settingsDefaults.quality;
  settings.difficulty = Object.hasOwn(DIFFICULTY, settings.difficulty) ? settings.difficulty : "normal";
  settings.music = clamp(settings.music, 0, 1, DEFAULT_SETTINGS.music);
  settings.sfx = clamp(settings.sfx, 0, 1, DEFAULT_SETTINGS.sfx);
  settings.showHints = settings.showHints !== false;
  settings.touchControls = ["auto", "on", "off"].includes(settings.touchControls) ? settings.touchControls : "auto";
  settings.touchScale = clamp(settings.touchScale, 0.85, 1.15, 1);
  const binds = { ...DEFAULT_BINDS };
  for (const [action, code] of Object.entries(object(raw.binds))) {
    if (Object.hasOwn(binds, action) && typeof code === "string" && /^[A-Za-z][A-Za-z0-9]{0,30}$/.test(code)) binds[action] = code;
  }
  return {
    ...defaultSave(appearance, settings, binds),
    unlocked: Math.floor(clamp(raw.unlocked, 1, 30, 1)),
    completed: [...new Set(Array.isArray(raw.completed) ? raw.completed.filter((id) => Number.isInteger(id) && id >= 1 && id <= 30) : [])],
    vsWins: Math.floor(clamp(raw.vsWins, 0, 999999, 0)),
    vsLosses: Math.floor(clamp(raw.vsLosses, 0, 999999, 0)),
  };
}

export function writeSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
  catch { return false; } // Private mode / quota must never interrupt a fight.
}

export function defaultSave(appearance, settings, binds) {
  return { unlocked: 1, completed: [], appearance, settings, binds, vsWins: 0, vsLosses: 0 };
}
