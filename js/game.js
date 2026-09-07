import * as THREE from "three";
import {
  DEFAULT_APPEARANCE, DEFAULT_SETTINGS, DEFAULT_BINDS, LEVELS, PRESETS, ELEMENT_IDS, ELEMENTS, STATUS, DIFFICULTY, MOVES, buildWaves,
} from "./config.js";
import { loadSave, writeSave, normalizeSave } from "./storage.js";
import { AudioEngine } from "./audio.js";
import { Input } from "./input.js";
import { Renderer } from "./renderer.js";
import { Stage } from "./stage.js";
import { FX } from "./fx.js";
import { createNinja, disposeNinja } from "./ninja.js";
import { createNaruto } from "./naruto.js";
import { loadAssets } from "./assets.js";
import { disposeTree } from "./resources.js";
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
    this.save = normalizeSave(loadSave(), { ...DEFAULT_SETTINGS, quality: this.isMobile() ? "baja" : "alta" });
    this.stage.setQuality(this.save.settings.quality);
    this.input.setBinds(this.save.binds);
    this.save.binds = { ...this.input.binds };
    this.audio.set(this.save.settings);
    this.playerNinja = null;
    this.enemyNinja = null;
    this.match = null;
    this.ai = null;
    this.level = LEVELS[0];
    this.projMeshes = new Map();
    this.pickupMeshes = new Map();
    this.waves = [];
    this.waveIndex = 0;
    this.versusMode = false;
    this.p1Fighter = null;
    this.interludeTimer = 0;
    this.editorTab = "identidad";
    this.editorRotY = 0;
    this.editorDrag = null;
    this.draft = structuredClone(this.save.appearance);
    this.clock = new THREE.Clock();
    this.t = 0;
    this.accumulator = 0;
    this.hudClock = 0;
    this.levelRequest = 0;
    this.editorPreviewRemaining = 0;
    this.updateControlPreferences();
  }

  isMobile() {
    return window.matchMedia("(any-pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  }

  persist() {
    if (!writeSave(this.save) && !this.saveWarning) {
      UI.toast("El navegador no permite guardar. Puedes seguir jugando esta sesión.");
      this.saveWarning = true;
    }
  }

  async start() {
    UI.mount(this.ui, UI.bootScreen());
    const fill = document.getElementById("boot-fill");
    const tick = (p) => { if (fill) fill.style.width = p + "%"; };
    tick(12);
    await loadAssets((progress) => tick(12 + progress * 68));
    await document.fonts.load('500 32px "Noto Sans JP"', "葉砂霧雲石雨音忍").catch(() => {});
    await this.renderer.setQuality(this.save.settings.quality);
    tick(85);
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
    // Futurista y robot son variantes cibernéticas; custom sigue procedural; naruto legacy -> futurista
    if (app.model === "custom" || app.model === "futuristic" || app.model === "robot") {
      this.playerNinja = createNinja(app);
    } else {
      this.playerNinja = createNaruto(app);
    }
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
      const preview = e.target.closest("[data-preview]")?.dataset.preview;
      if (preview) this.previewMove(preview);
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
        if (set === "quality") {
          this.renderer.setQuality(v);
          this.stage.setQuality(v);
          this.stage.build(this.stage.definition || LEVELS[0].stage);
        }
        if (set === "touchControls" || set === "touchScale") this.updateControlPreferences();
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

    // Arrastrar para rotar el personaje en el editor (ratón y táctil).
    window.addEventListener("pointerdown", (e) => {
      if (this.mode !== "editor") return;
      const elt = e.target;
      if (elt && elt.closest && elt.closest(".editor-side, .btn, .chip, .swatch, .tabs, input, select")) return;
      this.editorDrag = { x: e.clientX, rot: this.editorRotY };
    });
    window.addEventListener("pointermove", (e) => {
      if (!this.editorDrag) return;
      this.editorRotY = this.editorDrag.rot + (e.clientX - this.editorDrag.x) * 0.008;
    });
    window.addEventListener("pointerup", () => {
      this.editorDrag = null;
    });
    window.addEventListener("pointercancel", () => {
      this.editorDrag = null;
    });
    window.addEventListener("keydown", (event) => {
      if (this.paused && event.code === "Tab") {
        const buttons = [...document.querySelectorAll(".pause-menu button")];
        const index = buttons.indexOf(document.activeElement);
        if (buttons.length) {
          event.preventDefault();
          buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
        }
      }
      this.audio.unlock();
      if (!this.audio.music.playing) this.audio.startMusic(this.match ? "fight" : "menu");
    });
    window.addEventListener("blur", () => this.setPaused(true));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { this.setPaused(true); this.audio.suspend(); }
    });
    window.addEventListener("resize", () => { this.input.reset(); this.setPaused(true); });
    window.matchMedia("(any-pointer: coarse)").addEventListener("change", () => this.updateControlPreferences());
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.setPaused(true);
      UI.toast("Se ha interrumpido el renderizado. Espera a que se recupere o recarga la página.");
    });
  }

  updateControlPreferences() {
    const { touchControls, touchScale } = this.save.settings;
    this.touchEnabled = touchControls === "on" || (touchControls === "auto" && this.isMobile());
    document.documentElement.dataset.touch = String(this.touchEnabled);
    document.documentElement.style.setProperty("--touch-scale", touchScale);
    this.renderer.touch = this.touchEnabled;
    if (!this.touchEnabled) this.input.reset();
  }

  setPaused(value) {
    if (!["fight", "interlude"].includes(this.mode) || this.paused === value) return;
    this.paused = value;
    this.accumulator = 0;
    this.input.setEnabled(!value);
    this.input.reset();
    document.documentElement.dataset.paused = String(value);
    const slot = document.getElementById("pause-slot");
    if (slot) {
      slot.innerHTML = "";
      if (value) { slot.appendChild(UI.pauseMenu()); slot.querySelector("button")?.focus(); }
      else this.canvas.focus({ preventScroll: true });
    }
    if (!value) this.audio.unlock();
  }

  previewMove(name) {
    if (this.mode !== "editor" || !MOVES[name]) return;
    const move = MOVES[name];
    this.editorPreviewRemaining = move.startup + move.active + move.recovery + 0.35;
    this.playerNinja.animator.play(name, this.editorPreviewRemaining, true);
  }

  action(act) {
    if (act === "saveChar") {
      if (this.draft.elements.length !== 2) {
        UI.toast("Elige dos elementos");
        return;
      }
      this.draft.name = this.draft.name.trim() || (this.draft.model === "custom" ? "Shinobi" : "Kage Neon");
      this.save.appearance = structuredClone(this.draft);
      this.persist();
      this.rebuildPlayer(this.save.appearance);
      this.goto("menu");
    }
    if (act === "randomChar") {
      const p = PRESETS[Math.floor(Math.random() * PRESETS.length)];
      const baseModel = ["futuristic", "robot", "custom"].includes(this.draft.model) ? this.draft.model : "futuristic";
      if (["custom", "futuristic", "robot"].includes(this.draft.model)) this.draft = { ...merge(DEFAULT_APPEARANCE, p.appearance), model: baseModel };
      else this.draft = { ...merge(DEFAULT_APPEARANCE, p.appearance), model: baseModel };
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
    if (act === "resume") this.setPaused(false);
    if (act === "pause") this.setPaused(!this.paused);
    if (act === "fullscreen") {
      const request = document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
      if (request) request.catch(() => UI.toast("Pantalla completa no disponible en este navegador."));
      else UI.toast("Puedes usar la opción de pantalla completa de tu navegador.");
    }
    if (act === "restart") this.startLevel(this.level.id, this.versusMode);
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
    // Futurista/robot son modelos cibernéticos; uzumaki legacy se mapea a futurista para cumplir petición
    let model = "custom";
    if (id === "futuristic") model = "futuristic";
    else if (id === "robot") model = "robot";
    else if (id === "uzumaki") model = "futuristic";
    this.draft = { ...merge(DEFAULT_APPEARANCE, p.appearance), model };
    if (id === "uzumaki") this.draft.name = "Kage Neon";
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
    if (this.renderedEditorModel !== this.draft.model) {
      UI.mount(this.ui, UI.editorScreen(this.draft));
      this.renderedEditorModel = this.draft.model;
      this.editorTab = "identidad";
    }
    this.editorPreviewRemaining = 0;
    this.rebuildPlayer(this.draft);
    this.playerNinja.root.position.set(0, 0, 0);
    this.playerNinja.root.rotation.y = this.editorRotY;
    if (rebuildFields) this.setEditorTab(this.editorTab);
  }

  goto(screen) {
    ++this.levelRequest;
    this.input.cancelRemap(false);
    this.input.unbindTouch();
    this.input.setEnabled(false);
    this.paused = false;
    this.accumulator = 0;
    this.mode = screen;
    document.documentElement.dataset.mode = screen;
    document.documentElement.dataset.paused = "false";
    this.clearFight();
    if (screen !== "fight") {
      if (this.audio.ctx) this.audio.startMusic("menu");
    }
    if (screen === "menu") {
      UI.mount(this.ui, UI.menuScreen(this.save, this.input));
      this.rebuildPlayer(this.save.appearance);
    } else if (screen === "settings") {
      UI.mount(this.ui, UI.settingsScreen(this.save.settings, this.save.binds, this.input));
    } else if (screen === "editor") {
      this.draft = structuredClone(this.save.appearance);
      this.editorRotY = 0;
      this.editorPreviewRemaining = 0;
      this.renderedEditorModel = this.draft.model;
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

  clearVisuals() {
    this.projMeshes.forEach((mesh) => disposeTree(mesh));
    this.pickupMeshes.forEach((mesh) => disposeTree(mesh));
    this.projMeshes.clear();
    this.pickupMeshes.clear();
  }

  clearFight() {
    this.match = null;
    this.ai = null;
    this.p1Fighter = null;
    this.clearEnemy();
    this.fx?.clear();
    this.fx = null;
  }

  clearEnemy() {
    if (this.enemyNinja) { disposeNinja(this.enemyNinja); this.enemyNinja = null; }
    this.clearVisuals();
    this.fx?.clear();
  }

  async startLevel(id, versus = false) {
    const level = LEVELS[id - 1];
    if (!level || (!versus && id > this.save.unlocked)) return;
    const request = ++this.levelRequest;
    this.clearFight();
    this.input.unbindTouch();
    this.input.setEnabled(false);
    this.paused = false;
    this.accumulator = 0;
    document.documentElement.dataset.paused = "false";
    document.documentElement.dataset.mode = "intro";
    this.level = level;
    this.versusMode = versus;
    this.waves = buildWaves(this.level, versus);
    this.waveIndex = 0;
    this.p1Fighter = null;
    this.mode = "intro";
    this.audio.startMusic("fight");
    const intro = UI.vsIntro(this.save.appearance.name, {
      ...this.level,
      playerElems: this.save.appearance.elements.map((e) => ELEMENTS[e].name),
      waveCount: this.waves.length,
      versus,
      playerModel: this.save.appearance.model,
    });
    UI.mount(this.ui, intro);
    this.stage.build(this.level.stage);
    this.fx = new FX(this.stage.fx, this.stage.q.particles);
    this.rebuildPlayer(this.save.appearance);
    await new Promise((r) => setTimeout(r, 1200));
    if (this.mode !== "intro" || request !== this.levelRequest) return;
    this.beginWave(0);
  }

  beginWave(i) {
    this.waveIndex = i;
    const wave = this.waves[i];
    if (!wave) return;
    this.mode = "fight";
    document.documentElement.dataset.mode = "fight";
    this.input.reset();
    this.input.setEnabled(true);
    this.accumulator = 0;
    this.interludeTimer = 0;
    this.clearEnemy();
    this.enemyNinja = createNinja(wave.appearance);
    this.renderer.scene.add(this.enemyNinja.root);

    if (!this.p1Fighter) {
      this.p1Fighter = new Fighter(this.playerNinja, 1, { hp: 140, damage: 1, speed: 1 });
    } else {
      // Reutiliza luchador pero asegura vida completa al inicio de misión (no entre olas)
      if (i === 0) {
        this.p1Fighter.maxHp = 140;
        this.p1Fighter.hp = 140;
      }
    }
    const p1 = this.p1Fighter;
    p1.x = -5.2; p1.y = 0; p1.z = 0; p1.vx = 0; p1.vy = 0; p1.facing = 1;
    p1.state = "idle"; p1.timer = 0; p1.animLock = 0; p1.hitstun = 0; p1.blockstun = 0;
    p1.invuln = 0; p1.freeze = 0; p1.flash = 0; p1.coyote = 0; p1.jumpBuffer = 0; p1.walkDir = 0;
    p1.cd = { special1: 0, special2: 0, ultimate: 0, dash: 0, evade: 0, grab: 0 };
    p1.dashTime = 0; p1.evadeTime = 0; p1.bufferedAction = null; p1.upHold = false;
    p1.grabTarget = null; p1.grabbedBy = null; p1.grabTimer = 0; p1.grabHits = 0;
    p1.statuses = [];
    p1.move = null; p1.attackHit = false; p1.alive = true; p1.crouch = false; p1.blocking = false;
    p1.pendingSpec = null;
    p1.ninja.animator.reset();
    p1.sync();

    const difficulty = DIFFICULTY[this.save.settings.difficulty];
    const p2 = new Fighter(this.enemyNinja, 2, { hp: wave.hp * difficulty.hp, damage: wave.damage * difficulty.dmg, speed: wave.speed });
    this.match = new Match(p1, p2, {
      time: 99,
      onEvent: (ev) => this.onCombatEvent(ev),
      pickupCollector: p1,
    });
    p2.sync();
    const diff = this.save.settings.difficulty;
    this.ai = new AIController(p2, this.match, diff, wave.ai);
    UI.mount(this.ui, UI.hud(p1, p2, { ...this.level, wave, waveIndex: i, waveCount: this.waves.length, versus: this.versusMode }, this.input));
    const help = document.getElementById("help");
    if (help && !this.save.settings.showHints) help.style.display = "none";
    const touch = UI.touchLayer(p1);
    this.ui.appendChild(touch);
    this.input.bindTouch(touch);
    const p1el = document.getElementById("p1-el");
    const p2el = document.getElementById("p2-el");
    if (p1el) p1el.textContent = p1.elements.map((e) => ELEMENTS[e].kana).join(" ");
    if (p2el) p2el.textContent = p2.elements.map((e) => ELEMENTS[e].kana).join(" ");
    this.announce(this.waves.length > 1 ? `OLEADA ${i + 1}` : "FIGHT");
    this.syncPickups();
    this.updateHud();
  }

  announce(text) {
    const n = document.getElementById("announcer");
    if (!n) return;
    n.textContent = text;
    n.classList.remove("pop");
    void n.offsetWidth;
    n.classList.add("pop");
  }

  spawnDamage(f, amount, color) {
    const hud = document.getElementById("hud");
    if (!hud || !this.match) return;
    const isP1 = f === this.match.p1;
    const n = document.createElement("div");
    n.className = "damage-num";
    n.textContent = Math.round(amount);
    n.style.left = isP1 ? "30%" : "70%";
    n.style.top = "24%";
    if (color) n.style.textShadow = `0 0 8px ${color}, 0 2px 0 #000`;
    hud.appendChild(n);
    setTimeout(() => n.remove(), 700);
  }

  onCombatEvent(ev) {
    if (ev.type === "attack") {
      this.audio.sfx(["kick", "airKick", "crouchLight"].includes(ev.move) ? "kick" : "punch");
    } else if (ev.type === "evade") {
      this.audio.sfx("whoosh");
      this.fx?.burst(ev.fighter.x, 0.2, 0, "#3ee0ff", 8, 3);
    } else if (ev.type === "grab_attempt") {
      this.audio.sfx("whoosh");
    } else if (ev.type === "grab_hit") {
      this.audio.sfx("hit");
      this.announce("¡AGARRE!");
      this.fx?.burst(ev.def.x, 1.0, 0, "#ffdf8a", 10, 4);
      this.renderer.shake = 0.22;
    } else if (ev.type === "hit") {
      this.audio.sfx("hit");
      this.fx?.burst(ev.x, ev.y, 0, "#ffe08a", 14, 5);
      this.renderer.shake = this.match.shake;
      this.spawnDamage(ev.def, ev.damage);
    } else if (ev.type === "block") {
      this.audio.sfx("block");
      this.spawnDamage(ev.def, 0, "#8ab4ff");
    } else if (ev.type === "jump") {
      this.audio.sfx("jump");
    } else if (ev.type === "special") {
      this.audio.sfx(ev.spec.ultimate ? "ultimate" : "whoosh");
      if (ev.spec.ultimate) {
        this.announce(ev.spec.name);
        this.fx?.shockwave(ev.fighter.x, 0.1, ev.spec.color);
      }
    } else if (ev.type === "pickup") {
      this.audio.sfx(ev.pickup.heal ? "heal" : "pickup");
      UI.toast(`${ev.pickup.name} +`);
    } else if (ev.type === "ko") {
      this.audio.sfx("ko");
      this.announce("K.O.");
      this.handleResult(ev.winner === this.match.p1);
    } else if (ev.type === "timeout") {
      this.announce("TIME");
      this.handleResult(ev.winner === this.match.p1);
    }
  }

  dropRewards(x) {
    if (!this.match) return;
    // Recompensas con katanas: aspecto de espadas de /media
    this.match.spawnPickup("chakra", x + 0.6);
    if (Math.random() < 0.75) this.match.spawnPickup("heal", x - 0.6);
    const buffs = ["power", "speed", "shield", "blade"];
    if (Math.random() < 0.55) this.match.spawnPickup(buffs[Math.floor(Math.random() * buffs.length)], x + 1.2);
    if (Math.random() < 0.22) this.match.spawnPickup("blade", x - 1.1);
  }

  handleResult(playerWon) {
    if (this.mode === "result" || this.mode === "interlude") return;
    if (this.versusMode) {
      if (playerWon) this.save.vsWins++;
      else this.save.vsLosses++;
      this.persist();
      this.mode = "result";
      this.showResult(playerWon);
      return;
    }
    // Campaña.
    if (playerWon) {
      if (this.waveIndex + 1 < this.waves.length) {
        this.dropRewards(this.match.p2.x);
        this.mode = "interlude";
        this.match.interlude = true;
        this.interludeTimer = 2.6;
        this.announce("¡OLEADA SUPERADA!");
        this.audio.sfx("win");
        return;
      }
      // Misión completa.
      if (!this.save.completed.includes(this.level.id)) this.save.completed.push(this.level.id);
      this.save.unlocked = Math.max(this.save.unlocked, Math.min(30, this.level.id + 1));
      this.save.vsWins++;
      this.persist();
      this.mode = "result";
      this.audio.sfx("win");
      this.showResult(true);
    } else {
      this.save.vsLosses++;
      this.persist();
      this.mode = "result";
      this.showResult(false);
    }
  }

  showResult(win) {
    this.input.setEnabled(false);
    document.documentElement.dataset.mode = "result";
    this.match.projectiles.length = 0;
    this.match.traps.length = 0;
    this.clearVisuals();
    const slot = document.getElementById("result-slot");
    if (!slot) return;
    slot.innerHTML = "";
    slot.appendChild(UI.resultScreen(win, this.level, this.versusMode));
  }

  playerInput() {
    const dashTap = this.input.dashTap();
    const axis = this.input.axis();
    return {
      axis,
      jump: this.input.wasPressed("up"),
      up: this.input.isDown("up"),
      upReleased: this.input.wasReleased("up"),
      down: this.input.isDown("down"),
      light: this.input.wasPressed("light"),
      heavy: this.input.wasPressed("heavy"),
      kick: this.input.wasPressed("kick"),
      special1: this.input.wasPressed("special1"),
      special2: this.input.wasPressed("special2"),
      ultimate: this.input.wasPressed("ultimate"),
      block: this.input.isDown("block"),
      dash: this.input.wasPressed("dash") || dashTap !== 0,
      dashDirection: dashTap,
      evade: this.input.wasPressed("evade"),
      evadeDir: axis ? Math.sign(axis) : dashTap || 0,
      grab: this.input.wasPressed("grab"),
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
      n.setAttribute("aria-valuenow", String(Math.round(Math.max(0, Math.min(1, ratio)) * 100)));
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
        const html = `${this.match.combo} <small>${this.match.comboRank}</small>`;
        if (c.innerHTML !== html) c.innerHTML = html;
      } else c.classList.remove("show");
    }
    const w = document.getElementById("wave-info");
    if (w && this.waves.length > 1) w.textContent = `Oleada ${this.waveIndex + 1}/${this.waves.length}`;
    this.renderStatus("p1", p1);
    this.renderStatus("p2", p2);
    for (const [action, cost, cooldown] of [["special1", p1.el1.special.chakra, p1.cd.special1], ["special2", p1.el2.special.chakra, p1.cd.special2], ["ultimate", 100, p1.cd.ultimate]]) {
      const button = this.ui.querySelector(`[data-input="${action}"]`);
      button?.classList.toggle("unavailable", p1.chakra < cost || cooldown > 0);
    }
  }

  renderStatus(prefix, f) {
    const box = document.getElementById(prefix + "-status");
    if (!box) return;
    const parts = [];
    f.statuses.forEach((s) => {
      if (s.until <= 0) return;
      const st = STATUS[s.id];
      if (st) parts.push(`<span class="st" style="--stc:${st.color}">${st.name}</span>`);
    });
    if (f.buffs.shield > 0) parts.push(`<span class="st buff" style="--stc:#c9f6ff">ESCUDO</span>`);
    if (f.buffs.damage > 0) parts.push(`<span class="st buff" style="--stc:#ff6a2a">PODER</span>`);
    if (f.buffs.speed > 0) parts.push(`<span class="st buff" style="--stc:#e8c36a">VELOCIDAD</span>`);
    const html = parts.join("");
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  syncProjectiles() {
    if (!this.match || !this.fx) return;
    const projectiles = new Set(this.match.projectiles);
    this.projMeshes.forEach((mesh, projectile) => {
      if (!projectiles.has(projectile)) { disposeTree(mesh); this.projMeshes.delete(projectile); }
    });
    for (const projectile of projectiles) {
      if (!this.projMeshes.has(projectile)) this.projMeshes.set(projectile, this.fx.projectileMesh(projectile.color, projectile.size));
      const mesh = this.projMeshes.get(projectile);
      mesh.position.set(projectile.x, projectile.y, 0);
      mesh.rotation.y = projectile.vx > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    this.match.traps.forEach((trap) => {
      if (!trap.mesh) { trap.mesh = true; this.fx.shock(trap.x, 0.1, trap.color || "#c48a4a"); }
    });
  }

  syncPickups() {
    if (!this.match || !this.fx) return;
    const pickups = new Set(this.match.pickups);
    this.pickupMeshes.forEach((mesh, pickup) => {
      if (!pickups.has(pickup)) { disposeTree(mesh); this.pickupMeshes.delete(pickup); }
    });
    for (const pickup of pickups) {
      if (!this.pickupMeshes.has(pickup)) this.pickupMeshes.set(pickup, this.fx.pickupMesh(pickup.id, pickup.color));
      const mesh = this.pickupMeshes.get(pickup);
      mesh.position.set(pickup.x, pickup.y + Math.sin(pickup.bob * 3) * 0.12, 0);
      mesh.rotation.y = pickup.bob * 2;
    }
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const rawDt = this.clock.getDelta();
    const dt = Math.min(0.1, rawDt);
    const live = this.mode === "fight" || this.mode === "interlude";
    if (live && this.input.wasPressed("pause")) this.setPaused(!this.paused);
    if (!this.paused) {
      this.t += dt;
      this.stage.update(dt);
      this.fx?.update(dt);
    }
    if (["menu", "credits", "campaign", "settings"].includes(this.mode)) {
      this.renderer.showcaseCam(this.t);
      if (this.playerNinja) {
        this.playerNinja.root.position.set(0, 0, 0);
        this.playerNinja.root.rotation.y = -0.24;
        this.playerNinja.update(dt, {});
      }
    } else if (this.mode === "editor") {
      this.renderer.editorCam();
      if (this.playerNinja) {
        if (!this.editorDrag && this.editorPreviewRemaining <= 0) this.editorRotY += dt * 0.22;
        this.playerNinja.root.rotation.y = this.editorRotY;
        if (this.editorPreviewRemaining > 0) {
          this.editorPreviewRemaining -= dt;
          if (this.editorPreviewRemaining <= 0) this.playerNinja.animator.play("idle");
        }
        this.playerNinja.update(dt, {});
      }
    } else if (this.mode === "intro") {
      this.renderer.follow(-3.2, 3.2, dt);
    } else if (this.match) {
      if (live && !this.paused) {
        this.renderer.trackFrame(rawDt);
        this.accumulator = Math.min(0.1, this.accumulator + dt);
        const step = 1 / 60;
        while (this.accumulator + 1e-8 >= step && this.match) {
          this.accumulator -= step;
          this.match.control(this.match.p1, this.playerInput(), step);
          if (this.mode === "fight") this.match.control(this.match.p2, this.ai.input(step), step);
          this.match.update(step);
          this.input.endFrame();
          if (this.mode === "result") break;
          if (this.mode === "interlude") {
            this.interludeTimer -= step;
            if (this.interludeTimer <= 0) { this.beginWave(this.waveIndex + 1); break; }
          }
        }
        this.syncProjectiles();
        this.syncPickups();
        this.hudClock += dt;
        if (this.hudClock >= 0.08) { this.updateHud(); this.hudClock = 0; }
      } else if (this.mode === "result") {
        this.match.update(dt);
        this.updateHud();
      }
      this.renderer.follow(this.match.p1.x, this.match.p2.x, this.paused ? 0 : dt, this.match.p1.y, this.match.p2.y);
    }
    this.renderer.render();
    // At 120/144 Hz, preserve edge inputs until an actual 60 Hz simulation step.
    if (!live || this.paused) this.input.endFrame();
  };
}
