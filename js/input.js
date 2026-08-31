import { DEFAULT_BINDS } from "./config.js";

export class Input {
  constructor() {
    this.binds = { ...DEFAULT_BINDS };
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.listen = null;
    this.taps = { left: 0, right: 0, t: 0 };
    this.touch = {};
    window.addEventListener("keydown", (e) => this.onKey(e, true));
    window.addEventListener("keyup", (e) => this.onKey(e, false));
    window.addEventListener("blur", () => this.down.clear());
  }

  setBinds(b) {
    this.binds = { ...DEFAULT_BINDS, ...b };
  }

  onKey(e, isDown) {
    if (this.listen) {
      e.preventDefault();
      if (isDown && e.code !== "Escape") {
        this.binds[this.listen] = e.code;
        const cb = this.listenCb;
        this.listen = null;
        this.listenCb = null;
        cb?.(e.code);
      }
      return;
    }
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    const code = e.code;
    if (isDown) {
      if (!this.down.has(code)) this.pressed.add(code);
      this.down.add(code);
    } else {
      this.down.delete(code);
      this.released.add(code);
    }
  }

  remap(action, cb) {
    this.listen = action;
    this.listenCb = cb;
  }

  code(action) {
    return this.binds[action];
  }

  isDown(action) {
    if (this.touch[action]) return true;
    return this.down.has(this.binds[action]);
  }

  wasPressed(action) {
    if (this.touchPressed?.[action]) return true;
    return this.pressed.has(this.binds[action]);
  }

  wasReleased(action) {
    if (this.touchReleased?.[action]) return true;
    return this.released.has(this.binds[action]);
  }

  axis() {
    let x = 0;
    if (this.isDown("left")) x -= 1;
    if (this.isDown("right")) x += 1;
    return x;
  }

  dashTap(dt) {
    this.taps.t += dt;
    if (this.wasPressed("left")) {
      if (this.taps.t < 0.28 && this.taps.left) return -1;
      this.taps = { left: 1, right: 0, t: 0 };
    }
    if (this.wasPressed("right")) {
      if (this.taps.t < 0.28 && this.taps.right) return 1;
      this.taps = { left: 0, right: 1, t: 0 };
    }
    return 0;
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.touchPressed = {};
    this.touchReleased = {};
  }

  label(action) {
    const c = this.binds[action] || "";
    return c.replace("Key", "").replace("Left", "").replace("Right", "");
  }

  bindTouch(root) {
    if (!root) return;
    root.querySelectorAll("[data-act]").forEach((el) => {
      const act = el.dataset.act;
      const set = (v) => {
        this.touch[act] = v;
        if (v) {
          this.touchPressed = this.touchPressed || {};
          this.touchPressed[act] = true;
        } else {
          this.touchReleased = this.touchReleased || {};
          this.touchReleased[act] = true;
        }
      };
      el.addEventListener("pointerdown", (e) => { e.preventDefault(); set(true); });
      el.addEventListener("pointerup", () => set(false));
      el.addEventListener("pointerleave", () => set(false));
    });
  }
}
