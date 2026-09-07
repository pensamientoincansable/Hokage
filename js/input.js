import { DEFAULT_BINDS } from "./config.js";

export const ACTION_LABELS = {
  left: "Izquierda", right: "Derecha", up: "Saltar", down: "Agacharse",
  light: "Puño / barrido", heavy: "Puño fuerte", kick: "Patada",
  special1: "Jutsu 1", special2: "Jutsu 2", ultimate: "Fusión",
  block: "Guardia", dash: "Dash", evade: "Esquivar", grab: "Agarre", pause: "Pausa",
};
const ALIASES = { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp", "Space"], down: ["ArrowDown"], block: ["ShiftRight"], evade: ["KeyQ"], grab: ["KeyE", "KeyF"] };
const keyLabel = (code = "") => ({ Space: "Espacio", Escape: "Esc", ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", ShiftLeft: "Shift izq.", ShiftRight: "Shift der.", KeyQ: "Q", KeyF: "F", KeyG: "G", KeyH: "H", KeyE: "E" }[code] || code.replace(/^Key|^Digit/, ""));

export class Input {
  constructor({ target = globalThis.window, doc = globalThis.document, now = () => performance.now() } = {}) {
    this.binds = { ...DEFAULT_BINDS };
    this.target = target;
    this.doc = doc;
    this.now = now;
    this.enabled = false;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.touch = {};
    this.touchPressed = {};
    this.touchReleased = {};
    this.sources = new Map();
    this.pointers = new Map();
    this.analog = 0;
    this.lastTap = null;
    this.listen = null;
    this.touchCleanup = [];
    this.rebuildCodes();
    this.handlers = {
      keydown: (e) => this.onKey(e, true), keyup: (e) => this.onKey(e, false),
      blur: () => this.reset(),
    };
    for (const [name, handler] of Object.entries(this.handlers)) target?.addEventListener(name, handler);
    this.visibility = () => { if (doc?.hidden) this.reset(); };
    doc?.addEventListener("visibilitychange", this.visibility);
  }

  setBinds(binds) {
    const next = { ...DEFAULT_BINDS };
    for (const action of Object.keys(next)) {
      if (typeof binds?.[action] === "string" && binds[action].length < 32) next[action] = binds[action];
    }
    const used = new Set();
    const duplicates = [];
    for (const action of Object.keys(next)) {
      if (used.has(next[action])) duplicates.push(action);
      else used.add(next[action]);
    }
    for (const action of duplicates) {
      const fallback = !used.has(DEFAULT_BINDS[action]) ? DEFAULT_BINDS[action] : Object.values(DEFAULT_BINDS).find((code) => !used.has(code));
      next[action] = fallback;
      used.add(fallback);
    }
    this.binds = next;
    this.rebuildCodes();
    this.reset();
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) this.reset();
  }

  rebuildCodes() {
    this.codeActions = new Map();
    for (const [action, code] of Object.entries(this.binds)) this.codeActions.set(code, [action]);
    for (const [action, aliases] of Object.entries(ALIASES)) {
      for (const code of aliases) if (!this.codeActions.has(code)) this.codeActions.set(code, [action]);
    }
  }

  actionsFor(code) { return this.codeActions.get(code) || []; }

  onKey(event, isDown) {
    if (this.listen) {
      event.preventDefault();
      if (!isDown || event.repeat) return;
      if (event.code === "Escape") { this.cancelRemap(); return; }
      const action = this.listen;
      const conflict = Object.keys(this.binds).find((key) => key !== action && this.binds[key] === event.code);
      if (conflict) this.binds[conflict] = this.binds[action];
      this.binds[action] = event.code;
      this.rebuildCodes();
      const callback = this.listenCb;
      this.listen = null;
      this.listenCb = null;
      this.reset();
      callback?.(event.code);
      return;
    }
    if (event.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
    const actions = this.actionsFor(event.code);
    if (!actions.length) return;
    if (!this.enabled && !actions.includes("pause")) return;
    event.preventDefault();
    if (isDown) {
      if (!this.down.has(event.code) && !event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    } else if (this.down.delete(event.code)) {
      this.released.add(event.code);
    }
  }

  remap(action, callback) {
    if (!Object.hasOwn(this.binds, action)) return;
    this.reset();
    this.listen = action;
    this.listenCb = callback;
  }

  cancelRemap(notify = true) {
    const callback = this.listenCb;
    this.listen = null;
    this.listenCb = null;
    if (notify) callback?.(null);
  }

  code(action) { return this.binds[action]; }
  label(action) { return keyLabel(this.binds[action]); }
  keyHas(set, action) {
    for (const code of set) if (this.actionsFor(code).includes(action)) return true;
    return false;
  }
  isDown(action) { return !!this.touch[action] || this.keyHas(this.down, action); }
  wasPressed(action) { return !!this.touchPressed[action] || this.keyHas(this.pressed, action); }
  wasReleased(action) { return !this.isDown(action) && (!!this.touchReleased[action] || this.keyHas(this.released, action)); }

  axis() {
    const keyboard = Number(this.keyHas(this.down, "right")) - Number(this.keyHas(this.down, "left"));
    return keyboard || this.analog;
  }

  dashTap() {
    for (const [action, direction] of [["left", -1], ["right", 1]]) {
      if (!this.wasPressed(action)) continue;
      const now = this.now();
      if (this.lastTap?.action === action && now - this.lastTap.time < 280) {
        this.lastTap = null;
        return direction;
      }
      this.lastTap = { action, time: now };
    }
    return 0;
  }

  setSource(id, actions) {
    const previous = new Set(Object.keys(this.touch).filter((action) => this.touch[action]));
    if (actions.length) this.sources.set(id, new Set(actions));
    else this.sources.delete(id);
    const next = new Set([...this.sources.values()].flatMap((set) => [...set]));
    this.touch = Object.fromEntries([...next].map((action) => [action, true]));
    for (const action of next) if (!previous.has(action)) this.touchPressed[action] = true;
    for (const action of previous) if (!next.has(action)) this.touchReleased[action] = true;
    this.touchRoot?.querySelectorAll("[data-input]").forEach((button) => {
      const active = next.has(button.dataset.input);
      button.classList.toggle("is-held", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.touchPressed = {};
    this.touchReleased = {};
  }

  reset() {
    this.down.clear();
    this.endFrame();
    this.touch = {};
    this.sources.clear();
    this.lastTap = null;
    this.analog = 0;
    this.stickPointer = null;
    for (const [id, element] of this.pointers) {
      if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
    }
    this.pointers.clear();
    this.touchRoot?.querySelectorAll(".is-held").forEach((element) => { element.classList.remove("is-held"); element.setAttribute("aria-pressed", "false"); });
    this.touchRoot?.querySelector(".joystick-thumb")?.style.removeProperty("transform");
  }

  unbindTouch() {
    this.reset();
    this.touchCleanup.forEach((remove) => remove());
    this.touchCleanup = [];
    this.touchRoot = null;
  }

  bindTouch(root) {
    this.unbindTouch();
    this.touchRoot = root;
    if (!root) return;
    const on = (element, event, handler) => {
      element.addEventListener(event, handler, { passive: false });
      this.touchCleanup.push(() => element.removeEventListener(event, handler));
    };
    const capture = (element, event) => {
      this.pointers.set(event.pointerId, element);
      element.setPointerCapture(event.pointerId);
    };
    const release = (event) => {
      const element = this.pointers.get(event.pointerId);
      if (!element) return;
      this.pointers.delete(event.pointerId);
      this.setSource(event.pointerId, []);
      if (this.stickPointer === event.pointerId) {
        this.analog = 0;
        this.stickPointer = null;
        root.querySelector(".joystick-thumb").style.removeProperty("transform");
      }
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    on(root, "contextmenu", (event) => event.preventDefault());
    for (const button of root.querySelectorAll("[data-input]")) {
      on(button, "pointerdown", (event) => {
        event.preventDefault();
        if (!this.enabled || (event.pointerType === "mouse" && event.button !== 0)) return;
        capture(button, event);
        this.setSource(event.pointerId, [button.dataset.input]);
      });
      for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) on(button, event, release);
    }
    const stick = root.querySelector("[data-joystick]");
    if (!stick) return;
    const move = (event) => {
      if (event.pointerId !== this.stickPointer) return;
      event.preventDefault();
      const rect = stick.getBoundingClientRect();
      const radius = rect.width * 0.38;
      let x = (event.clientX - (rect.left + rect.width / 2)) / radius;
      let y = (event.clientY - (rect.top + rect.height / 2)) / radius;
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      const deadZone = 0.18;
      this.analog = Math.abs(x) <= deadZone ? 0 : Math.sign(x) * Math.min(1, (Math.abs(x) - deadZone) / (1 - deadZone));
      const actions = [];
      if (this.analog < -0.1) actions.push("left");
      if (this.analog > 0.1) actions.push("right");
      if (y < -0.55) actions.push("up");
      if (y > 0.55) actions.push("down");
      this.setSource(event.pointerId, actions);
      stick.querySelector(".joystick-thumb").style.transform = `translate(${x * radius}px, ${y * radius}px)`;
    };
    on(stick, "pointerdown", (event) => {
      event.preventDefault();
      if (!this.enabled || this.stickPointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      this.stickPointer = event.pointerId;
      capture(stick, event);
      move(event);
    });
    on(stick, "pointermove", move);
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) on(stick, event, release);
  }

  dispose() {
    this.unbindTouch();
    for (const [name, handler] of Object.entries(this.handlers)) this.target?.removeEventListener(name, handler);
    this.doc?.removeEventListener("visibilitychange", this.visibility);
  }
}
