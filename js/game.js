import * as THREE from "three";
import {
  DEFAULT_APPEARANCE, DEFAULT_SETTINGS, DEFAULT_BINDS, LEVELS, PRESETS, ELEMENT_IDS, ELEMENTS,
} from "./config.js";
import { loadSave, writeSave, defaultSave } from "./storage.js";
import { AudioEngine } from "./audio.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { Stage } from "./stage.js";
import { FX } from "./fx.js";
import { createNinja, disposeNinja } from "./ninja.js";
import { Fighter, Match } from "./combat.js";
import { AIController } from "./ai.js";
import * as UI from "./ui.js";

function merge(a, b) {
  return { ...a, ...b, elements: (b.elements || a.elements).slice(0, 2) };
}

export class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ui = document.getElementById("ui-root");
    this.audio = new AudioEngine();
    this.input = new Input();
    this.renderer = new Renderer(this.canvas);
    this.stage = new Stage(this.renderer, "alta");
    this.fx = null;
    this.mode = "boot";
    this.paused = false;
    this.save = loadSave() || defaultSave(structuredClone(DEFAULT_APPEARANCE), { ...DEFAULT_SETTINGS }, { ...DEFAULT_BINDS });
    this.save.appearance = merge(DEFAULT_APPEARANCE, this.save.appearance || {});
    this.save.settings = { ...DEFAULT_SETTINGS, ...this.save.settings };
    this.save.binds = { ...DEFAULT_BINDS, ...this.save.binds };
    this.input.setBinds(this.save.binds);
    this.audio.set(this.save.settings);
    this.playerNinja = null;
    this.enemyNinja = null;
    this.match = null;
    this.ai = null;
    this.level = LEVELS[0];
    this.projMeshes = [];
    this.trapMeshes = [];
    this.editorTab = "identidad";
    this.draft = structuredClone(this.save.appearance);
    this.clock = new THREE.Clock();
    this.t = 0;
    this.showcase = new THREE.Group();
    this.renderer.scene.add(this.showcase);
  }

  persist() {
    writeSave(this.save);
  }

  async start() {
    UI.mount(this.ui, UI.bootScreen());
    const fill = document.getElementById("boot-fill");
    const tick = (p) => { if (fill) fill.style.width = p + "%"; };
    tick(12);
    await this.stage.loadTextures();
    tick(40);
    this.renderer.setQuality(this.save.settings.quality);
    await this.renderer.enableBloom();
    tick(70);
    await this.buildMenuWorld();
    tick(100);
    this.bindUI();
    this.loop();
    this.goto("menu");
  }

  async buildMenuWorld() {
    this.stage.build(LEVELS[0].stage);
    this.rebuildPlayer(this.save.appearance);
    this.playerNinja.root.position.set(0, 0, 0);
  }

  rebuildPlayer(app) {
    if (this.playerNinja) {
      this.playerNinja.root.parent?.remove(this.playerNinja.root);
      disposeNinja(this.playerNinja);
    }
    this.playerNinja = createNinja(app);
    this.renderer.scene.add(this.playerNinja.root);
  }

  bindUI() {
    this.ui.addEventListener("click", (e) => {
      const go = e.target.closest("[data-go]")?.dataset.go;
      const act = e.target.closest("[data-act]")?.dataset.act;
      const level = e.target.closest("[data-level]")?.dataset.level;
      const tab = e.target.closest("[data-tab]")?.dataset.tab;
      const preset = e.target.closest("[data-preset]")?.dataset.preset;
      const chip = e.target.closest("[data-k]");
      const tog = e.target.closest("[data-toggle]");
      const elc = e.target.closest("[data-el]");
      const kbd = e.target.closest("[data-bind]");
      if (go) this.goto(go);
      if (act) this.action(act);
      if (level) this.startLevel(Number(level));
      if (tab) this.setEditorTab(tab);
      if (preset) this.applyPreset(preset);
      if (chip) {
        this.draft[chip.dataset.k] = chip.dataset.v;
        this.refreshEditor();
      }
      if (tog) {
        this.draft[tog.dataset.toggle] = !this.draft[tog.dataset.toggle];
        this.refreshEditor();
      }
      if (elc) this.toggleElement(elc.dataset.el);
      if (kbd) {
        kbd.classList.add("listen");
        kbd.textContent = "...";
        this.input.remap(kbd.dataset.bind, (code) => {
          this.save.binds = { ...this.input.binds };
          this.persist();
          this.goto("settings");
          this.audio.sfx("ui");
          void code;
        });
      }
    });
    this.ui.addEventListener("input", (e) => {
      const set = e.target.dataset.set;
      if (set) {
        const v = e.target.type === "checkbox" ? e.target.checked : e.target.type === "range" ? Number(e.target.value) : e.target.value;
        this.save.settings[set] = v;
        this.audio.set(this.save.settings);
        if (set === "quality") this.renderer.setQuality(v);
        this.persist();
      }
      if (e.target.dataset.name !== undefined) {
        this.draft.name = e.target.value;
      }
      if (e.target.dataset.color) {
        this.draft[e.target.dataset.color] = e.target.value;
        this.refreshEditor(false);
      }
      if (e.target.dataset.num) {
        this.draft[e.target.dataset.num] = Number(e.target.value);
        this.refreshEditor(false);
      }
    });
    window.addEventListener("pointerdown", () => {
      this.audio.unlock();
      if (!this.audio.music.playing) this.audio.startMusic(this.mode === "fight" ? "fight" : "menu");
    }, { once: false });
  }

  action(act) {
    if (act === "saveChar") {
      if (this.draft.elements.length !== 2) {
        UI.toast("Elige dos elementos");
        return;
      }
      this.save.appearance = structuredClone(this.draft);
      this.persist();
      this.rebuildPlayer(this.save.appearance);
      this.goto("menu");
    }
    if (act === "randomChar") {
      const p = PRESETS[Math.floor(Math.random() * PRESETS.length)];
      this.draft = merge(DEFAULT_APPEARANCE, p.appearance);
      const e1 = ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)];
      let e2 = ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)];
      if (e2 === e1) e2 = ELEMENT_IDS[(ELEMENT_IDS.indexOf(e1) + 1) % ELEMENT_IDS.length];
      this.draft.elements = [e1, e2];
      this.refreshEditor();
    }
    if (act === "resetBinds") {
      this.save.binds = { ...DEFAULT_BINDS };
      this.input.setBinds(this.save.binds);
      this.persist();
      this.goto("settings");
    }
    if (act === "resume") this.paused = false, document.getElementById("pause-slot") && (document.getElementById("pause-slot").innerHTML = "");
    if (act === "restart") this.startLevel(this.level.id);
    if (act === "next") this.startLevel(Math.min(30, this.level.id + 1));
  }

  toggleElement(id) {
    const els = this.draft.elements.slice();
    const i = els.indexOf(id);
    if (i >= 0) els.splice(i, 1);
    else {
      if (els.length >= 2) els.shift();
      els.push(id);
    }
    this.draft.elements = els;
    this.refreshEditor();
  }

  applyPreset(id) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    this.draft = merge(DEFAULT_APPEARANCE, p.appearance);
    this.refreshEditor();
    this.audio.sfx("ui");
  }

  setEditorTab(tab) {
    this.editorTab = tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === tab));
    const box = document.getElementById("editor-fields");
    if (box) box.innerHTML = UI.editorFields(tab, this.draft);
  }

  refreshEditor(rebuildFields = true) {
    this.rebuildPlayer(this.draft);
    this.playerNinja.root.position.set(0, 0, 0);
    if (rebuildFields) this.setEditorTab(this.editorTab);
  }

  goto(screen) {
    this.paused = false;
    this.mode = screen;
    this.clearFight();
    if (screen !== "fight") {
      if (this.audio.ctx) this.audio.startMusic("menu");
    }
    if (screen === "menu") {
      UI.mount(this.ui, UI.menuScreen(this.save));
      this.rebuildPlayer(this.save.appearance);
    } else if (screen === "settings") {
      UI.mount(this.ui, UI.settingsScreen(this.save.settings, this.save.binds, this.input));
    } else if (screen === "editor") {
      this.draft = structuredClone(this.save.appearance);
      UI.mount(this.ui, UI.editorScreen(this.draft));
      this.setEditorTab("identidad");
      this.rebuildPlayer(this.draft);
    } else if (screen === "campaign") {
      UI.mount(this.ui, UI.campaignScreen(this.save));
    } else if (screen === "credits") {
      UI.mount(this.ui, UI.creditsScreen());
    } else if (screen === "versus") {
      const unlocked = this.save.unlocked;
      const id = Math.min(30, Math.max(1, Math.floor(Math.random() * unlocked) + 1));
      this.startLevel(id, true);
    }
    this.audio.sfx("ui");
  }

  clearFight() {
    this.match = null;
    this.ai = null;
    this.projMeshes.forEach((m) => m.parent?.remove(m));
    this.projMeshes = [];
    if (this.enemyNinja) {
      this.enemyNinja.root.parent?.remove(this.enemyNinja.root);
      disposeNinja(this.enemyNinja);
      this.enemyNinja = null;
    }
  }

  async startLevel(id, versus = false) {
    this.level = LEVELS[id - 1];
    if (!this.level) return;
    if (!versus && id > this.save.unlocked) return;
    this.mode = "intro";
    this.audio.startMusic("fight");
    const intro = UI.vsIntro(this.save.appearance.name, {
      ...this.level,
      playerElems: this.save.appearance.elements.map((e) => ELEMENTS[e].name),
    });
    UI.mount(this.ui, intro);
    this.stage.build(this.level.stage);
    this.fx = new FX(this.stage.fx);
    this.rebuildPlayer(this.save.appearance);
    this.enemyNinja = createNinja(this.level.enemy);
    this.renderer.scene.add(this.enemyNinja.root);
    await new Promise((r) => setTimeout(r, 1800));
    if (this.mode !== "intro") return;
    this.beginMatch();
  }

  beginMatch() {
    this.mode = "fight";
    const p1 = new Fighter(this.playerNinja, 1, { hp: 110, damage: 1, speed: 1 });
    const diff = this.save.settings.difficulty;
    const p2 = new Fighter(this.enemyNinja, 2, {
      hp: this.level.stats.hp,
      damage: this.level.stats.damage,
      speed: this.level.stats.speed,
    });
    this.match = new Match(p1, p2, {
      time: 99,
      onEvent: (ev) => this.onCombatEvent(ev),
    });
    p1.sync();
    p2.sync();
    this.ai = new AIController(p2, this.match, diff, this.level.stats.ai);
    UI.mount(this.ui, UI.hud(p1, p2, this.level));
    const help = document.getElementById("help");
    if (help && !this.save.settings.showHints) help.style.display = "none";
    const touch = UI.touchLayer();
    this.ui.appendChild(touch);
    this.input.bindTouch(touch);
    const p1el = document.getElementById("p1-el");
    const p2el = document.getElementById("p2-el");
    if (p1el) p1el.textContent = p1.elements.map((e) => ELEMENTS[e].kana).join(" ");
    if (p2el) p2el.textContent = p2.elements.map((e) => ELEMENTS[e].kana).join(" ");
    this.announce("FIGHT");
  }

  announce(text) {
    const n = document.getElementById("announcer");
    if (!n) return;
    n.textContent = text;
    n.classList.remove("pop");
    void n.offsetWidth;
    n.classList.add("pop");
  }

  onCombatEvent(ev) {
    if (ev.type === "hit") {
      this.audio.sfx("hit");
      this.fx?.burst(ev.x, ev.y, 0, "#ffe08a", 14, 5);
      this.renderer.shake = this.match.shake;
    } else if (ev.type === "block") this.audio.sfx("block");
    else if (ev.type === "jump") this.audio.sfx("jump");
    else if (ev.type === "special") {
      this.audio.sfx(ev.spec.ultimate ? "ultimate" : "whoosh");
      if (ev.spec.ultimate) this.announce(ev.spec.name);
    } else if (ev.type === "ko") {
      this.audio.sfx("ko");
      this.announce("K.O.");
      setTimeout(() => this.endMatch(ev.winner === this.match.p1), 1400);
    } else if (ev.type === "timeout") {
      this.announce("TIME");
      setTimeout(() => this.endMatch(ev.winner === this.match.p1), 1000);
    }
  }

  endMatch(win) {
    if (this.mode !== "fight") return;
    this.mode = "result";
    if (win) {
      this.audio.sfx("win");
      if (!this.save.completed.includes(this.level.id)) this.save.completed.push(this.level.id);
      this.save.unlocked = Math.max(this.save.unlocked, Math.min(30, this.level.id + 1));
      this.save.vsWins++;
      this.persist();
    } else this.save.vsLosses++;
    const slot = document.getElementById("result-slot");
    if (slot) {
      slot.innerHTML = "";
      slot.appendChild(UI.resultScreen(win, this.level));
    }
  }

  playerInput() {
    const dashTap = this.input.dashTap(0.016);
    return {
      axis: this.input.axis(),
      jump: this.input.wasPressed("up"),
      down: this.input.isDown("down"),
      light: this.input.wasPressed("light"),
      heavy: this.input.wasPressed("heavy"),
      kick: this.input.wasPressed("kick"),
      special1: this.input.wasPressed("special1"),
      special2: this.input.wasPressed("special2"),
      ultimate: this.input.wasPressed("ultimate"),
      block: this.input.isDown("block"),
      dash: this.input.wasPressed("dash") || dashTap !== 0,
    };
  }

  updateHud() {
    if (!this.match) return;
    const { p1, p2 } = this.match;
    const setBar = (id, ratio) => {
      const n = document.getElementById(id);
      if (!n) return;
      const i = n.querySelector("i");
      const b = n.querySelector("b");
      if (i) i.style.width = Math.max(0, ratio * 100) + "%";
      if (b) b.style.width = Math.max(0, ratio * 100) + "%";
    };
    setBar("p1-hp", p1.hp / p1.maxHp);
    setBar("p2-hp", p2.hp / p2.maxHp);
    setBar("p1-ck", p1.chakra / 100);
    setBar("p2-ck", p2.chakra / 100);
    const t = document.getElementById("timer");
    if (t) t.textContent = String(Math.max(0, Math.ceil(this.match.time))).padStart(2, "0");
    const c = document.getElementById("combo");
    if (c) {
      if (this.match.combo > 1) {
        c.classList.add("show");
        c.innerHTML = `${this.match.combo} <small>${this.match.comboRank}</small>`;
      } else c.classList.remove("show");
    }
  }

  syncProjectiles() {
    if (!this.match || !this.fx) return;
    while (this.projMeshes.length < this.match.projectiles.length) {
      const p = this.match.projectiles[this.projMeshes.length];
      this.projMeshes.push(this.fx.projectileMesh(p.color, p.size));
    }
    while (this.projMeshes.length > this.match.projectiles.length) {
      const m = this.projMeshes.pop();
      m.parent?.remove(m);
    }
    this.match.projectiles.forEach((p, i) => {
      this.projMeshes[i].position.set(p.x, p.y, 0);
    });
    this.match.traps.forEach((t) => {
      if (!t.mesh) {
        t.mesh = true;
        this.fx.shock(t.x, 0.1, t.color || "#c48a4a");
      }
    });
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.033, this.clock.getDelta());
    this.t += dt;
    this.stage.update(dt);
    this.fx?.update(dt);

    if (this.mode === "menu" || this.mode === "credits" || this.mode === "campaign" || this.mode === "versus") {
      this.renderer.showcaseCam(this.t);
      if (this.playerNinja) {
        this.playerNinja.root.position.set(Math.sin(this.t * 0.2) * 0.2, 0, 0);
        this.playerNinja.update(dt, {});
      }
    } else if (this.mode === "settings") {
      this.renderer.showcaseCam(this.t * 0.5);
      this.playerNinja?.update(dt, {});
    } else if (this.mode === "editor") {
      this.renderer.editorCam();
      if (this.playerNinja) {
        this.playerNinja.root.rotation.y += dt * 0.35;
        this.playerNinja.update(dt, {});
      }
    } else if (this.mode === "intro") {
      this.renderer.follow(-3, 3, dt);
    } else if (this.mode === "fight" || this.mode === "result") {
      if (this.mode === "fight" && this.match) {
        if (this.paused) {
          if (this.input.wasPressed("pause")) this.action("resume");
        } else if (this.input.wasPressed("pause")) {
          this.paused = true;
          const slot = document.getElementById("pause-slot");
          if (slot) {
            slot.innerHTML = "";
            slot.appendChild(UI.pauseMenu());
          }
        } else {
          this.match.control(this.match.p1, this.playerInput(), dt);
          this.match.control(this.match.p2, this.ai.input(dt), dt);
          this.match.update(dt);
          this.syncProjectiles();
          this.updateHud();
        }
      }
      if (this.match) this.renderer.follow(this.match.p1.x, this.match.p2.x, dt);
    }

    this.renderer.render();
    this.input.endFrame();
  };
}
