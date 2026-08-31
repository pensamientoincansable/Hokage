const KEY = "hokage.save.v1";

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSave(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function defaultSave(appearance, settings, binds) {
  return {
    unlocked: 1,
    completed: [],
    appearance,
    settings,
    binds,
    vsWins: 0,
    vsLosses: 0,
  };
}
