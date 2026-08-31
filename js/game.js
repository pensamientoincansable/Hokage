import * as THREE from "three";
import {
  DEFAULT_APPEARANCE, DEFAULT_SETTINGS, DEFAULT_BINDS, LEVELS, PRESETS, ELEMENT_IDS, ELEMENTS, STATUS, buildWaves,
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
    this.pickupMeshes = [];
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
    this.showcase = new THREE.Group();
    this.renderer.scene.add(this.showcase);
  }

  isMobile() {
    return window.innerWidth <= 900;
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
    if (act === "resume") {
      this.paused = false;
      const slot = document.getElementById("pause-slot");
      if (slot) slot.innerHTML = "";
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
    this.playerNinja.root.rotation.y = this.editorRotY;
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
      this.editorRotY = 0;
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
    this.p1Fighter = null;
    this.projMeshes.forEach((m) => m.parent?.remove(m));
    this.projMeshes = [];
    this.pickupMeshes.forEach((m) => m.parent?.remove(m));
    this.pickupMeshes = [];
    if (this.enemyNinja) {
      this.enemyNinja.root.parent?.remove(this.enemyNinja.root);
      disposeNinja(this.enemyNinja);
      this.enemyNinja = null;
    }
  }

  clearEnemy() {
    if (this.enemyNinja) {
      this.enemyNinja.root.parent?.remove(this.enemyNinja.root);
      disposeNinja(this.enemyNinja);
      this.enemyNinja = null;
    }
    this.projMeshes.forEach((m) => m.parent?.remove(m));
    this.projMeshes = [];
    this.pickupMeshes.forEach((m) => m.parent?.remove(m));
    this.pickupMeshes = [];
  }

  async startLevel(id, versus = false) {
    this.level = LEVELS[id - 1];
    if (!this.level) return;
    if (!versus && id > this.save.unlocked) return;
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
    });
    UI.mount(this.ui, intro);
    this.stage.build(this.level.stage);
    this.fx = new FX(this.stage.fx);
    this.rebuildPlayer(this.save.appearance);
    await new Promise((r) => setTimeout(r, 1800));
    if (this.mode !== "intro") return;
    this.beginWave(0);
  }

  beginWave(i) {
    this.waveIndex = i;
    const wave = this.waves[i];
    if (!wave) return;
    this.mode = "fight";
    this.interludeTimer = 0;
    this.clearEnemy();
    this.enemyNinja = createNinja(wave.appearance);
    this.renderer.scene.add(this.enemyNinja.root);

    if (!this.p1Fighter) {
      this.p1Fighter = new Fighter(this.playerNinja, 1, { hp: 120, damage: 1, speed: 1 });
    }
    const p1 = this.p1Fighter;
    p1.x = -3.2; p1.y = 0; p1.z = 0; p1.vx = 0; p1.vy = 0; p1.facing = 1;
    p1.state = "idle"; p1.timer = 0; p1.animLock = 0; p1.hitstun = 0; p1.blockstun = 0;
    p1.invuln = 0; p1.freeze = 0; p1.flash = 0; p1.coyote = 0; p1.jumpBuffer = 0; p1.walkDir = 0;
    p1.cd = { special1: 0, special2: 0, ultimate: 0 };
    p1.statuses = [];
    p1.move = null; p1.attackHit = false; p1.alive = true; p1.crouch = false; p1.blocking = false;
    p1.pendingSpec = null;
    p1.ninja.animator.state = "idle";
    p1.ninja.animator.t = 0;
    p1.ninja.animator.lock = 0;
    p1.sync();

    const p2 = new Fighter(this.enemyNinja, 2, { hp: wave.hp, damage: wave.damage, speed: wave.speed });
    this.match = new Match(p1, p2, {
      time: 99,
      onEvent: (ev) => this.onCombatEvent(ev),
      pickupCollector: p1,
    });
    p2.sync();
    const diff = this.save.settings.difficulty;
    this.ai = new AIController(p2, this.match, diff, wave.ai);
    UI.mount(this.ui, UI.hud(p1, p2, { ...this.level, wave, waveIndex: i, waveCount: this.waves.length, versus: this.versusMode }));
    const help = document.getElementById("help");
    if (help && !this.save.settings.showHints) help.style.display = "none";
    const touch = UI.touchLayer();
    this.ui.appendChild(touch);
    this.input.bindTouch(touch);
    const p1el = document.getElementById("p1-el");
    const p2el = document.getElementById("p2-el");
    if (p1el) p1el.textContent = p1.elements.map((e) => ELEMENTS[e].kana).join(" ");
    if (p2el) p2el.textContent = p2.elements.map((e) => ELEMENTS[e].kana).join(" ");
    this.announce(this.waves.length > 1 ? `OLEADA ${i + 1}` : "FIGHT");
    this.syncPickups();
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
    if (ev.type === "hit") {
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
    this.match.spawnPickup("chakra", x + 0.5);
    if (Math.random() < 0.7) this.match.spawnPickup("heal", x - 0.5);
    const buffs = ["power", "speed", "shield"];
    if (Math.random() < 0.3) this.match.spawnPickup(buffs[Math.floor(Math.random() * buffs.length)], x + 1.3);
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
    const slot = document.getElementById("result-slot");
    if (!slot) return;
    slot.innerHTML = "";
    slot.appendChild(UI.resultScreen(win, this.level, this.versusMode));
  }

  playerInput() {
    const dashTap = this.input.dashTap(0.016);
    return {
      axis: this.input.axis(),
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
    const w = document.getElementById("wave-info");
    if (w && this.waves.length > 1) w.textContent = `Oleada ${this.waveIndex + 1}/${this.waves.length}`;
    this.renderStatus("p1", p1);
    this.renderStatus("p2", p2);
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
    box.innerHTML = parts.join("");
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
      const m = this.projMeshes[i];
      m.position.set(p.x, p.y, 0);
      m.rotation.y = p.vx > 0 ? -Math.PI / 2 : Math.PI / 2;
    });
    this.match.traps.forEach((t) => {
      if (!t.mesh) {
        t.mesh = true;
        this.fx.shock(t.x, 0.1, t.color || "#c48a4a");
      }
    });
  }

  syncPickups() {
    if (!this.match || !this.fx) {
      this.pickupMeshes.forEach((m) => m.parent?.remove(m));
      this.pickupMeshes = [];
      return;
    }
    const keys = this.match.pickups;
    while (this.pickupMeshes.length < keys.length) {
      const p = keys[this.pickupMeshes.length];
      this.pickupMeshes.push(this.fx.pickupMesh(p.id, p.color));
    }
    while (this.pickupMeshes.length > keys.length) {
      const m = this.pickupMeshes.pop();
      m.parent?.remove(m);
    }
    keys.forEach((p, i) => {
      const m = this.pickupMeshes[i];
      m.position.set(p.x, p.y + Math.sin(p.bob * 3) * 0.12, 0);
      m.rotation.y += 0.03;
    });
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.033, this.clock.getDelta());
    this.t += dt;
    this.stage.update(dt);
    this.fx?.update(dt);

    if (this.mode === "menu" || this.mode === "credits" || this.mode === "campaign") {
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
        if (!this.editorDrag) this.editorRotY += dt * 0.35;
        this.playerNinja.root.rotation.y = this.editorRotY;
        this.playerNinja.update(dt, {});
      }
    } else if (this.mode === "intro") {
      this.renderer.follow(-3, 3, dt);
    } else if (this.mode === "fight" || this.mode === "interlude" || this.mode === "result") {
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
          this.syncPickups();
          this.updateHud();
        }
      } else if (this.mode === "interlude" && this.match) {
        this.match.control(this.match.p1, this.playerInput(), dt);
        this.match.update(dt);
        this.syncProjectiles();
        this.syncPickups();
        this.updateHud();
        this.interludeTimer -= dt;
        if (this.interludeTimer <= 0) {
          this.beginWave(this.waveIndex + 1);
        }
      }
      if (this.match) this.renderer.follow(this.match.p1.x, this.match.p2.x, dt);
    }

    this.renderer.render();
    this.input.endFrame();
  };
}
